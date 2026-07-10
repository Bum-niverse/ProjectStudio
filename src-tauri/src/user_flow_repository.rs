use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserFlowNode {
    id: String,
    project_id: String,
    lane_id: String,
    title: String,
    description: String,
    kind: String,
    position_x: f64,
    position_y: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserFlowEdge {
    id: String,
    project_id: String,
    source_node_id: String,
    target_node_id: String,
}
#[derive(Serialize)]
pub struct UserFlowSpec {
    nodes: Vec<UserFlowNode>,
    edges: Vec<UserFlowEdge>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeInput {
    project_id: String,
    nodes: Vec<UserFlowNode>,
    edges: Vec<UserFlowEdge>,
    created_at: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodeInput {
    node: UserFlowNode,
    updated_at: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectInput {
    id: String,
    project_id: String,
    source_node_id: String,
    target_node_id: String,
    created_at: String,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("projectstudio.db"))
        .map_err(|error| error.to_string())
}
async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(database_path(app)?)
        .foreign_keys(true);
    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| error.to_string())
}
fn valid_kind(kind: &str) -> bool {
    matches!(kind, "phase" | "screen" | "action" | "result" | "decision")
}

async fn list_spec(
    connection: &mut SqliteConnection,
    project_id: &str,
) -> Result<UserFlowSpec, String> {
    let node_rows=sqlx::query("SELECT id, project_id, lane_id, title, description, kind, position_x, position_y FROM user_flow_nodes WHERE project_id = ? ORDER BY position_y, position_x").bind(project_id).fetch_all(&mut *connection).await.map_err(|error|error.to_string())?;
    let nodes = node_rows
        .into_iter()
        .map(|row| {
            Ok(UserFlowNode {
                id: row.try_get("id").map_err(|error| error.to_string())?,
                project_id: row
                    .try_get("project_id")
                    .map_err(|error| error.to_string())?,
                lane_id: row.try_get("lane_id").map_err(|error| error.to_string())?,
                title: row.try_get("title").map_err(|error| error.to_string())?,
                description: row
                    .try_get("description")
                    .map_err(|error| error.to_string())?,
                kind: row.try_get("kind").map_err(|error| error.to_string())?,
                position_x: row
                    .try_get("position_x")
                    .map_err(|error| error.to_string())?,
                position_y: row
                    .try_get("position_y")
                    .map_err(|error| error.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let edge_rows=sqlx::query("SELECT id, project_id, source_node_id, target_node_id FROM user_flow_edges WHERE project_id = ?").bind(project_id).fetch_all(&mut *connection).await.map_err(|error|error.to_string())?;
    let edges = edge_rows
        .into_iter()
        .map(|row| {
            Ok(UserFlowEdge {
                id: row.try_get("id").map_err(|error| error.to_string())?,
                project_id: row
                    .try_get("project_id")
                    .map_err(|error| error.to_string())?,
                source_node_id: row
                    .try_get("source_node_id")
                    .map_err(|error| error.to_string())?,
                target_node_id: row
                    .try_get("target_node_id")
                    .map_err(|error| error.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(UserFlowSpec { nodes, edges })
}

#[tauri::command]
pub async fn initialize_user_flow(
    app: AppHandle,
    input: InitializeInput,
) -> Result<UserFlowSpec, String> {
    let mut connection = open_database(&app).await?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    for node in &input.nodes {
        if !valid_kind(&node.kind) || node.project_id != input.project_id {
            return Err("유효하지 않은 유저플로우 노드입니다.".to_owned());
        }
        sqlx::query("INSERT OR IGNORE INTO user_flow_nodes (id, project_id, lane_id, title, description, kind, position_x, position_y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(&node.id).bind(&input.project_id).bind(&node.lane_id).bind(&node.title).bind(&node.description).bind(&node.kind).bind(node.position_x).bind(node.position_y).bind(&input.created_at).bind(&input.created_at).execute(&mut *transaction).await.map_err(|error|format!("유저플로우 노드를 저장하지 못했습니다: {error}"))?;
    }
    for edge in &input.edges {
        sqlx::query("INSERT OR IGNORE INTO user_flow_edges (id, project_id, source_node_id, target_node_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(&edge.id).bind(&input.project_id).bind(&edge.source_node_id).bind(&edge.target_node_id).bind(&input.created_at).execute(&mut *transaction).await.map_err(|error|format!("유저플로우 연결을 저장하지 못했습니다: {error}"))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    list_spec(&mut connection, &input.project_id).await
}

#[tauri::command]
pub async fn update_user_flow_node(
    app: AppHandle,
    input: UpdateNodeInput,
) -> Result<UserFlowNode, String> {
    if input.node.title.trim().is_empty() || !valid_kind(&input.node.kind) {
        return Err("노드 이름과 종류를 확인해 주세요.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    let result=sqlx::query("UPDATE user_flow_nodes SET title=?, description=?, kind=?, position_x=?, position_y=?, updated_at=? WHERE id=? AND project_id=?").bind(input.node.title.trim()).bind(&input.node.description).bind(&input.node.kind).bind(input.node.position_x).bind(input.node.position_y).bind(&input.updated_at).bind(&input.node.id).bind(&input.node.project_id).execute(&mut connection).await.map_err(|error|error.to_string())?;
    if result.rows_affected() != 1 {
        return Err("저장할 유저플로우 노드를 찾지 못했습니다.".to_owned());
    }
    Ok(input.node)
}

#[tauri::command]
pub async fn connect_user_flow_nodes(
    app: AppHandle,
    input: ConnectInput,
) -> Result<UserFlowEdge, String> {
    if input.source_node_id == input.target_node_id {
        return Err("노드를 자기 자신과 연결할 수 없습니다.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_flow_nodes WHERE project_id=? AND id IN (?, ?)",
    )
    .bind(&input.project_id)
    .bind(&input.source_node_id)
    .bind(&input.target_node_id)
    .fetch_one(&mut connection)
    .await
    .map_err(|error| error.to_string())?;
    if count != 2 {
        return Err("같은 프로젝트의 노드끼리만 연결할 수 있습니다.".to_owned());
    }
    sqlx::query("INSERT INTO user_flow_edges (id, project_id, source_node_id, target_node_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(&input.id).bind(&input.project_id).bind(&input.source_node_id).bind(&input.target_node_id).bind(&input.created_at).execute(&mut connection).await.map_err(|error|format!("유저플로우를 연결하지 못했습니다: {error}"))?;
    Ok(UserFlowEdge {
        id: input.id,
        project_id: input.project_id,
        source_node_id: input.source_node_id,
        target_node_id: input.target_node_id,
    })
}
