import type { FeatureChangeProposal } from "../domain/changeProposal";
import type { FeatureSpec } from "../domain/feature";

export interface ChangeProposalRepository {
  list(projectId: string): Promise<FeatureChangeProposal[]>;
  create(input: { projectId: string; featureId: string; baseFeature: FeatureSpec; proposedFeature: FeatureSpec; summary: string }): Promise<FeatureChangeProposal>;
  decide(input: { projectId: string; proposalId: string; decision: "accepted" | "rejected"; rejectionReason?: string }): Promise<FeatureChangeProposal>;
}
