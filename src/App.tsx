import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createProjectService } from "./application/createProjectService";
import { ProjectValidationError, type ProjectValidationErrors, type ProjectWithPrd } from "./domain/project";
import { PrdEditor } from "./PrdEditor";
import { FeatureMap } from "./FeatureMap";
import "./styles.css";

export default function App() {
  const service = useMemo(() => createProjectService(), []);
  const [projects, setProjects] = useState<ProjectWithPrd[]>([]);
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [errors, setErrors] = useState<ProjectValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    void service
      .listProjects()
      .then(setProjects)
      .catch(() => setLoadError("저장된 프로젝트를 불러오지 못했습니다. 앱을 다시 시작해 주세요."))
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
      setName("");
      setIdea("");
    } catch (error) {
      if (error instanceof ProjectValidationError) setErrors(error.fields);
      else setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSavePrd(projectId: string, contentMarkdown: string) {
    const current = projects.find(({ project }) => project.id === projectId);
    if (!current) throw new Error("프로젝트를 찾을 수 없습니다.");
    const prd = await service.savePrdRevision(current.prd, contentMarkdown);
    setProjects((items) =>
      items.map((item) => (item.project.id === projectId ? { ...item, prd } : item)),
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">PS</div>
        <div>
          <p className="eyebrow">LOCAL PRODUCT WORKSPACE</p>
          <h1>ProjectStudio</h1>
        </div>
        <span className="mode-badge">개발 모드 · 외부 전송 없음</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">IDEA → PRD → DELIVERY</p>
          <h2>아이디어를 실행 가능한 제품 기록으로 바꾸세요.</h2>
          <p>기획 문서와 코드, 커밋, 테스트가 어디까지 이어졌는지 한곳에서 추적합니다.</p>
        </div>
        <div className="progress-track" aria-label="제품 개발 단계">
          {["아이디어", "PRD", "기능명세", "개발", "완료"].map((step, index) => (
            <div className={index === 0 ? "step active" : "step"} key={step}>
              <span>{index + 1}</span>{step}
            </div>
          ))}
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel form-panel">
          <p className="panel-number">01</p>
          <h3>새 프로젝트</h3>
          <p className="panel-copy">프로젝트 이름과 핵심 아이디어로 첫 PRD 초안을 만듭니다.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="project-name">프로젝트 이름</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: Globeat" />
            {errors.name && <p className="field-error">{errors.name}</p>}

            <label htmlFor="project-idea">아이디어</label>
            <textarea id="project-idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="누구의 어떤 문제를 어떻게 해결할지 적어 주세요." rows={7} />
            {errors.idea && <p className="field-error">{errors.idea}</p>}
            {saveError && <p className="save-error">{saveError}</p>}
            <button type="submit" disabled={isSaving}>{isSaving ? "초안 생성 중…" : "PRD 초안 만들기"}</button>
          </form>
        </section>

        <section className="panel project-panel">
          <p className="panel-number">02</p>
          <h3>프로젝트 작업대</h3>
          {isLoading ? (
            <div className="empty-state" aria-live="polite">
              <strong>프로젝트를 불러오는 중입니다…</strong>
            </div>
          ) : loadError ? (
            <div className="empty-state error-state" role="alert">
              <strong>프로젝트를 열 수 없습니다.</strong>
              <p>{loadError}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <span>+</span>
              <strong>아직 프로젝트가 없습니다.</strong>
              <p>왼쪽에서 첫 아이디어를 기록하면 PRD 초안이 여기에 열립니다.</p>
            </div>
          ) : (
            <div className="project-list">
              {projects.map(({ project, prd }) => (
                <article className="project-card" key={project.id}>
                  <div><p className="eyebrow">PRD · REV {prd.revisionNumber}</p><h4>{project.name}</h4></div>
                  <p>{project.idea}</p>
                  <PrdEditor
                    revision={prd}
                    onSave={(contentMarkdown) => handleSavePrd(project.id, contentMarkdown)}
                  />
                  <FeatureMap projectId={project.id} />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
