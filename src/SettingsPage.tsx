import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { THEMES, type ThemeId } from "./theme";
import { FONTS, type FontId } from "./font";

interface ToolStatus { isInstalled: boolean; version?: string; programPath?:string }
interface DeveloperToolsStatus { claude: ToolStatus; codex: ToolStatus; antigravity: ToolStatus; localLlm: ToolStatus; git: ToolStatus; githubCli: ToolStatus; isGithubAuthenticated: boolean }
interface SyncResult { outputPath: string; documentCount: number; changedDocumentCount: number }
interface AppEnvironment{version:string;dataDirectory:string;databasePath:string}
interface SettingsPageProps { theme: ThemeId; font:FontId; projectId?: string; onThemeChange: (theme: ThemeId) => void; onFontChange:(font:FontId)=>void; onClose: () => void }

const REPOSITORY_PATH_KEY = "projectstudio:repository-path";
const GITHUB_REMOTE_KEY = "projectstudio:github-remote";
const TOOL_PATHS_KEY = "projectstudio:llm-tool-paths";
const LLM_TOOLS=[{id:"claude",name:"CLAUDE CLI",placeholder:"claude 또는 C:\\Tools\\claude.exe"},{id:"codex",name:"CODEX CLI",placeholder:"codex 또는 C:\\Tools\\codex.exe"},{id:"antigravity",name:"ANTIGRAVITY",placeholder:"antigravity 실행 파일 경로"},{id:"localLlm",name:"로컬 LLM · OLLAMA",placeholder:"ollama 또는 C:\\Tools\\ollama.exe"}]as const;
type LlmToolId=(typeof LLM_TOOLS)[number]["id"];

export function SettingsPage({ theme, font, projectId, onThemeChange, onFontChange, onClose }: SettingsPageProps) {
  const [repositoryPath, setRepositoryPath] = useState(() => localStorage.getItem(REPOSITORY_PATH_KEY) ?? "");
  const [githubRemote, setGithubRemote] = useState(() => localStorage.getItem(GITHUB_REMOTE_KEY) ?? "");
  const [tools, setTools] = useState<DeveloperToolsStatus>();
  const [message, setMessage] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>();
  const [openTool,setOpenTool]=useState<LlmToolId>();
  const [toolPaths,setToolPaths]=useState<Record<LlmToolId,string>>(()=>{try{return{claude:"claude",codex:"codex",antigravity:"antigravity",localLlm:"ollama",...JSON.parse(localStorage.getItem(TOOL_PATHS_KEY)??"{}")}}catch{return{claude:"claude",codex:"codex",antigravity:"antigravity",localLlm:"ollama"}}});
  const [checkingTool,setCheckingTool]=useState<LlmToolId>();
  const [toolMessages,setToolMessages]=useState<Partial<Record<LlmToolId,string>>>({});
  const[environment,setEnvironment]=useState<AppEnvironment>();

  useEffect(()=>{if(isTauri())void invoke<AppEnvironment>("get_app_environment").then(setEnvironment).catch(()=>setEnvironment(undefined));},[]);
  useEffect(()=>{if(!isTauri()||!projectId)return;void invoke<string|null>("get_project_repository_path",{projectId}).then(path=>{if(path)setRepositoryPath(path);}).catch(()=>undefined);},[projectId]);

  async function handleCheckTools() {
    setIsChecking(true);
    try {
      const checked=isTauri() ? await invoke<DeveloperToolsStatus>("check_developer_tools") : {
        claude: { isInstalled: false }, codex: { isInstalled: false }, antigravity: { isInstalled: false }, localLlm: { isInstalled: false }, git: { isInstalled: false }, githubCli: { isInstalled: false }, isGithubAuthenticated: false,
      };setTools(checked);setToolPaths(current=>({...current,...Object.fromEntries(LLM_TOOLS.flatMap(item=>checked[item.id].programPath?[[item.id,checked[item.id].programPath]]:[]))}));
    } finally { setIsChecking(false); }
  }

  async function handleCheckTool(id:LlmToolId){const programPath=toolPaths[id].trim();localStorage.setItem(TOOL_PATHS_KEY,JSON.stringify(toolPaths));setCheckingTool(id);setToolMessages(current=>({...current,[id]:"연결을 확인하는 중…"}));try{if(!isTauri())throw new Error("도구 연결 확인은 데스크톱 앱에서 사용할 수 있습니다.");const result=await invoke<ToolStatus>("check_tool_connection",{input:{programPath}});setTools(current=>({...current??{claude:{isInstalled:false},codex:{isInstalled:false},antigravity:{isInstalled:false},localLlm:{isInstalled:false},git:{isInstalled:false},githubCli:{isInstalled:false},isGithubAuthenticated:false},[id]:result}));setToolMessages(current=>({...current,[id]:result.version??"연결되었습니다."}));}catch(error){setToolMessages(current=>({...current,[id]:error instanceof Error?error.message:String(error)}));}finally{setCheckingTool(undefined);}}

  async function handleSaveConnections() {
    if(!projectId){setMessage("저장소를 연결할 프로젝트를 먼저 선택해 주세요.");return;}
    try{const saved=isTauri()?await invoke<string>("save_project_repository_path",{input:{projectId,repositoryPath:repositoryPath.trim()}}):repositoryPath.trim();setRepositoryPath(saved);localStorage.setItem(REPOSITORY_PATH_KEY,saved);localStorage.setItem(GITHUB_REMOTE_KEY,githubRemote.trim());setMessage("이 프로젝트의 Git 저장소 연결을 확인하고 저장했습니다.");}catch(error){setMessage(error instanceof Error?error.message:String(error));}
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

  const status = (tool?: ToolStatus) => !tools ? "확인 전" : tool?.isInstalled ? tool.version ?? "연결 가능" : "찾을 수 없음";
  const authenticationStatus = !tools ? "확인 전" : tools.isGithubAuthenticated ? "연결됨" : "인증 필요";
  return <section className="settings-page full-page">
    <div className="settings-heading"><div><p className="eyebrow">PREFERENCES & CONNECTIONS</p><h2>설정</h2><p>화면 테마와 로컬 개발 도구 연결을 관리합니다.</p></div><button aria-label="설정 닫기" className="settings-close-button secondary" onClick={onClose} title="설정 닫기" type="button">×</button></div>
    <section className="settings-section"><h3>색상 테마</h3><p>선택 즉시 전체 화면에 적용되며 앱을 다시 열어도 유지됩니다.</p><div className="theme-grid">{THEMES.map((item) => <button className={theme === item.id ? "theme-card selected" : "theme-card"} key={item.id} onClick={() => onThemeChange(item.id)} type="button"><div className="theme-swatches">{item.colors.map((color) => <span key={color} style={{ background: color }} />)}</div><strong>{item.name}</strong><small>{item.description}</small></button>)}</div></section>
    <section className="settings-section"><h3>글꼴</h3><p>선택 즉시 문서와 화면 전체에 적용됩니다. 코드·ID 영역은 고정폭 글꼴을 유지합니다.</p><div className="font-grid">{FONTS.map(item=><button className={font===item.id?"font-card selected":"font-card"} data-font-preview={item.id} key={item.id} onClick={()=>onFontChange(item.id)} type="button"><strong>{item.name}</strong><span>{item.sample}</span><small>{item.description}</small></button>)}</div></section>
    <section className="settings-section"><div className="settings-section-heading"><div><h3>LLM 연결</h3><p>LLM 및 각종 API와 `.projectstudio` 문서를 사용합니다.</p></div><button aria-label="도구 상태 다시 확인" className="tool-retry-button" onClick={() => void handleCheckTools()} disabled={isChecking} title={isChecking ? "확인 중" : "전체 도구 상태 다시 확인"} type="button"><span aria-hidden="true">↻</span></button></div><div className="llm-connection-list">{LLM_TOOLS.map(item=>{const tool=tools?.[item.id];const isOpen=openTool===item.id;return <section key={item.id}><button aria-expanded={isOpen} className="llm-connection-toggle" onClick={()=>setOpenTool(isOpen?undefined:item.id)} type="button"><span>{isOpen?"⌄":"›"}</span><strong>{item.name}</strong><small>{status(tool)}</small></button>{isOpen&&<div className="llm-connection-detail"><p>CLI 실행 파일 이름 또는 절대 경로를 지정합니다. 확인 과정에서는 버전 정보만 읽으며 문서를 전송하지 않습니다.</p><label>실행 파일 경로<input value={toolPaths[item.id]} onChange={event=>setToolPaths(current=>({...current,[item.id]:event.target.value}))} placeholder={item.placeholder}/></label><div><button className="secondary" onClick={()=>{localStorage.setItem(TOOL_PATHS_KEY,JSON.stringify(toolPaths));setToolMessages(current=>({...current,[item.id]:"연결 경로를 저장했습니다."}));}} type="button">경로 저장</button><button onClick={()=>void handleCheckTool(item.id)} disabled={checkingTool===item.id||!toolPaths[item.id].trim()} type="button">{checkingTool===item.id?"확인 중…":"연결 확인"}</button></div>{toolMessages[item.id]&&<p className="document-save-message">{toolMessages[item.id]}</p>}</div>}</section>})}</div><div className="connection-status developer-status"><span>Git <strong>{status(tools?.git)}</strong></span><span>GitHub CLI <strong>{status(tools?.githubCli)}</strong></span><span>GitHub 인증 <strong>{authenticationStatus}</strong></span></div></section>
    <section className="settings-section"><h3>프로젝트 저장소와 GitHub</h3><p>Codex 동기화 문서는 아래 로컬 저장소의 `.projectstudio` 폴더에 생성됩니다.</p><div className="connection-form"><label>로컬 Git 저장소 경로<input value={repositoryPath} onChange={(event) => setRepositoryPath(event.target.value)} placeholder="C:\\Projects\\MyProject" /></label><label>GitHub 원격 주소<input value={githubRemote} onChange={(event) => setGithubRemote(event.target.value)} placeholder="https://github.com/owner/repository.git" /></label><div className="settings-actions"><button className="secondary" onClick={handleSaveConnections} type="button">연결 설정 저장</button><button onClick={() => void handleSync()} disabled={!projectId || !repositoryPath.trim() || isSyncing} type="button">{isSyncing ? "동기화 중…" : "Codex 문서 동기화"}</button></div></div>{!projectId && <p className="settings-hint">먼저 프로젝트 작업대에서 프로젝트를 선택해야 동기화할 수 있습니다.</p>}{message && <p className="document-save-message">{message}</p>}{syncResult && <p className="settings-hint">생성 위치: {syncResult.outputPath}</p>}</section>
    <section className="settings-section local-data-section"><h3>로컬 데이터와 개인정보</h3><p>ProjectStudio는 프로젝트 내용을 서버에 동기화하지 않습니다. 각 Windows 사용자 계정에 별도의 SQLite 데이터베이스를 만들며 삭제 전에는 자동으로 사라지지 않습니다.</p><dl><dt>앱 버전</dt><dd>{environment?.version??"확인 중…"}</dd><dt>데이터 폴더</dt><dd><code>{environment?.dataDirectory??"데스크톱 앱에서 확인할 수 있습니다."}</code></dd><dt>SQLite 파일</dt><dd><code>{environment?.databasePath??"데스크톱 앱에서 확인할 수 있습니다."}</code></dd></dl><small>Codex·Claude 같은 외부 도구를 직접 선택해 실행할 때만 화면에 안내된 문서가 해당 CLI로 전달됩니다. GitHub 토큰은 GitHub CLI의 Windows 자격 증명 저장소에서 관리됩니다.</small></section>
  </section>;
}
