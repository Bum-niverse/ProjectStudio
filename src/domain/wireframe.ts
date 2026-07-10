import type { UserFlowLane, UserFlowNode } from "./userFlow";

export type WireframeDevice = "desktop" | "mobile";
export type WireframeProvider = "preview" | "codex" | "claude" | "antigravity" | "local-llm";
export type WireframeBlockKind = "navigation" | "hero" | "search" | "form" | "cards" | "list" | "detail" | "actions";
export interface WireframeCandidate { id:string; laneId:string; laneTitle:string; title:string; description:string; }
export interface WireframePageModel { id:string; sourceNodeId:string; title:string; description:string; device:WireframeDevice; provider:WireframeProvider; blocks:Array<{kind:WireframeBlockKind;label:string}>; }

export function createWireframeCandidates(nodes:UserFlowNode[],lanes:UserFlowLane[]):WireframeCandidate[]{
  return nodes.filter(node=>node.kind==="screen"||node.kind==="phase").map(node=>({id:`candidate-${node.id}`,laneId:node.laneId,laneTitle:lanes.find(lane=>lane.id===node.laneId)?.title??"기타",title:node.title,description:node.description}));
}

export function createWireframePage(candidate:WireframeCandidate,device:WireframeDevice,provider:WireframeProvider):WireframePageModel{
  const text=`${candidate.title} ${candidate.description}`;
  const blocks:Array<{kind:WireframeBlockKind;label:string}>=[{kind:"navigation",label:device==="desktop"?"상단 탐색과 현재 위치":"모바일 상단 바"}];
  if(/탐색|검색|장소|지구본/.test(text))blocks.push({kind:"search",label:"검색·필터와 위치 탐색"},{kind:"cards",label:"장소 및 플레이리스트 결과"});
  else if(/생성|만들|수정|입력|로그인/.test(text))blocks.push({kind:"form",label:"핵심 정보 입력 영역"},{kind:"actions",label:"저장·발행 작업"});
  else if(/상세|플레이리스트|듣기/.test(text))blocks.push({kind:"hero",label:"커버와 핵심 정보"},{kind:"list",label:"곡 목록과 외부 재생"},{kind:"actions",label:"공개·공유 작업"});
  else if(/라이브러리|목록|관리|신고/.test(text))blocks.push({kind:"search",label:"필터와 검색"},{kind:"list",label:"관리 목록"},{kind:"detail",label:"선택 항목 상세"});
  else blocks.push({kind:"hero",label:"페이지 목적과 주요 상태"},{kind:"cards",label:"핵심 콘텐츠 모듈"},{kind:"actions",label:"다음 행동"});
  return{id:`wireframe-${candidate.id}`,sourceNodeId:candidate.id,title:candidate.title,description:candidate.description,device,provider,blocks};
}
