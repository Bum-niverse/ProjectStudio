use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframePage {
    id: String,
    source_node_id: String,
    title: String,
    description: String,
    device: String,
    provider: String,
    blocks: Vec<WireframeBlock>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WireframeBlock {
    kind: String,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWireframesInput {
    project_id: String,
    pages: Vec<WireframePage>,
    updated_at: String,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("projectstudio.db"))
        .map_err(|error| error.to_string())
}

async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    SqliteConnection::connect_with(
        &sqlx::sqlite::SqliteConnectOptions::new()
            .filename(database_path(app)?)
            .foreign_keys(true),
    )
    .await
    .map_err(|error| error.to_string())
}

fn validate_page(page: &WireframePage) -> Result<(), String> {
    if page.id.trim().is_empty()
        || page.source_node_id.trim().is_empty()
        || page.title.trim().is_empty()
        || !matches!(page.device.as_str(), "desktop" | "mobile")
        || !matches!(
            page.provider.as_str(),
            "preview" | "codex" | "claude" | "antigravity" | "local-llm"
        )
        || page.blocks.len() > 100
    {
        return Err("와이어프레임 페이지 형식이 올바르지 않습니다.".to_owned());
    }
    for block in &page.blocks {
        if !matches!(
            block.kind.as_str(),
            "navigation" | "hero" | "search" | "form" | "cards" | "list" | "detail" | "actions"
        ) || block.label.trim().is_empty()
            || ![block.x, block.y, block.width, block.height]
                .into_iter()
                .all(f64::is_finite)
            || block.x < 0.0
            || block.y < 0.0
            || block.width <= 0.0
            || block.height <= 0.0
            || block.x + block.width > 2_000.0
            || block.y + block.height > 2_000.0
        {
            return Err("와이어프레임 블록 좌표와 종류를 확인해 주세요.".to_owned());
        }
    }
    Ok(())
}

async fn project_exists(
    connection: &mut SqliteConnection,
    project_id: &str,
) -> Result<bool, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_one(connection)
        .await
        .map_err(|error| error.to_string())?;
    Ok(count == 1)
}

#[tauri::command]
pub async fn list_wireframe_pages(
    app: AppHandle,
    project_id: String,
) -> Result<Vec<WireframePage>, String> {
    let mut connection = open_database(&app).await?;
    if !project_exists(&mut connection, &project_id).await? {
        return Err("와이어프레임을 조회할 프로젝트를 찾지 못했습니다.".to_owned());
    }
    let rows = sqlx::query(
        "SELECT snapshot_json FROM wireframe_pages WHERE project_id = ? ORDER BY updated_at, id",
    )
    .bind(project_id)
    .fetch_all(&mut connection)
    .await
    .map_err(|error| format!("와이어프레임을 불러오지 못했습니다: {error}"))?;
    rows.into_iter()
        .map(|row| {
            let json: String = row
                .try_get("snapshot_json")
                .map_err(|error| error.to_string())?;
            serde_json::from_str(&json).map_err(|error| error.to_string())
        })
        .collect()
}

#[tauri::command]
pub async fn save_wireframe_pages(
    app: AppHandle,
    input: SaveWireframesInput,
) -> Result<Vec<WireframePage>, String> {
    if input.pages.is_empty() {
        return Err("저장할 와이어프레임 페이지가 없습니다.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    if !project_exists(&mut connection, &input.project_id).await? {
        return Err("와이어프레임을 저장할 프로젝트를 찾지 못했습니다.".to_owned());
    }
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    for page in &input.pages {
        validate_page(page)?;
        let snapshot = serde_json::to_string(page).map_err(|error| error.to_string())?;
        sqlx::query("INSERT INTO wireframe_pages (id, project_id, source_node_id, title, snapshot_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(project_id, source_node_id) DO UPDATE SET id=excluded.id, title=excluded.title, snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at")
            .bind(&page.id)
            .bind(&input.project_id)
            .bind(&page.source_node_id)
            .bind(page.title.trim())
            .bind(snapshot)
            .bind(&input.updated_at)
            .bind(&input.updated_at)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("와이어프레임을 저장하지 못했습니다: {error}"))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    list_wireframe_pages(app, input.project_id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page() -> WireframePage {
        WireframePage {
            id: "wireframe-screen-1".to_owned(),
            source_node_id: "screen-1".to_owned(),
            title: "장소 탐색".to_owned(),
            description: "장소를 탐색한다.".to_owned(),
            device: "desktop".to_owned(),
            provider: "preview".to_owned(),
            blocks: vec![WireframeBlock {
                kind: "navigation".to_owned(),
                label: "상단 탐색".to_owned(),
                x: 0.0,
                y: 0.0,
                width: 1_440.0,
                height: 70.0,
            }],
        }
    }

    #[test]
    fn validates_supported_wireframe_page() {
        assert!(validate_page(&page()).is_ok());
    }

    #[test]
    fn rejects_unsupported_device_and_empty_title() {
        let mut invalid = page();
        invalid.device = "watch".to_owned();
        invalid.title = " ".to_owned();
        assert!(validate_page(&invalid).is_err());
    }

    #[test]
    fn rejects_out_of_canvas_blocks() {
        let mut invalid = page();
        invalid.blocks[0].width = 2_100.0;
        assert!(validate_page(&invalid).is_err());
    }
}
