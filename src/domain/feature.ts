export interface FeatureSpec {
  id: string;
  parentId?: string;
  title: string;
  status: "planned" | "ready" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  role: string;
}

export function createDevelopmentFeatureSpec(projectId: string): FeatureSpec[] {
  return [
    { id: `${projectId}-root`, title: "핵심 제품 경험", status: "planned", priority: "critical", role: "제품 소유자" },
    { id: `${projectId}-planning`, parentId: `${projectId}-root`, title: "기획 문서", status: "ready", priority: "high", role: "기획자" },
    { id: `${projectId}-prd`, parentId: `${projectId}-planning`, title: "PRD 생성·편집", status: "in_progress", priority: "critical", role: "제품 소유자" },
    { id: `${projectId}-revision`, parentId: `${projectId}-planning`, title: "리비전과 변경 기록", status: "ready", priority: "high", role: "제품 소유자" },
    { id: `${projectId}-delivery`, parentId: `${projectId}-root`, title: "개발 추적", status: "planned", priority: "high", role: "개발자" },
    { id: `${projectId}-code`, parentId: `${projectId}-delivery`, title: "코드·커밋 연결", status: "planned", priority: "medium", role: "개발자" },
    { id: `${projectId}-test`, parentId: `${projectId}-delivery`, title: "테스트·완료 추적", status: "planned", priority: "high", role: "개발자" },
  ];
}
