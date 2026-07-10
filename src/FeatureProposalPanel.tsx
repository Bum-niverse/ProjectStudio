import { useEffect, useMemo, useState } from "react";
import { createChangeProposalRepository } from "./adapters/changeProposalRepository";
import { createDevelopmentProposal, type FeatureChangeProposal } from "./domain/changeProposal";
import type { FeatureSpec } from "./domain/feature";

interface FeatureProposalPanelProps {
  projectId: string;
  features: FeatureSpec[];
  isOpen: boolean;
  onClose: () => void;
  onAccepted: (feature: FeatureSpec) => void;
}

function CompareValue({ before, after }: { before: string; after: string }) {
  const isChanged = before !== after;
  return <div className={isChanged ? "proposal-compare-row changed" : "proposal-compare-row"}>
    <div><small>현재</small><p>{before || "—"}</p></div><div><small>제안</small><p>{after || "—"}</p></div>
  </div>;
}

export function FeatureProposalPanel({ projectId, features, isOpen, onClose, onAccepted }: FeatureProposalPanelProps) {
  const repository = useMemo(() => createChangeProposalRepository(), []);
  const selectableFeatures = features.filter((feature) => feature.parentId);
  const [proposals, setProposals] = useState<FeatureChangeProposal[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [featureId, setFeatureId] = useState(selectableFeatures[0]?.id ?? "");
  const [message, setMessage] = useState<string>();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void repository.list(projectId).then((items) => {
      setProposals(items); setSelectedId((current) => current ?? items.find((item) => item.status === "pending")?.id ?? items[0]?.id);
    }).catch(() => setMessage("변경안 목록을 불러오지 못했습니다."));
  }, [isOpen, projectId, repository]);

  const selected = proposals.find((proposal) => proposal.id === selectedId);
  const pendingCount = proposals.filter((proposal) => proposal.status === "pending").length;

  async function handleCreate() {
    const feature = features.find((item) => item.id === featureId); if (!feature) return;
    setIsWorking(true); setMessage(undefined);
    try {
      const generated = createDevelopmentProposal(feature);
      const proposal = await repository.create({ projectId, featureId: feature.id, baseFeature: feature, ...generated });
      setProposals((current) => [proposal, ...current]); setSelectedId(proposal.id);
      setMessage("로컬 개발 모드 AI 변경안을 만들었습니다. 승인 전까지 원본은 바뀌지 않습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "변경안을 만들지 못했습니다."); }
    finally { setIsWorking(false); }
  }

  async function handleDecision(decision: "accepted" | "rejected") {
    if (!selected) return;
    setIsWorking(true); setMessage(undefined);
    try {
      const decided = await repository.decide({ projectId, proposalId: selected.id, decision, rejectionReason: decision === "rejected" ? rejectionReason.trim() || undefined : undefined });
      setProposals((current) => current.map((item) => item.id === decided.id ? decided : item));
      if (decision === "accepted") onAccepted(decided.proposedFeature);
      setMessage(decision === "accepted" ? "변경안을 승인하고 기능명세에 반영했습니다." : "변경안을 거절하고 원본을 유지했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "변경안을 처리하지 못했습니다."); }
    finally { setIsWorking(false); }
  }

  if (!isOpen) return null;
  return <div className="proposal-backdrop" role="presentation">
    <section className="proposal-panel" role="dialog" aria-modal="true" aria-label="AI 변경안 검토">
      <header><div><p className="eyebrow">AI CHANGE REVIEW</p><h3>AI 변경안 검토 <span>{pendingCount}개 대기</span></h3></div><button className="panel-close" onClick={onClose} type="button">×</button></header>
      <div className="proposal-create"><select aria-label="변경안을 만들 기능" value={featureId} onChange={(event) => setFeatureId(event.target.value)}>{selectableFeatures.map((feature) => <option key={feature.id} value={feature.id}>{feature.title}</option>)}</select><button onClick={() => void handleCreate()} disabled={!featureId || isWorking} type="button">개발 모드 AI 변경안 만들기</button></div>
      <div className="proposal-body">
        <aside className="proposal-list">{proposals.length === 0 ? <p>아직 변경안이 없습니다.</p> : proposals.map((proposal) => <button className={selectedId === proposal.id ? "selected" : ""} key={proposal.id} onClick={() => { setSelectedId(proposal.id); setRejectionReason(""); }} type="button"><strong>{proposal.baseFeature.title}</strong><small>{proposal.status === "pending" ? "승인 대기" : proposal.status === "accepted" ? "승인됨" : "거절됨"}</small><span>{proposal.summary}</span></button>)}</aside>
        <main className="proposal-detail">{selected ? <>
          <div className="proposal-summary"><strong>{selected.summary}</strong><span>출처: {selected.source === "development_ai" ? "로컬 개발 모드" : selected.source}</span></div>
          <h4>설명 비교</h4><CompareValue before={selected.baseFeature.description} after={selected.proposedFeature.description} />
          <h4>상태 · 중요도 · 역할</h4><CompareValue before={`${selected.baseFeature.status} · ${selected.baseFeature.priority} · ${selected.baseFeature.role}`} after={`${selected.proposedFeature.status} · ${selected.proposedFeature.priority} · ${selected.proposedFeature.role}`} />
          <h4>수용 기준</h4><CompareValue before={selected.baseFeature.acceptanceCriteria.map((item) => `• ${item.description}`).join("\n")} after={selected.proposedFeature.acceptanceCriteria.map((item) => `• ${item.description}`).join("\n")} />
          {selected.status === "pending" ? <div className="proposal-decision"><textarea aria-label="거절 사유" placeholder="거절 사유(선택)" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /><div><button className="secondary danger" onClick={() => void handleDecision("rejected")} disabled={isWorking} type="button">거절</button><button onClick={() => void handleDecision("accepted")} disabled={isWorking} type="button">변경안 승인</button></div></div> : <p className={`proposal-status ${selected.status}`}>{selected.status === "accepted" ? "이 변경안은 승인되어 반영됐습니다." : `이 변경안은 거절됐습니다.${selected.rejectionReason ? ` 사유: ${selected.rejectionReason}` : ""}`}</p>}
        </> : <p>왼쪽에서 검토할 변경안을 선택해 주세요.</p>}</main>
      </div>{message && <p className="proposal-message" aria-live="polite">{message}</p>}
    </section>
  </div>;
}
