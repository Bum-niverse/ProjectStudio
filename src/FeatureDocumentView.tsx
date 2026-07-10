import { useMemo, useState } from "react";
import type { AcceptanceCriterion, FeatureSpec } from "./domain/feature";

interface FeatureDocumentViewProps {
  features: FeatureSpec[];
  onSave: (feature: FeatureSpec) => Promise<void>;
}

function FeatureEditor({ feature, onSave }: { feature: FeatureSpec; onSave: (feature: FeatureSpec) => Promise<void> }) {
  const [draft, setDraft] = useState(feature);
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  function updateCriterion(index: number, patch: Partial<AcceptanceCriterion>) {
    setDraft((current) => ({ ...current, acceptanceCriteria: current.acceptanceCriteria.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  function addCriterion() {
    setDraft((current) => ({ ...current, acceptanceCriteria: [...current.acceptanceCriteria, { id: `${current.id}-ac-${crypto.randomUUID()}`, description: "", isMet: false, sortOrder: current.acceptanceCriteria.length }] }));
  }

  async function handleSave() {
    setIsSaving(true); setMessage(undefined);
    try { await onSave(draft); setMessage("기능 문서를 저장했습니다."); }
    catch { setMessage("저장하지 못했습니다. 편집 내용은 유지됩니다."); }
    finally { setIsSaving(false); }
  }

  return <div className="feature-document-editor">
    <div className="document-editor-top"><span>ID {draft.id}</span><button onClick={handleSave} disabled={isSaving} type="button">{isSaving ? "저장 중…" : "문서 저장"}</button></div>
    <input className="document-title-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="기능명" />
    <div className="document-meta">
      <label>상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as FeatureSpec["status"] })}><option value="planned">기획</option><option value="ready">준비</option><option value="in_progress">진행</option><option value="blocked">차단</option><option value="done">완료</option></select></label>
      <label>중요도<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as FeatureSpec["priority"] })}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option><option value="critical">핵심</option></select></label>
      <label>역할<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
    </div>
    <label className="document-section">설명<textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
    <section className="criteria-section"><div><h4>수용 기준</h4><button className="secondary" onClick={addCriterion} type="button">+ 기준 추가</button></div>
      {draft.acceptanceCriteria.map((criterion, index) => <div className="criterion-row" key={criterion.id}><input type="checkbox" checked={criterion.isMet} onChange={(event) => updateCriterion(index, { isMet: event.target.checked })} /><textarea rows={2} value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} /><button onClick={() => setDraft((current) => ({ ...current, acceptanceCriteria: current.acceptanceCriteria.filter((_, itemIndex) => itemIndex !== index) }))} type="button">×</button></div>)}
    </section>
    {message && <p className="document-save-message" aria-live="polite">{message}</p>}
  </div>;
}

export function FeatureDocumentView({ features, onSave }: FeatureDocumentViewProps) {
  const root = features.find((feature) => !feature.parentId);
  const requirements = useMemo(() => features.filter((feature) => feature.parentId === root?.id), [features, root?.id]);
  const [requirementId, setRequirementId] = useState(requirements[0]?.id);
  const details = features.filter((feature) => feature.parentId === requirementId);
  const [featureId, setFeatureId] = useState(details[0]?.id ?? requirementId);
  const selected = features.find((feature) => feature.id === featureId) ?? requirements[0];

  function selectRequirement(id: string) { setRequirementId(id); setFeatureId(features.find((feature) => feature.parentId === id)?.id ?? id); }
  return <div className="document-view">
    <aside className="document-column"><header><h4>요구사항</h4><button type="button">+</button></header>{requirements.map((feature, index) => <button className={requirementId === feature.id ? "selected" : ""} key={feature.id} onClick={() => selectRequirement(feature.id)} type="button"><span>{index + 1}</span><strong>{feature.title}</strong><small>{features.filter((item) => item.parentId === feature.id).length}</small></button>)}</aside>
    <aside className="document-column"><header><h4>기능 / 상세 기능</h4><button type="button">+</button></header>{details.map((feature, index) => <button className={selected?.id === feature.id ? "selected" : ""} key={feature.id} onClick={() => setFeatureId(feature.id)} type="button"><span>{index + 1}</span><strong>{feature.title}</strong><small>{feature.acceptanceCriteria.length}</small></button>)}</aside>
    <main className="document-detail">{selected ? <FeatureEditor key={selected.id} feature={selected} onSave={onSave} /> : <p>편집할 기능을 선택해 주세요.</p>}</main>
  </div>;
}
