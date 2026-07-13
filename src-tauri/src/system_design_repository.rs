use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection, Transaction};
use std::{collections::HashSet, path::PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Size {
    pub width: f64,
    pub height: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemNode {
    pub id: String,
    pub r#type: String,
    pub name: String,
    pub description: String,
    pub technology: String,
    pub deployment: String,
    pub status: String,
    pub linked_feature_ids: Vec<String>,
    pub linked_user_flow_ids: Vec<String>,
    pub linked_wireframe_ids: Vec<String>,
    pub code_paths: Vec<String>,
    pub test_paths: Vec<String>,
    pub configuration: String,
    #[serde(default)]
    pub c4_level: Option<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub implementation_status: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub commit: Option<String>,
    #[serde(default)]
    pub deployment_status: Option<String>,
    pub position: Point,
    pub size: Size,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub r#type: String,
    pub protocol: String,
    pub data_format: String,
    pub is_async: bool,
    #[serde(default)]
    pub sequence: Option<u32>,
    pub authentication: String,
    pub error_handling: String,
    pub description: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshot {
    pub schema_version: u32,
    pub title: String,
    pub summary: String,
    #[serde(default = "default_view_type")]
    pub view_type: String,
    #[serde(default = "default_architecture_pattern")]
    pub architecture_pattern: String,
    #[serde(default = "default_c4_level")]
    pub active_c4_level: String,
    #[serde(default)]
    pub active_scenario_id: Option<String>,
    #[serde(default)]
    pub scenarios: Vec<serde_json::Value>,
    #[serde(default)]
    pub decisions: Vec<serde_json::Value>,
    #[serde(default)]
    pub quality_attributes: Vec<String>,
    #[serde(default)]
    pub constraints: Vec<String>,
    pub nodes: Vec<SystemNode>,
    pub edges: Vec<SystemEdge>,
}
fn default_view_type() -> String {
    "structural".into()
}
fn default_architecture_pattern() -> String {
    "auto".into()
}
fn default_c4_level() -> String {
    "container".into()
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemRevision {
    id: String,
    design_id: String,
    project_id: String,
    revision_number: i64,
    snapshot: SystemSnapshot,
    source: String,
    created_at: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemProposal {
    id: String,
    project_id: String,
    design_id: String,
    base_revision_id: String,
    proposed_snapshot: SystemSnapshot,
    summary: String,
    source: String,
    status: String,
    created_at: String,
    decided_at: Option<String>,
    rejection_reason: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemWorkspace {
    design_id: String,
    project_id: String,
    revision: SystemRevision,
    proposals: Vec<SystemProposal>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeInput {
    project_id: String,
    initial_snapshot: SystemSnapshot,
    created_at: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRevisionInput {
    project_id: String,
    design_id: String,
    snapshot: SystemSnapshot,
    source: String,
    created_at: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProposalInput {
    id: String,
    project_id: String,
    design_id: String,
    base_revision_id: String,
    proposed_snapshot: SystemSnapshot,
    summary: String,
    source: String,
    created_at: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecideProposalInput {
    project_id: String,
    proposal_id: String,
    decision: String,
    rejection_reason: Option<String>,
    decided_at: String,
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
fn valid_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 160
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}
pub fn validate_snapshot(snapshot: &SystemSnapshot) -> Result<(), String> {
    if snapshot.schema_version != 1
        || snapshot.title.trim().is_empty()
        || !matches!(
            snapshot.view_type.as_str(),
            "structural" | "runtime" | "deployment" | "development"
        )
        || !matches!(
            snapshot.architecture_pattern.as_str(),
            "auto" | "layered" | "hub_spoke" | "pipeline" | "event_driven" | "deployment"
        )
        || !matches!(
            snapshot.active_c4_level.as_str(),
            "context" | "container" | "component" | "code"
        )
        || snapshot.nodes.len() > 200
        || snapshot.edges.len() > 500
    {
        return Err("시스템 설계의 버전, 제목 또는 항목 수를 확인해 주세요.".into());
    }
    let mut nodes = HashSet::new();
    for node in &snapshot.nodes {
        if !valid_id(&node.id)
            || !nodes.insert(&node.id)
            || node.name.trim().is_empty()
            || !matches!(
                node.r#type.as_str(),
                "client"
                    | "service"
                    | "database"
                    | "cache"
                    | "queue"
                    | "external"
                    | "component"
                    | "group"
            )
            || !matches!(node.status.as_str(), "planned" | "active" | "deprecated")
            || node.c4_level.as_deref().is_some_and(|value| {
                !matches!(value, "context" | "container" | "component" | "code")
            })
            || node
                .parent_id
                .as_deref()
                .is_some_and(|value| value == node.id || !valid_id(value))
            || node.implementation_status.as_deref().is_some_and(|value| {
                !matches!(
                    value,
                    "planned"
                        | "designed"
                        | "implementing"
                        | "implemented"
                        | "tested"
                        | "completed"
                        | "drift_detected"
                        | "deprecated"
                )
            })
            || ![
                node.position.x,
                node.position.y,
                node.size.width,
                node.size.height,
            ]
            .iter()
            .all(|v| v.is_finite() && v.abs() <= 100_000.0)
            || node.size.width <= 0.0
            || node.size.height <= 0.0
        {
            return Err(format!(
                "시스템 설계 노드 '{}' 형식이 올바르지 않습니다.",
                node.id
            ));
        }
    }
    for node in &snapshot.nodes {
        if node
            .parent_id
            .as_ref()
            .is_some_and(|parent_id| !nodes.contains(parent_id))
        {
            return Err(format!(
                "시스템 설계 노드 '{}'의 상위 경계를 찾을 수 없습니다.",
                node.id
            ));
        }
    }
    let mut edges = HashSet::new();
    let mut pairs = HashSet::new();
    for edge in &snapshot.edges {
        if !valid_id(&edge.id)
            || !edges.insert(&edge.id)
            || edge.source == edge.target
            || !nodes.contains(&edge.source)
            || !nodes.contains(&edge.target)
            || !matches!(
                edge.r#type.as_str(),
                "http" | "ipc" | "database_query" | "event" | "file" | "dependency"
            )
            || !pairs.insert(format!("{}:{}:{}", edge.source, edge.target, edge.r#type))
        {
            return Err(format!(
                "시스템 설계 연결 '{}' 형식이 올바르지 않습니다.",
                edge.id
            ));
        }
    }
    Ok(())
}
async fn insert_revision(
    transaction: &mut Transaction<'_, sqlx::Sqlite>,
    project_id: &str,
    design_id: &str,
    snapshot: &SystemSnapshot,
    source: &str,
    created_at: &str,
) -> Result<String, String> {
    validate_snapshot(snapshot)?;
    if !matches!(source, "user" | "development_mode" | "codex") {
        return Err("지원하지 않는 리비전 출처입니다.".into());
    }
    let owns_design: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM system_designs WHERE id=? AND project_id=?)",
    )
    .bind(design_id)
    .bind(project_id)
    .fetch_one(&mut **transaction)
    .await
    .map_err(|e| e.to_string())?;
    if !owns_design {
        return Err("프로젝트에 속한 시스템 설계를 찾지 못했습니다.".into());
    }
    let next: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(revision_number),0)+1 FROM system_design_revisions WHERE design_id=?",
    )
    .bind(design_id)
    .fetch_one(&mut **transaction)
    .await
    .map_err(|e| e.to_string())?;
    let id = format!("system-revision-{}-{}", design_id, next);
    let json = serde_json::to_string(snapshot).map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO system_design_revisions(id,design_id,revision_number,snapshot_json,source,created_at) VALUES(?,?,?,?,?,?)").bind(&id).bind(design_id).bind(next).bind(json).bind(source).bind(created_at).execute(&mut **transaction).await.map_err(|e|e.to_string())?;
    sqlx::query("UPDATE system_designs SET current_revision_id=?,title=?,updated_at=? WHERE id=? AND project_id=?").bind(&id).bind(snapshot.title.trim()).bind(created_at).bind(design_id).bind(project_id).execute(&mut **transaction).await.map_err(|e|e.to_string())?;
    Ok(id)
}
async fn load_workspace(
    connection: &mut SqliteConnection,
    project_id: &str,
) -> Result<SystemWorkspace, String> {
    let row=sqlx::query("SELECT d.id design_id,r.id revision_id,r.revision_number,r.snapshot_json,r.source,r.created_at FROM system_designs d JOIN system_design_revisions r ON r.id=d.current_revision_id WHERE d.project_id=?").bind(project_id).fetch_optional(&mut *connection).await.map_err(|e|e.to_string())?.ok_or_else(||"시스템 설계를 찾지 못했습니다.".to_owned())?;
    let design_id: String = row.try_get("design_id").map_err(|e| e.to_string())?;
    let snapshot_json: String = row.try_get("snapshot_json").map_err(|e| e.to_string())?;
    let revision = SystemRevision {
        id: row.try_get("revision_id").map_err(|e| e.to_string())?,
        design_id: design_id.clone(),
        project_id: project_id.into(),
        revision_number: row.try_get("revision_number").map_err(|e| e.to_string())?,
        snapshot: serde_json::from_str(&snapshot_json).map_err(|e| e.to_string())?,
        source: row.try_get("source").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    };
    let rows=sqlx::query("SELECT id,base_revision_id,proposed_snapshot_json,summary,source,status,created_at,decided_at,rejection_reason FROM system_design_proposals WHERE project_id=? ORDER BY created_at DESC").bind(project_id).fetch_all(&mut *connection).await.map_err(|e|e.to_string())?;
    let proposals = rows
        .into_iter()
        .map(|row| {
            let json: String = row
                .try_get("proposed_snapshot_json")
                .map_err(|e| e.to_string())?;
            Ok(SystemProposal {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                project_id: project_id.into(),
                design_id: design_id.clone(),
                base_revision_id: row.try_get("base_revision_id").map_err(|e| e.to_string())?,
                proposed_snapshot: serde_json::from_str(&json).map_err(|e| e.to_string())?,
                summary: row.try_get("summary").map_err(|e| e.to_string())?,
                source: row.try_get("source").map_err(|e| e.to_string())?,
                status: row.try_get("status").map_err(|e| e.to_string())?,
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                decided_at: row.try_get("decided_at").map_err(|e| e.to_string())?,
                rejection_reason: row.try_get("rejection_reason").map_err(|e| e.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(SystemWorkspace {
        design_id,
        project_id: project_id.into(),
        revision,
        proposals,
    })
}
#[tauri::command]
pub async fn initialize_system_design(
    app: AppHandle,
    input: InitializeInput,
) -> Result<SystemWorkspace, String> {
    validate_snapshot(&input.initial_snapshot)?;
    let mut db = open_database(&app).await?;
    let exists: Option<String> =
        sqlx::query_scalar("SELECT id FROM system_designs WHERE project_id=?")
            .bind(&input.project_id)
            .fetch_optional(&mut db)
            .await
            .map_err(|e| e.to_string())?;
    if exists.is_none() {
        let design_id = format!("system-design-{}", input.project_id);
        let mut tx = db.begin().await.map_err(|e| e.to_string())?;
        sqlx::query("INSERT INTO system_designs(id,project_id,title,created_at,updated_at) VALUES(?,?,?,?,?)").bind(&design_id).bind(&input.project_id).bind(input.initial_snapshot.title.trim()).bind(&input.created_at).bind(&input.created_at).execute(&mut *tx).await.map_err(|e|e.to_string())?;
        insert_revision(
            &mut tx,
            &input.project_id,
            &design_id,
            &input.initial_snapshot,
            "development_mode",
            &input.created_at,
        )
        .await?;
        tx.commit().await.map_err(|e| e.to_string())?;
    }
    load_workspace(&mut db, &input.project_id).await
}
#[tauri::command]
pub async fn save_system_design_revision(
    app: AppHandle,
    input: SaveRevisionInput,
) -> Result<SystemWorkspace, String> {
    let mut db = open_database(&app).await?;
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    insert_revision(
        &mut tx,
        &input.project_id,
        &input.design_id,
        &input.snapshot,
        &input.source,
        &input.created_at,
    )
    .await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    load_workspace(&mut db, &input.project_id).await
}
#[tauri::command]
pub async fn list_system_design_revisions(
    app: AppHandle,
    project_id: String,
) -> Result<Vec<SystemRevision>, String> {
    let mut db = open_database(&app).await?;
    let rows=sqlx::query("SELECT d.id design_id,r.id revision_id,r.revision_number,r.snapshot_json,r.source,r.created_at FROM system_designs d JOIN system_design_revisions r ON r.design_id=d.id WHERE d.project_id=? ORDER BY r.revision_number").bind(&project_id).fetch_all(&mut db).await.map_err(|e|e.to_string())?;
    rows.into_iter()
        .map(|row| {
            let snapshot_json: String = row.try_get("snapshot_json").map_err(|e| e.to_string())?;
            Ok(SystemRevision {
                id: row.try_get("revision_id").map_err(|e| e.to_string())?,
                design_id: row.try_get("design_id").map_err(|e| e.to_string())?,
                project_id: project_id.clone(),
                revision_number: row.try_get("revision_number").map_err(|e| e.to_string())?,
                snapshot: serde_json::from_str(&snapshot_json).map_err(|e| e.to_string())?,
                source: row.try_get("source").map_err(|e| e.to_string())?,
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            })
        })
        .collect()
}
#[tauri::command]
pub async fn create_system_design_proposal(
    app: AppHandle,
    input: CreateProposalInput,
) -> Result<SystemProposal, String> {
    validate_snapshot(&input.proposed_snapshot)?;
    if input.source != "codex" || input.summary.trim().is_empty() {
        return Err("변경안 출처와 요약을 확인해 주세요.".into());
    }
    let mut db = open_database(&app).await?;
    let current: Option<String> = sqlx::query_scalar(
        "SELECT current_revision_id FROM system_designs WHERE id=? AND project_id=?",
    )
    .bind(&input.design_id)
    .bind(&input.project_id)
    .fetch_optional(&mut db)
    .await
    .map_err(|e| e.to_string())?;
    if current.as_deref() != Some(&input.base_revision_id) {
        return Err("변경안 기준 리비전이 현재 설계와 다릅니다.".into());
    }
    let json = serde_json::to_string(&input.proposed_snapshot).map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO system_design_proposals(id,project_id,design_id,base_revision_id,proposed_snapshot_json,summary,source,status,created_at) VALUES(?,?,?,?,?,?,?,'pending',?)").bind(&input.id).bind(&input.project_id).bind(&input.design_id).bind(&input.base_revision_id).bind(json).bind(input.summary.trim()).bind(&input.source).bind(&input.created_at).execute(&mut db).await.map_err(|e|e.to_string())?;
    Ok(SystemProposal {
        id: input.id,
        project_id: input.project_id,
        design_id: input.design_id,
        base_revision_id: input.base_revision_id,
        proposed_snapshot: input.proposed_snapshot,
        summary: input.summary,
        source: input.source,
        status: "pending".into(),
        created_at: input.created_at,
        decided_at: None,
        rejection_reason: None,
    })
}
#[tauri::command]
pub async fn decide_system_design_proposal(
    app: AppHandle,
    input: DecideProposalInput,
) -> Result<SystemWorkspace, String> {
    if !matches!(input.decision.as_str(), "accepted" | "rejected") {
        return Err("승인 또는 거절만 선택할 수 있습니다.".into());
    }
    let mut db = open_database(&app).await?;
    let row=sqlx::query("SELECT design_id,base_revision_id,proposed_snapshot_json FROM system_design_proposals WHERE id=? AND project_id=? AND status='pending'").bind(&input.proposal_id).bind(&input.project_id).fetch_optional(&mut db).await.map_err(|e|e.to_string())?.ok_or_else(||"이미 처리됐거나 존재하지 않는 변경안입니다.".to_owned())?;
    let design_id: String = row.try_get("design_id").map_err(|e| e.to_string())?;
    let base: String = row.try_get("base_revision_id").map_err(|e| e.to_string())?;
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    if input.decision == "accepted" {
        let current: Option<String> =
            sqlx::query_scalar("SELECT current_revision_id FROM system_designs WHERE id=?")
                .bind(&design_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        if current.as_deref() != Some(&base) {
            return Err(
                "변경안 생성 후 원본 설계가 수정되었습니다. 새 변경안을 만들어 주세요.".into(),
            );
        }
        let json: String = row
            .try_get("proposed_snapshot_json")
            .map_err(|e| e.to_string())?;
        let snapshot: SystemSnapshot = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        insert_revision(
            &mut tx,
            &input.project_id,
            &design_id,
            &snapshot,
            "codex",
            &input.decided_at,
        )
        .await?;
    }
    sqlx::query("UPDATE system_design_proposals SET status=?,decided_at=?,rejection_reason=? WHERE id=? AND status='pending'").bind(&input.decision).bind(&input.decided_at).bind(&input.rejection_reason).bind(&input.proposal_id).execute(&mut *tx).await.map_err(|e|e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    load_workspace(&mut db, &input.project_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> SystemSnapshot {
        SystemSnapshot {
            schema_version: 1,
            title: "설계".into(),
            summary: "".into(),
            view_type: "structural".into(),
            architecture_pattern: "auto".into(),
            active_c4_level: "container".into(),
            active_scenario_id: None,
            scenarios: vec![],
            decisions: vec![],
            quality_attributes: vec![],
            constraints: vec![],
            nodes: vec![SystemNode {
                id: "a".into(),
                r#type: "service".into(),
                name: "A".into(),
                description: "".into(),
                technology: "".into(),
                deployment: "".into(),
                status: "planned".into(),
                linked_feature_ids: vec![],
                linked_user_flow_ids: vec![],
                linked_wireframe_ids: vec![],
                code_paths: vec![],
                test_paths: vec![],
                configuration: "".into(),
                c4_level: None,
                parent_id: None,
                implementation_status: None,
                branch: None,
                commit: None,
                deployment_status: None,
                position: Point { x: 0.0, y: 0.0 },
                size: Size {
                    width: 100.0,
                    height: 80.0,
                },
            }],
            edges: vec![],
        }
    }
    #[test]
    fn validates_snapshot() {
        assert!(validate_snapshot(&sample()).is_ok());
        let mut value = sample();
        value.edges.push(SystemEdge {
            id: "e".into(),
            source: "a".into(),
            target: "a".into(),
            r#type: "ipc".into(),
            protocol: "".into(),
            data_format: "".into(),
            is_async: false,
            sequence: None,
            authentication: "".into(),
            error_handling: "".into(),
            description: "".into(),
        });
        assert!(validate_snapshot(&value).is_err());
    }
    #[test]
    fn reads_legacy_snapshot_with_default_view_and_pattern() {
        let legacy = r#"{"schemaVersion":1,"title":"legacy","summary":"","nodes":[],"edges":[]}"#;
        let value: SystemSnapshot = serde_json::from_str(legacy).expect("legacy snapshot");
        assert_eq!(value.view_type, "structural");
        assert_eq!(value.architecture_pattern, "auto");
        assert_eq!(value.active_c4_level, "container");
        assert!(validate_snapshot(&value).is_ok());
    }
}
