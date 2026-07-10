use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection, Transaction};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalFeature {
    id: String,
    parent_id: Option<String>,
    title: String,
    description: String,
    status: String,
    priority: String,
    role: String,
    sort_order: i64,
    acceptance_criteria: Vec<ProposalCriterion>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProposalCriterion {
    id: String,
    description: String,
    is_met: bool,
    sort_order: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProposalInput {
    id: String,
    project_id: String,
    feature_id: String,
    proposed_feature: ProposalFeature,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureChangeProposal {
    id: String,
    project_id: String,
    feature_id: String,
    base_feature: ProposalFeature,
    proposed_feature: ProposalFeature,
    summary: String,
    source: String,
    status: String,
    created_at: String,
    decided_at: Option<String>,
    rejection_reason: Option<String>,
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
        .map_err(|error| format!("변경안 데이터베이스를 열지 못했습니다: {error}"))
}

async fn load_feature(
    connection: &mut SqliteConnection,
    project_id: &str,
    feature_id: &str,
) -> Result<(ProposalFeature, String), String> {
    let row = sqlx::query("SELECT id, parent_feature_id, title, description, status, priority, role, sort_order, updated_at FROM features WHERE id = ? AND project_id = ?")
        .bind(feature_id).bind(project_id).fetch_optional(&mut *connection).await.map_err(|error| error.to_string())?
        .ok_or_else(|| "변경안을 만들 기능을 찾지 못했습니다.".to_owned())?;
    let criteria_rows = sqlx::query("SELECT id, description, is_met, sort_order FROM acceptance_criteria WHERE feature_id = ? ORDER BY sort_order")
        .bind(feature_id).fetch_all(&mut *connection).await.map_err(|error| error.to_string())?;
    let acceptance_criteria = criteria_rows
        .into_iter()
        .map(|criterion| {
            Ok(ProposalCriterion {
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
    Ok((
        ProposalFeature {
            id: row.try_get("id").map_err(|error| error.to_string())?,
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
        },
        row.try_get("updated_at")
            .map_err(|error| error.to_string())?,
    ))
}

fn map_proposal(row: sqlx::sqlite::SqliteRow) -> Result<FeatureChangeProposal, String> {
    let base_json: String = row
        .try_get("base_snapshot_json")
        .map_err(|error| error.to_string())?;
    let proposed_json: String = row
        .try_get("proposed_snapshot_json")
        .map_err(|error| error.to_string())?;
    Ok(FeatureChangeProposal {
        id: row.try_get("id").map_err(|error| error.to_string())?,
        project_id: row
            .try_get("project_id")
            .map_err(|error| error.to_string())?,
        feature_id: row
            .try_get("feature_id")
            .map_err(|error| error.to_string())?,
        base_feature: serde_json::from_str(&base_json).map_err(|error| error.to_string())?,
        proposed_feature: serde_json::from_str(&proposed_json)
            .map_err(|error| error.to_string())?,
        summary: row.try_get("summary").map_err(|error| error.to_string())?,
        source: row.try_get("source").map_err(|error| error.to_string())?,
        status: row.try_get("status").map_err(|error| error.to_string())?,
        created_at: row
            .try_get("created_at")
            .map_err(|error| error.to_string())?,
        decided_at: row
            .try_get("decided_at")
            .map_err(|error| error.to_string())?,
        rejection_reason: row
            .try_get("rejection_reason")
            .map_err(|error| error.to_string())?,
    })
}

#[tauri::command]
pub async fn create_feature_change_proposal(
    app: AppHandle,
    input: CreateProposalInput,
) -> Result<FeatureChangeProposal, String> {
    if input.proposed_feature.id != input.feature_id {
        return Err("변경안의 기능 ID가 원본과 다릅니다.".to_owned());
    }
    if input.summary.trim().is_empty() {
        return Err("변경안 요약을 입력해 주세요.".to_owned());
    }
    if !matches!(input.source.as_str(), "development_ai" | "codex" | "manual") {
        return Err("지원하지 않는 변경안 출처입니다.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    let (base_feature, base_updated_at) =
        load_feature(&mut connection, &input.project_id, &input.feature_id).await?;
    let base_json = serde_json::to_string(&base_feature).map_err(|error| error.to_string())?;
    let proposed_json =
        serde_json::to_string(&input.proposed_feature).map_err(|error| error.to_string())?;
    sqlx::query("INSERT INTO feature_change_proposals (id, project_id, feature_id, base_updated_at, base_snapshot_json, proposed_snapshot_json, summary, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)")
        .bind(&input.id).bind(&input.project_id).bind(&input.feature_id).bind(base_updated_at).bind(base_json).bind(proposed_json)
        .bind(input.summary.trim()).bind(&input.source).bind(&input.created_at).execute(&mut connection).await.map_err(|error| format!("변경안을 저장하지 못했습니다: {error}"))?;
    list_feature_change_proposals(app, input.project_id)
        .await?
        .into_iter()
        .find(|proposal| proposal.id == input.id)
        .ok_or_else(|| "저장한 변경안을 다시 불러오지 못했습니다.".to_owned())
}

#[tauri::command]
pub async fn list_feature_change_proposals(
    app: AppHandle,
    project_id: String,
) -> Result<Vec<FeatureChangeProposal>, String> {
    let mut connection = open_database(&app).await?;
    let rows = sqlx::query("SELECT id, project_id, feature_id, base_snapshot_json, proposed_snapshot_json, summary, source, status, created_at, decided_at, rejection_reason FROM feature_change_proposals WHERE project_id = ? ORDER BY created_at DESC")
        .bind(project_id).fetch_all(&mut connection).await.map_err(|error| error.to_string())?;
    rows.into_iter().map(map_proposal).collect()
}

async fn apply_feature(
    transaction: &mut Transaction<'_, sqlx::Sqlite>,
    feature: &ProposalFeature,
    project_id: &str,
    decided_at: &str,
) -> Result<(), String> {
    let result = sqlx::query("UPDATE features SET title = ?, description = ?, status = ?, priority = ?, role = ?, updated_at = ? WHERE id = ? AND project_id = ?")
        .bind(&feature.title).bind(&feature.description).bind(&feature.status).bind(&feature.priority).bind(&feature.role)
        .bind(decided_at).bind(&feature.id).bind(project_id).execute(&mut **transaction).await.map_err(|error| error.to_string())?;
    if result.rows_affected() != 1 {
        return Err("변경안을 적용할 기능을 찾지 못했습니다.".to_owned());
    }
    sqlx::query("DELETE FROM acceptance_criteria WHERE feature_id = ?")
        .bind(&feature.id)
        .execute(&mut **transaction)
        .await
        .map_err(|error| error.to_string())?;
    for criterion in &feature.acceptance_criteria {
        if criterion.description.trim().is_empty() {
            return Err("빈 수용 기준은 승인할 수 없습니다.".to_owned());
        }
        sqlx::query("INSERT INTO acceptance_criteria (id, feature_id, description, is_met, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&criterion.id).bind(&feature.id).bind(&criterion.description).bind(criterion.is_met).bind(criterion.sort_order)
            .bind(decided_at).bind(decided_at).execute(&mut **transaction).await.map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn decide_feature_change_proposal(
    app: AppHandle,
    input: DecideProposalInput,
) -> Result<FeatureChangeProposal, String> {
    if !matches!(input.decision.as_str(), "accepted" | "rejected") {
        return Err("승인 또는 거절만 선택할 수 있습니다.".to_owned());
    }
    let mut connection = open_database(&app).await?;
    let row = sqlx::query("SELECT feature_id, base_updated_at, proposed_snapshot_json FROM feature_change_proposals WHERE id = ? AND project_id = ? AND status = 'pending'")
        .bind(&input.proposal_id).bind(&input.project_id).fetch_optional(&mut connection).await.map_err(|error| error.to_string())?
        .ok_or_else(|| "이미 처리됐거나 존재하지 않는 변경안입니다.".to_owned())?;
    let feature_id: String = row
        .try_get("feature_id")
        .map_err(|error| error.to_string())?;
    let base_updated_at: String = row
        .try_get("base_updated_at")
        .map_err(|error| error.to_string())?;
    let current_updated_at: String =
        sqlx::query_scalar("SELECT updated_at FROM features WHERE id = ? AND project_id = ?")
            .bind(&feature_id)
            .bind(&input.project_id)
            .fetch_one(&mut connection)
            .await
            .map_err(|error| error.to_string())?;
    if input.decision == "accepted" && current_updated_at != base_updated_at {
        return Err(
            "변경안 생성 후 원본 기능이 수정되었습니다. 새 변경안을 만들어 주세요.".to_owned(),
        );
    }
    let proposed_json: String = row
        .try_get("proposed_snapshot_json")
        .map_err(|error| error.to_string())?;
    let proposed: ProposalFeature =
        serde_json::from_str(&proposed_json).map_err(|error| error.to_string())?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    if input.decision == "accepted" {
        apply_feature(
            &mut transaction,
            &proposed,
            &input.project_id,
            &input.decided_at,
        )
        .await?;
    }
    sqlx::query("UPDATE feature_change_proposals SET status = ?, decided_at = ?, rejection_reason = ? WHERE id = ? AND status = 'pending'")
        .bind(&input.decision).bind(&input.decided_at).bind(&input.rejection_reason).bind(&input.proposal_id)
        .execute(&mut *transaction).await.map_err(|error| error.to_string())?;
    sqlx::query("INSERT INTO activity_log (id, project_id, action, target_type, target_id, details_json, created_at) VALUES (?, ?, ?, 'feature_change_proposal', ?, ?, ?)")
        .bind(format!("activity-{}", input.proposal_id)).bind(&input.project_id).bind(format!("proposal_{}", input.decision))
        .bind(&input.proposal_id).bind(serde_json::json!({"featureId": feature_id, "rejectionReason": input.rejection_reason}).to_string()).bind(&input.decided_at)
        .execute(&mut *transaction).await.map_err(|error| error.to_string())?;
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    list_feature_change_proposals(app, input.project_id)
        .await?
        .into_iter()
        .find(|proposal| proposal.id == input.proposal_id)
        .ok_or_else(|| "처리한 변경안을 다시 불러오지 못했습니다.".to_owned())
}
