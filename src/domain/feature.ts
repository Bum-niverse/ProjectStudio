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
  colorKey?: NodeColorKey;
}

export type NodeColorKey = "cyan" | "violet" | "green" | "amber" | "rose" | "slate";
export const NODE_COLORS: { key: NodeColorKey; label: string; color: string }[] = [
  { key: "cyan", label: "하늘", color: "#47c2ce" }, { key: "violet", label: "보라", color: "#8b5cf6" },
  { key: "green", label: "초록", color: "#57b47b" }, { key: "amber", label: "노랑", color: "#d9a441" },
  { key: "rose", label: "분홍", color: "#e66c91" }, { key: "slate", label: "회색", color: "#7c8799" },
];

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
    {id:root,title:"Globeat 장소 기반 음악 지도",status:"planned",priority:"critical",role:"제품 소유자",description:"세계의 실제 장소에 플레이리스트를 꽂아 발견하고 외부 음악 앱에서 듣는 경험을 제공한다.",sortOrder:0,acceptanceCriteria:[]},
    {id:`${projectId}-onboarding`,parentId:root,title:"인증 및 온보딩",status:"ready",priority:"high",role:"여행자·큐레이터",description:"서비스에 진입해 이메일 또는 소셜 계정으로 가입·로그인한다.",sortOrder:1,acceptanceCriteria:criteria(`${projectId}-onboarding`,["이메일 또는 소셜 로그인으로 계정을 만들고 다시 로그인할 수 있다."])},
    {id:`${projectId}-landing`,parentId:`${projectId}-onboarding`,title:"랜딩과 서비스 진입",status:"ready",priority:"medium",role:"방문자",description:"서비스 설명, 인기 장소와 시작 버튼을 제공한다.",sortOrder:2,acceptanceCriteria:criteria(`${projectId}-landing`,["방문자가 핵심 가치를 이해하고 지구본으로 진입한다."])},
    {id:`${projectId}-auth`,parentId:`${projectId}-onboarding`,title:"이메일·소셜 회원가입과 로그인",status:"in_progress",priority:"critical",role:"사용자",description:"Google, Meta/Facebook 또는 이메일과 비밀번호로 인증하고 콜백에서 프로필과 세션을 보장한다.",sortOrder:3,acceptanceCriteria:criteria(`${projectId}-auth`,["Google·Meta·이메일 가입과 로그인이 동일한 프로필 및 세션 흐름으로 완료된다.","공급자 취소·미확인 이메일·잘못된 자격 증명과 요청 제한을 복구할 수 있다.","OAuth 비밀값과 provider token을 클라이언트·로그·기획 문서에 저장하지 않는다."])},
    {id:`${projectId}-auth-google`,parentId:`${projectId}-auth`,title:"Google OAuth 로그인",status:"ready",priority:"critical",role:"가입자",description:"Supabase Google provider를 통해 동의 화면으로 이동하고 앱 콜백에서 세션을 만든다.",sortOrder:31,acceptanceCriteria:criteria(`${projectId}-auth-google`,["Google 동의 후 `/auth/callback`으로 돌아와 프로필 화면에 진입한다.","동의 취소나 URI 오류 시 로그인 화면에서 재시도할 수 있다."])},
    {id:`${projectId}-auth-meta`,parentId:`${projectId}-auth`,title:"Instagram/Meta 계정 로그인",status:"ready",priority:"critical",role:"가입자",description:"Supabase Facebook provider와 Meta 앱의 email·public_profile 권한으로 인증한다. Instagram 전용 프로필 API 접근은 별도 범위다.",sortOrder:32,acceptanceCriteria:criteria(`${projectId}-auth-meta`,["Meta 계정 인증 후 동일한 Globeat 프로필과 세션을 만든다.","Instagram 전용 로그인·프로필 접근으로 오해되지 않게 인증 경계를 안내한다.","Meta 앱이 개발 모드이면 등록된 테스터만 접근 가능함을 운영 문서에 표시한다."])},
    {id:`${projectId}-auth-email-signup`,parentId:`${projectId}-auth`,title:"일반 이메일 회원가입",status:"ready",priority:"critical",role:"가입자",description:"표시 이름·이메일·비밀번호를 검증해 가입하고 운영 확인 설정에 따라 세션 또는 확인 메일 상태를 제공한다.",sortOrder:33,acceptanceCriteria:criteria(`${projectId}-auth-email-signup`,["필수값과 이메일 형식·비밀번호 길이를 제출 전에 검증한다.","가입 성공 시 프로필을 생성하고 확인 필요 여부에 맞는 다음 행동을 안내한다.","중복 가입과 전송 제한 오류 후 입력값을 유지한다."])},
    {id:`${projectId}-auth-email-login`,parentId:`${projectId}-auth`,title:"이메일 비밀번호 로그인",status:"ready",priority:"critical",role:"회원",description:"기존 이메일 계정의 비밀번호를 검증하고 프로필을 보정한 뒤 라이브러리로 이동한다.",sortOrder:34,acceptanceCriteria:criteria(`${projectId}-auth-email-login`,["올바른 자격 증명으로 세션을 만들고 프로필로 이동한다.","계정 존재 여부를 과도하게 노출하지 않는 오류 문구를 사용한다.","처리 중 중복 제출을 차단하고 실패 후 이메일 입력을 유지한다."])},
    {id:`${projectId}-auth-callback-profile`,parentId:`${projectId}-auth`,title:"인증 콜백·프로필 자동 생성",status:"ready",priority:"critical",role:"인증 시스템",description:"안전한 내부 next 경로만 허용하고 소셜 이름·HTTPS 사진을 profiles에 멱등 반영한다.",sortOrder:35,acceptanceCriteria:criteria(`${projectId}-auth-callback-profile`,["외부 또는 이중 슬래시 redirect를 차단하고 기본 프로필 경로를 사용한다.","프로필 생성 재시도에도 중복 행이 생기지 않는다.","HTTP 사진 URL과 과도하게 긴 메타데이터를 저장하지 않는다."])},
    {id:`${projectId}-profile`,parentId:`${projectId}-onboarding`,title:"프로필 기본 정보",status:"planned",priority:"medium",role:"큐레이터",description:"표시 이름, 아바타와 소개를 관리한다.",sortOrder:4,acceptanceCriteria:criteria(`${projectId}-profile`,["공개 프로필과 공개 플레이리스트를 조회할 수 있다."])},
    {id:`${projectId}-explore`,parentId:root,title:"지구본 탐색 및 장소 발견",status:"in_progress",priority:"critical",role:"여행자",description:"3D 지구본을 회전·확대하고 장소 검색이나 지도 클릭으로 핀과 플레이리스트를 발견한다.",sortOrder:10,acceptanceCriteria:criteria(`${projectId}-explore`,["3D 지구본을 회전·확대하고 저사양 환경에서 2D 지도로 전환한다.","장소명 검색과 위도·경도 입력을 지원한다."])},
    {id:`${projectId}-globe`,parentId:`${projectId}-explore`,title:"3D 지구본 홈",status:"in_progress",priority:"critical",role:"여행자",description:"지구본, 핀 클러스터, 검색과 미리보기 카드를 한 화면에 제공한다.",sortOrder:11,acceptanceCriteria:criteria(`${projectId}-globe`,["회전·확대·축소와 핀 클러스터 탐색이 가능하다."])},
    {id:`${projectId}-place-search`,parentId:`${projectId}-explore`,title:"장소 검색과 좌표 입력",status:"planned",priority:"high",role:"여행자·큐레이터",description:"장소명 또는 위도·경도로 위치를 찾는다.",sortOrder:12,acceptanceCriteria:criteria(`${projectId}-place-search`,["검색 결과와 좌표 위치를 지구본에 표시한다."])},
    {id:`${projectId}-click-place-resolve`,parentId:`${projectId}-explore`,title:"지도 클릭 주변 장소 자동 확인",status:"done",priority:"high",role:"여행자·큐레이터",description:"지도를 직접 클릭하면 80m 안의 역·공공시설·랜드마크를 Google Places Nearby Search로 확인하고 이름·주소·좌표를 표시한다.",sortOrder:13,acceptanceCriteria:criteria(`${projectId}-click-place-resolve`,["서울역 좌표 클릭 시 검색어 입력 없이 서울역 이름과 주소를 표시한다.","장소가 없거나 API가 실패하면 사용자가 클릭한 좌표를 유지한다.","IP당 분당 10회와 약 100m 좌표 캐시로 Nearby Search Pro 호출을 제한한다.","장소 확인 중·Google 장소·좌표 위치 상태와 주소·좌표를 읽기 쉬운 위계로 표시한다."])},
    {id:`${projectId}-pin-preview`,parentId:`${projectId}-explore`,title:"핀 선택과 플레이리스트 미리보기",status:"planned",priority:"critical",role:"여행자",description:"핀을 선택해 장소의 공개 플레이리스트 미리보기를 연다.",sortOrder:14,acceptanceCriteria:criteria(`${projectId}-pin-preview`,["같은 장소의 여러 플레이리스트를 탐색할 수 있다."])},
    {id:`${projectId}-create`,parentId:root,title:"장소 플레이리스트 만들기·수정",status:"planned",priority:"critical",role:"큐레이터",description:"지도에서 위치를 지정하고 정보·곡 링크·커버·공개 범위를 저장해 핀을 발행한다.",sortOrder:20,acceptanceCriteria:criteria(`${projectId}-create`,["위치 선택부터 플레이리스트 발행까지 완료할 수 있다."])},
    {id:`${projectId}-place-pin`,parentId:`${projectId}-create`,title:"지도 클릭과 핀 위치 지정",status:"planned",priority:"critical",role:"큐레이터",description:"지도 클릭 또는 검색 결과로 플레이리스트 장소를 지정한다.",sortOrder:21,acceptanceCriteria:criteria(`${projectId}-place-pin`,["장소와 위도·경도를 저장하고 다시 표시한다."])},
    {id:`${projectId}-metadata`,parentId:`${projectId}-create`,title:"제목·설명·커버 작성",status:"planned",priority:"high",role:"큐레이터",description:"제목, 장소 이야기, 커버 이미지와 장소를 편집한다.",sortOrder:22,acceptanceCriteria:criteria(`${projectId}-metadata`,["이미지 크기·형식을 검증하고 작성 내용을 유지한다."])},
    {id:`${projectId}-tracks`,parentId:`${projectId}-create`,title:"곡과 Spotify·YouTube 링크 추가",status:"planned",priority:"critical",role:"큐레이터",description:"곡별 제목·아티스트와 공식 외부 링크를 순서대로 저장한다.",sortOrder:23,acceptanceCriteria:criteria(`${projectId}-tracks`,["곡 순서와 Spotify/YouTube 링크를 저장·수정한다."])},
    {id:`${projectId}-visibility`,parentId:`${projectId}-create`,title:"공개 범위 선택과 발행",status:"planned",priority:"critical",role:"큐레이터",description:"공개·링크 공유·비공개 중 범위를 선택하고 발행한다.",sortOrder:24,acceptanceCriteria:criteria(`${projectId}-visibility`,["공개 범위별 지도 노출과 링크 접근 규칙을 지킨다."])},
    {id:`${projectId}-listen`,parentId:root,title:"플레이리스트 발견 및 외부 재생",status:"planned",priority:"critical",role:"여행자",description:"핀 미리보기에서 상세와 곡 목록을 확인하고 외부 음악 앱으로 이동한다.",sortOrder:30,acceptanceCriteria:criteria(`${projectId}-listen`,["상세 열람 후 Spotify 또는 YouTube에서 재생한다."])},
    {id:`${projectId}-detail`,parentId:`${projectId}-listen`,title:"플레이리스트 상세와 곡 목록",status:"planned",priority:"critical",role:"여행자",description:"커버, 장소, 작성자, 설명과 순서 있는 곡 목록을 표시한다.",sortOrder:31,acceptanceCriteria:criteria(`${projectId}-detail`,["장소 맥락과 전체 곡 목록을 확인할 수 있다."])},
    {id:`${projectId}-external`,parentId:`${projectId}-listen`,title:"Spotify·YouTube에서 듣기",status:"planned",priority:"critical",role:"여행자",description:"공식 링크를 통해 외부 앱 또는 웹에서 곡을 재생한다.",sortOrder:32,acceptanceCriteria:criteria(`${projectId}-external`,["지원 플랫폼 버튼이 올바른 공식 링크를 연다."])},
    {id:`${projectId}-library`,parentId:root,title:"내 라이브러리 및 공개 범위 관리",status:"planned",priority:"high",role:"큐레이터",description:"내가 만든 플레이리스트를 공개 범위별로 조회·수정·삭제한다.",sortOrder:40,acceptanceCriteria:criteria(`${projectId}-library`,["내 플레이리스트만 필터하고 공개 범위를 변경한다."])},
    {id:`${projectId}-mine`,parentId:`${projectId}-library`,title:"내 플레이리스트 필터",status:"planned",priority:"high",role:"큐레이터",description:"내가 만든 항목과 공개 범위별 목록을 조회한다.",sortOrder:41,acceptanceCriteria:criteria(`${projectId}-mine`,["공개·링크 공유·비공개 상태를 구분한다."])},
    {id:`${projectId}-manage`,parentId:`${projectId}-library`,title:"플레이리스트 수정·삭제",status:"planned",priority:"high",role:"큐레이터",description:"소유한 플레이리스트의 내용과 공개 범위를 수정하거나 삭제한다.",sortOrder:42,acceptanceCriteria:criteria(`${projectId}-manage`,["소유자만 수정·삭제할 수 있다."])},
    {id:`${projectId}-moderation`,parentId:root,title:"신고 및 콘텐츠 관리",status:"planned",priority:"medium",role:"사용자·운영자",description:"부적절한 플레이리스트를 신고하고 운영자가 상태를 처리한다.",sortOrder:50,acceptanceCriteria:criteria(`${projectId}-moderation`,["신고 접수와 최소 운영자 처리 상태를 제공한다."])},
    {id:`${projectId}-report`,parentId:`${projectId}-moderation`,title:"플레이리스트 신고",status:"planned",priority:"medium",role:"사용자",description:"신고 사유를 선택하고 대상 콘텐츠를 제출한다.",sortOrder:51,acceptanceCriteria:criteria(`${projectId}-report`,["중복 제출을 방지하고 접수 결과를 알린다."])},
    {id:`${projectId}-review`,parentId:`${projectId}-moderation`,title:"운영자 신고 검토",status:"planned",priority:"medium",role:"운영자",description:"신고를 검토해 유지·숨김 등 최소 조치를 기록한다.",sortOrder:52,acceptanceCriteria:criteria(`${projectId}-review`,["처리 상태와 사유를 기록한다."])},
  ];
  const parents=definitions.filter(feature=>feature.parentId&&feature.parentId!==root);const details=parents.flatMap((parent,parentIndex)=>[
    {suffix:"flow",title:`${parent.title} 기본 흐름`,description:`${parent.role}가 ${parent.description} 시작 조건, 화면 전환과 완료 상태를 단계별로 정의한다.`,criteria:[`${parent.title} 진입 전 필요한 상태와 권한을 확인한다.`,`${parent.role}가 중간 입력을 잃지 않고 핵심 행동을 끝까지 수행한다.`,`완료 후 ${parent.title} 결과와 다음 행동을 명확하게 표시한다.`]},
    {suffix:"validation",title:`${parent.title} 입력·검증·오류 복구`,description:`${parent.title}에서 발생할 수 있는 잘못된 입력, 권한 부족, 외부 링크·네트워크 실패와 복구 동작을 정의한다.`,criteria:[`필수 입력 누락과 잘못된 형식을 해당 필드 가까이에서 설명한다.`,`권한 또는 외부 서비스 실패 시 원인과 재시도·되돌아가기 행동을 제공한다.`,`검증 실패 후에도 ${parent.title}에서 사용자가 작성한 유효한 값을 유지한다.`]},
    {suffix:"history",title:`${parent.title} 저장·재조회·변경 이력`,description:`${parent.title}의 저장 단위, 재조회 결과, 소유권과 변경 시각을 추적해 데이터 일관성을 보장한다.`,criteria:[`저장된 ${parent.title} 결과를 같은 사용자와 공개 범위 규칙에 따라 다시 조회한다.`,`수정 시 생성자·수정 시각·변경 대상 ID를 남기고 중복 저장을 방지한다.`,`삭제·비공개·외부 링크 만료 상태가 목록, 상세과 지도 표시에 일관되게 반영된다.`]},
  ].map((item,index):FeatureSpec=>{const id=`${parent.id}-${item.suffix}`;return{id,parentId:parent.id,title:item.title,description:item.description,status:"planned",priority:parent.priority,role:parent.role,sortOrder:100+parentIndex*3+index,acceptanceCriteria:criteria(id,item.criteria)};}));
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
