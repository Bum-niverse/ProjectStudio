import { invoke, isTauri } from "@tauri-apps/api/core";
import { createFeatureRepository } from "../adapters/featureRepository";
import { createSystemDesignRepository } from "../adapters/systemDesignRepository";
import { createUserFlowRepository } from "../adapters/userFlowRepository";
import type { FeatureSpec } from "../domain/feature";
import type { ProjectSubtype, ProjectType } from "../domain/project";
import { inspectPlanningQuality, type PlanningQualityReport } from "../domain/planningQuality";
import type { SystemDesignSnapshot } from "../domain/systemDesign";
import { validateSystemDesign } from "../domain/systemDesign";
import type { UserFlowEdge, UserFlowNode } from "../domain/userFlow";

interface PlanningBundle {
  features: FeatureSpec[];
  userFlow: { nodes: UserFlowNode[]; edges: UserFlowEdge[] };
  systemDesign: SystemDesignSnapshot;
}

export interface PlanningGenerationResult {
  featureCount: number;
  criterionCount: number;
  flowNodeCount: number;
  flowEdgeCount: number;
  designNodeCount: number;
  designEdgeCount: number;
  quality: PlanningQualityReport;
}

export async function generateAndSavePlanningBundle(input: {
  projectId: string;
  projectName: string;
  projectType: ProjectType;
  projectSubtype?: ProjectSubtype;
  sourceDocumentId: string;
  prdMarkdown: string;
  replaceExisting?: boolean;
}): Promise<PlanningGenerationResult> {
  if (!isTauri()) throw new Error("Codex 상세 기획 생성은 데스크톱 앱에서 사용할 수 있습니다.");
  const bundle = await invoke<PlanningBundle>("generate_project_plan_with_codex", { input });
  const designErrors = validateSystemDesign(bundle.systemDesign);
  if (designErrors.length) throw new Error(designErrors[0]);
  const quality = inspectPlanningQuality({ projectType: input.projectType, prdMarkdown: input.prdMarkdown, ...bundle });

  const features = await createFeatureRepository().initialize(input.projectId, input.sourceDocumentId, bundle.features, input.replaceExisting);
  const userFlow = await createUserFlowRepository().initialize(input.projectId, bundle.userFlow.nodes, bundle.userFlow.edges, input.replaceExisting);
  const systemDesignRepository = createSystemDesignRepository();
  let systemDesign = await systemDesignRepository.initialize(input.projectId, bundle.systemDesign);
  if (input.replaceExisting) systemDesign = await systemDesignRepository.saveRevision(input.projectId, systemDesign.designId, bundle.systemDesign, "codex");

  return {
    featureCount: features.length,
    criterionCount: features.reduce((sum, feature) => sum + feature.acceptanceCriteria.length, 0),
    flowNodeCount: userFlow.nodes.length,
    flowEdgeCount: userFlow.edges.length,
    designNodeCount: systemDesign.revision.snapshot.nodes.length,
    designEdgeCount: systemDesign.revision.snapshot.edges.length,
    quality,
  };
}
