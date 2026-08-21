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
    #[serde(default)]
    color_key: Option<String>,
    #[serde(default)]
    depth: Option<i64>,
    #[serde(default)]
    parent_id: Option<String>,
    #[serde(default)]
    linked_feature_ids: Vec<String>,
    #[serde(default)]
    branch_condition: Option<String>,
    #[serde(default)]
    input_artifacts: Vec<String>,
    #[serde(default)]
    output_artifacts: Vec<String>,
    #[serde(default)]
    methods: Vec<String>,
    #[serde(default)]
    validation: Option<String>,
    #[serde(default)]
    failure_handling: Option<String>,
    #[serde(default)]
    code_paths: Vec<String>,
    #[serde(default)]
    test_paths: Vec<String>,
    #[serde(default)]
    completion_criteria: Option<String>,
    #[serde(default)]
    is_completed: bool,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct ExecutionMetadata {
    input_artifacts: Vec<String>,
    output_artifacts: Vec<String>,
    methods: Vec<String>,
    validation: Option<String>,
    failure_handling: Option<String>,
    code_paths: Vec<String>,
    test_paths: Vec<String>,
    completion_criteria: Option<String>,
    #[serde(default)]
    is_completed: bool,
}
fn metadata(node: &UserFlowNode) -> Result<String, String> {
    serde_json::to_string(&ExecutionMetadata {
        input_artifacts: node.input_artifacts.clone(),
        output_artifacts: node.output_artifacts.clone(),
        methods: node.methods.clone(),
        validation: node.validation.clone(),
        failure_handling: node.failure_handling.clone(),
        code_paths: node.code_paths.clone(),
        test_paths: node.test_paths.clone(),
        completion_criteria: node.completion_criteria.clone(),
        is_completed: node.is_completed,
    })
    .map_err(|error| error.to_string())
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
    #[serde(default)]
    replace_existing: bool,
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
    let node_rows=sqlx::query("SELECT id, project_id, lane_id, title, description, kind, position_x, position_y, color_key, depth, parent_id, linked_feature_ids, branch_condition, metadata_json FROM user_flow_nodes WHERE project_id = ? ORDER BY position_y, position_x").bind(project_id).fetch_all(&mut *connection).await.map_err(|error|error.to_string())?;
    let nodes = node_rows
        .into_iter()
        .map(|row| {
            let execution: ExecutionMetadata = serde_json::from_str(
                &row.try_get::<String, _>("metadata_json")
                    .map_err(|error| error.to_string())?,
            )
            .unwrap_or_default();
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
                color_key: Some(
                    row.try_get("color_key")
                        .map_err(|error| error.to_string())?,
                ),
                depth: row.try_get("depth").map_err(|error| error.to_string())?,
                parent_id: row
                    .try_get("parent_id")
                    .map_err(|error| error.to_string())?,
                linked_feature_ids: serde_json::from_str(
                    &row.try_get::<String, _>("linked_feature_ids")
                        .map_err(|error| error.to_string())?,
                )
                .unwrap_or_default(),
                branch_condition: row
                    .try_get("branch_condition")
                    .map_err(|error| error.to_string())?,
                input_artifacts: execution.input_artifacts,
                output_artifacts: execution.output_artifacts,
                methods: execution.methods,
                validation: execution.validation,
                failure_handling: execution.failure_handling,
                code_paths: execution.code_paths,
                test_paths: execution.test_paths,
                completion_criteria: execution.completion_criteria,
                is_completed: execution.is_completed,
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
    if input.replace_existing {
        sqlx::query("DELETE FROM user_flow_edges WHERE project_id = ?")
            .bind(&input.project_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("기존 유저플로우 연결을 정리하지 못했습니다: {error}"))?;
        sqlx::query("DELETE FROM user_flow_nodes WHERE project_id = ?")
            .bind(&input.project_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("기존 유저플로우 단계를 정리하지 못했습니다: {error}"))?;
    }
    for node in &input.nodes {
        if !valid_kind(&node.kind) || node.project_id != input.project_id {
            return Err("유효하지 않은 유저플로우 노드입니다.".to_owned());
        }
        sqlx::query("INSERT OR IGNORE INTO user_flow_nodes (id, project_id, lane_id, title, description, kind, position_x, position_y, created_at, updated_at, color_key, depth, parent_id, linked_feature_ids, branch_condition, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(&node.id).bind(&input.project_id).bind(&node.lane_id).bind(&node.title).bind(&node.description).bind(&node.kind).bind(node.position_x).bind(node.position_y).bind(&input.created_at).bind(&input.created_at).bind(node.color_key.as_deref().unwrap_or("violet")).bind(node.depth).bind(&node.parent_id).bind(serde_json::to_string(&node.linked_feature_ids).map_err(|error|error.to_string())?).bind(&node.branch_condition).bind(metadata(node)?).execute(&mut *transaction).await.map_err(|error|format!("유저플로우 노드를 저장하지 못했습니다: {error}"))?;
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
    let result=sqlx::query("UPDATE user_flow_nodes SET lane_id=?, title=?, description=?, kind=?, position_x=?, position_y=?, color_key=?, depth=?, parent_id=?, linked_feature_ids=?, branch_condition=?, metadata_json=?, updated_at=? WHERE id=? AND project_id=?").bind(&input.node.lane_id).bind(input.node.title.trim()).bind(&input.node.description).bind(&input.node.kind).bind(input.node.position_x).bind(input.node.position_y).bind(input.node.color_key.as_deref().unwrap_or("violet")).bind(input.node.depth).bind(&input.node.parent_id).bind(serde_json::to_string(&input.node.linked_feature_ids).map_err(|error|error.to_string())?).bind(&input.node.branch_condition).bind(metadata(&input.node)?).bind(&input.updated_at).bind(&input.node.id).bind(&input.node.project_id).execute(&mut connection).await.map_err(|error|error.to_string())?;
    if result.rows_affected() != 1 {
        return Err("저장할 유저플로우 노드를 찾지 못했습니다.".to_owned());
    }
    Ok(input.node)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeInput {
    node: UserFlowNode,
    created_at: String,
}

#[tauri::command]
pub async fn create_user_flow_node(
    app: AppHandle,
    input: CreateNodeInput,
) -> Result<UserFlowNode, String> {
    if input.node.title.trim().is_empty() || !valid_kind(&input.node.kind) {
        return Err("노드 이름과 종류를 확인해 주세요.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    sqlx::query("INSERT INTO user_flow_nodes (id, project_id, lane_id, title, description, kind, position_x, position_y, created_at, updated_at, color_key, depth, parent_id, linked_feature_ids, branch_condition, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(&input.node.id).bind(&input.node.project_id).bind(&input.node.lane_id).bind(&input.node.title).bind(&input.node.description).bind(&input.node.kind).bind(input.node.position_x).bind(input.node.position_y).bind(&input.created_at).bind(&input.created_at).bind(input.node.color_key.as_deref().unwrap_or("violet")).bind(input.node.depth).bind(&input.node.parent_id).bind(serde_json::to_string(&input.node.linked_feature_ids).map_err(|error|error.to_string())?).bind(&input.node.branch_condition).bind(metadata(&input.node)?).execute(&mut connection).await.map_err(|error|format!("유저플로우 노드를 추가하지 못했습니다: {error}"))?;
    Ok(input.node)
}

#[tauri::command]
pub async fn delete_user_flow_node(
    app: AppHandle,
    project_id: String,
    node_id: String,
) -> Result<(), String> {
    let mut connection = open_database(&app).await?;
    let result = sqlx::query("DELETE FROM user_flow_nodes WHERE id=? AND project_id=?")
        .bind(node_id)
        .bind(project_id)
        .execute(&mut connection)
        .await
        .map_err(|error| format!("유저플로우 노드를 삭제하지 못했습니다: {error}"))?;
    if result.rows_affected() != 1 {
        return Err("삭제할 유저플로우 노드를 찾지 못했습니다.".to_owned());
    }
    Ok(())
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
    let lane_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT lane_id) FROM user_flow_nodes WHERE project_id=? AND id IN (?, ?)",
    )
    .bind(&input.project_id)
    .bind(&input.source_node_id)
    .bind(&input.target_node_id)
    .fetch_one(&mut connection)
    .await
    .map_err(|error| error.to_string())?;
    if lane_count != 1 {
        return Err("다른 스윔레인의 노드는 연결할 수 없습니다.".to_owned());
    }
    let creates_cycle: i64 = sqlx::query_scalar("WITH RECURSIVE reachable(id) AS (SELECT target_node_id FROM user_flow_edges WHERE project_id=? AND source_node_id=? UNION SELECT edge.target_node_id FROM user_flow_edges edge JOIN reachable ON edge.source_node_id=reachable.id WHERE edge.project_id=?) SELECT COUNT(*) FROM reachable WHERE id=?")
        .bind(&input.project_id).bind(&input.target_node_id).bind(&input.project_id).bind(&input.source_node_id).fetch_one(&mut connection).await.map_err(|error|error.to_string())?;
    if creates_cycle > 0 {
        return Err("순환 흐름은 연결할 수 없습니다.".to_owned());
    }
    sqlx::query("INSERT INTO user_flow_edges (id, project_id, source_node_id, target_node_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(&input.id).bind(&input.project_id).bind(&input.source_node_id).bind(&input.target_node_id).bind(&input.created_at).execute(&mut connection).await.map_err(|error|format!("유저플로우를 연결하지 못했습니다: {error}"))?;
    Ok(UserFlowEdge {
        id: input.id,
        project_id: input.project_id,
        source_node_id: input.source_node_id,
        target_node_id: input.target_node_id,
    })
}

#[cfg(test)]
mod tests {
    use super::ExecutionMetadata;

    #[test]
    fn completion_metadata_defaults_to_incomplete_and_round_trips() {
        let legacy: ExecutionMetadata = serde_json::from_str("{}").expect("legacy metadata");
        assert!(!legacy.is_completed);

        let completed = ExecutionMetadata {
            is_completed: true,
            ..ExecutionMetadata::default()
        };
        let encoded = serde_json::to_string(&completed).expect("encode metadata");
        let decoded: ExecutionMetadata = serde_json::from_str(&encoded).expect("decode metadata");
        assert!(decoded.is_completed);
    }
}
