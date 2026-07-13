use crate::system_design_repository::SystemSnapshot;
use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportProjectInput {
    project_id: String,
    output_directory: String,
    formats: Vec<String>,
    sections: Vec<String>,
    llm_targets: Vec<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportProjectResult {
    output_path: String,
    files: Vec<String>,
}
struct ProjectData {
    name: String,
    idea: String,
    prd: String,
    features: Vec<FeatureRow>,
    flows: Vec<FlowRow>,
    system_design: Option<SystemSnapshot>,
}
struct FeatureRow {
    id: String,
    parent_id: Option<String>,
    title: String,
    description: String,
    status: String,
    priority: String,
    role: String,
    criteria: String,
}
struct FlowRow {
    id: String,
    lane_id: String,
    title: String,
    description: String,
    kind: String,
}

fn csv(value: &str) -> String {
    format!(
        "\"{}\"",
        value.replace('"', "\"\"").replace(['\r', '\n'], " ")
    )
}
fn html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
fn safe_name(value: &str) -> String {
    let cleaned = value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    if cleaned.is_empty() {
        "project".to_owned()
    } else {
        cleaned
    }
}
async fn open_database(app: &AppHandle) -> Result<SqliteConnection, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("projectstudio.db");
    SqliteConnection::connect_with(
        &sqlx::sqlite::SqliteConnectOptions::new()
            .filename(path)
            .foreign_keys(true),
    )
    .await
    .map_err(|e| e.to_string())
}
async fn load_data(app: &AppHandle, project_id: &str) -> Result<ProjectData, String> {
    let mut db = open_database(app).await?;
    let project = sqlx::query("SELECT name, idea FROM projects WHERE id=?")
        .bind(project_id)
        .fetch_optional(&mut db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "내보낼 프로젝트를 찾지 못했습니다.".to_owned())?;
    let name: String = project.try_get("name").map_err(|e| e.to_string())?;
    let idea: String = project.try_get("idea").map_err(|e| e.to_string())?;
    let prd=sqlx::query_scalar::<_,String>("SELECT r.content_markdown FROM documents d JOIN document_revisions r ON r.id=d.current_revision_id WHERE d.project_id=? AND d.document_type='prd'").bind(project_id).fetch_optional(&mut db).await.map_err(|e|e.to_string())?.unwrap_or_default();
    let rows=sqlx::query("SELECT id,parent_feature_id,title,description,status,priority,role FROM features WHERE project_id=? ORDER BY sort_order").bind(project_id).fetch_all(&mut db).await.map_err(|e|e.to_string())?;
    let mut features = Vec::new();
    for row in rows {
        let id: String = row.try_get("id").map_err(|e| e.to_string())?;
        let criteria = sqlx::query_scalar::<_, String>(
            "SELECT description FROM acceptance_criteria WHERE feature_id=? ORDER BY sort_order",
        )
        .bind(&id)
        .fetch_all(&mut db)
        .await
        .map_err(|e| e.to_string())?
        .join(" | ");
        features.push(FeatureRow {
            id,
            parent_id: row
                .try_get("parent_feature_id")
                .map_err(|e| e.to_string())?,
            title: row.try_get("title").map_err(|e| e.to_string())?,
            description: row.try_get("description").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            priority: row.try_get("priority").map_err(|e| e.to_string())?,
            role: row.try_get("role").map_err(|e| e.to_string())?,
            criteria,
        });
    }
    let flows=sqlx::query("SELECT id,lane_id,title,description,kind FROM user_flow_nodes WHERE project_id=? ORDER BY position_y,position_x").bind(project_id).fetch_all(&mut db).await.map_err(|e|e.to_string())?.into_iter().map(|row|Ok(FlowRow{id:row.try_get("id").map_err(|e|e.to_string())?,lane_id:row.try_get("lane_id").map_err(|e|e.to_string())?,title:row.try_get("title").map_err(|e|e.to_string())?,description:row.try_get("description").map_err(|e|e.to_string())?,kind:row.try_get("kind").map_err(|e|e.to_string())?})).collect::<Result<Vec<_>,String>>()?;
    let system_design = sqlx::query_scalar::<_, String>("SELECT r.snapshot_json FROM system_designs d JOIN system_design_revisions r ON r.id=d.current_revision_id WHERE d.project_id=?")
        .bind(project_id).fetch_optional(&mut db).await.map_err(|e|e.to_string())?
        .map(|value| serde_json::from_str(&value).map_err(|e| format!("시스템 설계 데이터가 손상되었습니다: {e}"))).transpose()?;
    Ok(ProjectData {
        name,
        idea,
        prd,
        features,
        flows,
        system_design,
    })
}
fn markdown(data: &ProjectData, sections: &[String]) -> String {
    let mut out = format!("# {}\n", data.name);
    if sections.iter().any(|s| s == "project") {
        out.push_str(&format!("\n## 아이디어\n\n{}\n", data.idea));
    }
    if sections.iter().any(|s| s == "prd") {
        out.push_str(&format!("\n## PRD\n\n{}\n", data.prd));
    }
    if sections.iter().any(|s| s == "features") {
        out.push_str("\n## 기능명세\n");
        for f in &data.features {
            out.push_str(&format!("\n### {} [{}]\n\n- ID: `{}`\n- 부모: `{}`\n- 상태/중요도: {} / {}\n- 역할: {}\n- 설명: {}\n- 수용 기준: {}\n",f.title,f.status,f.id,f.parent_id.as_deref().unwrap_or("root"),f.status,f.priority,f.role,f.description,f.criteria));
        }
    }
    if sections.iter().any(|s| s == "user-flow") {
        out.push_str("\n## 유저플로우\n");
        for flow in &data.flows {
            out.push_str(&format!(
                "\n- [{}] **{}** - {} (lane: `{}`)\n",
                flow.kind, flow.title, flow.description, flow.lane_id
            ));
        }
    }
    if sections.iter().any(|s| s == "system-design") {
        if let Some(design) = &data.system_design {
            out.push_str(&format!("\n## 시스템 설계\n\n{}\n", design.summary));
            for node in &design.nodes {
                out.push_str(&format!("\n### {} (`{}`)\n\n- 유형/기술: {} / {}\n- 배포: {}\n- 설명: {}\n- 기능 링크: {}\n- 코드: {}\n", node.name, node.id, node.r#type, node.technology, node.deployment, node.description, node.linked_feature_ids.join(", "), node.code_paths.join(", ")));
            }
            out.push_str("\n### 연결\n");
            for edge in &design.edges {
                out.push_str(&format!(
                    "\n- `{}` → `{}`: {} / {} / {}\n",
                    edge.source, edge.target, edge.r#type, edge.protocol, edge.description
                ));
            }
        } else {
            out.push_str("\n## 시스템 설계\n\n아직 저장된 시스템 설계가 없습니다.\n");
        }
    }
    out
}
fn system_design_mermaid(design: &SystemSnapshot) -> String {
    let mut out = String::from("flowchart LR\n");
    for node in &design.nodes {
        out.push_str(&format!(
            "  {}[\"{}\"]\n",
            safe_name(&node.id),
            node.name.replace('"', "'")
        ));
    }
    for edge in &design.edges {
        out.push_str(&format!(
            "  {} -->|{}| {}\n",
            safe_name(&edge.source),
            edge.protocol.replace('|', "/"),
            safe_name(&edge.target)
        ));
    }
    out
}
fn prompt(target: &str, context_file: &str) -> String {
    format!("# {target} 개발 실행 프롬프트\n\n당신은 이 프로젝트의 구현 에이전트다. 먼저 `{context_file}` 전체를 읽고 ID와 계층 관계를 보존한다.\n\n1. PRD, 기능명세, 수용 기준, 유저플로우 사이의 불일치를 먼저 보고한다.\n2. 요청된 기능 ID의 영향 범위를 확인하고 관련 코드와 테스트를 찾는다.\n3. 구현 전 변경 파일과 검증 계획을 제시한다.\n4. 최소 범위로 구현하고 테스트·린트·빌드를 실행한다.\n5. 완료 후 기능 ID별 변경 파일, 커밋 후보, 테스트 결과와 남은 위험을 요약한다.\n\n사용자가 별도 기능을 지정하지 않았다면 우선순위가 높고 미완료인 기능 하나를 제안하되 코드는 수정하지 않는다.\n")
}
fn report_html(data: &ProjectData, sections: &[String]) -> String {
    let mut body = String::new();
    if sections.iter().any(|s| s == "project") {
        body.push_str(&format!(
            "<section><h2>프로젝트 개요</h2><p>{}</p></section>",
            html(&data.idea)
        ));
    }
    if sections.iter().any(|s| s == "prd") {
        body.push_str(&format!(
            "<section><h2>PRD</h2><pre>{}</pre></section>",
            html(&data.prd)
        ));
    }
    if sections.iter().any(|s| s == "features") {
        body.push_str("<section><h2>기능명세와 수용 기준</h2><table><thead><tr><th>ID</th><th>기능</th><th>상태</th><th>중요도</th></tr></thead><tbody>");
        for f in &data.features {
            body.push_str(&format!("<tr><td>{}</td><td><strong>{}</strong><br><small>{}</small><br><small>수용 기준: {}</small></td><td>{}</td><td>{}</td></tr>",html(&f.id),html(&f.title),html(&f.description),html(&f.criteria),html(&f.status),html(&f.priority)));
        }
        body.push_str("</tbody></table></section>");
    }
    if sections.iter().any(|s| s == "user-flow") {
        body.push_str("<section><h2>유저플로우</h2><table><thead><tr><th>종류</th><th>단계</th><th>설명</th></tr></thead><tbody>");
        for f in &data.flows {
            body.push_str(&format!(
                "<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
                html(&f.kind),
                html(&f.title),
                html(&f.description)
            ));
        }
        body.push_str("</tbody></table></section>");
    }
    if sections.iter().any(|s| s == "system-design") {
        body.push_str("<section><h2>시스템 설계</h2>");
        if let Some(design) = &data.system_design {
            body.push_str(&format!("<p>{}</p><table><thead><tr><th>컴포넌트</th><th>유형·기술</th><th>연결된 기획</th></tr></thead><tbody>", html(&design.summary)));
            for node in &design.nodes {
                body.push_str(&format!("<tr><td><strong>{}</strong><br><small>{}</small></td><td>{}<br>{}</td><td>{}</td></tr>", html(&node.name), html(&node.description), html(&node.r#type), html(&node.technology), html(&node.linked_feature_ids.join(", "))));
            }
            body.push_str("</tbody></table>");
        } else {
            body.push_str("<p>아직 저장된 시스템 설계가 없습니다.</p>");
        }
        body.push_str("</section>");
    }
    format!("<!doctype html><html lang='ko'><meta charset='utf-8'><style>@page{{size:A4;margin:16mm}}html,body{{background:#fff}}body{{font-family:'Malgun Gothic','Segoe UI',sans-serif;color:#202124;font-size:9pt;line-height:1.5}}h1{{font-size:25pt;border-bottom:3px solid #202124;padding-bottom:8px}}h2{{font-size:16pt;margin-top:24px;page-break-after:avoid}}pre{{white-space:pre-wrap;font-family:'Malgun Gothic',sans-serif}}table{{width:100%;border-collapse:collapse;font-size:8pt}}thead{{display:table-header-group}}tr{{page-break-inside:avoid}}th,td{{padding:7px;border:1px solid #d0d0d0;vertical-align:top;text-align:left}}th{{background:#f0f0f0}}small,.meta{{color:#666}}</style><body><p class='meta'>ProjectStudio 기획 데이터 내보내기</p><h1>{}</h1>{}</body></html>",html(&data.name),body)
}
fn edge_path() -> Option<PathBuf> {
    [
        env::var("PROGRAMFILES(X86)").ok(),
        env::var("PROGRAMFILES").ok(),
    ]
    .into_iter()
    .flatten()
    .map(|root| PathBuf::from(root).join("Microsoft/Edge/Application/msedge.exe"))
    .find(|path| path.is_file())
}
fn create_pdf(html_path: &Path, pdf_path: &Path) -> Result<(), String> {
    let edge = edge_path()
        .ok_or_else(|| "PDF 생성을 위한 Microsoft Edge를 찾지 못했습니다.".to_owned())?;
    let url = format!("file:///{}", html_path.to_string_lossy().replace('\\', "/"));
    let profile_path = pdf_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(".edge-profile");
    let output = Command::new(edge)
        .args([
            "--headless",
            "--disable-gpu",
            &format!("--user-data-dir={}", profile_path.to_string_lossy()),
            "--no-pdf-header-footer",
            &format!("--print-to-pdf={}", pdf_path.to_string_lossy()),
            &url,
        ])
        .output()
        .map_err(|e| format!("PDF 생성기를 실행하지 못했습니다: {e}"))?;
    thread::sleep(Duration::from_secs(3));
    for _ in 0..100 {
        if pdf_path.metadata().is_ok_and(|metadata| metadata.len() > 0) {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    let _ = fs::remove_dir_all(profile_path);
    if !output.status.success() || !pdf_path.is_file() {
        return Err("PDF 파일을 생성하지 못했습니다.".to_owned());
    }
    Ok(())
}

#[tauri::command]
pub async fn export_project_package(
    app: AppHandle,
    input: ExportProjectInput,
) -> Result<ExportProjectResult, String> {
    if input.formats.is_empty() {
        return Err("내보낼 형식을 하나 이상 선택해 주세요.".to_owned());
    }
    let base = fs::canonicalize(input.output_directory.trim())
        .map_err(|e| format!("내보내기 경로를 열 수 없습니다: {e}"))?;
    if !base.is_dir() {
        return Err("내보내기 경로가 폴더가 아닙니다.".to_owned());
    }
    let data = load_data(&app, &input.project_id).await?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let output = base
        .join("ProjectStudio-Exports")
        .join(format!("{}-{stamp}", safe_name(&data.name)));
    fs::create_dir_all(&output).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    let context = markdown(&data, &input.sections);
    if input.formats.iter().any(|f| f == "markdown") {
        let name = "project-context.md";
        fs::write(output.join(name), &context).map_err(|e| e.to_string())?;
        files.push(name.to_owned());
        for target in &input.llm_targets {
            let file = format!("PROMPT-{}.md", target.to_uppercase().replace(' ', "-"));
            fs::write(output.join(&file), prompt(target, name)).map_err(|e| e.to_string())?;
            files.push(file);
        }
    }
    if input.sections.iter().any(|s| s == "system-design") {
        if let Some(design) = &data.system_design {
            if input.formats.iter().any(|f| f == "json") {
                fs::write(
                    output.join("system-design.json"),
                    serde_json::to_string_pretty(design).map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                files.push("system-design.json".to_owned());
            }
            if input.formats.iter().any(|f| f == "markdown") {
                fs::write(
                    output.join("system-design.mmd"),
                    system_design_mermaid(design),
                )
                .map_err(|e| e.to_string())?;
                files.push("system-design.mmd".to_owned());
            }
        }
    }
    if input.formats.iter().any(|f| f == "csv") && input.sections.iter().any(|s| s == "features") {
        let mut features =
            "id,parent_id,title,description,status,priority,role,acceptance_criteria\r\n"
                .to_owned();
        for f in &data.features {
            features.push_str(
                &[
                    csv(&f.id),
                    csv(f.parent_id.as_deref().unwrap_or("")),
                    csv(&f.title),
                    csv(&f.description),
                    csv(&f.status),
                    csv(&f.priority),
                    csv(&f.role),
                    csv(&f.criteria),
                ]
                .join(","),
            );
            features.push_str("\r\n");
        }
        fs::write(output.join("features.csv"), features).map_err(|e| e.to_string())?;
        files.push("features.csv".to_owned());
    }
    if input.formats.iter().any(|f| f == "csv") && input.sections.iter().any(|s| s == "user-flow") {
        let mut flows = "id,lane_id,title,description,kind\r\n".to_owned();
        for f in &data.flows {
            flows.push_str(
                &[
                    csv(&f.id),
                    csv(&f.lane_id),
                    csv(&f.title),
                    csv(&f.description),
                    csv(&f.kind),
                ]
                .join(","),
            );
            flows.push_str("\r\n");
        }
        fs::write(output.join("user-flow.csv"), flows).map_err(|e| e.to_string())?;
        files.push("user-flow.csv".to_owned());
    }
    if input.formats.iter().any(|f| f == "pdf") {
        let html_path = output.join("report.tmp.html");
        let pdf_path = output.join("project-report.pdf");
        fs::write(&html_path, report_html(&data, &input.sections)).map_err(|e| e.to_string())?;
        let result = create_pdf(&html_path, &pdf_path);
        let _ = fs::remove_file(html_path);
        result?;
        files.push("project-report.pdf".to_owned());
    }
    Ok(ExportProjectResult {
        output_path: output.to_string_lossy().into_owned(),
        files,
    })
}

#[cfg(test)]
mod tests {
    use super::{csv, prompt};

    #[test]
    fn escapes_csv_cells_and_builds_llm_prompt() {
        assert_eq!(csv("제목, \"인용\"\n다음"), "\"제목, \"\"인용\"\" 다음\"");
        let text = prompt("Codex", "project-context.md");
        assert!(text.contains("project-context.md"));
        assert!(text.contains("수용 기준"));
    }
}
