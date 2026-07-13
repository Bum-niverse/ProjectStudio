use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "projectstudio.db";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeInput {
    project_id: String,
    revision_id: String,
    content_json: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveInput {
    project_id: String,
    revision_id: String,
    expected_revision_number: i64,
    content_json: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataDesignRevision {
    id: String,
    project_id: String,
    revision_number: i64,
    content_json: String,
    created_at: String,
}

async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("앱 데이터 경로를 확인하지 못했습니다: {error}"))?;
    std::fs::create_dir_all(&directory)
        .map_err(|error| format!("앱 데이터 폴더를 만들지 못했습니다: {error}"))?;
    SqliteConnection::connect_with(
        &sqlx::sqlite::SqliteConnectOptions::new()
            .filename(directory.join(DATABASE_FILE_NAME))
            .create_if_missing(true)
            .foreign_keys(true),
    )
    .await
    .map_err(|error| format!("로컬 데이터베이스를 열지 못했습니다: {error}"))
}

fn row_to_revision(row: &sqlx::sqlite::SqliteRow) -> Result<DataDesignRevision, String> {
    Ok(DataDesignRevision {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        project_id: row.try_get("project_id").map_err(|e| e.to_string())?,
        revision_number: row.try_get("revision_number").map_err(|e| e.to_string())?,
        content_json: row.try_get("content_json").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
pub async fn initialize_data_design(
    app: AppHandle,
    input: InitializeInput,
) -> Result<DataDesignRevision, String> {
    let mut connection = open_database(&app).await?;
    if let Some(row) = sqlx::query("SELECT r.id, r.project_id, r.revision_number, r.content_json, r.created_at FROM data_designs d JOIN data_design_revisions r ON r.id = d.current_revision_id WHERE d.project_id = ?").bind(&input.project_id).fetch_optional(&mut connection).await.map_err(|e| e.to_string())? { return row_to_revision(&row); }
    let mut tx = connection.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO data_designs (project_id, current_revision_id, created_at, updated_at) VALUES (?, NULL, ?, ?)").bind(&input.project_id).bind(&input.created_at).bind(&input.created_at).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO data_design_revisions (id, project_id, revision_number, content_json, source, created_at) VALUES (?, ?, 1, ?, 'rule', ?)").bind(&input.revision_id).bind(&input.project_id).bind(&input.content_json).bind(&input.created_at).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("UPDATE data_designs SET current_revision_id = ? WHERE project_id = ?")
        .bind(&input.revision_id)
        .bind(&input.project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(DataDesignRevision {
        id: input.revision_id,
        project_id: input.project_id,
        revision_number: 1,
        content_json: input.content_json,
        created_at: input.created_at,
    })
}

#[tauri::command]
pub async fn save_data_design_revision(
    app: AppHandle,
    input: SaveInput,
) -> Result<DataDesignRevision, String> {
    let mut connection = open_database(&app).await?;
    let current: i64 = sqlx::query_scalar("SELECT r.revision_number FROM data_designs d JOIN data_design_revisions r ON r.id = d.current_revision_id WHERE d.project_id = ?").bind(&input.project_id).fetch_one(&mut connection).await.map_err(|e| e.to_string())?;
    if current != input.expected_revision_number {
        return Err("데이터 설계가 다른 리비전으로 변경됐습니다.".to_owned());
    }
    let next = current + 1;
    let mut tx = connection.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO data_design_revisions (id, project_id, revision_number, content_json, source, created_at) VALUES (?, ?, ?, ?, 'user', ?)").bind(&input.revision_id).bind(&input.project_id).bind(next).bind(&input.content_json).bind(&input.created_at).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query(
        "UPDATE data_designs SET current_revision_id = ?, updated_at = ? WHERE project_id = ?",
    )
    .bind(&input.revision_id)
    .bind(&input.created_at)
    .bind(&input.project_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(DataDesignRevision {
        id: input.revision_id,
        project_id: input.project_id,
        revision_number: next,
        content_json: input.content_json,
        created_at: input.created_at,
    })
}
