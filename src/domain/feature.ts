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

function createGlobeatFeatureSpec(projectId: string): FeatureSpec[] {
  const root=`${projectId}-root`;const definitions:FeatureSpec[]=[
    {id:root,title:"Globeat 배송 운영",status:"planned",priority:"critical",role:"운영 관리자",description:"배송지 등록부터 배차, 기사 배송과 운영 리포트까지 한 흐름으로 관리한다.",sortOrder:0,acceptanceCriteria:[]},
    {id:`${projectId}-master`,parentId:root,title:"기업 온보딩 및 기준정보 관리",status:"ready",priority:"high",role:"운영 관리자",description:"차량·기사·거래처와 배송 규칙을 등록하고 운영 기준을 준비한다.",sortOrder:1,acceptanceCriteria:criteria(`${projectId}-master`,["차량·기사·거래처를 등록하고 활성 상태를 관리할 수 있다."])},
    {id:`${projectId}-vehicle`,parentId:`${projectId}-master`,title:"차량 목록 및 등록",status:"ready",priority:"high",role:"운영 관리자",description:"적재량과 차량 유형을 포함한 배차 가능 차량을 관리한다.",sortOrder:2,acceptanceCriteria:criteria(`${projectId}-vehicle`,["차량을 등록·수정·비활성화할 수 있다."])},
    {id:`${projectId}-driver`,parentId:`${projectId}-master`,title:"기사 목록 및 등록",status:"ready",priority:"high",role:"운영 관리자",description:"기사 연락처와 근무 가능 시간, 담당 차량을 관리한다.",sortOrder:3,acceptanceCriteria:criteria(`${projectId}-driver`,["기사 정보와 담당 차량을 저장할 수 있다."])},
    {id:`${projectId}-partner`,parentId:`${projectId}-master`,title:"거래처·배송지 조건 관리",status:"planned",priority:"medium",role:"운영 관리자",description:"거래처별 배송 시간창과 특이사항을 관리한다.",sortOrder:4,acceptanceCriteria:criteria(`${projectId}-partner`,["거래처별 배송 조건을 배차에 반영할 수 있다."])},
    {id:`${projectId}-upload`,parentId:root,title:"배송지 엑셀/CSV 업로드 및 검증",status:"in_progress",priority:"critical",role:"배차 담당자",description:"당일 배송지 파일을 업로드하고 오류를 수정해 배차 가능한 목록으로 확정한다.",sortOrder:10,acceptanceCriteria:criteria(`${projectId}-upload`,["엑셀/CSV를 업로드해 배송지 목록을 생성한다.","누락·형식·중복 오류를 화면에서 수정한다.","주소를 좌표로 변환해 지도에 표시한다."])},
    {id:`${projectId}-template`,parentId:`${projectId}-upload`,title:"업로드 템플릿과 파일 파싱",status:"in_progress",priority:"high",role:"배차 담당자",description:"표준 템플릿을 제공하고 업로드 파일의 열과 데이터를 파싱한다.",sortOrder:11,acceptanceCriteria:criteria(`${projectId}-template`,["템플릿을 내려받고 엑셀/CSV를 업로드할 수 있다."])},
    {id:`${projectId}-validation`,parentId:`${projectId}-upload`,title:"업로드 데이터 검증 및 오류 수정",status:"in_progress",priority:"critical",role:"배차 담당자",description:"필수값 누락, 형식 오류와 중복을 표시하고 재검증한다.",sortOrder:12,acceptanceCriteria:criteria(`${projectId}-validation`,["오류 행과 원인을 표시하고 수정 후 재검증할 수 있다."])},
    {id:`${projectId}-geocoding`,parentId:`${projectId}-upload`,title:"주소 표준화 및 좌표 변환",status:"planned",priority:"high",role:"시스템",description:"주소를 표준화하고 위경도 좌표로 변환한다.",sortOrder:13,acceptanceCriteria:criteria(`${projectId}-geocoding`,["변환 실패 주소를 구분하고 수동 보정할 수 있다."])},
    {id:`${projectId}-dispatch`,parentId:root,title:"배차 후보 생성 및 확정",status:"planned",priority:"critical",role:"배차 담당자",description:"차량·기사·배송 조건을 반영해 배차 후보를 만들고 비교·조정 후 확정한다.",sortOrder:20,acceptanceCriteria:criteria(`${projectId}-dispatch`,["여러 배차 후보를 비교할 수 있다.","배송 순서를 수동 조정하고 배차를 확정할 수 있다."])},
    {id:`${projectId}-candidate`,parentId:`${projectId}-dispatch`,title:"배차 후보안 생성",status:"planned",priority:"critical",role:"배차 담당자",description:"거리·시간·적재량 기준으로 복수 후보안을 생성한다.",sortOrder:21,acceptanceCriteria:criteria(`${projectId}-candidate`,["거리·시간·적재량별 후보안을 생성한다."])},
    {id:`${projectId}-compare`,parentId:`${projectId}-dispatch`,title:"후보안 비교 화면",status:"planned",priority:"high",role:"배차 담당자",description:"지도와 지표로 후보안을 비교하고 선택한다.",sortOrder:22,acceptanceCriteria:criteria(`${projectId}-compare`,["거리·예상시간·차량 수를 한 화면에서 비교한다."])},
    {id:`${projectId}-adjust`,parentId:`${projectId}-dispatch`,title:"배차 수동 조정 및 확정",status:"planned",priority:"critical",role:"배차 담당자",description:"배송지를 재배정하고 순서를 조정한 뒤 배차를 확정한다.",sortOrder:23,acceptanceCriteria:criteria(`${projectId}-adjust`,["드래그로 배송 순서와 담당 기사를 조정할 수 있다."])},
    {id:`${projectId}-mobile`,parentId:root,title:"기사 모바일 배송 링크 발송 및 수행",status:"planned",priority:"critical",role:"배송 기사",description:"기사에게 배송 링크를 발송하고 순서·상세·완료 증빙을 관리한다.",sortOrder:30,acceptanceCriteria:criteria(`${projectId}-mobile`,["기사별 배송 링크를 발송한다.","기사가 완료 사진과 메모를 저장할 수 있다."])},
    {id:`${projectId}-link`,parentId:`${projectId}-mobile`,title:"카카오톡/SMS 배송 링크 발송",status:"planned",priority:"high",role:"배차 담당자",description:"로그인 없이 접근 가능한 기사별 당일 배송 링크를 발송한다.",sortOrder:31,acceptanceCriteria:criteria(`${projectId}-link`,["카카오톡 또는 SMS로 만료 시간이 있는 링크를 발송한다."])},
    {id:`${projectId}-route`,parentId:`${projectId}-mobile`,title:"기사 배송 목록과 상세",status:"planned",priority:"critical",role:"배송 기사",description:"배송 순서, 주소, 연락처와 요청사항을 모바일에서 확인한다.",sortOrder:32,acceptanceCriteria:criteria(`${projectId}-route`,["지도 앱 길안내와 배송지 상세를 열 수 있다."])},
    {id:`${projectId}-complete`,parentId:`${projectId}-mobile`,title:"배송 완료 처리와 증빙",status:"planned",priority:"high",role:"배송 기사",description:"완료·실패 사유, 사진과 메모를 등록한다.",sortOrder:33,acceptanceCriteria:criteria(`${projectId}-complete`,["완료 사진과 메모가 운영 화면에 즉시 반영된다."])},
    {id:`${projectId}-dashboard`,parentId:root,title:"대시보드 및 리포트",status:"planned",priority:"high",role:"운영 관리자",description:"실시간 진행률과 지연 위험을 확인하고 일별 리포트를 조회한다.",sortOrder:40,acceptanceCriteria:criteria(`${projectId}-dashboard`,["진행·완료·지연 배송 수를 확인한다.","일별 리포트를 조회할 수 있다."])},
    {id:`${projectId}-status`,parentId:`${projectId}-dashboard`,title:"운영 진행 현황",status:"planned",priority:"high",role:"운영 관리자",description:"기사와 배차별 실시간 진행 상태를 표시한다.",sortOrder:41,acceptanceCriteria:criteria(`${projectId}-status`,["진행률과 마지막 갱신 시간을 확인한다."])},
    {id:`${projectId}-risk`,parentId:`${projectId}-dashboard`,title:"지연 위험 알림",status:"planned",priority:"high",role:"운영 관리자",description:"예정 시간을 벗어날 가능성이 높은 배송을 식별한다.",sortOrder:42,acceptanceCriteria:criteria(`${projectId}-risk`,["지연 위험 배송과 원인을 우선순위로 표시한다."])},
    {id:`${projectId}-report`,parentId:`${projectId}-dashboard`,title:"일별 배송 리포트",status:"planned",priority:"medium",role:"운영 관리자",description:"완료율, 실패 사유와 기사별 실적을 조회한다.",sortOrder:43,acceptanceCriteria:criteria(`${projectId}-report`,["날짜별 배송 결과와 실패 사유를 조회한다."])},
  ];
  const parents=definitions.filter(feature=>feature.parentId&&feature.parentId!==root);const details=parents.flatMap((parent,parentIndex)=>[
    {suffix:"flow",title:`${parent.title} 기본 흐름`,description:`${parent.title}의 정상 처리 흐름과 완료 결과를 정의한다.`},
    {suffix:"validation",title:`${parent.title} 입력·검증·오류 복구`,description:`${parent.title}의 입력 조건과 실패 시 재시도 동작을 정의한다.`},
    {suffix:"history",title:`${parent.title} 저장·변경 이력`,description:`${parent.title}의 저장 결과와 변경 이력을 추적한다.`},
  ].map((item,index):FeatureSpec=>{const id=`${parent.id}-${item.suffix}`;return{id,parentId:parent.id,title:item.title,description:item.description,status:"planned",priority:parent.priority,role:parent.role,sortOrder:100+parentIndex*3+index,acceptanceCriteria:criteria(id,["사용자가 해당 단계를 완료하고 결과를 다시 확인할 수 있다."])};}));
  return [...definitions,...details];
}

export function createDevelopmentFeatureSpec(projectId: string, projectName?: string): FeatureSpec[] {
  if(projectName?.trim().toLowerCase()==="globeat")return createGlobeatFeatureSpec(projectId);
  const baseFeatures: FeatureSpec[] = [
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
  const detailParents = baseFeatures.filter((feature) => feature.parentId && feature.parentId !== `${projectId}-root`);
  const detailFeatures = detailParents.flatMap((parent, parentIndex) => {
    const templates = [
      { suffix: "flow", title: `${parent.title} 기본 흐름`, description: `${parent.title}의 정상 사용자 흐름과 화면 상태를 정의한다.`, criterion: "사용자가 정상 흐름을 처음부터 끝까지 완료할 수 있다." },
      { suffix: "validation", title: `${parent.title} 입력·검증·오류 복구`, description: `${parent.title}의 입력 조건, 오류 표시와 재시도 동작을 정의한다.`, criterion: "잘못된 입력과 저장 실패 시 원인을 보여주고 입력을 잃지 않는다." },
      { suffix: "history", title: `${parent.title} 저장·변경 이력`, description: `${parent.title}의 저장, 재조회와 변경 추적 규칙을 정의한다.`, criterion: "저장한 결과를 다시 열 수 있고 변경 항목 ID를 추적할 수 있다." },
    ];
    return templates.map((template, index): FeatureSpec => {
      const id = `${parent.id}-${template.suffix}`;
      return { id, parentId: parent.id, title: template.title, description: template.description, status: "planned", priority: parent.priority, role: parent.role, sortOrder: 100 + parentIndex * 3 + index, acceptanceCriteria: criteria(id, [template.criterion]) };
    });
  });
  return [...baseFeatures, ...detailFeatures];
}
