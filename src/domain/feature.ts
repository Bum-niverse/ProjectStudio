export interface FeatureSpec {
  id: string;
  parentId?: string;
  title: string;
  status: "planned" | "ready" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  role: string;
  description: string;
  sortOrder: number;
}

export function createDevelopmentFeatureSpec(projectId: string): FeatureSpec[] {
  return [
    { id: `${projectId}-root`, title: "핵심 제품 경험", status: "planned", priority: "critical", role: "제품 소유자", description: "제품의 최상위 목표", sortOrder: 0 },
    { id: `${projectId}-planning`, parentId: `${projectId}-root`, title: "기획 문서", status: "ready", priority: "high", role: "기획자", description: "기획 정보를 구조화한다.", sortOrder: 1 },
    { id: `${projectId}-prd`, parentId: `${projectId}-planning`, title: "PRD 생성·편집", status: "in_progress", priority: "critical", role: "제품 소유자", description: "PRD를 생성하고 편집한다.", sortOrder: 2 },
    { id: `${projectId}-revision`, parentId: `${projectId}-planning`, title: "리비전과 변경 기록", status: "ready", priority: "high", role: "제품 소유자", description: "변경 이력을 보존한다.", sortOrder: 3 },
    { id: `${projectId}-delivery`, parentId: `${projectId}-root`, title: "개발 추적", status: "planned", priority: "high", role: "개발자", description: "구현 진행을 추적한다.", sortOrder: 4 },
    { id: `${projectId}-code`, parentId: `${projectId}-delivery`, title: "코드·커밋 연결", status: "planned", priority: "medium", role: "개발자", description: "기능과 구현 근거를 연결한다.", sortOrder: 5 },
    { id: `${projectId}-test`, parentId: `${projectId}-delivery`, title: "테스트·완료 추적", status: "planned", priority: "high", role: "개발자", description: "검증과 완료 상태를 연결한다.", sortOrder: 6 },
  ];
}
