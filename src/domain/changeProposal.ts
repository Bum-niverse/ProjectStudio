import type { FeatureSpec } from "./feature";

export type ProposalStatus = "pending" | "accepted" | "rejected";
export interface FeatureChangeProposal {
  id: string;
  projectId: string;
  featureId: string;
  baseFeature: FeatureSpec;
  proposedFeature: FeatureSpec;
  summary: string;
  source: "development_ai" | "codex" | "manual";
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
  rejectionReason?: string;
}

export function createDevelopmentProposal(feature: FeatureSpec): Pick<FeatureChangeProposal, "proposedFeature" | "summary"> {
  const newCriterion = {
    id: `${feature.id}-ac-${crypto.randomUUID()}`,
    description: "저장 실패 시 편집 내용을 유지하고 사용자가 다시 시도할 수 있다.",
    isMet: false,
    sortOrder: feature.acceptanceCriteria.length,
  };
  return {
    summary: "설명을 실행 가능한 문장으로 보강하고 오류 복구 수용 기준을 추가합니다.",
    proposedFeature: {
      ...feature,
      status: feature.status === "planned" ? "ready" : feature.status,
      description: `${feature.description.trim()} 구현 시 정상 흐름뿐 아니라 로딩·빈 상태·오류 복구 상태를 함께 제공한다.`,
      acceptanceCriteria: [...feature.acceptanceCriteria, newCriterion],
    },
  };
}
