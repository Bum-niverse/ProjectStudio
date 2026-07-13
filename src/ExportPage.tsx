import { invoke, isTauri } from "@tauri-apps/api/core";
import { useState } from "react";

interface Props { projectId: string; projectName: string }
interface ExportResult { outputPath: string; files: string[] }

const FORMATS = [
  { id: "csv", name: "CSV 묶음", description: "기능명세와 유저플로우를 표 데이터로 저장" },
  { id: "pdf", name: "PDF 보고서", description: "PRD부터 시스템 설계까지 읽기 좋은 기획서로 정리" },
  { id: "markdown", name: "LLM Markdown", description: "구조화된 전체 문맥과 도구별 실행 프롬프트 생성" },
  { id: "json", name: "시스템 설계 JSON", description: "노드·연결·위치·기획 링크를 기계 판독 형식으로 저장" },
] as const;
const SECTIONS = [
  { id: "project", name: "프로젝트 개요" }, { id: "prd", name: "PRD" },
  { id: "features", name: "기능명세·수용 기준" }, { id: "user-flow", name: "유저플로우" },
  { id: "system-design", name: "시스템 설계" },
] as const;
const TARGETS = ["Codex", "Claude", "Antigravity", "Generic LLM"];

export function ExportPage({ projectId, projectName }: Props) {
  const [formats, setFormats] = useState<string[]>(FORMATS.map(item => item.id));
  const [sections, setSections] = useState<string[]>(SECTIONS.map(item => item.id));
  const [targets, setTargets] = useState<string[]>(["Codex", "Claude", "Generic LLM"]);
  const [outputDirectory, setOutputDirectory] = useState(() => localStorage.getItem("projectstudio:repository-path") ?? "");
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("내보낼 형식과 문서 범위를 선택해 주세요.");
  const [result, setResult] = useState<ExportResult>();
  const toggle = (value: string, current: string[], set: (value: string[]) => void) => set(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  async function exportPackage() {
    setIsExporting(true); setResult(undefined);
    try {
      if (!isTauri()) throw new Error("내보내기는 데스크톱 앱에서 사용할 수 있습니다.");
      const exported = await invoke<ExportResult>("export_project_package", { input: { projectId, outputDirectory: outputDirectory.trim(), formats, sections, llmTargets: targets } });
      setResult(exported); setMessage(`${exported.files.length}개 파일을 로컬 폴더에 생성했습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setIsExporting(false); }
  }
  return <section className="export-page"><header><p className="eyebrow">07 · EXPORT & HANDOFF</p><h2>{projectName} 내보내기</h2><p>정리된 기획 데이터를 사람이 읽는 보고서와 LLM이 바로 사용할 개발 문맥으로 만듭니다.</p></header><div className="export-grid"><section><h3>파일 형식</h3><div className="export-option-grid">{FORMATS.map(item => <label className={formats.includes(item.id) ? "selected" : ""} key={item.id}><input checked={formats.includes(item.id)} onChange={() => toggle(item.id, formats, setFormats)} type="checkbox"/><span><strong>{item.name}</strong><small>{item.description}</small></span></label>)}</div></section><section><h3>포함할 문서</h3><div className="export-check-list">{SECTIONS.map(item => <label key={item.id}><input checked={sections.includes(item.id)} onChange={() => toggle(item.id, sections, setSections)} type="checkbox"/>{item.name}</label>)}</div></section><section><h3>LLM 실행 프롬프트</h3><p>선택한 도구마다 동일한 프로젝트 문맥을 참조하는 시작 프롬프트를 별도 Markdown으로 만듭니다.</p><div className="export-check-list">{TARGETS.map(item => <label key={item}><input checked={targets.includes(item)} onChange={() => toggle(item, targets, setTargets)} type="checkbox"/>{item}</label>)}</div></section><section><h3>저장 위치</h3><p>지정 폴더 아래 `ProjectStudio-Exports/프로젝트-시간` 폴더를 생성합니다.</p><label className="export-path-label">로컬 폴더 경로<input value={outputDirectory} onChange={event => setOutputDirectory(event.target.value)} placeholder="C:\\Projects\\Globeat"/></label></section></div><footer><div><strong>{message}</strong>{result && <><p>{result.outputPath}</p><ul>{result.files.map(file => <li key={file}>{file}</li>)}</ul></>}</div><button disabled={isExporting || !formats.length || !sections.length || !outputDirectory.trim()} onClick={() => void exportPackage()} type="button">{isExporting ? "내보내는 중…" : "선택한 데이터 내보내기"}</button></footer></section>;
}
