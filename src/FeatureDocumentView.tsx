import { useMemo, useState, type CSSProperties } from "react";
import { NODE_COLORS, type AcceptanceCriterion, type FeatureSpec } from "./domain/feature";

interface FeatureDocumentViewProps {
  features: FeatureSpec[];
  onSave: (feature: FeatureSpec) => Promise<void>;
}

export function FeatureEditor({ feature, onSave }: { feature: FeatureSpec; onSave: (feature: FeatureSpec) => Promise<void> }) {
  const [draft, setDraft] = useState(feature);
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  function updateCriterion(index: number, patch: Partial<AcceptanceCriterion>) {
    setDraft((current) => ({ ...current, acceptanceCriteria: current.acceptanceCriteria.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  async function handleCriterionCheck(index: number, isMet: boolean) {
    const updated = { ...draft, acceptanceCriteria: draft.acceptanceCriteria.map((item, itemIndex) => itemIndex === index ? { ...item, isMet } : item) };
    setDraft(updated);
    setMessage("수용 기준 체크를 저장하는 중…");
    try { await onSave(updated); setMessage(isMet ? "수용 기준 충족을 저장했습니다." : "수용 기준 체크를 해제했습니다."); }
    catch { setMessage("수용 기준 체크를 저장하지 못했습니다. 선택은 유지됩니다."); }
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

  async function handleColorChange(colorKey:FeatureSpec["colorKey"]){const updated={...draft,colorKey};setDraft(updated);setMessage("색상을 저장하는 중…");try{await onSave(updated);setMessage("노드 색상을 자동 저장했습니다.");}catch{setMessage("색상을 저장하지 못했습니다. 선택은 유지됩니다.");}}

  return <div className="feature-document-editor">
    <div className="document-editor-top"><span>ID {draft.id}</span><button onClick={handleSave} disabled={isSaving} type="button">{isSaving ? "저장 중…" : "문서 저장"}</button></div>
    <input className="document-title-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="기능명" />
    <div className="document-meta">
      <label>상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as FeatureSpec["status"] })}><option value="planned">기획</option><option value="ready">준비</option><option value="in_progress">진행</option><option value="blocked">차단</option><option value="done">완료</option></select></label>
      <label>중요도<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as FeatureSpec["priority"] })}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option><option value="critical">핵심</option></select></label>
      <label>역할<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
    </div>
    <div className="node-color-palette" aria-label="노드 색상">{NODE_COLORS.map((color) => <button aria-label={`${color.label} 색상`} className={draft.colorKey === color.key ? "selected" : ""} key={color.key} onClick={() => void handleColorChange(color.key)} style={{ "--node-color": color.color } as CSSProperties} type="button" />)}</div>
    <label className="document-section">설명<textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
    <section className="criteria-section"><div><h4>수용 기준</h4><button className="secondary" onClick={addCriterion} type="button">+ 기준 추가</button></div>
      {draft.acceptanceCriteria.map((criterion, index) => <div className="criterion-row" key={criterion.id}><input aria-label={`수용 기준 ${index+1} 충족`} type="checkbox" checked={criterion.isMet} onChange={(event) => void handleCriterionCheck(index, event.currentTarget.checked)} /><textarea aria-label={`수용 기준 ${index+1}`} rows={2} value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} /><button aria-label={`수용 기준 ${index+1} 삭제`} onClick={() => setDraft((current) => ({ ...current, acceptanceCriteria: current.acceptanceCriteria.filter((_, itemIndex) => itemIndex !== index) }))} type="button">×</button></div>)}
    </section>
    {message && <p className="document-save-message" aria-live="polite">{message}</p>}
  </div>;
}

export function FeatureDocumentView({ features, onSave }: FeatureDocumentViewProps) {
  const root = features.filter(feature=>!feature.parentId).sort((a,b)=>a.sortOrder-b.sortOrder)[0];
  const requirements = useMemo(() => features.filter((feature) => feature.parentId === root?.id||(!feature.parentId&&feature.id!==root?.id)), [features, root?.id]);
  const [requirementId, setRequirementId] = useState(requirements[0]?.id);
  const details = features.filter((feature) => feature.parentId === requirementId);
  const [featureId, setFeatureId] = useState(details[0]?.id ?? requirementId);
  const selected = features.find((feature) => feature.id === featureId) ?? requirements[0];

  function selectRequirement(id: string) { setRequirementId(id); setFeatureId(features.find((feature) => feature.parentId === id)?.id ?? id); }
  return <div className="document-view">
    <aside className="document-column"><header><h4>요구사항</h4><button aria-label="요구사항 추가" type="button">+</button></header>{requirements.map((feature, index) => <button className={requirementId === feature.id ? "selected" : ""} key={feature.id} onClick={() => selectRequirement(feature.id)} type="button"><span>{feature.status==="done"?"✓":index+1}</span><strong>{feature.title}</strong><small>{features.filter((item) => item.parentId === feature.id).length}</small></button>)}</aside>
    <aside className="document-column"><header><h4>기능 / 상세 기능</h4><button aria-label="상세 기능 추가" type="button">+</button></header>{details.map((feature, index) => {const met=feature.acceptanceCriteria.filter(item=>item.isMet).length;return <button className={selected?.id === feature.id ? "selected" : ""} key={feature.id} onClick={() => setFeatureId(feature.id)} type="button"><span>{feature.status==="done"?"✓":index+1}</span><strong>{feature.title}</strong><small>{met}/{feature.acceptanceCriteria.length}</small></button>;})}</aside>
    <main className="document-detail">{selected ? <FeatureEditor key={selected.id} feature={selected} onSave={onSave} /> : <p>편집할 기능을 선택해 주세요.</p>}</main>
  </div>;
}
