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
    project_type: String,
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

fn validate(bundle: &PlanningBundle, project_id: &str, project_type: &str) -> Result<(), String> {
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
    let is_interface_project = matches!(
        project_type,
        "web" | "mobile" | "desktop" | "general" | "auto"
    );
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
    let forbidden_flow_terms = [
        "RLS",
        "SQL",
        "데이터베이스",
        "URL 안전 검증",
        "권한 검사",
        "캐시 갱신",
        "토큰 갱신",
        "토큰 저장",
        "내부 처리",
    ];
    for node in flow_nodes {
        let title = node
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if is_interface_project && forbidden_flow_terms.iter().any(|term| title.contains(term)) {
            return Err(format!(
                "유저플로우에 내부 구현 단계가 포함되었습니다: {title}"
            ));
        }
        if node.get("kind").and_then(Value::as_str) == Some("decision") {
            let outgoing = flow_edges
                .iter()
                .filter(|edge| {
                    edge.get("sourceNodeId").and_then(Value::as_str)
                        == node.get("id").and_then(Value::as_str)
                })
                .count();
            if outgoing < 2 {
                return Err(format!(
                    "유저플로우 분기 노드에는 두 개 이상의 경로가 필요합니다: {title}"
                ));
            }
        }
    }
    for lane_id in &lane_ids {
        let lane_nodes = flow_nodes
            .iter()
            .filter(|node| node.get("laneId").and_then(Value::as_str) == Some(*lane_id))
            .collect::<Vec<_>>();
        if lane_nodes.is_empty() {
            continue;
        }
        let has_start = lane_nodes
            .iter()
            .any(|node| node.get("kind").and_then(Value::as_str) == Some("phase"));
        let has_result = lane_nodes
            .iter()
            .any(|node| node.get("kind").and_then(Value::as_str) == Some("result"));
        if !has_start || !has_result {
            return Err(if is_interface_project {
                "각 유저플로우에는 시작과 사용자가 확인하는 결과가 필요합니다."
            } else {
                "각 실행 파이프라인에는 시작과 산출물 결과가 필요합니다."
            }
            .into());
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
    if !matches!(
        input.project_type.as_str(),
        "auto"
            | "web"
            | "mobile"
            | "desktop"
            | "backend_cli"
            | "machine_learning"
            | "data_analysis"
            | "general"
    ) {
        return Err("지원하지 않는 프로젝트 유형입니다.".into());
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
    let workflow_rules = if matches!(
        input.project_type.as_str(),
        "web" | "mobile" | "desktop" | "general" | "auto"
    ) {
        "userFlow는 기능명세를 복사하지 말고 실제 화면 이동만 작성한다. 각 레인은 시작(phase)→현재 화면(screen)→구체적인 클릭·입력(action)→다음 화면 또는 사용자가 보는 완료(result)를 갖는다. 내부 구현을 사용자 행동으로 쓰지 마라."
    } else {
        "userFlow 필드는 호환 가능한 실행 파이프라인으로 사용한다. 화면과 버튼을 만들지 말고 입력·데이터 수집→검증·정제→핵심 처리·학습·분석→평가·산출물(result)을 좌→우로 작성한다. 머신러닝은 시간 분할, 누수 검사, 기준선, 학습, 평가와 모델 버전을 포함하고 데이터 분석은 스키마, 병합 키·카디널리티, 결측·중복·이상치, 분석과 결과 계보를 포함한다."
    };
    let prompt=format!("ProjectStudio의 PRD를 읽고 기능명세, 작업 흐름, 시스템 설계를 하나의 JSON으로 생성하라. 프로젝트 유형은 {project_type}이며 유형에 맞지 않는 화면이나 단계를 억지로 만들지 마라. 기능명세는 루트 1개 아래 대주제→하위 기능→처리·결과·검증 규칙의 3~4단계 트리로 30개 이상 만들고 각 기능에 검증 가능한 수용 기준 2~6개를 작성한다. {workflow_rules} 모든 userFlow laneId는 기능명세 루트 바로 아래 대주제 ID여야 하고 각 레인은 phase와 result를 포함한다. 시스템 설계는 실행 환경·서비스·데이터 저장소·비동기 처리·외부 시스템을 필요한 만큼 분리하고 기술, 배포, 프로토콜, 데이터 형식, 인증, 오류 복구를 명시하라. 모든 ID는 영문·숫자·점·밑줄·하이픈만 사용하며 userFlow projectId는 '{project_id}'여야 한다. 실제 존재하는 ID만 추적 링크에 사용하고 설명은 한국어로 작성하라. 프로젝트명: {project_name}\n프로젝트 ID: {project_id}\n\nPRD:\n{prd}",project_type=input.project_type,workflow_rules=workflow_rules,project_id=input.project_id,project_name=input.project_name.trim(),prd=input.prd_markdown);
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
    validate(&bundle, &input.project_id, &input.project_type)?;
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
