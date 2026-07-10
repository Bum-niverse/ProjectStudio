use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::{fs, path::Path};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProjectInput {
    project_id: String,
    repository_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    output_path: String,
    document_count: usize,
    changed_document_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ManifestFeature {
    id: String,
    parent_id: Option<String>,
    title: String,
    status: String,
    document_path: String,
}

fn safe_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
}

fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, content)
        .map_err(|error| format!("임시 동기화 파일을 쓰지 못했습니다: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("이전 동기화 파일을 교체하지 못했습니다: {error}"))?;
    }
    fs::rename(temporary, path)
        .map_err(|error| format!("동기화 파일을 확정하지 못했습니다: {error}"))
}

async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("projectstudio.db");
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(path)
        .foreign_keys(true);
    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn sync_project_documents(
    app: AppHandle,
    input: SyncProjectInput,
) -> Result<SyncResult, String> {
    let repository = fs::canonicalize(&input.repository_path)
        .map_err(|error| format!("저장소 경로를 열 수 없습니다: {error}"))?;
    if !repository.join(".git").is_dir() {
        return Err("선택한 경로는 Git 저장소가 아닙니다.".to_owned());
    }
    let output_root = repository.join(".projectstudio");
    let feature_dir = output_root.join("features");
    let change_dir = output_root.join("changes");
    fs::create_dir_all(&feature_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&change_dir).map_err(|error| error.to_string())?;

    let mut database = open_database(&app).await?;
    let project = sqlx::query("SELECT name, idea FROM projects WHERE id = ?")
        .bind(&input.project_id)
        .fetch_optional(&mut database)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "동기화할 프로젝트를 찾지 못했습니다.".to_owned())?;
    let project_name: String = project.try_get("name").map_err(|error| error.to_string())?;
    let idea: String = project.try_get("idea").map_err(|error| error.to_string())?;
    let rows = sqlx::query("SELECT id, parent_feature_id, title, description, status, priority, role FROM features WHERE project_id = ? ORDER BY sort_order")
        .bind(&input.project_id).fetch_all(&mut database).await.map_err(|error| error.to_string())?;

    let mut manifest_features = Vec::new();
    let mut changes = Vec::new();
    for row in rows {
        let id: String = row.try_get("id").map_err(|error| error.to_string())?;
        if !safe_id(&id) {
            return Err("안전하지 않은 기능 ID가 있어 동기화를 중단했습니다.".to_owned());
        }
        let parent_id: Option<String> = row
            .try_get("parent_feature_id")
            .map_err(|error| error.to_string())?;
        let title: String = row.try_get("title").map_err(|error| error.to_string())?;
        let description: String = row
            .try_get("description")
            .map_err(|error| error.to_string())?;
        let status: String = row.try_get("status").map_err(|error| error.to_string())?;
        let priority: String = row.try_get("priority").map_err(|error| error.to_string())?;
        let role: String = row.try_get("role").map_err(|error| error.to_string())?;
        let criteria = sqlx::query("SELECT id, description, is_met FROM acceptance_criteria WHERE feature_id = ? ORDER BY sort_order")
            .bind(&id).fetch_all(&mut database).await.map_err(|error| error.to_string())?;
        let criteria_markdown = criteria
            .into_iter()
            .map(|criterion| {
                let criterion_id: String = criterion.try_get("id").unwrap_or_default();
                let text: String = criterion.try_get("description").unwrap_or_default();
                let is_met: i64 = criterion.try_get("is_met").unwrap_or_default();
                format!(
                    "- [{}] {} {}",
                    if is_met != 0 { "x" } else { " " },
                    criterion_id,
                    text
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        let markdown = format!("---\nid: {id}\nparentId: {}\nstatus: {status}\npriority: {priority}\nrole: {role}\n---\n\n# {title}\n\n## 설명\n\n{description}\n\n## 수용 기준\n\n{criteria_markdown}\n", parent_id.as_deref().unwrap_or("null"));
        let path = feature_dir.join(format!("{id}.md"));
        if fs::read_to_string(&path).map_or(true, |current| current != markdown) {
            write_atomic(&path, &markdown)?;
            changes.push(serde_json::json!({ "entityType": "feature", "entityId": id.clone(), "changeType": "updated", "changedFields": ["document"], "documentPath": format!(".projectstudio/features/{id}.md") }));
        }
        manifest_features.push(ManifestFeature {
            id: id.clone(),
            parent_id,
            title,
            status,
            document_path: format!(".projectstudio/features/{id}.md"),
        });
    }

    write_atomic(&output_root.join("project.md"), &format!("# {project_name}\n\n## 아이디어\n\n{idea}\n\n## Codex 시작점\n\n먼저 `changes/latest.json`을 읽고 변경된 기능 문서를 확인한다.\n"))?;
    let document_count = manifest_features.len();
    let manifest = serde_json::json!({ "schemaVersion": 1, "projectId": input.project_id.clone(), "projectName": project_name, "features": manifest_features });
    write_atomic(
        &output_root.join("manifest.json"),
        &serde_json::to_string_pretty(&manifest).map_err(|error| error.to_string())?,
    )?;
    let latest = serde_json::json!({ "schemaVersion": 1, "projectId": input.project_id, "changes": changes });
    write_atomic(
        &change_dir.join("latest.json"),
        &serde_json::to_string_pretty(&latest).map_err(|error| error.to_string())?,
    )?;
    Ok(SyncResult {
        output_path: output_root.to_string_lossy().into_owned(),
        document_count,
        changed_document_count: latest["changes"].as_array().map_or(0, Vec::len),
    })
}
