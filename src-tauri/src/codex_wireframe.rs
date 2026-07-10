use serde::{Deserialize, Serialize};
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
pub struct WireframeInputPage {
    source_node_id: String,
    title: String,
    description: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInput {
    project_name: String,
    device: String,
    pages: Vec<WireframeInputPage>,
    additional_request: String,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedBlock {
    kind: String,
    label: String,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedPage {
    source_node_id: String,
    title: String,
    summary: String,
    blocks: Vec<GeneratedBlock>,
}
#[derive(Deserialize, Serialize)]
struct GeneratedEnvelope {
    pages: Vec<GeneratedPage>,
}
fn schema() -> &'static str {
    r#"{"type":"object","additionalProperties":false,"required":["pages"],"properties":{"pages":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["sourceNodeId","title","summary","blocks"],"properties":{"sourceNodeId":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"},"blocks":{"type":"array","minItems":2,"maxItems":8,"items":{"type":"object","additionalProperties":false,"required":["kind","label"],"properties":{"kind":{"type":"string","enum":["navigation","hero","search","form","cards","list","detail","actions"]},"label":{"type":"string"}}}}}}}}}"#
}
fn validate(
    input: &GenerateInput,
    result: GeneratedEnvelope,
) -> Result<Vec<GeneratedPage>, String> {
    if result.pages.len() != input.pages.len() {
        return Err("Codex가 선택한 페이지 수와 다른 결과를 반환했습니다.".to_owned());
    }
    for requested in &input.pages {
        let Some(page) = result
            .pages
            .iter()
            .find(|page| page.source_node_id == requested.source_node_id)
        else {
            return Err(format!(
                "Codex 결과에서 '{}' 페이지를 찾지 못했습니다.",
                requested.title
            ));
        };
        if page.title.trim().is_empty() || page.summary.trim().is_empty() || page.blocks.len() < 2 {
            return Err("Codex 와이어프레임 결과가 비어 있습니다.".to_owned());
        }
    }
    Ok(result.pages)
}
#[tauri::command]
pub async fn generate_wireframes_with_codex(
    app: AppHandle,
    input: GenerateInput,
) -> Result<Vec<GeneratedPage>, String> {
    if input.pages.is_empty() || input.pages.len() > 30 {
        return Err("한 번에 1~30개 페이지를 선택해 주세요.".to_owned());
    }
    if !matches!(input.device.as_str(), "desktop" | "mobile") {
        return Err("디바이스 유형을 확인해 주세요.".to_owned());
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
    let schema_path: PathBuf = cache.join(format!("wireframe-schema-{stamp}.json"));
    let output_path: PathBuf = cache.join(format!("wireframe-output-{stamp}.json"));
    fs::write(&schema_path, schema()).map_err(|e| e.to_string())?;
    let page_context = input
        .pages
        .iter()
        .map(|p| {
            format!(
                "- sourceNodeId: {}\n  title: {}\n  description: {}",
                p.source_node_id, p.title, p.description
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let prompt=format!("ProjectStudio에서 실제 구현 전 모습을 확인할 저충실도 와이어프레임을 설계하라. 코드를 작성하거나 파일을 읽지 말고 제공된 문맥만 사용한다. 프로젝트: {}. 디바이스: {}. 각 페이지마다 사용자가 목적을 달성하는 데 필요한 화면 영역을 2~8개 블록으로 제안하고 원래 sourceNodeId를 그대로 반환한다. 장식보다 정보 계층, 입력, 탐색, 상태, 주요 행동을 구체적으로 표현한다. 추가 요청: {}\n\n선택 페이지:\n{}",input.project_name,input.device,if input.additional_request.trim().is_empty(){"없음"}else{input.additional_request.trim()},page_context);
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
        .map_err(|e| format!("Codex 생성을 시작하지 못했습니다: {e}"))?;
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
        return Err("Codex 와이어프레임 생성 시간이 3분을 초과했습니다.".to_owned());
    }
    let status = completed.expect("checked");
    if !status.success() {
        let _ = fs::remove_file(&schema_path);
        return Err("Codex가 와이어프레임을 생성하지 못했습니다. 연결 또는 Codex 사용 상태를 확인해 주세요.".to_owned());
    }
    let text = fs::read_to_string(&output_path)
        .map_err(|e| format!("Codex 결과를 읽지 못했습니다: {e}"))?;
    let _ = fs::remove_file(schema_path);
    let _ = fs::remove_file(output_path);
    let result: GeneratedEnvelope = serde_json::from_str(&text)
        .map_err(|e| format!("Codex 결과 형식이 올바르지 않습니다: {e}"))?;
    validate(&input, result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_missing_pages() {
        let input = GenerateInput {
            project_name: "p".into(),
            device: "desktop".into(),
            pages: vec![WireframeInputPage {
                source_node_id: "1".into(),
                title: "홈".into(),
                description: "".into(),
            }],
            additional_request: "".into(),
        };
        assert!(validate(&input, GeneratedEnvelope { pages: vec![] }).is_err());
    }
}
