import { invoke, isTauri } from "@tauri-apps/api/core";
import type { FeatureChangeProposal } from "../domain/changeProposal";
import type { ChangeProposalRepository } from "../ports/changeProposalRepository";

class TauriChangeProposalRepository implements ChangeProposalRepository {
  list(projectId: string) { return invoke<FeatureChangeProposal[]>("list_feature_change_proposals", { projectId }); }
  create(input: Parameters<ChangeProposalRepository["create"]>[0]) {
    return invoke<FeatureChangeProposal>("create_feature_change_proposal", { input: {
      id: `proposal-${crypto.randomUUID()}`, projectId: input.projectId, featureId: input.featureId,
      proposedFeature: input.proposedFeature, summary: input.summary, source: "development_ai", createdAt: new Date().toISOString(),
    } });
  }
  decide(input: Parameters<ChangeProposalRepository["decide"]>[0]) {
    return invoke<FeatureChangeProposal>("decide_feature_change_proposal", { input: { ...input, decidedAt: new Date().toISOString() } });
  }
}

class BrowserChangeProposalRepository implements ChangeProposalRepository {
  private key(projectId: string) { return `projectstudio:${projectId}:change-proposals`; }
  async list(projectId: string) { return JSON.parse(localStorage.getItem(this.key(projectId)) ?? "[]") as FeatureChangeProposal[]; }
  async create(input: Parameters<ChangeProposalRepository["create"]>[0]) {
    const proposal: FeatureChangeProposal = { id: `proposal-${crypto.randomUUID()}`, ...input, source: "development_ai", status: "pending", createdAt: new Date().toISOString() };
    const current = await this.list(input.projectId); localStorage.setItem(this.key(input.projectId), JSON.stringify([proposal, ...current])); return proposal;
  }
  async decide(input: Parameters<ChangeProposalRepository["decide"]>[0]) {
    const current = await this.list(input.projectId); const proposal = current.find((item) => item.id === input.proposalId);
    if (!proposal || proposal.status !== "pending") throw new Error("이미 처리됐거나 존재하지 않는 변경안입니다.");
    const decided = { ...proposal, status: input.decision, decidedAt: new Date().toISOString(), rejectionReason: input.rejectionReason } satisfies FeatureChangeProposal;
    localStorage.setItem(this.key(input.projectId), JSON.stringify(current.map((item) => item.id === decided.id ? decided : item))); return decided;
  }
}

export function createChangeProposalRepository(): ChangeProposalRepository {
  return isTauri() ? new TauriChangeProposalRepository() : new BrowserChangeProposalRepository();
}
