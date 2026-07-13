use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "projectstudio.db";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProjectWithPrdInput {
    project_id: String,
    project_name: String,
    idea: String,
    project_type: String,
    project_subtype: Option<String>,
    document_id: String,
    revision_id: String,
    prd_title: String,
    prd_markdown: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    id: String,
    name: String,
    idea: String,
    project_type: String,
    project_subtype: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrdRevision {
    id: String,
    document_id: String,
    revision_number: i64,
    content_markdown: String,
    source: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWithPrd {
    project: Project,
    prd: PrdRevision,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePrdRevisionInput {
    document_id: String,
    revision_id: String,
    expected_revision_number: i64,
    content_markdown: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRepositoryPathInput {
    project_id: String,
    repository_path: String,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("앱 데이터 경로를 확인하지 못했습니다: {error}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("앱 데이터 폴더를 만들지 못했습니다: {error}"))?;
    Ok(app_data_dir.join(DATABASE_FILE_NAME))
}

async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let path = database_path(app)?;
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true);

    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| format!("로컬 데이터베이스를 열지 못했습니다: {error}"))
}

#[tauri::command]
pub async fn get_project_repository_path(
    app: AppHandle,
    project_id: String,
) -> Result<Option<String>, String> {
    let mut connection = open_database(&app).await?;
    sqlx::query_scalar("SELECT git_repository_path FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_optional(&mut connection)
        .await
        .map_err(|error| format!("프로젝트 저장소 연결을 읽지 못했습니다: {error}"))
        .map(|value| value.flatten())
}

#[tauri::command]
pub async fn save_project_repository_path(
    app: AppHandle,
    input: ProjectRepositoryPathInput,
) -> Result<String, String> {
    let root = std::fs::canonicalize(input.repository_path.trim())
        .map_err(|_| "선택한 로컬 저장소 경로를 찾을 수 없습니다.".to_owned())?;
    if !root.join(".git").exists() {
        return Err("선택한 경로는 Git 저장소 루트가 아닙니다.".to_owned());
    }
    let path = root.to_string_lossy().into_owned();
    let mut connection = open_database(&app).await?;
    let result = sqlx::query(
        "UPDATE projects SET git_repository_path = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&path)
    .bind(&input.project_id)
    .execute(&mut connection)
    .await
    .map_err(|error| format!("프로젝트 저장소 연결을 저장하지 못했습니다: {error}"))?;
    if result.rows_affected() != 1 {
        return Err("연결할 프로젝트를 찾지 못했습니다.".to_owned());
    }
    Ok(path)
}

#[tauri::command]
pub async fn save_project_with_initial_prd(
    app: AppHandle,
    input: SaveProjectWithPrdInput,
) -> Result<ProjectWithPrd, String> {
    let mut connection = open_database(&app).await?;
    save_project_with_initial_prd_in_connection(&mut connection, input).await
}

async fn save_project_with_initial_prd_in_connection(
    connection: &mut SqliteConnection,
    input: SaveProjectWithPrdInput,
) -> Result<ProjectWithPrd, String> {
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("저장 트랜잭션을 시작하지 못했습니다: {error}"))?;

    sqlx::query(
        "INSERT INTO projects (id, name, idea, project_type, project_subtype, git_repository_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)",
    )
    .bind(&input.project_id)
    .bind(&input.project_name)
    .bind(&input.idea)
    .bind(&input.project_type)
    .bind(&input.project_subtype)
    .bind(&input.created_at)
    .bind(&input.created_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("프로젝트를 저장하지 못했습니다: {error}"))?;

    sqlx::query(
        "INSERT INTO documents (id, project_id, document_type, title, current_revision_id, created_at, updated_at) VALUES (?, ?, 'prd', ?, NULL, ?, ?)",
    )
    .bind(&input.document_id)
    .bind(&input.project_id)
    .bind(&input.prd_title)
    .bind(&input.created_at)
    .bind(&input.created_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("PRD 문서를 저장하지 못했습니다: {error}"))?;

    sqlx::query(
        "INSERT INTO document_revisions (id, document_id, revision_number, content_markdown, content_json, source, created_at) VALUES (?, ?, 1, ?, NULL, 'development_mode', ?)",
    )
    .bind(&input.revision_id)
    .bind(&input.document_id)
    .bind(&input.prd_markdown)
    .bind(&input.created_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("PRD 리비전을 저장하지 못했습니다: {error}"))?;

    sqlx::query("UPDATE documents SET current_revision_id = ? WHERE id = ?")
        .bind(&input.revision_id)
        .bind(&input.document_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("현재 PRD 리비전을 연결하지 못했습니다: {error}"))?;

    transaction
        .commit()
        .await
        .map_err(|error| format!("프로젝트 저장을 확정하지 못했습니다: {error}"))?;

    Ok(ProjectWithPrd {
        project: Project {
            id: input.project_id,
            name: input.project_name,
            idea: input.idea,
            project_type: input.project_type,
            project_subtype: input.project_subtype,
            created_at: input.created_at.clone(),
            updated_at: input.created_at.clone(),
        },
        prd: PrdRevision {
            id: input.revision_id,
            document_id: input.document_id,
            revision_number: 1,
            content_markdown: input.prd_markdown,
            source: "development_mode".to_owned(),
            created_at: input.created_at,
        },
    })
}

#[tauri::command]
pub async fn list_projects(app: AppHandle) -> Result<Vec<ProjectWithPrd>, String> {
    let mut connection = open_database(&app).await?;
    list_projects_in_connection(&mut connection).await
}

async fn list_projects_in_connection(
    connection: &mut SqliteConnection,
) -> Result<Vec<ProjectWithPrd>, String> {
    let rows = sqlx::query(
        "SELECT p.id AS project_id, p.name, p.idea, p.project_type, p.project_subtype, p.created_at AS project_created_at, p.updated_at, r.id AS revision_id, r.document_id, r.revision_number, r.content_markdown, r.source, r.created_at AS revision_created_at FROM projects p JOIN documents d ON d.project_id = p.id AND d.document_type = 'prd' JOIN document_revisions r ON r.id = d.current_revision_id ORDER BY p.updated_at DESC",
    )
    .fetch_all(connection)
    .await
    .map_err(|error| format!("프로젝트 목록을 불러오지 못했습니다: {error}"))?;

    rows.into_iter()
        .map(|row| {
            Ok(ProjectWithPrd {
                project: Project {
                    id: row.try_get("project_id").map_err(database_read_error)?,
                    name: row.try_get("name").map_err(database_read_error)?,
                    idea: row.try_get("idea").map_err(database_read_error)?,
                    project_type: row.try_get("project_type").map_err(database_read_error)?,
                    project_subtype: row
                        .try_get("project_subtype")
                        .map_err(database_read_error)?,
                    created_at: row
                        .try_get("project_created_at")
                        .map_err(database_read_error)?,
                    updated_at: row.try_get("updated_at").map_err(database_read_error)?,
                },
                prd: PrdRevision {
                    id: row.try_get("revision_id").map_err(database_read_error)?,
                    document_id: row.try_get("document_id").map_err(database_read_error)?,
                    revision_number: row
                        .try_get("revision_number")
                        .map_err(database_read_error)?,
                    content_markdown: row
                        .try_get("content_markdown")
                        .map_err(database_read_error)?,
                    source: row.try_get("source").map_err(database_read_error)?,
                    created_at: row
                        .try_get("revision_created_at")
                        .map_err(database_read_error)?,
                },
            })
        })
        .collect()
}

fn database_read_error(error: sqlx::Error) -> String {
    format!("저장된 프로젝트 데이터를 읽지 못했습니다: {error}")
}

#[tauri::command]
pub async fn save_prd_revision(
    app: AppHandle,
    input: SavePrdRevisionInput,
) -> Result<PrdRevision, String> {
    let mut connection = open_database(&app).await?;
    save_prd_revision_in_connection(&mut connection, input).await
}

async fn save_prd_revision_in_connection(
    connection: &mut SqliteConnection,
    input: SavePrdRevisionInput,
) -> Result<PrdRevision, String> {
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("PRD 저장 트랜잭션을 시작하지 못했습니다: {error}"))?;
    let current_revision_number: Option<i64> = sqlx::query_scalar(
        "SELECT r.revision_number FROM documents d JOIN document_revisions r ON r.id = d.current_revision_id WHERE d.id = ? AND d.document_type = 'prd'",
    )
    .bind(&input.document_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("현재 PRD 리비전을 확인하지 못했습니다: {error}"))?;

    if current_revision_number != Some(input.expected_revision_number) {
        return Err("PRD가 다른 리비전으로 변경됐습니다. 최신 내용을 다시 열어 주세요.".to_owned());
    }

    let revision_number = input.expected_revision_number + 1;
    sqlx::query(
        "INSERT INTO document_revisions (id, document_id, revision_number, content_markdown, content_json, source, created_at) VALUES (?, ?, ?, ?, NULL, 'user', ?)",
    )
    .bind(&input.revision_id)
    .bind(&input.document_id)
    .bind(revision_number)
    .bind(&input.content_markdown)
    .bind(&input.created_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("새 PRD 리비전을 저장하지 못했습니다: {error}"))?;

    let update_result = sqlx::query(
        "UPDATE documents SET current_revision_id = ?, updated_at = ? WHERE id = ? AND current_revision_id IN (SELECT id FROM document_revisions WHERE document_id = ? AND revision_number = ?)",
    )
    .bind(&input.revision_id)
    .bind(&input.created_at)
    .bind(&input.document_id)
    .bind(&input.document_id)
    .bind(input.expected_revision_number)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("현재 PRD 리비전을 갱신하지 못했습니다: {error}"))?;
    if update_result.rows_affected() != 1 {
        return Err("PRD가 저장 중 변경됐습니다. 최신 내용을 다시 열어 주세요.".to_owned());
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("PRD 저장을 확정하지 못했습니다: {error}"))?;

    Ok(PrdRevision {
        id: input.revision_id,
        document_id: input.document_id,
        revision_number,
        content_markdown: input.content_markdown,
        source: "user".to_owned(),
        created_at: input.created_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saves_and_reopens_project_with_current_prd_revision() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:")
                .await
                .expect("메모리 SQLite 연결에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0001_initial.sql"))
                .execute(&mut connection)
                .await
                .expect("운영 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0009_project_types.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 유형 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0010_project_subtypes.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 세부 유형 마이그레이션 적용에 실패했습니다.");

            let saved = save_project_with_initial_prd_in_connection(
                &mut connection,
                SaveProjectWithPrdInput {
                    project_id: "project-1".to_owned(),
                    project_name: "Globeat".to_owned(),
                    idea: "음악으로 도시를 탐색한다.".to_owned(),
                    project_type: "web".to_owned(),
                    project_subtype: None,
                    document_id: "document-1".to_owned(),
                    revision_id: "revision-1".to_owned(),
                    prd_title: "Globeat PRD".to_owned(),
                    prd_markdown: "# Globeat PRD".to_owned(),
                    created_at: "2026-07-10T00:00:00.000Z".to_owned(),
                },
            )
            .await
            .expect("프로젝트 저장에 실패했습니다.");

            let reopened = list_projects_in_connection(&mut connection)
                .await
                .expect("프로젝트 재조회에 실패했습니다.");

            assert_eq!(saved.project.id, "project-1");
            assert_eq!(reopened.len(), 1);
            assert_eq!(reopened[0].project.name, "Globeat");
            assert_eq!(reopened[0].prd.id, "revision-1");
            assert_eq!(reopened[0].prd.revision_number, 1);
            assert_eq!(reopened[0].prd.content_markdown, "# Globeat PRD");
        });
    }

    #[test]
    fn rolls_back_all_records_when_prd_document_conflicts() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:")
                .await
                .expect("메모리 SQLite 연결에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0001_initial.sql"))
                .execute(&mut connection)
                .await
                .expect("운영 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0009_project_types.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 유형 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0010_project_subtypes.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 세부 유형 마이그레이션 적용에 실패했습니다.");

            let input = SaveProjectWithPrdInput {
                project_id: "project-1".to_owned(),
                project_name: "Globeat".to_owned(),
                idea: "음악으로 도시를 탐색한다.".to_owned(),
                project_type: "web".to_owned(),
                project_subtype: None,
                document_id: "document-1".to_owned(),
                revision_id: "revision-1".to_owned(),
                prd_title: "Globeat PRD".to_owned(),
                prd_markdown: "# Globeat PRD".to_owned(),
                created_at: "2026-07-10T00:00:00.000Z".to_owned(),
            };
            save_project_with_initial_prd_in_connection(&mut connection, input)
                .await
                .expect("첫 프로젝트 저장에 실패했습니다.");

            let conflicting_input = SaveProjectWithPrdInput {
                project_id: "project-2".to_owned(),
                project_name: "Second".to_owned(),
                idea: "두 번째 아이디어".to_owned(),
                project_type: "desktop".to_owned(),
                project_subtype: None,
                document_id: "document-1".to_owned(),
                revision_id: "revision-2".to_owned(),
                prd_title: "Second PRD".to_owned(),
                prd_markdown: "# Second PRD".to_owned(),
                created_at: "2026-07-10T01:00:00.000Z".to_owned(),
            };
            assert!(save_project_with_initial_prd_in_connection(
                &mut connection,
                conflicting_input
            )
            .await
            .is_err());

            let project_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects")
                .fetch_one(&mut connection)
                .await
                .expect("프로젝트 수 조회에 실패했습니다.");
            assert_eq!(project_count, 1);
        });
    }

    #[test]
    fn adds_an_immutable_prd_revision_and_rejects_stale_edits() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:")
                .await
                .expect("메모리 SQLite 연결에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0001_initial.sql"))
                .execute(&mut connection)
                .await
                .expect("운영 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0009_project_types.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 유형 마이그레이션 적용에 실패했습니다.");
            sqlx::raw_sql(include_str!("../migrations/0010_project_subtypes.sql"))
                .execute(&mut connection)
                .await
                .expect("프로젝트 세부 유형 마이그레이션 적용에 실패했습니다.");
            save_project_with_initial_prd_in_connection(
                &mut connection,
                SaveProjectWithPrdInput {
                    project_id: "project-1".to_owned(),
                    project_name: "Globeat".to_owned(),
                    idea: "음악으로 도시를 탐색한다.".to_owned(),
                    project_type: "web".to_owned(),
                    project_subtype: None,
                    document_id: "document-1".to_owned(),
                    revision_id: "revision-1".to_owned(),
                    prd_title: "Globeat PRD".to_owned(),
                    prd_markdown: "# 초안".to_owned(),
                    created_at: "2026-07-10T00:00:00.000Z".to_owned(),
                },
            )
            .await
            .expect("초기 PRD 저장에 실패했습니다.");

            let revision = save_prd_revision_in_connection(
                &mut connection,
                SavePrdRevisionInput {
                    document_id: "document-1".to_owned(),
                    revision_id: "revision-2".to_owned(),
                    expected_revision_number: 1,
                    content_markdown: "# 수정본".to_owned(),
                    created_at: "2026-07-10T01:00:00.000Z".to_owned(),
                },
            )
            .await
            .expect("PRD 새 리비전 저장에 실패했습니다.");
            assert_eq!(revision.revision_number, 2);

            let stale_result = save_prd_revision_in_connection(
                &mut connection,
                SavePrdRevisionInput {
                    document_id: "document-1".to_owned(),
                    revision_id: "revision-stale".to_owned(),
                    expected_revision_number: 1,
                    content_markdown: "# 오래된 수정".to_owned(),
                    created_at: "2026-07-10T02:00:00.000Z".to_owned(),
                },
            )
            .await;
            assert!(stale_result.is_err());

            let revisions: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM document_revisions WHERE document_id = 'document-1'",
            )
            .fetch_one(&mut connection)
            .await
            .expect("리비전 수 조회에 실패했습니다.");
            assert_eq!(revisions, 2);
        });
    }
}
