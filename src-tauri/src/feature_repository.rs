use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureSpec {
    id: String,
    parent_id: Option<String>,
    title: String,
    description: String,
    status: String,
    priority: String,
    role: String,
    sort_order: i64,
    acceptance_criteria: Vec<AcceptanceCriterion>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptanceCriterion {
    id: String,
    description: String,
    is_met: bool,
    sort_order: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeFeatureSpecInput {
    project_id: String,
    source_document_id: String,
    features: Vec<FeatureSpec>,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFeaturePositionInput {
    feature_id: String,
    view_mode: String,
    position_x: f64,
    position_y: f64,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFeatureInput {
    project_id: String,
    feature: FeatureSpec,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeaturePosition {
    feature_id: String,
    view_mode: String,
    position_x: f64,
    position_y: f64,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("projectstudio.db"))
        .map_err(|error| format!("앱 데이터 경로를 확인하지 못했습니다: {error}"))
}

async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(database_path(app)?)
        .foreign_keys(true);
    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| format!("기능명세 데이터베이스를 열지 못했습니다: {error}"))
}

#[tauri::command]
pub async fn initialize_feature_spec(
    app: AppHandle,
    input: InitializeFeatureSpecInput,
) -> Result<Vec<FeatureSpec>, String> {
    let mut connection = open_database(&app).await?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    for feature in &input.features {
        sqlx::query("INSERT OR IGNORE INTO features (id, project_id, parent_feature_id, source_document_id, title, description, status, priority, role, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&feature.id).bind(&input.project_id).bind(&feature.parent_id)
            .bind(&input.source_document_id).bind(&feature.title).bind(&feature.description)
            .bind(&feature.status).bind(&feature.priority).bind(&feature.role)
            .bind(feature.sort_order).bind(&input.created_at).bind(&input.created_at)
            .execute(&mut *transaction).await
            .map_err(|error| format!("기능명세를 저장하지 못했습니다: {error}"))?;
    }
    for feature in &input.features {
        for criterion in &feature.acceptance_criteria {
            sqlx::query("INSERT OR IGNORE INTO acceptance_criteria (id, feature_id, description, is_met, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(&criterion.id).bind(&feature.id).bind(&criterion.description).bind(criterion.is_met)
                .bind(criterion.sort_order).bind(&input.created_at).bind(&input.created_at)
                .execute(&mut *transaction).await.map_err(|error| format!("수용 기준을 저장하지 못했습니다: {error}"))?;
        }
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    list_features(&mut connection, &input.project_id).await
}

async fn list_features(
    connection: &mut SqliteConnection,
    project_id: &str,
) -> Result<Vec<FeatureSpec>, String> {
    let rows = sqlx::query("SELECT id, parent_feature_id, title, description, status, priority, role, sort_order FROM features WHERE project_id = ? ORDER BY sort_order")
        .bind(project_id).fetch_all(&mut *connection).await.map_err(|error| error.to_string())?;
    let mut features = Vec::new();
    for row in rows {
        let feature_id: String = row.try_get("id").map_err(|error| error.to_string())?;
        let criteria_rows = sqlx::query("SELECT id, description, is_met, sort_order FROM acceptance_criteria WHERE feature_id = ? ORDER BY sort_order")
                .bind(&feature_id).fetch_all(&mut *connection).await.map_err(|error| error.to_string())?;
        let acceptance_criteria = criteria_rows
            .into_iter()
            .map(|criterion| {
                Ok(AcceptanceCriterion {
                    id: criterion.try_get("id").map_err(|error| error.to_string())?,
                    description: criterion
                        .try_get("description")
                        .map_err(|error| error.to_string())?,
                    is_met: criterion
                        .try_get::<i64, _>("is_met")
                        .map_err(|error| error.to_string())?
                        != 0,
                    sort_order: criterion
                        .try_get("sort_order")
                        .map_err(|error| error.to_string())?,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        features.push(FeatureSpec {
            id: feature_id,
            parent_id: row
                .try_get("parent_feature_id")
                .map_err(|error| error.to_string())?,
            title: row.try_get("title").map_err(|error| error.to_string())?,
            description: row
                .try_get("description")
                .map_err(|error| error.to_string())?,
            status: row.try_get("status").map_err(|error| error.to_string())?,
            priority: row.try_get("priority").map_err(|error| error.to_string())?,
            role: row.try_get("role").map_err(|error| error.to_string())?,
            sort_order: row
                .try_get("sort_order")
                .map_err(|error| error.to_string())?,
            acceptance_criteria,
        });
    }
    Ok(features)
}

#[tauri::command]
pub async fn update_feature(
    app: AppHandle,
    input: UpdateFeatureInput,
) -> Result<FeatureSpec, String> {
    let mut connection = open_database(&app).await?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    let result = sqlx::query("UPDATE features SET title = ?, description = ?, status = ?, priority = ?, role = ?, updated_at = ? WHERE id = ? AND project_id = ?")
        .bind(&input.feature.title).bind(&input.feature.description).bind(&input.feature.status)
        .bind(&input.feature.priority).bind(&input.feature.role).bind(&input.updated_at)
        .bind(&input.feature.id).bind(&input.project_id).execute(&mut *transaction).await
        .map_err(|error| format!("기능 문서를 저장하지 못했습니다: {error}"))?;
    if result.rows_affected() != 1 {
        return Err("저장할 기능 문서를 찾지 못했습니다.".to_owned());
    }
    sqlx::query("DELETE FROM acceptance_criteria WHERE feature_id = ?")
        .bind(&input.feature.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    for criterion in &input.feature.acceptance_criteria {
        sqlx::query("INSERT INTO acceptance_criteria (id, feature_id, description, is_met, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&criterion.id).bind(&input.feature.id).bind(&criterion.description).bind(criterion.is_met)
            .bind(criterion.sort_order).bind(&input.updated_at).bind(&input.updated_at)
            .execute(&mut *transaction).await.map_err(|error| format!("수용 기준을 저장하지 못했습니다: {error}"))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    Ok(input.feature)
}

#[tauri::command]
pub async fn save_feature_position(
    app: AppHandle,
    input: SaveFeaturePositionInput,
) -> Result<(), String> {
    if input.view_mode != "tree" && input.view_mode != "mindmap" {
        return Err("지원하지 않는 기능명세 보기입니다.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    sqlx::query("INSERT INTO feature_view_positions (feature_id, view_mode, position_x, position_y, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(feature_id, view_mode) DO UPDATE SET position_x = excluded.position_x, position_y = excluded.position_y, updated_at = excluded.updated_at")
        .bind(input.feature_id).bind(input.view_mode).bind(input.position_x).bind(input.position_y).bind(input.updated_at)
        .execute(&mut connection).await.map_err(|error| format!("노드 위치를 저장하지 못했습니다: {error}"))?;
    Ok(())
}

#[tauri::command]
pub async fn list_feature_positions(
    app: AppHandle,
    project_id: String,
) -> Result<Vec<FeaturePosition>, String> {
    let mut connection = open_database(&app).await?;
    let rows = sqlx::query("SELECT p.feature_id, p.view_mode, p.position_x, p.position_y FROM feature_view_positions p JOIN features f ON f.id = p.feature_id WHERE f.project_id = ?")
        .bind(project_id).fetch_all(&mut connection).await.map_err(|error| format!("노드 위치를 불러오지 못했습니다: {error}"))?;
    rows.into_iter()
        .map(|row| {
            Ok(FeaturePosition {
                feature_id: row
                    .try_get("feature_id")
                    .map_err(|error| error.to_string())?,
                view_mode: row
                    .try_get("view_mode")
                    .map_err(|error| error.to_string())?,
                position_x: row
                    .try_get("position_x")
                    .map_err(|error| error.to_string())?,
                position_y: row
                    .try_get("position_y")
                    .map_err(|error| error.to_string())?,
            })
        })
        .collect()
}
