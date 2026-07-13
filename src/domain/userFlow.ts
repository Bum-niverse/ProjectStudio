import type { FeatureSpec, NodeColorKey } from "./feature";

export type UserFlowNodeKind="phase"|"screen"|"action"|"result"|"decision";
export interface UserFlowNode{id:string;projectId:string;laneId:string;title:string;description:string;kind:UserFlowNodeKind;positionX:number;positionY:number;colorKey?:NodeColorKey}
export interface UserFlowEdge{id:string;projectId:string;sourceNodeId:string;targetNodeId:string}
export interface UserFlowLane{id:string;title:string;positionY:number;height:number;colorKey?:NodeColorKey}
export interface UserFlowSpec{nodes:UserFlowNode[];edges:UserFlowEdge[];lanes:UserFlowLane[]}

export function connectedUserFlowNodeIds(edges:UserFlowEdge[],originId:string,depth=2):Set<string>{
  const visible=new Set([originId]);let frontier=[originId];
  for(let step=0;step<depth&&frontier.length;step++){
    const next:string[]=[];
    for(const edge of edges){
      if(frontier.includes(edge.sourceNodeId)&&!visible.has(edge.targetNodeId)){visible.add(edge.targetNodeId);next.push(edge.targetNodeId);}
      if(frontier.includes(edge.targetNodeId)&&!visible.has(edge.sourceNodeId)){visible.add(edge.sourceNodeId);next.push(edge.sourceNodeId);}
    }
    frontier=next;
  }
  return visible;
}

const FLOW_COLORS:NodeColorKey[]=["green","cyan","amber","violet","rose","slate"];
function actionTitle(title:string):string{
  const rules:Array<[RegExp,string]>=[[/Google OAuth/,"Google 동의 후 돌아오기"],[/Instagram|Meta 계정/,"Meta 계정 인증"],[/일반 이메일 회원가입/,"가입 정보 제출"],[/이메일 비밀번호 로그인/,"이메일 자격 증명 제출"],[/인증 콜백/,"세션·프로필 확정"],[/로그인|회원가입/,"로그인 정보 제출"],[/랜딩|서비스 진입/,"서비스 시작 선택"],[/프로필/,"프로필 저장"],[/주변 장소|자동 확인/,"클릭 좌표 주변 장소 확인"],[/장소 검색|좌표 입력/,"장소 선택"],[/지구본/,"지도 탐색"],[/핀 선택/,"플레이리스트 핀 열기"],[/위치 지정/,"이 위치로 지정"],[/제목|설명|커버/,"기본 정보 저장"],[/외부 플레이리스트|링크 가져오기/,"재생목록 URL 붙여넣기·곡 검토"],[/곡과|링크 추가/,"곡 링크 추가"],[/공개 범위|발행/,"플레이리스트 발행"],[/상세|곡 목록/,"상세 화면 열기"],[/Spotify|YouTube/,"외부 앱에서 듣기"],[/필터/,"필터 적용"],[/수정|삭제/,"변경 내용 저장"],[/신고$/,"신고 제출"],[/신고 검토/,"처리 상태 저장"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??`${title} 실행`;
}
function screenKind(title:string):UserFlowNodeKind{return /공개 범위|필터|검토/.test(title)?"decision":"screen";}
function isConvergenceFeature(feature:FeatureSpec):boolean{return /콜백|완료|확정|공통|후처리|자동 생성|세션 보장/.test(feature.title);}

export function createUserFlowSpec(projectId:string,features:FeatureSpec[]):UserFlowSpec{
  const root=features.find(feature=>!feature.parentId);const requirements=features.filter(feature=>feature.parentId===root?.id).sort((a,b)=>a.sortOrder-b.sortOrder);const nodes:UserFlowNode[]=[];const edges:UserFlowEdge[]=[];
  const childFeatures=(parentId:string)=>features.filter(feature=>feature.parentId===parentId&&!/(?:-flow|-validation|-history)$/.test(feature.id)).sort((a,b)=>a.sortOrder-b.sortOrder);
  let laneY=0;const lanes=requirements.map((requirement,index)=>{const maxBranches=Math.max(1,...childFeatures(requirement.id).map(child=>childFeatures(child.id).filter(item=>!isConvergenceFeature(item)).length));const height=Math.max(210,maxBranches*150+80);const lane={id:requirement.id,title:requirement.title,positionY:laneY,height,colorKey:FLOW_COLORS[index%FLOW_COLORS.length]};laneY+=height;return lane;});
  requirements.forEach((requirement,laneIndex)=>{const lane=lanes[laneIndex];const colorKey=lane.colorKey;const centerY=lane.positionY+lane.height/2;const phaseId=`flow-${requirement.id}`;const resultId=`flow-${requirement.id}-complete`;let cursorX=420;let incomingIds=[phaseId];
    nodes.push({id:phaseId,projectId,laneId:requirement.id,title:requirement.title,description:`${requirement.description} 이 레인에서는 실제 화면과 사용자의 클릭·입력 행동만 연결한다.`,kind:"phase",positionX:90,positionY:centerY,colorKey});
    const addStep=(child:FeatureSpec,screenX:number,y:number,sources:string[],kind=screenKind(child.title))=>{const screenId=`flow-${child.id}`;const actionId=`flow-${child.id}-interaction`;nodes.push({id:screenId,projectId,laneId:requirement.id,title:child.title,description:child.description,kind,positionX:screenX,positionY:y,colorKey},{id:actionId,projectId,laneId:requirement.id,title:actionTitle(child.title),description:`사용자가 ‘${child.title}’ 화면에서 이 행동을 수행하면 입력을 검증하고 다음 화면 또는 결과로 이동한다.`,kind:"action",positionX:screenX+300,positionY:y,colorKey});sources.forEach(sourceId=>edges.push({id:`edge-${sourceId}-${screenId}`,projectId,sourceNodeId:sourceId,targetNodeId:screenId}));edges.push({id:`edge-${screenId}-${actionId}`,projectId,sourceNodeId:screenId,targetNodeId:actionId});return actionId;};
    for(const child of childFeatures(requirement.id)){const nested=childFeatures(child.id);const alternatives=nested.filter(item=>!isConvergenceFeature(item));const convergence=nested.filter(isConvergenceFeature);const parentActionId=addStep(child,cursorX,centerY,incomingIds,alternatives.length>=2?"decision":screenKind(child.title));cursorX+=620;
      if(alternatives.length>=2){const firstY=centerY-((alternatives.length-1)*150)/2;const branchActionIds=alternatives.map((alternative,index)=>addStep(alternative,cursorX,firstY+index*150,[parentActionId]));cursorX+=620;incomingIds=branchActionIds;for(const common of convergence){incomingIds=[addStep(common,cursorX,centerY,incomingIds)];cursorX+=620;}}
      else{incomingIds=[parentActionId];for(const nestedChild of nested){incomingIds=[addStep(nestedChild,cursorX,centerY,incomingIds)];cursorX+=620;}}
    }
    nodes.push({id:resultId,projectId,laneId:requirement.id,title:`${requirement.title} 완료`,description:"사용자의 행동이 저장되고 다음에 다시 확인할 수 있는 완료 상태다.",kind:"result",positionX:cursorX,positionY:centerY,colorKey});incomingIds.forEach(sourceId=>edges.push({id:`edge-${sourceId}-${resultId}`,projectId,sourceNodeId:sourceId,targetNodeId:resultId}));
  });return{nodes,edges,lanes};
}
