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
  return createIdeaDrivenFeatureSpec(projectId,projectName?.trim()||"새 프로젝트",projectIdea.trim());
}
