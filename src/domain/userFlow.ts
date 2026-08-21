import type { FeatureSpec, NodeColorKey } from "./feature";
import type { ProjectSubtype, ProjectType } from "./project";

export type UserFlowNodeKind="phase"|"screen"|"action"|"result"|"decision";
export interface UserFlowNode{id:string;projectId:string;laneId:string;title:string;description:string;kind:UserFlowNodeKind;positionX:number;positionY:number;colorKey?:NodeColorKey;depth?:number;parentId?:string;linkedFeatureIds?:string[];branchCondition?:string;inputArtifacts?:string[];outputArtifacts?:string[];methods?:string[];validation?:string;failureHandling?:string;codePaths?:string[];testPaths?:string[];completionCriteria?:string;isCompleted?:boolean}
export interface UserFlowEdge{id:string;projectId:string;sourceNodeId:string;targetNodeId:string}
export interface UserFlowLane{id:string;title:string;requirementId?:string;order?:number;positionY:number;height:number;colorKey?:NodeColorKey}
export interface UserFlowSpec{nodes:UserFlowNode[];edges:UserFlowEdge[];lanes:UserFlowLane[]}
export interface UserFlowCompletionSummary{total:number;completed:number;percent:number}
export function summarizeUserFlowCompletion(nodes:UserFlowNode[]):UserFlowCompletionSummary{const completed=nodes.filter(node=>node.isCompleted).length;return{total:nodes.length,completed,percent:nodes.length?Math.round(completed/nodes.length*100):0};}
export const isLegacyPipelineNodeId=(id:string):boolean=>/^pipeline-\d+-\d+$/u.test(id);

export function isIncompleteGeneratedFlow(storedNodes:UserFlowNode[],generatedNodes:UserFlowNode[]):boolean{
  if(!storedNodes.length||storedNodes.length>=generatedNodes.length)return false;
  const generatedIds=new Set(generatedNodes.map(node=>node.id));
  return storedNodes.every(node=>generatedIds.has(node.id)||isLegacyPipelineNodeId(node.id));
}

export function reconcileUserFlowLanes(nodes:UserFlowNode[],generatedLanes:UserFlowLane[]):{nodes:UserFlowNode[];lanes:UserFlowLane[];didRemap:boolean}{
  const persistedLaneIds=[...new Set(nodes.map(node=>node.laneId))];
  if(!nodes.length)return{nodes,lanes:generatedLanes,didRemap:false};
  if(persistedLaneIds.length===generatedLanes.length&&persistedLaneIds.every(id=>generatedLanes.some(lane=>lane.id===id)))return{nodes,lanes:generatedLanes,didRemap:false};
  const orderedPersisted=persistedLaneIds.sort((left,right)=>Math.min(...nodes.filter(node=>node.laneId===left).map(node=>node.positionY))-Math.min(...nodes.filter(node=>node.laneId===right).map(node=>node.positionY)));
  if(orderedPersisted.length===generatedLanes.length){
    const laneMap=new Map(orderedPersisted.map((id,index)=>[id,generatedLanes[index].id]));
    return{nodes:nodes.map(node=>({...node,laneId:laneMap.get(node.laneId)??node.laneId})),lanes:generatedLanes,didRemap:true};
  }
  const lanes=orderedPersisted.map((id,index)=>{const laneNodes=nodes.filter(node=>node.laneId===id);const minY=Math.min(...laneNodes.map(node=>node.positionY));const maxY=Math.max(...laneNodes.map(node=>node.positionY));const phase=laneNodes.find(node=>node.kind==="phase");return{id,title:phase?.title??`분석 단계 ${index+1}`,order:index,positionY:Math.max(0,minY-100),height:Math.max(240,maxY-minY+200),colorKey:phase?.colorKey??laneNodes[0]?.colorKey};});
  return{nodes,lanes,didRemap:false};
}

export function connectedUserFlowNodeIds(edges:UserFlowEdge[],originId:string,depth=2):Set<string>{
  const visible=new Set([originId]);let frontier=[originId];
  for(let step=0;step<depth&&frontier.length;step++){const next:string[]=[];for(const edge of edges){if(frontier.includes(edge.sourceNodeId)&&!visible.has(edge.targetNodeId)){visible.add(edge.targetNodeId);next.push(edge.targetNodeId);}if(frontier.includes(edge.targetNodeId)&&!visible.has(edge.sourceNodeId)){visible.add(edge.sourceNodeId);next.push(edge.sourceNodeId);}}frontier=next;}
  return visible;
}

const FLOW_COLORS:NodeColorKey[]=["green","cyan","amber","violet","rose","slate"];
const INTERNAL_PATTERN=/광고|코인|경제 정책|정책 검토|운영자|신고 검토|모더레이션|RLS|SQL|데이터베이스|캐시|토큰|내부 처리|변경 이력|안전 검증|URL 검증|보안 검증|권한 검사|콜백|자동 생성|저장과 재현|입력·검증·오류 복구/u;
const INTERNAL_ROLE_PATTERN=/운영자|관리자|검증 담당자|개발자|인증 시스템|제품 소유자/u;
function isInternalFeature(feature:FeatureSpec):boolean{return /(?:-flow|-validation|-history)$/u.test(feature.id)||INTERNAL_PATTERN.test(feature.title);}
function isUserJourneyRequirement(feature:FeatureSpec,features:FeatureSpec[]):boolean{
  if(INTERNAL_PATTERN.test(feature.title)||INTERNAL_ROLE_PATTERN.test(feature.role))return false;
  const descendants=features.filter(item=>item.parentId===feature.id&&!isInternalFeature(item));
  return descendants.length>0||/사용자|여행자|큐레이터|방문자|회원|가입자|분석가/.test(feature.role);
}
function screenTitle(title:string):string{
  const rules:Array<[RegExp,string]>=[[/랜딩|서비스 진입/,"서비스 소개 화면"],[/이메일·소셜 회원가입|로그인·회원가입|인증 방식 선택/,"로그인/회원가입 화면"],[/Google OAuth/,"Google 계정 선택 화면"],[/Instagram|Meta 계정/,"Meta 계정 선택 화면"],[/일반 이메일 회원가입/,"이메일 회원가입 화면"],[/이메일 비밀번호 로그인/,"이메일 로그인 화면"],[/필터/,"목록 필터 화면"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??(/화면|페이지/.test(title)?title:`${title} 화면`);
}
function actionTitle(title:string):string{
  const rules:Array<[RegExp,string]>=[[/랜딩|서비스 진입/,"시작하기 버튼 선택"],[/Google OAuth/,"Google로 계속하기 선택"],[/Instagram|Meta 계정/,"Meta로 계속하기 선택"],[/일반 이메일 회원가입/,"회원가입 정보 입력"],[/이메일 비밀번호 로그인/,"이메일과 비밀번호 입력"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??`${title.replace(/(?:화면|페이지|기능)$/u,"").trim()} 선택·입력`;
}

type Step={key:string;title:string;kind:UserFlowNodeKind;feature?:FeatureSpec;parentKey?:string;branchCondition?:string};
function semanticSteps(requirement:FeatureSpec,children:FeatureSpec[]):Step[]|undefined{
  const feature=(pattern:RegExp)=>children.find(item=>pattern.test(item.title));
  if(/인증|온보딩|로그인|회원가입/.test(requirement.title))return[
    {key:"landing",title:"서비스 소개 화면",kind:"screen",feature:feature(/랜딩|서비스 진입/)},{key:"start",title:"시작하기 버튼 선택",kind:"action",parentKey:"landing"},{key:"auth",title:"로그인/회원가입 화면",kind:"screen",feature:feature(/이메일·소셜|로그인·회원가입/),parentKey:"start"},{key:"choice",title:"가입 또는 로그인 방식 선택",kind:"decision",parentKey:"auth"},{key:"google",title:"Google 계정 선택 화면",kind:"screen",feature:feature(/Google OAuth/),parentKey:"choice",branchCondition:"Google 선택"},{key:"meta",title:"Meta 계정 선택 화면",kind:"screen",feature:feature(/Instagram|Meta 계정/),parentKey:"choice",branchCondition:"Meta 선택"},{key:"signup",title:"이메일 회원가입 화면",kind:"screen",feature:feature(/일반 이메일 회원가입/),parentKey:"choice",branchCondition:"이메일 회원가입 선택"},{key:"login",title:"이메일 로그인 화면",kind:"screen",feature:feature(/이메일 비밀번호 로그인/),parentKey:"choice",branchCondition:"이메일 로그인 선택"},{key:"profile-google",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"google"},{key:"profile-meta",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"meta"},{key:"profile-signup",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"signup"},{key:"profile-login",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"login"}
  ];
  const branchParent=children.find(parent=>children.filter(item=>item.parentId===parent.id&&!/공통|완료/.test(item.title)).length>=2);
  if(branchParent){const alternatives=children.filter(item=>item.parentId===branchParent.id&&!/공통|완료/.test(item.title));return[{key:"screen",title:screenTitle(branchParent.title),kind:"screen",feature:branchParent},{key:"choice",title:`${branchParent.title} 선택`,kind:"decision",feature:branchParent,parentKey:"screen"},...alternatives.map((item,index):Step=>({key:`branch-${index}`,title:screenTitle(item.title),kind:"screen",feature:item,parentKey:"choice",branchCondition:item.title}))];}
  return undefined;
}

export function createUserFlowSpec(projectId:string,features:FeatureSpec[]):UserFlowSpec{
  const root=features.find(feature=>!feature.parentId);const requirements=features.filter(feature=>feature.parentId===root?.id&&isUserJourneyRequirement(feature,features)).sort((a,b)=>a.sortOrder-b.sortOrder);const nodes:UserFlowNode[]=[];const edges:UserFlowEdge[]=[];const lanes:UserFlowLane[]=[];let laneY=0;
  requirements.forEach((requirement,laneIndex)=>{
    const colorKey=FLOW_COLORS[laneIndex%FLOW_COLORS.length];const descendantIds=new Set([requirement.id]);let changed=true;while(changed){changed=false;for(const feature of features)if(feature.parentId&&descendantIds.has(feature.parentId)&&!descendantIds.has(feature.id)){descendantIds.add(feature.id);changed=true;}}const children=features.filter(feature=>feature.id!==requirement.id&&descendantIds.has(feature.id)&&!isInternalFeature(feature)).sort((a,b)=>a.sortOrder-b.sortOrder);const custom=semanticSteps(requirement,children);const steps:Step[]=custom??children.filter(child=>child.parentId===requirement.id).flatMap((child,index)=>[{key:`screen-${index}`,title:screenTitle(child.title),kind:"screen" as const,feature:child,parentKey:index?`action-${index-1}`:"stage"},{key:`action-${index}`,title:actionTitle(child.title),kind:"action" as const,feature:child,parentKey:`screen-${index}`}]);
    if(!steps.length)steps.push({key:"screen-0",title:screenTitle(requirement.title),kind:"screen",feature:requirement,parentKey:"stage"},{key:"action-0",title:actionTitle(requirement.title),kind:"action",feature:requirement,parentKey:"screen-0"});
    const depthByKey=new Map<string,number>([["stage",0]]);for(const step of steps)depthByKey.set(step.key,(depthByKey.get(step.parentKey??"stage")??0)+1);const rowsByDepth=new Map<number,Step[]>();for(const step of steps){const depth=depthByKey.get(step.key)??1;rowsByDepth.set(depth,[...(rowsByDepth.get(depth)??[]),step]);}const maxRows=Math.max(1,...[...rowsByDepth.values()].map(items=>items.length));const height=Math.max(250,maxRows*112+110);const centerY=laneY+height/2;lanes.push({id:requirement.id,title:requirement.title,requirementId:requirement.id,order:laneIndex,positionY:laneY,height,colorKey});
    const stageId=`flow-${requirement.id}`;nodes.push({id:stageId,projectId,laneId:requirement.id,title:/인증|로그인|회원가입/.test(requirement.title)?"서비스 진입":requirement.title,description:requirement.description,kind:"phase",positionX:90,positionY:centerY,colorKey,depth:0,linkedFeatureIds:[requirement.id]});const ids=new Map<string,string>([["stage",stageId]]);
    for(const [depth,depthSteps] of [...rowsByDepth.entries()].sort((a,b)=>a[0]-b[0])){const startY=centerY-((depthSteps.length-1)*104)/2;depthSteps.forEach((step,row)=>{const id=`flow-${requirement.id}-${step.key}`;const parentId=ids.get(step.parentKey??"stage")??stageId;ids.set(step.key,id);nodes.push({id,projectId,laneId:requirement.id,title:step.title,description:step.feature?.description??`${step.title} 이후 사용자가 다음 화면 또는 결과를 확인한다.`,kind:step.kind,positionX:90+depth*260,positionY:startY+row*104,colorKey,depth,parentId,linkedFeatureIds:step.feature?[step.feature.id]:[requirement.id],branchCondition:step.branchCondition});edges.push({id:`edge-${parentId}-${id}`,projectId,sourceNodeId:parentId,targetNodeId:id});});}
    const terminalIds=nodes.filter(node=>node.laneId===requirement.id&&!edges.some(edge=>edge.sourceNodeId===node.id)).map(node=>node.id);if(!terminalIds.some(id=>nodes.find(node=>node.id===id)?.kind==="result")){const depth=Math.max(...nodes.filter(node=>node.laneId===requirement.id).map(node=>node.depth??0))+1;const id=`flow-${requirement.id}-complete`;nodes.push({id,projectId,laneId:requirement.id,title:`${requirement.title} 완료 화면`,description:"사용자가 완료 결과와 다음 행동을 확인한다.",kind:"result",positionX:90+depth*260,positionY:centerY,colorKey,depth,linkedFeatureIds:[requirement.id]});terminalIds.forEach(sourceNodeId=>edges.push({id:`edge-${sourceNodeId}-${id}`,projectId,sourceNodeId,targetNodeId:id}));}
    laneY+=height+24;
  });return{nodes,edges,lanes};
}

export function createExecutionPipelineSpec(projectId:string,features:FeatureSpec[],projectType:ProjectType,subtype?:ProjectSubtype):UserFlowSpec{
  const root=features.find(feature=>!feature.parentId);const featureStages=features.filter(feature=>feature.parentId===root?.id).sort((a,b)=>a.sortOrder-b.sortOrder);
  if(projectType!=="machine_learning"&&projectType!=="data_analysis"){
    const nodes:UserFlowNode[]=[],edges:UserFlowEdge[]=[],lanes:UserFlowLane[]=[];let laneY=0;
    featureStages.forEach((stage,laneIndex)=>{const colorKey=FLOW_COLORS[laneIndex%FLOW_COLORS.length];const sequence=[stage,...features.filter(feature=>feature.parentId===stage.id).sort((a,b)=>a.sortOrder-b.sortOrder).slice(0,8)];const height=260;lanes.push({id:stage.id,title:stage.title,requirementId:stage.id,order:laneIndex,positionY:laneY,height,colorKey});sequence.forEach((feature,index)=>{const id=`pipeline-${feature.id}`;nodes.push({id,projectId,laneId:stage.id,title:feature.title,description:feature.description,kind:index===0?"phase":index===sequence.length-1?"result":"action",positionX:90+index*280,positionY:laneY+height/2,colorKey,depth:index,parentId:index?`pipeline-${sequence[index-1].id}`:undefined,linkedFeatureIds:[feature.id]});if(index)edges.push({id:`edge-pipeline-${sequence[index-1].id}-${feature.id}`,projectId,sourceNodeId:`pipeline-${sequence[index-1].id}`,targetNodeId:id});});laneY+=height+24;});return{nodes,edges,lanes};
  }
  const laneDefinitions=projectType==="machine_learning"?mlPipeline(subtype):analysisPipeline(subtype);const nodes:UserFlowNode[]=[],edges:UserFlowEdge[]=[],lanes:UserFlowLane[]=[];let laneY=0;
  laneDefinitions.forEach((lane,laneIndex)=>{const colorKey=FLOW_COLORS[laneIndex%FLOW_COLORS.length];const height=Math.max(240,lane.steps.length*12+180);const laneId=featureStages[laneIndex]?.id??`data-lane-${projectId}-${laneIndex}`;lanes.push({id:laneId,title:lane.title,requirementId:featureStages[laneIndex]?.id,order:laneIndex,positionY:laneY,height,colorKey});lane.steps.forEach((title,index)=>{const id=`pipeline-${projectId}-${laneIndex}-${index}`;const parentId=index?`pipeline-${projectId}-${laneIndex}-${index-1}`:undefined;nodes.push({id,projectId,laneId,title,description:lane.descriptions[index]??`${title}의 입력·출력과 완료 기준을 확인한다.`,kind:index===0?"phase":index===lane.steps.length-1?"result":/검증|평가|검정|승인/.test(title)?"decision":"action",positionX:90+index*280,positionY:laneY+height/2,colorKey,depth:index,parentId,linkedFeatureIds:featureStages[laneIndex]?[featureStages[laneIndex].id]:[],inputArtifacts:index?[lane.steps[index-1]]:["데이터 명세"],outputArtifacts:[title],methods:[],validation:/검증|평가|검정|승인/.test(title)?"통과·실패 기준을 사용자 검토 후 확정":"입력·출력 계약 확인",failureHandling:"실패 원인과 재실행 조건을 기록하고 다음 단계 진행을 차단",codePaths:[],testPaths:[],completionCriteria:`${title} 산출물과 검증 근거가 저장되어 있다.`});if(parentId)edges.push({id:`edge-${parentId}-${id}`,projectId,sourceNodeId:parentId,targetNodeId:id});});laneY+=height+24;});return{nodes,edges,lanes};
}

type PipelineLane={title:string;steps:string[];descriptions:string[]};
function analysisPipeline(subtype?:ProjectSubtype):PipelineLane[]{
  const analysis=subtype==="statistical"?["검정 가정 확인","귀무·대립가설 검정","효과 크기·보정 평가","해석 승인"]:subtype==="time_series_analysis"?["시간 인덱스 정렬","추세·계절성 분석","기간별 비교","시계열 해석"]:["기술통계","분포·집단 비교","관계·패턴 분석","분석 해석"];
  return[
    {title:"데이터 준비",steps:["원본 데이터 계약","스키마 검증","정제·표준화","분석 데이터 저장"],descriptions:["출처·라이선스·기준 시점을 확인한다.","필수 컬럼·타입·키를 검사한다.","원본을 보존하고 처리 규칙을 적용한다.","버전이 있는 분석 입력을 만든다."]},
    {title:"품질·병합",steps:["조인 키 확인","카디널리티 검증","결측·중복·이상치 검사","품질 승인"],descriptions:["키와 단위를 확인한다.","N:N 행 증폭을 차단한다.","분포 변화와 실패 행을 기록한다.","분석 가능한 상태인지 결정한다."]},
    {title:"탐색·분석",steps:analysis,descriptions:analysis.map(step=>`${step}의 방법·가정·산출물을 기록한다.`)},
    {title:"보고",steps:["핵심 결과 시각화","한계·편향 검토","보고서 작성","이해관계자 검토 완료"],descriptions:["질문과 직접 연결된 도표를 만든다.","인과 단정과 표본 편향을 검토한다.","근거와 다음 행동을 정리한다.","승인된 산출물을 보존한다."]},
  ];
}
function mlPipeline(subtype?:ProjectSubtype):PipelineLane[]{
  const split=subtype==="time_series_forecasting"?"시간 기반·rolling 분할":subtype==="classification"?"계층화 데이터 분할":subtype==="recommendation"?"사용자·시간 기준 분할":"그룹·시간·무작위 분할 선택";
  const specialty=subtype==="recommendation"?["인기 기반 기준 모델","후보 추천 모델","Precision·Recall·NDCG@K"]:subtype==="anomaly_detection"?["규칙 기반 기준선","이상 탐지 후보 모델","오탐·미탐 비용 평가"]:subtype==="time_series_forecasting"?["직전 값 기준 모델","후보 예측 모델","MAE·MASE·기간별 오류"]:["단순 기준 모델","후보 모델 학습","핵심·보조 지표 평가"];
  return[
    {title:"데이터 준비",steps:["원본 데이터 계약","스키마·시점 검증","정제·피처 후보 생성","학습 데이터 버전 저장"],descriptions:["출처와 관측 단위를 확인한다.","타깃 사용 가능 시점과 미래 정보를 검사한다.","분할 전후 적용 범위를 구분한다.","입력 버전과 생성 코드를 기록한다."]},
    {title:"분할·누수",steps:["타깃·예측 시점 확정",split,"분할별 전처리 적합","누수 검증 승인"],descriptions:["관측·입력·예측 시점을 기록한다.","데이터 특성에 맞는 분할 이유를 승인한다.","검증·테스트 통계가 학습에 유입되지 않게 한다.","미래·타깃 파생 정보가 없음을 확인한다."]},
    {title:"모델링·평가",steps:specialty,descriptions:["후보 모델보다 먼저 비교 기준을 실행한다.","seed·환경·하이퍼파라미터를 기록한다.","핵심 지표와 보조 지표·그룹별 오류를 함께 저장한다."]},
    {title:"해석·전달",steps:["오류 분석","설명 가능성 검토","모델·결과 버전 저장","배치·온라인 전달 승인"],descriptions:["실패 집단과 경계 사례를 분석한다.","사용자 요구에 맞는 설명을 검토한다.","전처리·모델·평가 결과 버전을 묶는다.","추론 지연·입력 스키마·모니터링 계획을 확인한다."]},
  ];
}
