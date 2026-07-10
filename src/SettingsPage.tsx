import { invoke, isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import { THEMES, type ThemeId } from "./theme";

interface ToolStatus { isInstalled: boolean; version?: string }
interface DeveloperToolsStatus { codex: ToolStatus; git: ToolStatus; githubCli: ToolStatus; isGithubAuthenticated: boolean }
interface SyncResult { outputPath: string; documentCount: number; changedDocumentCount: number }
interface SettingsPageProps { theme: ThemeId; projectId?: string; onThemeChange: (theme: ThemeId) => void; onClose: () => void }

const REPOSITORY_PATH_KEY = "projectstudio:repository-path";
const GITHUB_REMOTE_KEY = "projectstudio:github-remote";

export function SettingsPage({ theme, projectId, onThemeChange, onClose }: SettingsPageProps) {
  const [repositoryPath, setRepositoryPath] = useState(() => localStorage.getItem(REPOSITORY_PATH_KEY) ?? "");
  const [githubRemote, setGithubRemote] = useState(() => localStorage.getItem(GITHUB_REMOTE_KEY) ?? "");
  const [tools, setTools] = useState<DeveloperToolsStatus>();
  const [message, setMessage] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>();

  async function handleCheckTools() {
    setIsChecking(true);
    try {
      setTools(isTauri() ? await invoke<DeveloperToolsStatus>("check_developer_tools") : {
        codex: { isInstalled: false }, git: { isInstalled: false }, githubCli: { isInstalled: false }, isGithubAuthenticated: false,
      });
    } finally { setIsChecking(false); }
  }

  function handleSaveConnections() {
    localStorage.setItem(REPOSITORY_PATH_KEY, repositoryPath.trim());
    localStorage.setItem(GITHUB_REMOTE_KEY, githubRemote.trim());
    setMessage("연결 설정을 이 컴퓨터에 저장했습니다.");
  }

  async function handleSync() {
    if (!projectId || !repositoryPath.trim()) return;
    setIsSyncing(true);
    setMessage(undefined);
    try {
      if (!isTauri()) throw new Error("문서 동기화는 데스크톱 앱에서 사용할 수 있습니다.");
      const result = await invoke<SyncResult>("sync_project_documents", {
        input: { projectId, repositoryPath: repositoryPath.trim() },
      });
      setSyncResult(result);
      setMessage(`Codex 문서 ${result.documentCount}개를 동기화했습니다. 변경 문서: ${result.changedDocumentCount}개`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSyncing(false);
    }
  }

  const status = (tool?: ToolStatus) => tool?.isInstalled ? tool.version ?? "설치됨" : "찾을 수 없음";
  return <section className="settings-page full-page">
    <div className="settings-heading"><div><p className="eyebrow">PREFERENCES & CONNECTIONS</p><h2>설정</h2><p>화면 테마와 로컬 개발 도구 연결을 관리합니다.</p></div><button className="secondary" onClick={onClose} type="button">설정 닫기</button></div>
    <section className="settings-section"><h3>색상 테마</h3><p>선택 즉시 전체 화면에 적용되며 앱을 다시 열어도 유지됩니다.</p><div className="theme-grid">{THEMES.map((item) => <button className={theme === item.id ? "theme-card selected" : "theme-card"} key={item.id} onClick={() => onThemeChange(item.id)} type="button"><div className="theme-swatches">{item.colors.map((color) => <span key={color} style={{ background: color }} />)}</div><strong>{item.name}</strong><small>{item.description}</small></button>)}</div></section>
    <section className="settings-section"><div className="settings-section-heading"><div><h3>Codex 연결</h3><p>유료 API 대신 로컬 Codex CLI와 `.projectstudio` 문서를 사용합니다.</p></div><button onClick={() => void handleCheckTools()} disabled={isChecking} type="button">{isChecking ? "확인 중…" : "도구 상태 확인"}</button></div><div className="connection-status"><span>Codex CLI <strong>{status(tools?.codex)}</strong></span><span>Git <strong>{status(tools?.git)}</strong></span><span>GitHub CLI <strong>{status(tools?.githubCli)}</strong></span><span>GitHub 인증 <strong>{tools?.isGithubAuthenticated ? "연결됨" : "확인 필요"}</strong></span></div></section>
    <section className="settings-section"><h3>프로젝트 저장소와 GitHub</h3><p>Codex 동기화 문서는 아래 로컬 저장소의 `.projectstudio` 폴더에 생성됩니다.</p><div className="connection-form"><label>로컬 Git 저장소 경로<input value={repositoryPath} onChange={(event) => setRepositoryPath(event.target.value)} placeholder="C:\\Projects\\Globeat" /></label><label>GitHub 원격 주소<input value={githubRemote} onChange={(event) => setGithubRemote(event.target.value)} placeholder="https://github.com/owner/repository.git" /></label><div className="settings-actions"><button className="secondary" onClick={handleSaveConnections} type="button">연결 설정 저장</button><button onClick={() => void handleSync()} disabled={!projectId || !repositoryPath.trim() || isSyncing} type="button">{isSyncing ? "동기화 중…" : "Codex 문서 동기화"}</button></div></div>{!projectId && <p className="settings-hint">먼저 프로젝트 작업대에서 프로젝트를 선택해야 동기화할 수 있습니다.</p>}{message && <p className="document-save-message">{message}</p>}{syncResult && <p className="settings-hint">생성 위치: {syncResult.outputPath}</p>}</section>
  </section>;
}
