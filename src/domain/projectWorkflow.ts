import { isDataProject, type ProjectType } from "./project";

export type WorkflowStageId = "project" | "prd" | "features" | "user-flow" | "system-design" | "export";
export interface WorkflowStageDefinition { id: WorkflowStageId; label: string }

const WEB_MOBILE_STAGES: WorkflowStageDefinition[] = [
  { id: "project", label: "프로젝트" }, { id: "prd", label: "PRD" },
  { id: "features", label: "기능명세" }, { id: "user-flow", label: "유저플로우" },
  { id: "system-design", label: "시스템 설계" }, { id: "export", label: "내보내기" },
];

export function workflowStages(projectType?: ProjectType): WorkflowStageDefinition[] {
  if (!projectType || !isDataProject(projectType)) return WEB_MOBILE_STAGES;
  const isMl = projectType === "machine_learning";
  return [
    { id: "project", label: "프로젝트 정의" },
    { id: "prd", label: "문제·목표 정의" },
    { id: "features", label: isMl ? "데이터·타깃 설계" : "데이터 설계" },
    { id: "user-flow", label: isMl ? "실험 설계" : "분석 설계" },
    { id: "system-design", label: isMl ? "ML 파이프라인 설계" : "데이터 시스템 설계" },
    { id: "export", label: "실행 계획·내보내기" },
  ];
}
