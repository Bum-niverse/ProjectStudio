import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { createProjectService } from "./application/createProjectService";
import { isDataProject, PROJECT_SUBTYPES, PROJECT_TYPES, ProjectValidationError, projectTypeLabel, type ProjectSubtype, type ProjectType, type ProjectValidationErrors, type ProjectWithPrd } from "./domain/project";
import { workflowStages } from "./domain/projectWorkflow";
import { FeatureMap } from "./FeatureMap";
import { PrdEditor } from "./PrdEditor";
import "./styles.css";
import "./theme-audit.css";
import { SettingsPage } from "./SettingsPage";
import { applyTheme, loadTheme, type ThemeId } from "./theme";
import { UserFlowPage } from "./UserFlowPage";
import { ExportPage } from "./ExportPage";
import { LoginPage } from "./LoginPage";
import { createDevelopmentPrdValues } from "./adapters/developmentPrdGenerator";
import { applyFont, loadFont, type FontId } from "./font";
import { SystemDesignPage } from "./SystemDesignPage";
import { generateAndSavePlanningBundle, type PlanningGenerationResult } from "./application/planningService";
import { DataDesignPage } from "./DataDesignPage";
import { dataProblemSections } from "./domain/dataProblemSections";

interface GithubUser{id:number;login:string;name?:string;avatarUrl:string;isOwner:boolean}

type AppPage = "project" | "prd" | "features" | "user-flow" | "system-design" | "export" | "settings";

export default function App() {
  const isVisualTest = !isTauri() && new URLSearchParams(window.location.search).get("visual-test") === "1";
  const service = useMemo(() => createProjectService(), []);
  const [page, setPage] = useState<AppPage>("project");
  const [returnPage, setReturnPage] = useState<AppPage>("project");
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());
  const [font,setFont]=useState<FontId>(()=>loadFont());
  const [projects, setProjects] = useState<ProjectWithPrd[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("auto");
  const [projectSubtype, setProjectSubtype] = useState<ProjectSubtype>();
  const [errors, setErrors] = useState<ProjectValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [githubUser,setGithubUser]=useState<GithubUser | undefined>(() => isVisualTest ? { id: 128395576, login: "Bum-niverse", name: "Visual QA", avatarUrl: "", isOwner: true } : undefined);
  const [isAuthenticating,setIsAuthenticating]=useState(false);
  const [authMessage,setAuthMessage]=useState<string>();
  const [isDeveloperMode,setIsDeveloperMode]=useState(()=>localStorage.getItem("projectstudio:developer-mode")==="true");
  const[completionError,setCompletionError]=useState<string>();
  const [planningState,setPlanningState]=useState<{projectId:string;status:"running"|"success"|"error";result?:PlanningGenerationResult;message:string}>();

  const selectedProject = projects.find(({ project }) => project.id === selectedProjectId);
  const stages = workflowStages(selectedProject?.project.projectType);
  const stageLabel = (id: (typeof stages)[number]["id"]) => stages.find(stage => stage.id === id)?.label ?? id;
  const activeStageIndex = stages.findIndex(stage=>stage.id===page);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(()=>{applyFont(font);},[font]);

  useEffect(() => {
    if(!githubUser)return;
    void service.listProjects().then(setProjects)
      .catch(() => setLoadError("저장된 프로젝트를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [githubUser,service]);

  async function handleGithubLogin(){setIsAuthenticating(true);setAuthMessage(undefined);try{if(!isTauri())throw new Error("GitHub 로그인은 데스크톱 앱에서 사용할 수 있습니다.");const user=await invoke<GithubUser>("get_github_session");if(!user.isOwner){setIsDeveloperMode(false);localStorage.setItem("projectstudio:developer-mode","false");}setIsLoading(true);setGithubUser(user);setAuthMessage(undefined);}catch(error){setAuthMessage(error instanceof Error?error.message:String(error));}finally{setIsAuthenticating(false);}}
  async function handleStartGithubLogin(){try{if(!isTauri())throw new Error("GitHub 로그인은 데스크톱 앱에서 사용할 수 있습니다.");await invoke("start_github_login");setAuthMessage("열린 GitHub CLI 창에서 로그인을 완료한 뒤 ‘GitHub로 로그인’을 다시 눌러 주세요.");}catch(error){setAuthMessage(error instanceof Error?error.message:String(error));}}
  function handleDeveloperMode(){if(!githubUser?.isOwner)return;const next=!isDeveloperMode;setIsDeveloperMode(next);localStorage.setItem("projectstudio:developer-mode",String(next));}
  function handleLock(){setGithubUser(undefined);setProjects([]);setSelectedProjectId(undefined);setPage("project");setIsLoading(false);}
  async function handleComplete(){setCompletionError(undefined);try{if(isTauri()){await invoke("exit_projectstudio");return;}window.close();if(!window.closed)setCompletionError("브라우저 미리보기에서는 창을 자동으로 닫을 수 없습니다.");}catch(error){setCompletionError(error instanceof Error?error.message:"프로그램을 종료하지 못했습니다. 다시 시도해 주세요.");}}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const created = await service.createProject({ name, idea, projectType, projectSubtype });
      setProjects((current) => [created, ...current]);
      setSelectedProjectId(created.project.id);
      setName("");
      setIdea("");
      setProjectSubtype(undefined);
      setProjectType("auto");
      setPage("prd");
      generateDetailedPlan(created);
    } catch (error) {
      if (error instanceof ProjectValidationError) setErrors(error.fields);
      else setSaveError("프로젝트를 만들지 못했습니다. 입력 내용은 유지됩니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function generateDetailedPlan(project: ProjectWithPrd, replaceExisting=false) {
    setPlanningState({projectId:project.project.id,status:"running",message:"PRD를 Codex CLI에 전달해 기능명세·유저플로우·시스템 설계를 생성하고 있습니다."});
    void generateAndSavePlanningBundle({projectId:project.project.id,projectName:project.project.name,projectType:project.project.projectType,projectSubtype:project.project.projectSubtype,sourceDocumentId:project.prd.documentId,prdMarkdown:project.prd.contentMarkdown,replaceExisting})
      .then(result=>setPlanningState({projectId:project.project.id,status:"success",result,message:"Codex 상세 기획을 로컬 작업대에 저장했습니다."}))
      .catch(error=>setPlanningState({projectId:project.project.id,status:"error",message:`${error instanceof Error?error.message:String(error)} PRD는 저장됐습니다. 하위 산출물 상태를 확인한 뒤 다시 실행할 수 있습니다.`}));
  }

  function handleRegeneratePlanning() {
    if(!selectedProject||planningState?.status==="running")return;
    if(!window.confirm("기존 기능명세와 유저플로우를 Codex 생성 결과로 교체합니다. 시스템 설계는 새 리비전으로 보존됩니다. 계속할까요?"))return;
    generateDetailedPlan(selectedProject,true);
  }

  function handleOpenProject(projectId: string) {
    setSelectedProjectId(projectId);
    setPage("prd");
  }

  async function handleSavePrd(contentMarkdown: string) {
    if (!selectedProject) throw new Error("프로젝트를 찾을 수 없습니다.");
    const prd = await service.savePrdRevision(selectedProject.prd, contentMarkdown);
    setProjects((items) => items.map((item) =>
      item.project.id === selectedProject.project.id ? { ...item, prd } : item,
    ));
  }

  function handleNavigate(target: AppPage) {
    if (target !== "project" && !selectedProject) return;
    setPage(target);
  }

  function handleOpenSettings() { setReturnPage(page === "settings" ? "project" : page); setPage("settings"); }

  if(!githubUser)return <LoginPage message={authMessage} isAuthenticating={isAuthenticating} onLogin={()=>void handleGithubLogin()} onStartLogin={()=>void handleStartGithubLogin()}/>;
  return (
    <main className="app-shell page-shell">
      <header className="topbar">
        <div className="brand-mark">PS</div>
        <div><p className="eyebrow">LOCAL PRODUCT WORKSPACE</p><h1>ProjectStudio</h1></div>
        <div className="topbar-actions"><span className="github-user-badge">@{githubUser.login}</span>{githubUser.isOwner&&<button className={isDeveloperMode?"developer-mode-toggle active":"developer-mode-toggle"} onClick={handleDeveloperMode} type="button">개발자 모드 {isDeveloperMode?"ON":"OFF"}</button>}<span className="mode-badge">{githubUser.isOwner&&isDeveloperMode?(window.location.port==="1420"?"실시간 반영 연결됨":"개발 빌드에서 실시간 반영"):"로컬 저장 · 외부 전송 없음"}</span><button onClick={handleOpenSettings} type="button" aria-label="설정 열기">⚙ 설정</button><button onClick={handleLock} type="button">잠금</button></div>
      </header>

      {page !== "settings" && <nav className="page-progress" aria-label="제품 개발 단계">
        {stages.map((stage, index) => (
          <button
            className={index === activeStageIndex ? "active" : index < activeStageIndex ? "complete" : ""}
            disabled={index > 0 && !selectedProject}
            key={stage.id}
            onClick={() => handleNavigate(stage.id as AppPage)}
            type="button"
          >
            <span>{index + 1}</span>{stage.label}
          </button>
        ))}
      </nav>}

      {page === "settings" && <SettingsPage theme={theme} font={font} projectId={selectedProject?.project.id} onThemeChange={setTheme} onFontChange={setFont} onClose={() => setPage(returnPage === "settings" ? "project" : returnPage)} />}

      {page === "project" && (
        <section className="full-page project-create-page">
          <div className="page-intro">
            <p className="eyebrow">01 · NEW PROJECT</p>
            <h2>아이디어에서 시작합니다.</h2>
            <p>프로젝트 유형, 이름과 핵심 아이디어를 기준으로 필요한 기획 단계를 구성합니다.</p>
          </div>
          <div className="project-page-grid">
            <form className="project-create-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="project-name">프로젝트 이름</label>
              <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 여행 일정 관리" />
              {errors.name && <p className="field-error">{errors.name}</p>}
              <fieldset className="project-type-fieldset"><legend>프로젝트 유형</legend><div className="project-type-options">{PROJECT_TYPES.map(type=><label className={projectType===type.id?"selected":""} key={type.id}><input checked={projectType===type.id} name="project-type" onChange={()=>{setProjectType(type.id);setProjectSubtype(undefined);}} type="radio" value={type.id}/><span><strong>{type.label}</strong><small>{type.description}</small></span></label>)}</div></fieldset>
              {errors.projectType && <p className="field-error">{errors.projectType}</p>}
              {isDataProject(projectType)&&<label>세부 유형<select aria-label="프로젝트 세부 유형" onChange={event=>setProjectSubtype(event.target.value as ProjectSubtype)} value={projectSubtype??""}><option value="">세부 유형을 선택해 주세요</option>{PROJECT_SUBTYPES[projectType].map(subtype=><option key={subtype.id} value={subtype.id}>{subtype.label}</option>)}</select></label>}
              {errors.projectSubtype && <p className="field-error">{errors.projectSubtype}</p>}
              <label htmlFor="project-idea">아이디어</label>
              <textarea id="project-idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="누구의 어떤 문제를 어떻게 해결할지 적어 주세요." rows={9} />
              {errors.idea && <p className="field-error">{errors.idea}</p>}
              {saveError && <p className="save-error">{saveError}</p>}
              <button type="submit" disabled={isSaving}>{isSaving ? "프로젝트 생성 중…" : "프로젝트 만들고 PRD로 이동"}</button>
            </form>
            <aside className="recent-projects">
              <p className="eyebrow">RECENT PROJECTS</p><h3>기존 프로젝트</h3>
              {isLoading ? <p>불러오는 중…</p> : loadError ? <p className="field-error">{loadError}</p> : projects.length === 0 ? <p>아직 저장된 프로젝트가 없습니다.</p> : projects.map(({ project }) => (
                <button key={project.id} onClick={() => handleOpenProject(project.id)} type="button"><strong>{project.name}</strong><small>{projectTypeLabel(project.projectType)}</small><span>{project.idea}</span></button>
              ))}
            </aside>
          </div>
        </section>
      )}

      {page === "prd" && selectedProject && (
        <section className="full-page document-page">
          <div className="page-heading-row">
            <div><p className="eyebrow">02 · PRODUCT REQUIREMENTS</p><h2>{selectedProject.project.name} PRD</h2><p>{selectedProject.project.idea}</p></div>
            <span className="revision-badge">REV {selectedProject.prd.revisionNumber}</span>
          </div>
          <PrdEditor key={selectedProject.prd.id} revision={selectedProject.prd} fallbackValues={createDevelopmentPrdValues(selectedProject.project.name,selectedProject.project.idea,selectedProject.project.projectType)} sections={isDataProject(selectedProject.project.projectType)?dataProblemSections(selectedProject.project.projectType):undefined} documentLabel={isDataProject(selectedProject.project.projectType)?"문제·목표 정의":"PRD"} onSave={handleSavePrd} />
          <section className={`planning-generation-status ${planningState?.projectId===selectedProject.project.id?planningState.status:"idle"}`} aria-live="polite"><div><strong>{planningState?.projectId!==selectedProject.project.id?"Codex 상세 산출물":planningState.status==="running"?"Codex 상세 기획 생성 중":planningState.status==="success"?"상세 산출물 생성 완료":"상세 산출물 생성 실패"}</strong><p>{planningState?.projectId===selectedProject.project.id?planningState.message:"현재 PRD를 분석해 기능명세·유저플로우·시스템 설계를 프로젝트별로 상세 생성합니다."}</p>{planningState?.projectId===selectedProject.project.id&&planningState.result&&<><small>기능 {planningState.result.featureCount}개 · 수용 기준 {planningState.result.criterionCount}개 · 유저플로우 {planningState.result.flowNodeCount}노드/{planningState.result.flowEdgeCount}연결 · 시스템 설계 {planningState.result.designNodeCount}노드/{planningState.result.designEdgeCount}연결</small><div className={`planning-quality-summary ${planningState.result.quality.gate}`}><b>품질 검사 {planningState.result.quality.score}점 · {planningState.result.quality.projectTypeLabel}</b><span>{planningState.result.quality.gate==="pass"?"통과":planningState.result.quality.gate==="review"?"검토 필요":"보완 필요"} · {planningState.result.quality.passedChecks}/{planningState.result.quality.checks}개 기준 충족</span>{planningState.result.quality.findings.length>0&&<ul>{planningState.result.quality.findings.slice(0,3).map(finding=><li key={finding.id}><strong>{finding.title}</strong> {finding.recommendation}</li>)}</ul>}</div></>}</div><div className="planning-generation-actions"><span>{planningState?.projectId===selectedProject.project.id&&planningState.status==="running"?"현재 PRD 내용이 로컬 Codex CLI로 전달됩니다.":"기존 하위 산출물 교체 전 확인을 요청합니다."}</span><button disabled={planningState?.projectId===selectedProject.project.id&&planningState.status==="running"} onClick={handleRegeneratePlanning} type="button">{planningState?.projectId===selectedProject.project.id&&planningState.status==="running"?"생성 중…":"Codex로 상세 산출물 생성"}</button></div></section>
          <div className="page-actions"><button className="secondary" onClick={() => setPage("project")} type="button">이전: {stageLabel("project")}</button><button onClick={() => setPage("features")} type="button">다음: {stageLabel("features")}</button></div>
        </section>
      )}

      {page === "features" && selectedProject && (
        <section className="full-page feature-page">
          {isDataProject(selectedProject.project.projectType)?<DataDesignPage projectId={selectedProject.project.id} projectName={selectedProject.project.name} projectIdea={selectedProject.project.idea} projectType={selectedProject.project.projectType} projectSubtype={selectedProject.project.projectSubtype}/>:<FeatureMap projectId={selectedProject.project.id} projectName={selectedProject.project.name} projectIdea={selectedProject.project.idea} sourceDocumentId={selectedProject.prd.documentId} />}
          <div className="page-actions"><button className="secondary" onClick={() => setPage("prd")} type="button">이전: {stageLabel("prd")}</button><button onClick={() => setPage("user-flow")} type="button">다음: {stageLabel("user-flow")}</button></div>
        </section>
      )}
      {page === "user-flow" && selectedProject && <section className="full-page user-flow-full-page"><UserFlowPage projectId={selectedProject.project.id} projectName={selectedProject.project.name} projectIdea={selectedProject.project.idea} projectType={selectedProject.project.projectType} projectSubtype={selectedProject.project.projectSubtype} sourceDocumentId={selectedProject.prd.documentId}/><div className="page-actions"><button className="secondary" onClick={()=>setPage("features")} type="button">이전: {stageLabel("features")}</button><button onClick={()=>setPage("system-design")} type="button">다음: {stageLabel("system-design")}</button></div></section>}
      {page === "system-design" && selectedProject && <section className="full-page system-design-full-page"><SystemDesignPage projectId={selectedProject.project.id} projectName={selectedProject.project.name} projectIdea={selectedProject.project.idea} projectType={selectedProject.project.projectType} projectSubtype={selectedProject.project.projectSubtype} sourceDocumentId={selectedProject.prd.documentId}/><div className="page-actions"><button className="secondary" onClick={()=>setPage("user-flow")} type="button">이전: {stageLabel("user-flow")}</button><button className="secondary" onClick={()=>setPage("export")} type="button">건너뛰고 {stageLabel("export")}</button><button onClick={()=>setPage("export")} type="button">다음: {stageLabel("export")}</button></div></section>}
      {page === "export" && selectedProject && <section className="full-page export-full-page"><ExportPage projectId={selectedProject.project.id} projectName={selectedProject.project.name} projectType={selectedProject.project.projectType}/>{completionError&&<p className="completion-error" role="alert">{completionError}</p>}<div className="page-actions"><button className="secondary" onClick={()=>setPage("system-design")} type="button">이전: 시스템 설계</button><button onClick={()=>void handleComplete()} type="button">완료 및 종료</button></div></section>}
    </main>
  );
}
