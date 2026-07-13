use crate::system_design_repository::SystemSnapshot;
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

fn system_design_markdown(design: &SystemSnapshot) -> String {
    let mut output = format!("# {}\n\n{}\n\n## 컴포넌트\n", design.title, design.summary);
    for node in &design.nodes {
        output.push_str(&format!("\n### {} (`{}`)\n\n- 유형: `{}`\n- 기술: {}\n- 배포: {}\n- 상태: {}\n- 기능명세: {}\n- 유저플로우: {}\n- 코드: {}\n- 테스트: {}\n- 설명: {}\n", node.name, node.id, node.r#type, node.technology, node.deployment, node.status, node.linked_feature_ids.join(", "), node.linked_user_flow_ids.join(", "), node.code_paths.join(", "), node.test_paths.join(", "), node.description));
    }
    output.push_str("\n## 연결\n");
    for edge in &design.edges {
        output.push_str(&format!(
            "\n- `{}` → `{}`: `{}` / {} / {}\n  - 인증: {}\n  - 오류 처리: {}\n",
            edge.source,
            edge.target,
            edge.r#type,
            edge.protocol,
            edge.description,
            edge.authentication,
            edge.error_handling
        ));
    }
    output
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
    let mut database = open_database(&app).await?;
    let project = sqlx::query("SELECT name, idea, git_repository_path FROM projects WHERE id = ?")
        .bind(&input.project_id)
        .fetch_optional(&mut database)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "동기화할 프로젝트를 찾지 못했습니다.".to_owned())?;
    let stored_repository: Option<String> = project
        .try_get("git_repository_path")
        .map_err(|error| error.to_string())?;
    let stored_repository = stored_repository
        .ok_or_else(|| "프로젝트에 저장된 Git 저장소를 먼저 연결해 주세요.".to_owned())?;
    let stored_repository = fs::canonicalize(stored_repository)
        .map_err(|_| "프로젝트에 저장된 Git 저장소를 찾지 못했습니다.".to_owned())?;
    if stored_repository != repository {
        return Err("프로젝트에 저장된 Git 저장소와 요청 경로가 일치하지 않습니다.".to_owned());
    }
    // 렌더러가 임의 경로를 전달하더라도 DB에 연결된 저장소를 검증하기 전에는
    // 어떤 디렉터리나 파일도 만들지 않는다.
    let output_root = repository.join(".projectstudio");
    let feature_dir = output_root.join("features");
    let change_dir = output_root.join("changes");
    fs::create_dir_all(&feature_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&change_dir).map_err(|error| error.to_string())?;
    let project_name: String = project.try_get("name").map_err(|error| error.to_string())?;
    let idea: String = project.try_get("idea").map_err(|error| error.to_string())?;
    let rows = sqlx::query("SELECT id, parent_feature_id, title, description, status, priority, role FROM features WHERE project_id = ? ORDER BY sort_order")
        .bind(&input.project_id).fetch_all(&mut database).await.map_err(|error| error.to_string())?;
    let system_design = sqlx::query_scalar::<_, String>("SELECT r.snapshot_json FROM system_designs d JOIN system_design_revisions r ON r.id=d.current_revision_id WHERE d.project_id=?")
        .bind(&input.project_id).fetch_optional(&mut database).await.map_err(|error|error.to_string())?
        .map(|value| serde_json::from_str::<SystemSnapshot>(&value).map_err(|error| format!("시스템 설계 데이터가 손상되었습니다: {error}"))).transpose()?;

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
    let system_design_manifest = if let Some(design) = &system_design {
        let json = serde_json::to_string_pretty(design).map_err(|error| error.to_string())?;
        let json_path = output_root.join("system-design.json");
        let markdown_path = output_root.join("system-design.md");
        let markdown = system_design_markdown(design);
        if fs::read_to_string(&json_path).map_or(true, |current| current != json)
            || fs::read_to_string(&markdown_path).map_or(true, |current| current != markdown)
        {
            changes.push(serde_json::json!({ "entityType": "system-design", "entityId": "current", "changeType": "updated", "changedFields": ["snapshot"], "documentPath": ".projectstudio/system-design.json" }));
        }
        write_atomic(&json_path, &json)?;
        write_atomic(&markdown_path, &markdown)?;
        Some(
            serde_json::json!({"jsonPath":".projectstudio/system-design.json","markdownPath":".projectstudio/system-design.md","nodeCount":design.nodes.len(),"edgeCount":design.edges.len()}),
        )
    } else {
        None
    };
    let document_count = manifest_features.len() + usize::from(system_design.is_some());
    let manifest = serde_json::json!({ "schemaVersion": 1, "projectId": input.project_id.clone(), "projectName": project_name, "features": manifest_features, "systemDesign": system_design_manifest });
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
