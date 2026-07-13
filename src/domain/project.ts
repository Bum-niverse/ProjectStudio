export type ProjectType = "auto" | "web" | "mobile" | "desktop" | "backend_cli" | "machine_learning" | "data_analysis" | "general";

export const PROJECT_TYPES: Array<{ id: Exclude<ProjectType, "auto">; label: string; description: string }> = [
  { id: "web", label: "웹 서비스", description: "브라우저 화면, 사용자 흐름, API와 권한을 설계합니다." },
  { id: "mobile", label: "모바일 앱", description: "화면 전환, 기기 권한, 오프라인과 앱 상태를 설계합니다." },
  { id: "desktop", label: "데스크톱 프로그램", description: "창·패널, 로컬 파일·DB, 설치와 업데이트를 설계합니다." },
  { id: "backend_cli", label: "백엔드·CLI·자동화", description: "요청·명령·입력에서 처리와 출력까지 실행 흐름을 설계합니다." },
  { id: "machine_learning", label: "머신러닝", description: "데이터, 피처, 분할, 학습, 평가와 모델 산출물을 설계합니다." },
  { id: "data_analysis", label: "데이터 분석", description: "수집, 정제, 병합, 분석, 시각화와 재현성을 설계합니다." },
  { id: "general", label: "기타 소프트웨어", description: "아직 특정 유형으로 나누기 어려운 소프트웨어를 설계합니다." },
];

export function isInterfaceProject(projectType: ProjectType): boolean {
  return ["auto", "web", "mobile", "desktop", "general"].includes(projectType);
}

export function projectTypeLabel(projectType: ProjectType): string {
  if (projectType === "auto") return "자동 감지";
  return PROJECT_TYPES.find(type => type.id === projectType)?.label ?? "기타 소프트웨어";
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  projectType: ProjectType;
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
}

export interface ProjectValidationErrors {
  name?: string;
  idea?: string;
  projectType?: string;
}

export class ProjectValidationError extends Error {
  readonly fields: ProjectValidationErrors;

  constructor(fields: ProjectValidationErrors) {
    super("프로젝트 입력을 확인해 주세요.");
    this.name = "ProjectValidationError";
    this.fields = fields;
  }
}
