import type { FeatureSpec, NodeColorKey } from "./feature";

export type UserFlowNodeKind="phase"|"screen"|"action"|"result"|"decision";
export interface UserFlowNode{id:string;projectId:string;laneId:string;title:string;description:string;kind:UserFlowNodeKind;positionX:number;positionY:number;colorKey?:NodeColorKey;depth?:number;parentId?:string;linkedFeatureIds?:string[];branchCondition?:string}
export interface UserFlowEdge{id:string;projectId:string;sourceNodeId:string;targetNodeId:string}
export interface UserFlowLane{id:string;title:string;requirementId?:string;order?:number;positionY:number;height:number;colorKey?:NodeColorKey}
export interface UserFlowSpec{nodes:UserFlowNode[];edges:UserFlowEdge[];lanes:UserFlowLane[]}

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
  const rules:Array<[RegExp,string]>=[[/랜딩|서비스 진입/,"서비스 소개 화면"],[/이메일·소셜 회원가입|로그인·회원가입|인증 방식 선택/,"로그인/회원가입 화면"],[/Google OAuth/,"Google 계정 선택 화면"],[/Instagram|Meta 계정/,"Meta 계정 선택 화면"],[/일반 이메일 회원가입/,"이메일 회원가입 화면"],[/이메일 비밀번호 로그인/,"이메일 로그인 화면"],[/지구본/,"3D 지구본 화면"],[/장소 검색|좌표 입력/,"장소 검색 화면"],[/지도 클릭|핀 위치 지정/,"장소 선택 화면"],[/제목|설명|커버/,"플레이리스트 정보 화면"],[/외부 플레이리스트|링크 가져오기|곡과 링크 추가/,"음악 링크 입력 화면"],[/공개 범위|발행/,"공개 범위 설정 화면"],[/상세|곡 목록/,"플레이리스트 상세 화면"],[/여행 동선|날짜·시간/,"여행 동선 편집 화면"],[/필터/,"목록 필터 화면"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??(/화면|페이지/.test(title)?title:`${title} 화면`);
}
function actionTitle(title:string):string{
  const rules:Array<[RegExp,string]>=[[/랜딩|서비스 진입/,"시작하기 버튼 선택"],[/Google OAuth/,"Google로 계속하기 선택"],[/Instagram|Meta 계정/,"Meta로 계속하기 선택"],[/일반 이메일 회원가입/,"회원가입 정보 입력"],[/이메일 비밀번호 로그인/,"이메일과 비밀번호 입력"],[/지구본/,"지구본 회전·확대"],[/장소 검색|좌표 입력/,"장소명 또는 좌표 입력"],[/지도 클릭|핀 위치 지정/,"지도에서 장소 선택"],[/제목|설명|커버/,"제목·설명·커버 사진 추가"],[/외부 플레이리스트|링크 가져오기/,"YouTube·Spotify 링크 입력"],[/공개 범위|발행/,"공개 범위 선택 후 발행"],[/상세|곡 목록/,"플레이리스트 상세 열기"],[/Spotify|YouTube/,"음악 플랫폼 선택"],[/날짜·시간|여행 동선/,"여행 날짜와 방문 시간 입력"],[/사진/,"여행 사진 추가"],[/대표사진/,"대표사진 선택"],[/플레이리스트/,"플레이리스트 선택"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??`${title.replace(/(?:화면|페이지|기능)$/u,"").trim()} 선택·입력`;
}

type Step={key:string;title:string;kind:UserFlowNodeKind;feature?:FeatureSpec;parentKey?:string;branchCondition?:string};
function semanticSteps(requirement:FeatureSpec,children:FeatureSpec[]):Step[]|undefined{
  const feature=(pattern:RegExp)=>children.find(item=>pattern.test(item.title));
  if(/인증|온보딩|로그인|회원가입/.test(requirement.title))return[
    {key:"landing",title:"서비스 소개 화면",kind:"screen",feature:feature(/랜딩|서비스 진입/)},{key:"start",title:"시작하기 버튼 선택",kind:"action",parentKey:"landing"},{key:"auth",title:"로그인/회원가입 화면",kind:"screen",feature:feature(/이메일·소셜|로그인·회원가입/),parentKey:"start"},{key:"choice",title:"가입 또는 로그인 방식 선택",kind:"decision",parentKey:"auth"},{key:"google",title:"Google 계정 선택 화면",kind:"screen",feature:feature(/Google OAuth/),parentKey:"choice",branchCondition:"Google 선택"},{key:"meta",title:"Meta 계정 선택 화면",kind:"screen",feature:feature(/Instagram|Meta 계정/),parentKey:"choice",branchCondition:"Meta 선택"},{key:"signup",title:"이메일 회원가입 화면",kind:"screen",feature:feature(/일반 이메일 회원가입/),parentKey:"choice",branchCondition:"이메일 회원가입 선택"},{key:"login",title:"이메일 로그인 화면",kind:"screen",feature:feature(/이메일 비밀번호 로그인/),parentKey:"choice",branchCondition:"이메일 로그인 선택"},{key:"profile-google",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"google"},{key:"profile-meta",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"meta"},{key:"profile-signup",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"signup"},{key:"profile-login",title:"프로필 화면",kind:"result",feature:feature(/프로필 기본 정보/),parentKey:"login"}
  ];
  if(/여행 동선|음악 추억/.test(requirement.title))return[
    {key:"screen",title:"여행 동선 편집 화면",kind:"screen",feature:feature(/날짜|동선/)},{key:"date",title:"여행 날짜 선택",kind:"action",parentKey:"screen"},{key:"place",title:"방문 장소 추가 화면",kind:"screen",parentKey:"date"},{key:"search",title:"장소 검색·지도 선택",kind:"action",parentKey:"place"},{key:"time",title:"방문 시간 입력",kind:"action",parentKey:"search"},{key:"photo",title:"여행 사진 추가",kind:"action",parentKey:"time"},{key:"cover",title:"대표사진 선택",kind:"action",parentKey:"photo"},{key:"playlist",title:"장소별 플레이리스트 선택",kind:"action",parentKey:"cover"},{key:"use-cover",title:"대표사진을 커버로 사용",kind:"decision",parentKey:"playlist",branchCondition:"커버로 사용 여부"},{key:"save",title:"여행 동선 저장",kind:"action",parentKey:"use-cover"},{key:"result",title:"여행 동선 상세 화면",kind:"result",parentKey:"save"}
  ];
  if(/장소 플레이리스트 만들기|플레이리스트 만들기/.test(requirement.title))return[
    {key:"place-screen",title:"장소 선택 화면",kind:"screen",feature:feature(/핀 위치|지도 클릭/)},{key:"place",title:"검색 또는 지도에서 장소 선택",kind:"action",parentKey:"place-screen"},{key:"edit",title:"플레이리스트 정보 화면",kind:"screen",feature:feature(/제목|설명|커버/),parentKey:"place"},{key:"metadata",title:"제목과 장소 이야기 입력",kind:"action",parentKey:"edit"},{key:"cover",title:"플레이리스트 커버 사진 추가",kind:"action",parentKey:"metadata"},{key:"music",title:"음악 링크 입력 화면",kind:"screen",feature:feature(/링크 가져오기|곡과/),parentKey:"cover"},{key:"youtube",title:"YouTube 플레이리스트 링크 입력",kind:"action",parentKey:"music",branchCondition:"YouTube 선택"},{key:"spotify",title:"Spotify 플레이리스트 선택",kind:"action",parentKey:"music",branchCondition:"Spotify 선택"},{key:"visibility",title:"공개 범위 설정 화면",kind:"screen",feature:feature(/공개 범위|발행/),parentKey:"youtube"},{key:"visibility-2",title:"공개 범위 설정 화면",kind:"screen",feature:feature(/공개 범위|발행/),parentKey:"spotify"},{key:"publish",title:"플레이리스트 발행",kind:"action",parentKey:"visibility"},{key:"publish-2",title:"플레이리스트 발행",kind:"action",parentKey:"visibility-2"},{key:"result",title:"발행된 플레이리스트 상세 화면",kind:"result",parentKey:"publish"},{key:"result-2",title:"발행된 플레이리스트 상세 화면",kind:"result",parentKey:"publish-2"}
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
