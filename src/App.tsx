import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createProjectService } from "./application/createProjectService";
import { ProjectValidationError, type ProjectValidationErrors, type ProjectWithPrd } from "./domain/project";
import { FeatureMap } from "./FeatureMap";
import { PrdEditor } from "./PrdEditor";
import "./styles.css";

type AppPage = "project" | "prd" | "features";

const STAGES = [
  { id: "project", label: "프로젝트" },
  { id: "prd", label: "PRD" },
  { id: "features", label: "기능명세" },
  { id: "user-flow", label: "유저플로우" },
  { id: "wireframe", label: "와이어프레임" },
  { id: "development", label: "개발" },
] as const;

export default function App() {
  const service = useMemo(() => createProjectService(), []);
  const [page, setPage] = useState<AppPage>("project");
  const [projects, setProjects] = useState<ProjectWithPrd[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [errors, setErrors] = useState<ProjectValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();

  const selectedProject = projects.find(({ project }) => project.id === selectedProjectId);
  const activeStageIndex = page === "project" ? 0 : page === "prd" ? 1 : 2;

  useEffect(() => {
    void service.listProjects().then(setProjects)
      .catch(() => setLoadError("저장된 프로젝트를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [service]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const created = await service.createProject({ name, idea });
      setProjects((current) => [created, ...current]);
      setSelectedProjectId(created.project.id);
      setName("");
      setIdea("");
      setPage("prd");
    } catch (error) {
      if (error instanceof ProjectValidationError) setErrors(error.fields);
      else setSaveError("프로젝트를 만들지 못했습니다. 입력 내용은 유지됩니다.");
    } finally {
      setIsSaving(false);
    }
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

  return (
    <main className="app-shell page-shell">
      <header className="topbar">
        <div className="brand-mark">PS</div>
        <div><p className="eyebrow">LOCAL PRODUCT WORKSPACE</p><h1>ProjectStudio</h1></div>
        <span className="mode-badge">개발 모드 · 외부 전송 없음</span>
      </header>

      <nav className="page-progress" aria-label="제품 개발 단계">
        {STAGES.map((stage, index) => (
          <button
            className={index === activeStageIndex ? "active" : index < activeStageIndex ? "complete" : ""}
            disabled={index > 2 || (index > 0 && !selectedProject)}
            key={stage.id}
            onClick={() => index <= 2 && handleNavigate(stage.id as AppPage)}
            type="button"
          >
            <span>{index + 1}</span>{stage.label}
          </button>
        ))}
      </nav>

      {page === "project" && (
        <section className="full-page project-create-page">
          <div className="page-intro">
            <p className="eyebrow">01 · NEW PROJECT</p>
            <h2>아이디어에서 시작합니다.</h2>
            <p>프로젝트 이름과 핵심 아이디어만 입력하면 작업대와 PRD 초안을 자동으로 만듭니다.</p>
          </div>
          <div className="project-page-grid">
            <form className="project-create-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="project-name">프로젝트 이름</label>
              <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: Globeat" />
              {errors.name && <p className="field-error">{errors.name}</p>}
              <label htmlFor="project-idea">아이디어</label>
              <textarea id="project-idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="누구의 어떤 문제를 어떻게 해결할지 적어 주세요." rows={9} />
              {errors.idea && <p className="field-error">{errors.idea}</p>}
              {saveError && <p className="save-error">{saveError}</p>}
              <button type="submit" disabled={isSaving}>{isSaving ? "프로젝트 생성 중…" : "프로젝트 만들고 PRD로 이동"}</button>
            </form>
            <aside className="recent-projects">
              <p className="eyebrow">RECENT PROJECTS</p><h3>기존 프로젝트</h3>
              {isLoading ? <p>불러오는 중…</p> : loadError ? <p className="field-error">{loadError}</p> : projects.length === 0 ? <p>아직 저장된 프로젝트가 없습니다.</p> : projects.map(({ project }) => (
                <button key={project.id} onClick={() => handleOpenProject(project.id)} type="button"><strong>{project.name}</strong><span>{project.idea}</span></button>
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
          <PrdEditor revision={selectedProject.prd} onSave={handleSavePrd} />
          <div className="page-actions"><button className="secondary" onClick={() => setPage("project")} type="button">이전: 프로젝트</button><button onClick={() => setPage("features")} type="button">다음: 기능명세</button></div>
        </section>
      )}

      {page === "features" && selectedProject && (
        <section className="full-page feature-page">
          <FeatureMap projectId={selectedProject.project.id} sourceDocumentId={selectedProject.prd.documentId} />
          <div className="page-actions"><button className="secondary" onClick={() => setPage("prd")} type="button">이전: PRD</button><button disabled type="button">다음: 유저플로우</button></div>
        </section>
      )}
    </main>
  );
}
