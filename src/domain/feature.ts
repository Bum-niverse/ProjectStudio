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
    {id:`${projectId}-place-search`,parentId:`${projectId}-explore`,title:"전 세계 장소 검색과 좌표 입력",status:"done",priority:"high",role:"여행자·큐레이터",description:"Google Places 검색을 특정 국가로 제한하지 않고 장소명 또는 위도·경도로 세계의 위치를 찾는다.",sortOrder:12,acceptanceCriteria:criteria(`${projectId}-place-search`,["한국어 검색 문맥을 유지하면서 한국 밖의 장소도 검색한다.","도쿄의 시부야·센소지·오다이바 검색 결과와 좌표를 지구본에 표시한다."])},
    {id:`${projectId}-click-place-resolve`,parentId:`${projectId}-explore`,title:"지도 클릭 주변 장소 자동 확인",status:"done",priority:"high",role:"여행자·큐레이터",description:"지도를 직접 클릭하면 80m 안의 역·공공시설·랜드마크를 Google Places Nearby Search로 확인하고 이름·주소·좌표를 표시한다.",sortOrder:13,acceptanceCriteria:criteria(`${projectId}-click-place-resolve`,["서울역 좌표 클릭 시 검색어 입력 없이 서울역 이름과 주소를 표시한다.","장소가 없거나 API가 실패하면 사용자가 클릭한 좌표를 유지한다.","IP당 분당 10회와 약 100m 좌표 캐시로 Nearby Search Pro 호출을 제한한다.","장소 확인 중·Google 장소·좌표 위치 상태와 주소·좌표를 읽기 쉬운 위계로 표시한다."])},
    {id:`${projectId}-pin-preview`,parentId:`${projectId}-explore`,title:"핀 선택과 플레이리스트 미리보기",status:"planned",priority:"critical",role:"여행자",description:"핀을 선택해 장소의 공개 플레이리스트 미리보기를 연다.",sortOrder:14,acceptanceCriteria:criteria(`${projectId}-pin-preview`,["같은 장소의 여러 플레이리스트를 탐색할 수 있다."])},
    {id:`${projectId}-create`,parentId:root,title:"장소 플레이리스트 만들기·수정",status:"planned",priority:"critical",role:"큐레이터",description:"지도에서 위치를 지정하고 정보·곡 링크·커버·공개 범위를 저장해 핀을 발행한다.",sortOrder:20,acceptanceCriteria:criteria(`${projectId}-create`,["위치 선택부터 플레이리스트 발행까지 완료할 수 있다."])},
    {id:`${projectId}-place-pin`,parentId:`${projectId}-create`,title:"지도 클릭과 핀 위치 지정",status:"planned",priority:"critical",role:"큐레이터",description:"지도 클릭 또는 검색 결과로 플레이리스트 장소를 지정한다.",sortOrder:21,acceptanceCriteria:criteria(`${projectId}-place-pin`,["장소와 위도·경도를 저장하고 다시 표시한다."])},
    {id:`${projectId}-metadata`,parentId:`${projectId}-create`,title:"제목·설명·커버 작성",status:"planned",priority:"high",role:"큐레이터",description:"제목, 장소 이야기, 커버 이미지와 장소를 편집한다.",sortOrder:22,acceptanceCriteria:criteria(`${projectId}-metadata`,["이미지 크기·형식을 검증하고 작성 내용을 유지한다."])},
    {id:`${projectId}-tracks`,parentId:`${projectId}-create`,title:"외부 플레이리스트 링크 가져오기",status:"in_progress",priority:"critical",role:"큐레이터",description:"YouTube·YouTube Music 재생목록 URL에서 공개 영상 최대 100곡을 한 번에 가져오고 원본 list ID를 유지해 연속 재생한다. Spotify는 사용자 OAuth 연결 후 가져오기·내보내기를 제공한다.",sortOrder:23,acceptanceCriteria:criteria(`${projectId}-tracks`,["YouTube 재생목록 링크에서 곡 제목·채널·영상 URL을 최대 100개 가져온다.","가져온 영상 URL은 원본 재생목록 ID를 유지해 연속 재생한다.","동일한 list ID가 검증된 목록은 핀과 상세에서 전체 연속 재생을 우선 제공하고 개별 곡 링크는 보조 행동으로 표시한다.","수동 곡은 공식 URL을 필수로 하고 oEmbed 메타데이터로 제목·아티스트 입력을 보완한다.","Spotify 미연결과 YouTube API 미설정, 비공개 재생목록을 구분해 안내한다."])},
    {id:`${projectId}-spotify-oauth`,parentId:`${projectId}-tracks`,title:"Spotify 계정 보안 연결",status:"in_progress",priority:"critical",role:"큐레이터",description:"공식 Authorization Code와 PKCE로 Spotify 계정을 연결하고 접근 가능한 플레이리스트 URL에서 최대 100곡을 가져온다. state와 단기 HttpOnly 쿠키를 검증하고 외부 토큰은 서버에서 AES-256-GCM으로 암호화한다.",sortOrder:24,acceptanceCriteria:criteria(`${projectId}-spotify-oauth`,["연결 시작과 가져오기 전에 Globeat 로그인 토큰을 서버에서 다시 검증한다.","콜백의 state와 PKCE verifier가 일치하지 않거나 10분을 넘으면 연결을 거부한다.","access token과 refresh token은 브라우저·로그·ProjectStudio에 노출하지 않고 만료 전에 서버에서 갱신한다.","연결 계정이 접근 가능한 플레이리스트 URL에서 공식 곡 링크를 최대 100개 가져온다.","미로그인·미연결·권한 없음·재동의 필요를 구분해 복구 행동을 안내한다."])},
    {id:`${projectId}-spotify-export`,parentId:`${projectId}-spotify-oauth`,title:"Spotify 플레이리스트 내보내기",status:"in_progress",priority:"high",role:"큐레이터",description:"본인이 만든 Globeat 플레이리스트의 Spotify 공식 곡 링크를 순서대로 새 비공개 Spotify 플레이리스트에 추가하고 결과 URL을 제공한다.",sortOrder:25,acceptanceCriteria:criteria(`${projectId}-spotify-export`,["서버가 Globeat 로그인과 플레이리스트 소유권을 다시 검증한다.","Spotify 공식 곡만 원래 순서대로 내보내고 제외된 곡 수를 표시한다.","같은 Globeat 플레이리스트의 중복 요청은 기존 완료 URL을 반환한다.","부분 실패와 재동의 필요를 구분하고 실패 레코드는 안전하게 재시도할 수 있다."])},
    {id:`${projectId}-visibility`,parentId:`${projectId}-create`,title:"공개 범위 선택과 발행",status:"planned",priority:"critical",role:"큐레이터",description:"공개·링크 공유·비공개 중 범위를 선택하고 발행한다.",sortOrder:24,acceptanceCriteria:criteria(`${projectId}-visibility`,["공개 범위별 지도 노출과 링크 접근 규칙을 지킨다."])},
    {id:`${projectId}-listen`,parentId:root,title:"플레이리스트 발견 및 외부 재생",status:"planned",priority:"critical",role:"여행자",description:"핀 미리보기에서 상세와 곡 목록을 확인하고 외부 음악 앱으로 이동한다.",sortOrder:30,acceptanceCriteria:criteria(`${projectId}-listen`,["상세 열람 후 Spotify 또는 YouTube에서 재생한다."])},
    {id:`${projectId}-detail`,parentId:`${projectId}-listen`,title:"플레이리스트 상세와 곡 목록",status:"planned",priority:"critical",role:"여행자",description:"커버, 장소, 작성자, 설명과 순서 있는 곡 목록을 표시한다.",sortOrder:31,acceptanceCriteria:criteria(`${projectId}-detail`,["장소 맥락과 전체 곡 목록을 확인할 수 있다."])},
    {id:`${projectId}-external`,parentId:`${projectId}-listen`,title:"Spotify·YouTube에서 듣기",status:"planned",priority:"critical",role:"여행자",description:"공식 링크를 통해 외부 앱 또는 웹에서 곡을 재생한다.",sortOrder:32,acceptanceCriteria:criteria(`${projectId}-external`,["지원 플랫폼 버튼이 올바른 공식 링크를 연다."])},
    {id:`${projectId}-library`,parentId:root,title:"내 라이브러리 및 공개 범위 관리",status:"planned",priority:"high",role:"큐레이터",description:"내가 만든 플레이리스트를 공개 범위별로 조회·수정·삭제한다.",sortOrder:40,acceptanceCriteria:criteria(`${projectId}-library`,["내 플레이리스트만 필터하고 공개 범위를 변경한다."])},
    {id:`${projectId}-mine`,parentId:`${projectId}-library`,title:"내 플레이리스트 필터",status:"planned",priority:"high",role:"큐레이터",description:"내가 만든 항목과 공개 범위별 목록을 조회한다.",sortOrder:41,acceptanceCriteria:criteria(`${projectId}-mine`,["공개·링크 공유·비공개 상태를 구분한다."])},
    {id:`${projectId}-manage`,parentId:`${projectId}-library`,title:"플레이리스트 수정·삭제",status:"planned",priority:"high",role:"큐레이터",description:"소유한 플레이리스트의 내용과 공개 범위를 수정하거나 삭제한다.",sortOrder:42,acceptanceCriteria:criteria(`${projectId}-manage`,["소유자만 수정·삭제할 수 있다."])},
    {id:`${projectId}-trip-memory`,parentId:root,title:"여행 동선과 음악 추억",status:"in_progress",priority:"high",role:"여행자",description:"여행 일차별 장소를 선으로 연결하고 사진·대표사진·플레이리스트를 함께 비공개 기록한다.",sortOrder:45,acceptanceCriteria:criteria(`${projectId}-trip-memory`,["1~3일차 방문지와 순서를 저장하고 지구본 위 동선으로 다시 조회한다.","여행 사진 최대 12장 중 대표사진을 하나 선택하고 연결 플레이리스트 커버로 사용할 수 있다.","여행과 사진은 소유자만 조회하며 명시적인 공유 행동 전에는 외부로 전달하지 않는다."])},
    {id:`${projectId}-trip-route`,parentId:`${projectId}-trip-memory`,title:"날짜·시간별 여행 동선 저장",status:"done",priority:"high",role:"여행자",description:"여행 시작일에서 일차별 날짜를 계산하고 각 방문지에 방문 시간과 플레이리스트를 지정해 비공개 여행으로 저장한다.",sortOrder:46,acceptanceCriteria:criteria(`${projectId}-trip-route`,["DAY 01/02/03 섹션에 해당 날짜와 여러 방문지를 표시한다.","각 방문지의 방문 시간을 저장하고 지도 라벨에 일차·시간·장소명을 함께 표시한다.","연결 플레이리스트는 선택값뿐 아니라 정사각형 커버 카드로 확인한다."])},
    {id:`${projectId}-trip-photos`,parentId:`${projectId}-trip-memory`,title:"여행 사진과 대표 커버",status:"in_progress",priority:"high",role:"여행자",description:"JPEG·PNG·WebP 사진을 저장 전에 미리보고 일차와 대표사진을 지정한 뒤 비공개 Storage에 저장한다.",sortOrder:47,acceptanceCriteria:criteria(`${projectId}-trip-photos`,["사진당 5MB, 여행당 12장 제한과 MIME 형식을 검증한다.","저장 전 미리보기에서 사진별 일차와 대표사진 하나를 선택한다.","Storage 또는 메타데이터 저장 실패 시 실패 파일명을 알리고 편집 상태를 유지한다.","실제 운영 브라우저에서 로컬 사진 업로드와 재조회까지 확인한다."])},
    {id:`${projectId}-trip-share`,parentId:`${projectId}-trip-memory`,title:"Instagram 공유 시트",status:"in_progress",priority:"medium",role:"여행자",description:"Web Share API로 대표사진과 일차별 여행 소개를 전달해 사용자가 Instagram을 선택하도록 한다. 자동 게시나 비공개 URL 공유는 하지 않는다.",sortOrder:48,acceptanceCriteria:criteria(`${projectId}-trip-share`,["지원 모바일 환경에서 대표사진 파일과 여행 소개를 공유 시트에 전달한다.","미지원 환경에서는 복사 또는 취소·미지원 상태를 명확히 안내한다.","Instagram 자동 게시로 오해되지 않게 사용자 선택 단계와 개인정보 경계를 표시한다."])},
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

function createIdeaDrivenFeatureSpec(projectId:string,projectName:string,idea:string):FeatureSpec[]{
  const root=`${projectId}-root`;const context=`${projectName} ${idea}`.toLowerCase();
  const isDataProject=/머신러닝|machine learning|예측|분류|회귀|모델|데이터|학습|백테스트|시계열/.test(context);
  const rootFeature:FeatureSpec={id:root,title:`${projectName} 핵심 경험`,status:"planned",priority:"critical",role:"프로젝트 소유자",description:idea||`${projectName}의 핵심 사용자 가치와 완료 결과를 정의한다.`,sortOrder:0,acceptanceCriteria:criteria(root,["프로젝트의 대표 흐름을 처음부터 끝까지 재현할 수 있다."])};
  const definitions=isDataProject?[
    ["data","데이터 수집과 품질 관리","분석가","원천 데이터를 기간과 대상 조건에 맞게 가져오고 재현 가능한 원본으로 보존한다.",["수집 기간·대상·출처와 실패 내역을 기록한다.","결측·중복·비정상 값을 검사하고 원본 데이터는 수정하지 않는다."]],
    ["features","피처와 예측 대상 생성","데이터 과학자","과거 정보만 사용해 학습 피처와 예측 대상 레이블을 생성하고 미래 정보 누수를 차단한다.",["각 피처가 예측 시점 이전 정보만 사용하는지 검증한다.","피처 계산식과 레이블 기준을 같은 설정으로 다시 생성할 수 있다."]],
    ["training","기준선과 분류 모델 학습","데이터 과학자","단순 기준선과 하나 이상의 분류 모델을 동일한 학습 구간에서 훈련한다.",["무작위 또는 단순 규칙 기준선을 먼저 계산한다.","모델·하이퍼파라미터·학습 데이터 버전을 기록한다."]],
    ["evaluation","시간 순서 검증과 백테스트","검증 담당자","시간 순서를 지킨 검증 구간에서 성능과 실제 적용 한계를 비교한다.",["미래 데이터를 학습에 섞지 않는 시계열 분할을 사용한다.","정확도뿐 아니라 기준선 대비 개선과 비용 반영 결과를 함께 표시한다."]],
    ["results","예측 결과와 근거 탐색","사용자","대상과 기준 시점을 선택해 예측 방향·확률·사용 피처와 모델 한계를 확인한다.",["예측 결과에 대상·기준 시점·모델 버전을 함께 표시한다.","결과를 수익 보장이나 확정적 판단으로 표현하지 않는다."]],
    ["reproducibility","재현성과 모델 상태 관리","개발자","데이터·피처·모델·평가 산출물의 버전과 실행 상태를 연결한다.",["같은 설정과 데이터 버전으로 결과를 다시 생성할 수 있다.","데이터 또는 성능 변화가 기준을 벗어나면 재학습 필요 상태를 표시한다."]],
  ] as const:[
    ["input","입력과 핵심 작업","사용자",`${idea||projectName}에 필요한 입력을 받고 핵심 작업을 시작한다.`,["필수 입력과 형식을 검증하고 오류 후에도 유효한 값을 유지한다."]],
    ["process","핵심 처리와 진행 상태","사용자",`${projectName}의 핵심 처리를 단계별로 실행하고 현재 상태를 명확히 표시한다.`,["처리 중·완료·실패 상태와 복구 행동을 구분한다."]],
    ["result","결과 확인과 저장","사용자","완료 결과를 이해하기 쉽게 표시하고 저장해 다시 확인한다.",["저장한 결과를 다시 열어 같은 내용과 상태를 확인할 수 있다."]],
    ["management","기록 관리와 변경 이력","프로젝트 소유자","생성한 기록을 조회·수정하고 변경 이력을 추적한다.",["변경 대상과 시각을 기록하고 의도하지 않은 중복을 방지한다."]],
    ["reliability","오류 복구와 품질 검증","검증 담당자","대표 실패 조건과 경계값을 검증하고 안전한 재시도 흐름을 제공한다.",["정상·오류·경계값 시나리오를 반복 검증할 수 있다."]],
  ] as const;
  const major:FeatureSpec[]=definitions.map(([key,title,role,description,items],index)=>{const id=`${projectId}-${key}`;return{id,parentId:root,title,role,description,status:"planned",priority:index<4?"critical":"high",sortOrder:(index+1)*10,acceptanceCriteria:criteria(id,[...items])};});
  const children=major.flatMap((parent,parentIndex)=>[
    {suffix:"execution",title:`${parent.title} 실행`,description:`${parent.description} 시작 조건부터 완료 결과까지의 정상 흐름을 정의한다.`,criterion:`${parent.title}의 시작·진행·완료 상태를 순서대로 확인할 수 있다.`},
    {suffix:"validation",title:`${parent.title} 검증과 오류 복구`,description:`${parent.title}에서 잘못된 입력, 데이터 부족과 처리 실패를 구분하고 복구한다.`,criterion:`${parent.title} 실패 후 원인과 재시도 방법을 보여주고 유효한 작업 상태를 유지한다.`},
    {suffix:"history",title:`${parent.title} 저장과 재현`,description:`${parent.title}의 입력·설정·결과와 변경 시각을 연결해 다시 확인할 수 있게 한다.`,criterion:`${parent.title} 결과의 생성 근거와 버전을 추적할 수 있다.`},
  ].map((item,index):FeatureSpec=>{const id=`${parent.id}-${item.suffix}`;return{id,parentId:parent.id,title:item.title,description:item.description,status:"planned",priority:parent.priority,role:parent.role,sortOrder:100+parentIndex*3+index,acceptanceCriteria:criteria(id,[item.criterion])};}));
  return[rootFeature,...major,...children];
}

export function createDevelopmentFeatureSpec(projectId: string, projectName?: string, projectIdea=""): FeatureSpec[] {
  if(projectName?.trim().toLowerCase()==="globeat")return createGlobeatFeatureSpec(projectId);
  return createIdeaDrivenFeatureSpec(projectId,projectName?.trim()||"새 프로젝트",projectIdea.trim());
}
