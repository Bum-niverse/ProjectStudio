import type { FeatureSpec, NodeColorKey } from "./feature";

export type UserFlowNodeKind="phase"|"screen"|"action"|"result"|"decision";
export interface UserFlowNode{id:string;projectId:string;laneId:string;title:string;description:string;kind:UserFlowNodeKind;positionX:number;positionY:number;colorKey?:NodeColorKey}
export interface UserFlowEdge{id:string;projectId:string;sourceNodeId:string;targetNodeId:string}
export interface UserFlowLane{id:string;title:string;positionY:number;height:number;colorKey?:NodeColorKey}
export interface UserFlowSpec{nodes:UserFlowNode[];edges:UserFlowEdge[];lanes:UserFlowLane[]}

const FLOW_COLORS:NodeColorKey[]=["green","cyan","amber","violet","rose","slate"];
function actionTitle(title:string):string{
  const rules:Array<[RegExp,string]>=[[/Google OAuth/,"Google 동의 후 돌아오기"],[/Instagram|Meta 계정/,"Meta 계정 인증"],[/일반 이메일 회원가입/,"가입 정보 제출"],[/이메일 비밀번호 로그인/,"이메일 자격 증명 제출"],[/인증 콜백/,"세션·프로필 확정"],[/로그인|회원가입/,"로그인 정보 제출"],[/랜딩|서비스 진입/,"서비스 시작 선택"],[/프로필/,"프로필 저장"],[/주변 장소|자동 확인/,"클릭 좌표 주변 장소 확인"],[/장소 검색|좌표 입력/,"장소 선택"],[/지구본/,"지도 탐색"],[/핀 선택/,"플레이리스트 핀 열기"],[/위치 지정/,"이 위치로 지정"],[/제목|설명|커버/,"기본 정보 저장"],[/곡과|링크 추가/,"곡 링크 추가"],[/공개 범위|발행/,"플레이리스트 발행"],[/상세|곡 목록/,"상세 화면 열기"],[/Spotify|YouTube/,"외부 앱에서 듣기"],[/필터/,"필터 적용"],[/수정|삭제/,"변경 내용 저장"],[/신고$/,"신고 제출"],[/신고 검토/,"처리 상태 저장"]];
  return rules.find(([pattern])=>pattern.test(title))?.[1]??`${title} 실행`;
}
function screenKind(title:string):UserFlowNodeKind{return /공개 범위|필터|검토/.test(title)?"decision":"screen";}

export function createUserFlowSpec(projectId:string,features:FeatureSpec[]):UserFlowSpec{
  const root=features.find(feature=>!feature.parentId);const requirements=features.filter(feature=>feature.parentId===root?.id).sort((a,b)=>a.sortOrder-b.sortOrder);const nodes:UserFlowNode[]=[];const edges:UserFlowEdge[]=[];const laneHeight=210;
  const lanes=requirements.map((requirement,index)=>({id:requirement.id,title:requirement.title,positionY:index*laneHeight,height:laneHeight,colorKey:FLOW_COLORS[index%FLOW_COLORS.length]}));
  requirements.forEach((requirement,laneIndex)=>{const laneY=laneIndex*laneHeight;const colorKey=FLOW_COLORS[laneIndex%FLOW_COLORS.length];const directChildren=features.filter(feature=>feature.parentId===requirement.id).sort((a,b)=>a.sortOrder-b.sortOrder);const children=directChildren.flatMap(child=>child.id.endsWith("-auth")?[child,...features.filter(feature=>feature.parentId===child.id&&!/(?:-flow|-validation|-history)$/.test(feature.id)).sort((a,b)=>a.sortOrder-b.sortOrder)]:[child]);const phaseId=`flow-${requirement.id}`;
    nodes.push({id:phaseId,projectId,laneId:requirement.id,title:requirement.title,description:`${requirement.description} 이 레인에서는 실제 화면과 사용자의 클릭·입력 행동만 연결한다.`,kind:"phase",positionX:90,positionY:laneY+86,colorKey});let previousId=phaseId;
    children.forEach((child,index)=>{const screenId=`flow-${child.id}`;const actionId=`flow-${child.id}-interaction`;const screenX=360+index*470;nodes.push({id:screenId,projectId,laneId:requirement.id,title:child.title,description:child.description,kind:screenKind(child.title),positionX:screenX,positionY:laneY+86,colorKey},{id:actionId,projectId,laneId:requirement.id,title:actionTitle(child.title),description:`사용자가 ‘${child.title}’ 화면에서 이 행동을 수행하면 입력을 검증하고 다음 화면 또는 결과로 이동한다.`,kind:"action",positionX:screenX+220,positionY:laneY+86,colorKey});edges.push({id:`edge-${previousId}-${screenId}`,projectId,sourceNodeId:previousId,targetNodeId:screenId},{id:`edge-${screenId}-${actionId}`,projectId,sourceNodeId:screenId,targetNodeId:actionId});previousId=actionId;});
    const resultId=`flow-${requirement.id}-complete`;const resultX=360+children.length*470;nodes.push({id:resultId,projectId,laneId:requirement.id,title:`${requirement.title} 완료`,description:"사용자의 행동이 저장되고 다음에 다시 확인할 수 있는 완료 상태다.",kind:"result",positionX:resultX,positionY:laneY+86,colorKey});edges.push({id:`edge-${previousId}-${resultId}`,projectId,sourceNodeId:previousId,targetNodeId:resultId});
  });return{nodes,edges,lanes};
}
