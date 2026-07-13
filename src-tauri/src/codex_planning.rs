use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratePlanningInput {
    project_id: String,
    project_name: String,
    prd_markdown: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningBundle {
    features: Vec<Value>,
    user_flow: Value,
    system_design: Value,
}

fn object(properties: Value, required: &[&str]) -> Value {
    json!({"type":"object","additionalProperties":false,"required":required,"properties":properties})
}

fn schema() -> Value {
    let criterion = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},
            "description":{"type":"string","minLength":12},
            "isMet":{"type":"boolean"},
            "sortOrder":{"type":"integer","minimum":0}
        }),
        &["id", "description", "isMet", "sortOrder"],
    );
    let feature = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},
            "parentId":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},
            "title":{"type":"string","minLength":2},
            "status":{"type":"string","enum":["planned","ready","in_progress","blocked","done"]},
            "priority":{"type":"string","enum":["low","medium","high","critical"]},
            "role":{"type":"string","minLength":1},
            "description":{"type":"string","minLength":20},
            "sortOrder":{"type":"integer","minimum":0},
            "colorKey":{"type":"string","enum":["cyan","violet","green","amber","rose","slate"]},
            "acceptanceCriteria":{"type":"array","minItems":2,"maxItems":6,"items":criterion}
        }),
        &[
            "id",
            "title",
            "status",
            "priority",
            "role",
            "description",
            "sortOrder",
            "colorKey",
            "acceptanceCriteria",
        ],
    );
    let flow_node = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"projectId":{"type":"string"},"laneId":{"type":"string"},
            "title":{"type":"string","minLength":2},"description":{"type":"string","minLength":15},
            "kind":{"type":"string","enum":["phase","screen","action","result","decision"]},
            "positionX":{"type":"number","minimum":0,"maximum":100000},"positionY":{"type":"number","minimum":0,"maximum":100000},
            "colorKey":{"type":"string","enum":["green","cyan","amber","violet","rose","slate"]}
        }),
        &[
            "id",
            "projectId",
            "laneId",
            "title",
            "description",
            "kind",
            "positionX",
            "positionY",
            "colorKey",
        ],
    );
    let flow_edge = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"projectId":{"type":"string"},
            "sourceNodeId":{"type":"string"},"targetNodeId":{"type":"string"}
        }),
        &["id", "projectId", "sourceNodeId", "targetNodeId"],
    );
    let position = object(
        json!({"x":{"type":"number","minimum":-100000,"maximum":100000},"y":{"type":"number","minimum":-100000,"maximum":100000}}),
        &["x", "y"],
    );
    let size = object(
        json!({"width":{"type":"number","exclusiveMinimum":0,"maximum":2000},"height":{"type":"number","exclusiveMinimum":0,"maximum":2000}}),
        &["width", "height"],
    );
    let design_node = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"type":{"type":"string","enum":["client","service","database","cache","queue","external","component","group"]},
            "name":{"type":"string","minLength":2},"description":{"type":"string","minLength":20},"technology":{"type":"string"},"deployment":{"type":"string"},
            "status":{"type":"string","enum":["planned","active","deprecated"]},"linkedFeatureIds":{"type":"array","items":{"type":"string"}},
            "linkedUserFlowIds":{"type":"array","items":{"type":"string"}},"linkedWireframeIds":{"type":"array","maxItems":0},
            "codePaths":{"type":"array","maxItems":0},"testPaths":{"type":"array","maxItems":0},"configuration":{"type":"string"},
            "c4Level":{"type":"string","enum":["context","container","component","code"]},"parentId":{"type":"string"},"position":position,"size":size
        }),
        &[
            "id",
            "type",
            "name",
            "description",
            "technology",
            "deployment",
            "status",
            "linkedFeatureIds",
            "linkedUserFlowIds",
            "linkedWireframeIds",
            "codePaths",
            "testPaths",
            "configuration",
            "c4Level",
            "position",
            "size",
        ],
    );
    let design_edge = object(
        json!({
            "id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"source":{"type":"string"},"target":{"type":"string"},
            "type":{"type":"string","enum":["http","ipc","database_query","event","file","dependency"]},"protocol":{"type":"string"},
            "dataFormat":{"type":"string"},"isAsync":{"type":"boolean"},"sequence":{"type":"integer","minimum":1},
            "authentication":{"type":"string"},"errorHandling":{"type":"string","minLength":5},"description":{"type":"string","minLength":5}
        }),
        &[
            "id",
            "source",
            "target",
            "type",
            "protocol",
            "dataFormat",
            "isAsync",
            "authentication",
            "errorHandling",
            "description",
        ],
    );
    object(
        json!({
            "features":{"type":"array","minItems":30,"maxItems":140,"items":feature},
            "userFlow":object(json!({
                "nodes":{"type":"array","minItems":20,"maxItems":140,"items":flow_node},
                "edges":{"type":"array","minItems":15,"maxItems":240,"items":flow_edge}
            }), &["nodes","edges"]),
            "systemDesign":object(json!({
                "schemaVersion":{"type":"integer","const":1},"title":{"type":"string","minLength":2},"summary":{"type":"string","minLength":20},
                "viewType":{"type":"string","enum":["structural","runtime","deployment","development"]},
                "architecturePattern":{"type":"string","enum":["auto","layered","hub_spoke","pipeline","event_driven","deployment"]},
                "activeC4Level":{"type":"string","enum":["context","container","component","code"]},
                "nodes":{"type":"array","minItems":6,"maxItems":50,"items":design_node},"edges":{"type":"array","minItems":5,"maxItems":100,"items":design_edge}
            }), &["schemaVersion","title","summary","viewType","architecturePattern","activeC4Level","nodes","edges"])
        }),
        &["features", "userFlow", "systemDesign"],
    )
}

fn ids(values: &[Value]) -> Result<HashSet<String>, String> {
    let mut result = HashSet::new();
    for value in values {
        let id = value
            .get("id")
            .and_then(Value::as_str)
            .ok_or_else(|| "생성 결과에 ID가 없습니다.".to_owned())?;
        if !result.insert(id.to_owned()) {
            return Err(format!("생성 결과의 ID가 중복되었습니다: {id}"));
        }
    }
    Ok(result)
}

fn validate(bundle: &PlanningBundle, project_id: &str) -> Result<(), String> {
    if bundle.features.len() < 30 {
        return Err("Codex 기능명세가 상세도 기준(30개)에 미달했습니다.".into());
    }
    let feature_ids = ids(&bundle.features)?;
    let mut criterion_ids = HashSet::new();
    let roots = bundle
        .features
        .iter()
        .filter(|item| item.get("parentId").is_none())
        .count();
    if roots != 1 {
        return Err("기능명세에는 정확히 하나의 루트가 필요합니다.".into());
    }
    let root_id = bundle
        .features
        .iter()
        .find(|item| item.get("parentId").is_none())
        .and_then(|item| item.get("id"))
        .and_then(Value::as_str)
        .ok_or_else(|| "기능명세 루트 ID가 없습니다.".to_owned())?;
    let lane_ids = bundle
        .features
        .iter()
        .filter(|item| item.get("parentId").and_then(Value::as_str) == Some(root_id))
        .filter_map(|item| item.get("id").and_then(Value::as_str))
        .collect::<HashSet<_>>();
    for feature in &bundle.features {
        for criterion in feature
            .get("acceptanceCriteria")
            .and_then(Value::as_array)
            .ok_or_else(|| "기능명세 수용 기준이 없습니다.".to_owned())?
        {
            let id = criterion
                .get("id")
                .and_then(Value::as_str)
                .ok_or_else(|| "수용 기준 ID가 없습니다.".to_owned())?;
            if !criterion_ids.insert(id.to_owned()) {
                return Err(format!("수용 기준 ID가 중복되었습니다: {id}"));
            }
        }
        if let Some(parent) = feature.get("parentId").and_then(Value::as_str) {
            if !feature_ids.contains(parent) {
                return Err(format!("기능명세 상위 노드를 찾을 수 없습니다: {parent}"));
            }
        }
    }
    for feature in &bundle.features {
        let mut seen = HashSet::new();
        let mut current = feature.get("parentId").and_then(Value::as_str);
        while let Some(parent) = current {
            if !seen.insert(parent) {
                return Err("기능명세에 순환 부모 관계가 있습니다.".into());
            }
            current = bundle
                .features
                .iter()
                .find(|item| item.get("id").and_then(Value::as_str) == Some(parent))
                .and_then(|item| item.get("parentId"))
                .and_then(Value::as_str);
        }
    }
    let flow_nodes = bundle
        .user_flow
        .get("nodes")
        .and_then(Value::as_array)
        .ok_or_else(|| "유저플로우 노드가 없습니다.".to_owned())?;
    let flow_edges = bundle
        .user_flow
        .get("edges")
        .and_then(Value::as_array)
        .ok_or_else(|| "유저플로우 연결이 없습니다.".to_owned())?;
    let flow_ids = ids(flow_nodes)?;
    ids(flow_edges)?;
    for node in flow_nodes {
        if node.get("projectId").and_then(Value::as_str) != Some(project_id) {
            return Err("유저플로우의 프로젝트 ID가 일치하지 않습니다.".into());
        }
        let lane_id = node
            .get("laneId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !lane_ids.contains(lane_id) {
            return Err(format!(
                "유저플로우 레인이 최상위 기능과 연결되지 않았습니다: {lane_id}"
            ));
        }
    }
    for edge in flow_edges {
        let source = edge
            .get("sourceNodeId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let target = edge
            .get("targetNodeId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if source == target || !flow_ids.contains(source) || !flow_ids.contains(target) {
            return Err("유저플로우 연결 대상이 올바르지 않습니다.".into());
        }
    }
    let design_nodes = bundle
        .system_design
        .get("nodes")
        .and_then(Value::as_array)
        .ok_or_else(|| "시스템 설계 노드가 없습니다.".to_owned())?;
    let design_edges = bundle
        .system_design
        .get("edges")
        .and_then(Value::as_array)
        .ok_or_else(|| "시스템 설계 연결이 없습니다.".to_owned())?;
    let design_ids = ids(design_nodes)?;
    ids(design_edges)?;
    for node in design_nodes {
        for linked in node
            .get("linkedFeatureIds")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            if !feature_ids.contains(linked) {
                return Err(format!(
                    "시스템 설계가 존재하지 않는 기능을 참조합니다: {linked}"
                ));
            }
        }
        for linked in node
            .get("linkedUserFlowIds")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            if !flow_ids.contains(linked) {
                return Err(format!(
                    "시스템 설계가 존재하지 않는 유저플로우를 참조합니다: {linked}"
                ));
            }
        }
    }
    for edge in design_edges {
        let source = edge
            .get("source")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let target = edge
            .get("target")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if source == target || !design_ids.contains(source) || !design_ids.contains(target) {
            return Err("시스템 설계 연결 대상이 올바르지 않습니다.".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn generate_project_plan_with_codex(
    app: AppHandle,
    input: GeneratePlanningInput,
) -> Result<PlanningBundle, String> {
    if input.project_name.trim().is_empty() || input.prd_markdown.trim().is_empty() {
        return Err("프로젝트명과 PRD가 필요합니다.".into());
    }
    if input.prd_markdown.chars().count() > 50_000 {
        return Err("Codex에 전달할 PRD가 50,000자를 초과했습니다.".into());
    }
    let program = crate::developer_tools::codex_program_path().ok_or_else(|| {
        "Codex CLI 연결을 찾지 못했습니다. 설정에서 연결 상태를 확인해 주세요.".to_owned()
    })?;
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let schema_path: PathBuf = cache.join(format!("planning-schema-{stamp}.json"));
    let output_path = cache.join(format!("planning-output-{stamp}.json"));
    fs::write(
        &schema_path,
        serde_json::to_vec_pretty(&schema()).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let prompt=format!("ProjectStudio의 PRD를 읽고 기능명세, 유저플로우, 시스템 설계를 하나의 JSON으로 생성하라. 프로젝트별 하드코딩이나 범용 문구 반복 없이 PRD의 실제 도메인, 사용자 역할, 데이터, 권한, 외부 연동, 정상·빈 상태·오류·복구·보안 흐름을 구체적으로 반영하라. 기능명세는 루트 1개 아래 대주제→기능→상세 기능 3단계로 30개 이상 만들고 각 기능에 검증 가능한 수용 기준 2~6개를 작성하라. 구현 상태는 모두 planned로 시작하되 MVP 핵심은 critical/high로 구분하라. 유저플로우는 실제 화면·사용자 행동·분기·완료 결과만 표현하고 기술 검증·저장 이력 문서를 화면 노드로 만들지 마라. 모든 유저플로우 laneId는 반드시 기능명세 루트 바로 아래에 있는 대주제 기능 ID 중 하나여야 한다. 대주제별 좌→우 흐름, 자연스러운 분기와 합류, 겹치지 않는 좌표를 작성하라. 시스템 설계는 클라이언트·서비스·데이터 저장소·비동기 처리·외부 시스템을 필요한 만큼 분리하고 기술, 배포, 프로토콜, 데이터 형식, 인증, 오류 복구를 명시하라. PRD에서 확정되지 않은 기술은 합리적인 MVP 후보로 제안하되 configuration에 '검토 필요'를 기록하라. 모든 ID는 영문·숫자·점·밑줄·하이픈만 사용하고 프로젝트 ID를 접두사로 사용하라. userFlow의 projectId는 정확히 '{project_id}'여야 한다. linkedFeatureIds와 linkedUserFlowIds에는 이번 JSON에 실제 존재하는 ID만 사용하라. 설명은 한국어로 작성하라. 프로젝트명: {project_name}\n프로젝트 ID: {project_id}\n\nPRD:\n{prd}",project_id=input.project_id,project_name=input.project_name.trim(),prd=input.prd_markdown);
    let mut child = Command::new(program)
        .args([
            "exec",
            "--skip-git-repo-check",
            "--ephemeral",
            "--ignore-user-config",
            "--ignore-rules",
            "--sandbox",
            "read-only",
            "--output-schema",
            &schema_path.to_string_lossy(),
            "--output-last-message",
            &output_path.to_string_lossy(),
            "-",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Codex 상세 기획 생성을 시작하지 못했습니다: {e}"))?;
    child
        .stdin
        .take()
        .ok_or_else(|| "Codex 입력을 열지 못했습니다.".to_owned())?
        .write_all(prompt.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut completed = None;
    for _ in 0..1200 {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            completed = Some(status);
            break;
        }
        thread::sleep(Duration::from_millis(250));
    }
    if completed.is_none() {
        let _ = child.kill();
        let _ = fs::remove_file(&schema_path);
        let _ = fs::remove_file(&output_path);
        return Err("Codex 상세 기획 생성 시간이 5분을 초과했습니다.".into());
    }
    if !completed.expect("checked").success() {
        let _ = fs::remove_file(&schema_path);
        let _ = fs::remove_file(&output_path);
        return Err("Codex가 상세 기획을 생성하지 못했습니다.".into());
    }
    let text = fs::read_to_string(&output_path);
    let _ = fs::remove_file(schema_path);
    let _ = fs::remove_file(output_path);
    let text = text.map_err(|e| format!("Codex 결과를 읽지 못했습니다: {e}"))?;
    let bundle: PlanningBundle = serde_json::from_str(&text)
        .map_err(|e| format!("Codex 기획 결과 형식이 올바르지 않습니다: {e}"))?;
    validate(&bundle, &input.project_id)?;
    Ok(bundle)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn planning_schema_requires_detailed_artifacts() {
        let value = schema();
        assert_eq!(value["properties"]["features"]["minItems"], 30);
        assert_eq!(
            value["properties"]["systemDesign"]["properties"]["nodes"]["minItems"],
            6
        );
        assert_eq!(
            value["properties"]["userFlow"]["properties"]["nodes"]["minItems"],
            20
        );
    }
}
