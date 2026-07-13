export type ProjectType = "auto" | "web" | "mobile" | "desktop" | "backend_cli" | "machine_learning" | "data_analysis" | "general";
export type DataAnalysisSubtype = "eda" | "statistical" | "time_series_analysis" | "dashboard_report" | "data_pipeline" | "research_reproduction" | "other_data";
export type MachineLearningSubtype = "regression" | "classification" | "time_series_forecasting" | "recommendation" | "anomaly_detection" | "clustering" | "nlp" | "computer_vision" | "ranking" | "other_ml";
export type ProjectSubtype = DataAnalysisSubtype | MachineLearningSubtype;

export const PROJECT_SUBTYPES: Record<"data_analysis" | "machine_learning", Array<{ id: ProjectSubtype; label: string }>> = {
  data_analysis: [
    { id: "eda", label: "탐색적 데이터 분석" }, { id: "statistical", label: "통계 분석" },
    { id: "time_series_analysis", label: "시계열 분석" }, { id: "dashboard_report", label: "대시보드·리포트" },
    { id: "data_pipeline", label: "데이터 파이프라인" }, { id: "research_reproduction", label: "연구·논문 재현" },
    { id: "other_data", label: "기타" },
  ],
  machine_learning: [
    { id: "regression", label: "회귀" }, { id: "classification", label: "분류" },
    { id: "time_series_forecasting", label: "시계열 예측" }, { id: "recommendation", label: "추천 시스템" },
    { id: "anomaly_detection", label: "이상 탐지" }, { id: "clustering", label: "클러스터링" },
    { id: "nlp", label: "자연어 처리" }, { id: "computer_vision", label: "컴퓨터 비전" },
    { id: "ranking", label: "랭킹" }, { id: "other_ml", label: "기타" },
  ],
};

export function isDataProject(projectType: ProjectType): projectType is "data_analysis" | "machine_learning" {
  return projectType === "data_analysis" || projectType === "machine_learning";
}

export const PROJECT_TYPES: Array<{ id: Exclude<ProjectType, "auto">; label: string; description: string }> = [
  { id: "web", label: "웹 서비스", description: "브라우저 화면, 사용자 흐름, API와 권한을 설계합니다." },
  { id: "mobile", label: "모바일 앱", description: "화면 전환, 기기 권한, 오프라인과 앱 상태를 설계합니다." },
  { id: "machine_learning", label: "머신러닝", description: "데이터, 피처, 분할, 학습, 평가와 모델 산출물을 설계합니다." },
  { id: "data_analysis", label: "데이터 분석", description: "수집, 정제, 병합, 분석, 시각화와 재현성을 설계합니다." },
];

const LEGACY_PROJECT_TYPE_LABELS: Partial<Record<ProjectType, string>> = {
  desktop: "데스크톱 프로그램 (이전 유형)",
  backend_cli: "백엔드·CLI·자동화 (이전 유형)",
  general: "기타 소프트웨어 (이전 유형)",
};

export function isInterfaceProject(projectType: ProjectType): boolean {
  return ["auto", "web", "mobile", "desktop", "general"].includes(projectType);
}

export function projectTypeLabel(projectType: ProjectType): string {
  if (projectType === "auto") return "자동 감지";
  return PROJECT_TYPES.find(type => type.id === projectType)?.label ?? LEGACY_PROJECT_TYPE_LABELS[projectType] ?? "이전 프로젝트 유형";
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  projectType: ProjectType;
  projectSubtype?: ProjectSubtype;
  createdAt: string;
  updatedAt: string;
}

export interface PrdRevision {
  id: string;
  documentId: string;
  revisionNumber: number;
  contentMarkdown: string;
  source: "user" | "development_mode" | "ai";
  createdAt: string;
}

export interface ProjectWithPrd {
  project: Project;
  prd: PrdRevision;
}

export interface CreateProjectInput {
  name: string;
  idea: string;
  projectType: ProjectType;
  projectSubtype?: ProjectSubtype;
}

export interface ProjectValidationErrors {
  name?: string;
  idea?: string;
  projectType?: string;
  projectSubtype?: string;
}

export class ProjectValidationError extends Error {
  readonly fields: ProjectValidationErrors;

  constructor(fields: ProjectValidationErrors) {
    super("프로젝트 입력을 확인해 주세요.");
    this.name = "ProjectValidationError";
    this.fields = fields;
  }
}
