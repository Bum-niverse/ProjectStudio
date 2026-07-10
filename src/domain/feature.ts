export interface FeatureSpec {
  id: string;
  parentId?: string;
  title: string;
  status: "planned" | "ready" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  role: string;
  description: string;
  sortOrder: number;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  isMet: boolean;
  sortOrder: number;
}

function criteria(featureId: string, descriptions: string[]): AcceptanceCriterion[] {
  return descriptions.map((description, index) => ({ id: `${featureId}-ac-${index + 1}`, description, isMet: false, sortOrder: index }));
}

export function createDevelopmentFeatureSpec(projectId: string): FeatureSpec[] {
  return [
    { id: `${projectId}-root`, title: "핵심 제품 경험", status: "planned", priority: "critical", role: "제품 소유자", description: "제품의 최상위 목표", sortOrder: 0, acceptanceCriteria: [] },
    { id: `${projectId}-planning`, parentId: `${projectId}-root`, title: "기획 문서", status: "ready", priority: "high", role: "기획자", description: "아이디어를 PRD와 기능명세로 구조화하고 변경 이력을 보존한다.", sortOrder: 1, acceptanceCriteria: criteria(`${projectId}-planning`, ["PRD와 기능명세를 독립 페이지에서 열 수 있다.", "모든 문서는 안정적인 ID를 가진다."]) },
    { id: `${projectId}-prd`, parentId: `${projectId}-planning`, title: "PRD 생성·편집", status: "in_progress", priority: "critical", role: "제품 소유자", description: "아이디어에서 구조화된 PRD를 생성하고 직접 편집한다.", sortOrder: 2, acceptanceCriteria: criteria(`${projectId}-prd`, ["아이디어 입력 후 PRD가 자동 생성된다.", "편집 결과가 새 불변 리비전으로 저장된다.", "앱 재실행 후 최신 PRD가 복원된다."]) },
    { id: `${projectId}-revision`, parentId: `${projectId}-planning`, title: "리비전과 변경 기록", status: "ready", priority: "high", role: "제품 소유자", description: "문서 변경 이력을 보존하고 변경된 필드를 식별한다.", sortOrder: 3, acceptanceCriteria: criteria(`${projectId}-revision`, ["이전 리비전을 조회할 수 있다.", "변경된 필드와 항목 ID를 확인할 수 있다."]) },
    { id: `${projectId}-views`, parentId: `${projectId}-planning`, title: "문서·트리·마인드맵 보기", status: "in_progress", priority: "high", role: "기획자", description: "같은 기능명세를 문서, 계층 트리와 방사형 마인드맵으로 탐색한다.", sortOrder: 4, acceptanceCriteria: criteria(`${projectId}-views`, ["세 보기에서 같은 기능 ID와 내용을 표시한다.", "보기 전환 시 선택한 기능이 유지된다.", "트리와 마인드맵의 사용자 배치를 복원한다."]) },
    { id: `${projectId}-comments`, parentId: `${projectId}-planning`, title: "코멘트와 검토 상태", status: "planned", priority: "medium", role: "제품 소유자", description: "기능별 코멘트와 검토 상태를 기록한다.", sortOrder: 5, acceptanceCriteria: criteria(`${projectId}-comments`, ["기능 문서에 코멘트를 추가할 수 있다.", "해결된 코멘트와 미해결 코멘트를 구분한다."]) },
    { id: `${projectId}-export`, parentId: `${projectId}-planning`, title: "Codex 문서 동기화", status: "planned", priority: "critical", role: "개발자", description: "기획 문서를 Markdown과 JSON으로 동기화하고 변경 manifest를 생성한다.", sortOrder: 6, acceptanceCriteria: criteria(`${projectId}-export`, ["안정적인 ID 기반 파일을 생성한다.", "마지막 저장 이후 변경 필드를 manifest에 기록한다.", "Codex가 연결 코드와 테스트를 찾을 수 있다."]) },
    { id: `${projectId}-delivery`, parentId: `${projectId}-root`, title: "개발 추적", status: "planned", priority: "high", role: "개발자", description: "기획 항목과 구현·검증 근거를 연결한다.", sortOrder: 7, acceptanceCriteria: criteria(`${projectId}-delivery`, ["기능에서 관련 코드와 테스트로 이동할 수 있다."]) },
    { id: `${projectId}-code`, parentId: `${projectId}-delivery`, title: "코드·커밋 연결", status: "planned", priority: "medium", role: "개발자", description: "기능과 파일·브랜치·커밋을 연결한다.", sortOrder: 8, acceptanceCriteria: criteria(`${projectId}-code`, ["기능별 관련 파일과 커밋이 표시된다."]) },
    { id: `${projectId}-test`, parentId: `${projectId}-delivery`, title: "테스트·완료 추적", status: "planned", priority: "high", role: "개발자", description: "수용 기준과 테스트 결과를 기반으로 완료 상태를 추적한다.", sortOrder: 9, acceptanceCriteria: criteria(`${projectId}-test`, ["수용 기준별 연결 테스트와 결과를 확인할 수 있다.", "미검증 기능은 완료로 표시되지 않는다."]) },
    { id: `${projectId}-impact`, parentId: `${projectId}-delivery`, title: "변경 영향 분석", status: "planned", priority: "critical", role: "개발자", description: "변경된 기획 ID에서 영향을 받는 기능·파일·테스트를 계산한다.", sortOrder: 10, acceptanceCriteria: criteria(`${projectId}-impact`, ["변경된 기능의 하위 항목을 찾는다.", "연결된 파일과 테스트를 영향 후보로 표시한다."]) },
    { id: `${projectId}-tasks`, parentId: `${projectId}-delivery`, title: "개발 작업 생성", status: "planned", priority: "high", role: "개발자", description: "기능과 수용 기준에서 구현 작업을 생성한다.", sortOrder: 11, acceptanceCriteria: criteria(`${projectId}-tasks`, ["작업에 근거 기능과 수용 기준 ID가 포함된다.", "작업 상태를 기능 완료 판정에 반영한다."]) },
    { id: `${projectId}-completion`, parentId: `${projectId}-delivery`, title: "개발 완료 판정", status: "planned", priority: "high", role: "제품 소유자", description: "코드·테스트·수용 기준 근거를 종합해 완료 상태를 추적한다.", sortOrder: 12, acceptanceCriteria: criteria(`${projectId}-completion`, ["필수 수용 기준이 검증돼야 완료할 수 있다.", "완료 근거 커밋과 테스트를 표시한다."]) },
  ];
}
