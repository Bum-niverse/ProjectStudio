use crate::system_design_repository::{validate_snapshot, SystemSnapshot};
use serde::Deserialize;
use sqlx::{Connection, SqliteConnection};
use std::{
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
pub struct ContextItem {
    id: String,
    title: String,
    description: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInput {
    #[serde(default)]
    project_id: String,
    project_name: String,
    #[serde(default)]
    repository_path: String,
    current_snapshot: SystemSnapshot,
    features: Vec<ContextItem>,
    user_flows: Vec<ContextItem>,
    additional_request: String,
}
fn schema() -> &'static str {
    r#"{"type":"object","additionalProperties":false,"required":["schemaVersion","title","summary","viewType","architecturePattern","nodes","edges"],"properties":{"schemaVersion":{"type":"integer","const":1},"title":{"type":"string","minLength":1},"summary":{"type":"string"},"viewType":{"type":"string","enum":["structural","runtime","deployment","development"]},"architecturePattern":{"type":"string","enum":["auto","layered","hub_spoke","pipeline","event_driven","deployment"]},"nodes":{"type":"array","maxItems":80,"items":{"type":"object","additionalProperties":false,"required":["id","type","name","description","technology","deployment","status","linkedFeatureIds","linkedUserFlowIds","linkedWireframeIds","codePaths","testPaths","configuration","position","size"],"properties":{"id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"type":{"type":"string","enum":["client","service","database","cache","queue","external","component","group"]},"name":{"type":"string","minLength":1},"description":{"type":"string"},"technology":{"type":"string"},"deployment":{"type":"string"},"status":{"type":"string","enum":["planned","active","deprecated"]},"linkedFeatureIds":{"type":"array","items":{"type":"string"}},"linkedUserFlowIds":{"type":"array","items":{"type":"string"}},"linkedWireframeIds":{"type":"array","items":{"type":"string"}},"codePaths":{"type":"array","items":{"type":"string"}},"testPaths":{"type":"array","items":{"type":"string"}},"configuration":{"type":"string"},"position":{"type":"object","additionalProperties":false,"required":["x","y"],"properties":{"x":{"type":"number","minimum":-100000,"maximum":100000},"y":{"type":"number","minimum":-100000,"maximum":100000}}},"size":{"type":"object","additionalProperties":false,"required":["width","height"],"properties":{"width":{"type":"number","exclusiveMinimum":0,"maximum":2000},"height":{"type":"number","exclusiveMinimum":0,"maximum":2000}}}}}},"edges":{"type":"array","maxItems":160,"items":{"type":"object","additionalProperties":false,"required":["id","source","target","type","protocol","dataFormat","isAsync","authentication","errorHandling","description"],"properties":{"id":{"type":"string","pattern":"^[A-Za-z0-9._-]+$"},"source":{"type":"string"},"target":{"type":"string"},"type":{"type":"string","enum":["http","ipc","database_query","event","file","dependency"]},"protocol":{"type":"string"},"dataFormat":{"type":"string"},"isAsync":{"type":"boolean"},"authentication":{"type":"string"},"errorHandling":{"type":"string"},"description":{"type":"string"}}}}}}"#
}
#[tauri::command]
pub async fn generate_system_design_with_codex(
    app: AppHandle,
    input: GenerateInput,
) -> Result<SystemSnapshot, String> {
    validate_snapshot(&input.current_snapshot)?;
    if input.features.len() > 200 || input.user_flows.len() > 200 {
        return Err("Codex에 전달할 기획 항목이 너무 많습니다.".into());
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
    let schema_path: PathBuf = cache.join(format!("system-design-schema-{stamp}.json"));
    let output_path = cache.join(format!("system-design-output-{stamp}.json"));
    fs::write(&schema_path, schema()).map_err(|e| e.to_string())?;
    let items = |values: &[ContextItem]| {
        values
            .iter()
            .map(|item| {
                format!(
                    "- {} | {} | {}",
                    item.id,
                    item.title,
                    item.description.replace(['\r', '\n'], " ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let current =
        serde_json::to_string_pretty(&input.current_snapshot).map_err(|e| e.to_string())?;
    let database_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("projectstudio.db");
    let mut database = SqliteConnection::connect_with(
        &sqlx::sqlite::SqliteConnectOptions::new()
            .filename(database_path)
            .foreign_keys(true),
    )
    .await
    .map_err(|e| e.to_string())?;
    let effective_project_id = if input.project_id.is_empty() {
        input
            .current_snapshot
            .nodes
            .iter()
            .find_map(|node| node.id.strip_suffix("-client"))
            .unwrap_or_default()
    } else {
        &input.project_id
    };
    let prd = sqlx::query_scalar::<_, String>("SELECT r.content_markdown FROM documents d JOIN document_revisions r ON r.id=d.current_revision_id WHERE d.project_id=? AND d.document_type='prd'")
        .bind(effective_project_id).fetch_optional(&mut database).await.map_err(|e| e.to_string())?.unwrap_or_default();
    let repository = fs::canonicalize(input.repository_path.trim())
        .ok()
        .filter(|path| path.join(".git").is_dir());
    let prompt=format!("ProjectStudio의 시스템 설계 변경안을 JSON으로 작성하라. 먼저 PRD와 기능명세에서 architectural drivers, quality attributes, constraints, 주요 시나리오를 추출하고 후보 구조와 trade-off를 검토한 뒤 가장 타당한 구조를 제안하라. viewType은 structural을 기본으로 하고 architecturePattern은 그래프 구조에 맞춰 auto, layered, hub_spoke, pipeline, event_driven, deployment 중 하나를 선택하라. 요구사항 관계를 추측으로 확정하지 말고 근거가 약한 연결은 summary와 configuration에 검토 필요로 기록하라. 제공된 안정 ID만 linkedFeatureIds와 linkedUserFlowIds에 사용한다. 현재 설계를 직접 수정하지 말고 완전한 제안 snapshot을 반환한다. 자기 연결·중복 연결·존재하지 않는 노드 연결을 만들지 않는다. 컴포넌트는 좌→우로 읽히게 배치하고 통신 프로토콜·인증·오류 처리를 구체적으로 작성한다. 연결된 저장소가 작업 디렉터리라면 기존 모듈·기술 스택·테스트 경로를 읽기 전용으로 확인해 codePaths와 testPaths에 반영한다. 프로젝트: {}. 저장소: {}. 추가 요청: {}\n\nPRD:\n{}\n\n현재 설계:\n{}\n\n기능명세:\n{}\n\n유저플로우:\n{}",input.project_name,repository.as_ref().map_or("연결 안 됨".into(),|path|path.to_string_lossy().into_owned()),if input.additional_request.trim().is_empty(){"없음"}else{input.additional_request.trim()},prd.chars().take(40_000).collect::<String>(),current,items(&input.features),items(&input.user_flows));
    let mut command = Command::new(program);
    if let Some(path) = &repository {
        command.current_dir(path);
    }
    let mut child = command
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
        .map_err(|e| format!("Codex 시스템 설계를 시작하지 못했습니다: {e}"))?;
    child
        .stdin
        .take()
        .ok_or_else(|| "Codex 입력을 열지 못했습니다.".to_owned())?
        .write_all(prompt.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut completed = None;
    for _ in 0..720 {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            completed = Some(status);
            break;
        }
        thread::sleep(Duration::from_millis(250));
    }
    if completed.is_none() {
        let _ = child.kill();
        let _ = fs::remove_file(&schema_path);
        return Err("Codex 시스템 설계 생성 시간이 3분을 초과했습니다.".into());
    }
    if !completed.expect("checked").success() {
        let _ = fs::remove_file(&schema_path);
        return Err("Codex가 시스템 설계를 생성하지 못했습니다.".into());
    }
    let text = fs::read_to_string(&output_path)
        .map_err(|e| format!("Codex 결과를 읽지 못했습니다: {e}"))?;
    let _ = fs::remove_file(schema_path);
    let _ = fs::remove_file(output_path);
    let result: SystemSnapshot = serde_json::from_str(&text)
        .map_err(|e| format!("Codex 결과 형식이 올바르지 않습니다: {e}"))?;
    validate_snapshot(&result)?;
    Ok(result)
}
