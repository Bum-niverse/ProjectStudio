import type { FeatureSpec } from "./feature";
import type { UserFlowNode } from "./userFlow";

export type SystemNodeType="client"|"service"|"database"|"cache"|"queue"|"external"|"component"|"group";
export type SystemNodeStatus="planned"|"active"|"deprecated";
export type SystemEdgeType="http"|"ipc"|"database_query"|"event"|"file"|"dependency";
export type SystemDesignSource="user"|"development_mode"|"codex";

export interface SystemDesignNode{
  id:string;type:SystemNodeType;name:string;description:string;technology:string;deployment:string;status:SystemNodeStatus;
  linkedFeatureIds:string[];linkedUserFlowIds:string[];linkedWireframeIds:string[];codePaths:string[];testPaths:string[];configuration:string;
  position:{x:number;y:number};size:{width:number;height:number};
}
export interface SystemDesignEdge{
  id:string;source:string;target:string;type:SystemEdgeType;protocol:string;dataFormat:string;isAsync:boolean;authentication:string;errorHandling:string;description:string;
}
export interface SystemDesignSnapshot{schemaVersion:1;title:string;summary:string;nodes:SystemDesignNode[];edges:SystemDesignEdge[];}
export interface SystemDesignRevision{id:string;designId:string;projectId:string;revisionNumber:number;snapshot:SystemDesignSnapshot;source:SystemDesignSource;createdAt:string;}
export interface SystemDesignProposal{id:string;projectId:string;designId:string;baseRevisionId:string;proposedSnapshot:SystemDesignSnapshot;summary:string;source:"codex";status:"pending"|"accepted"|"rejected";createdAt:string;decidedAt?:string;rejectionReason?:string;}
export interface SystemDesignWorkspace{designId:string;projectId:string;revision:SystemDesignRevision;proposals:SystemDesignProposal[];}
export interface SystemDesignWarning{id:string;kind:"disconnected"|"unlinked_feature"|"missing_datastore"|"external_error"|"missing_auth"|"cycle"|"missing_node"|"duplicate_id"|"direct_database"|"missing_protocol";message:string;targetId?:string;}

export const SYSTEM_NODE_TYPES:Array<{id:SystemNodeType;label:string}>=[
  {id:"client",label:"클라이언트"},{id:"service",label:"서비스"},{id:"database",label:"데이터베이스"},{id:"cache",label:"캐시"},
  {id:"queue",label:"메시지 큐"},{id:"external",label:"외부 시스템"},{id:"component",label:"일반 컴포넌트"},{id:"group",label:"그룹"},
];
export const SYSTEM_EDGE_TYPES:Array<{id:SystemEdgeType;label:string}>=[
  {id:"http",label:"HTTP/HTTPS"},{id:"ipc",label:"IPC"},{id:"database_query",label:"Database Query"},{id:"event",label:"Event/Message"},{id:"file",label:"File Access"},{id:"dependency",label:"Generic Dependency"},
];

const finite=(value:number)=>Number.isFinite(value)&&Math.abs(value)<=100_000;
export function validateSystemDesign(snapshot:SystemDesignSnapshot):string[]{
  const errors:string[]=[];const nodeIds=new Set<string>();const edgeIds=new Set<string>();const pairs=new Set<string>();
  for(const node of snapshot.nodes){if(!node.id.trim()||nodeIds.has(node.id))errors.push(`중복되거나 빈 노드 ID: ${node.id||"(비어 있음)"}`);nodeIds.add(node.id);if(!node.name.trim())errors.push(`${node.id} 노드 이름이 비어 있습니다.`);if(!finite(node.position.x)||!finite(node.position.y)||!finite(node.size.width)||!finite(node.size.height)||node.size.width<=0||node.size.height<=0)errors.push(`${node.id} 노드 좌표 또는 크기가 올바르지 않습니다.`);}
  for(const edge of snapshot.edges){if(!edge.id.trim()||edgeIds.has(edge.id))errors.push(`중복되거나 빈 연결 ID: ${edge.id||"(비어 있음)"}`);edgeIds.add(edge.id);if(edge.source===edge.target)errors.push(`${edge.id} 자기 연결은 허용되지 않습니다.`);if(!nodeIds.has(edge.source)||!nodeIds.has(edge.target))errors.push(`${edge.id} 연결 대상 노드를 찾을 수 없습니다.`);const key=`${edge.source}:${edge.target}:${edge.type}`;if(pairs.has(key))errors.push(`${edge.id} 연결이 중복되었습니다.`);pairs.add(key);}
  return errors;
}

export function reviewSystemDesign(snapshot:SystemDesignSnapshot):SystemDesignWarning[]{
  const warnings:SystemDesignWarning[]=[];const ids=new Set(snapshot.nodes.map(node=>node.id));const connected=new Set(snapshot.edges.flatMap(edge=>[edge.source,edge.target]));
  for(const node of snapshot.nodes){
    if(!connected.has(node.id)&&snapshot.nodes.length>1)warnings.push({id:`disconnected-${node.id}`,kind:"disconnected",targetId:node.id,message:`‘${node.name}’ 노드가 다른 컴포넌트와 연결되지 않았습니다.`});
    if(!node.linkedFeatureIds.length)warnings.push({id:`feature-${node.id}`,kind:"unlinked_feature",targetId:node.id,message:`‘${node.name}’ 노드에 연결된 기능명세가 없습니다.`});
    if(node.type==="service"&&/저장|상태|기록|관리/.test(`${node.name} ${node.description}`)&&!snapshot.edges.some(edge=>edge.source===node.id&&["database","cache"].includes(snapshot.nodes.find(item=>item.id===edge.target)?.type??"")))warnings.push({id:`store-${node.id}`,kind:"missing_datastore",targetId:node.id,message:`‘${node.name}’ 서비스는 상태를 다루지만 연결된 저장소가 보이지 않습니다.`});
  }
  for(const edge of snapshot.edges){
    if(!ids.has(edge.source)||!ids.has(edge.target))warnings.push({id:`missing-${edge.id}`,kind:"missing_node",targetId:edge.id,message:`‘${edge.id}’ 연결이 존재하지 않는 노드를 참조합니다.`});
    const source=snapshot.nodes.find(node=>node.id===edge.source);const target=snapshot.nodes.find(node=>node.id===edge.target);
    if((source?.type==="external"||target?.type==="external")&&!edge.errorHandling.trim())warnings.push({id:`external-${edge.id}`,kind:"external_error",targetId:edge.id,message:`외부 시스템 연결 ‘${edge.description||edge.id}’에 오류 처리 방식이 없습니다.`});
    if(edge.type==="http"&&!edge.authentication.trim())warnings.push({id:`auth-${edge.id}`,kind:"missing_auth",targetId:edge.id,message:`HTTP 연결 ‘${edge.description||edge.id}’의 인증 방식을 검토해 주세요.`});
    if(source?.type==="client"&&target?.type==="database")warnings.push({id:`database-${edge.id}`,kind:"direct_database",targetId:edge.id,message:"클라이언트가 데이터베이스에 직접 연결됩니다. 권한 경계를 검토해 주세요."});
    if(!edge.protocol.trim()&&edge.type!=="dependency")warnings.push({id:`protocol-${edge.id}`,kind:"missing_protocol",targetId:edge.id,message:`‘${edge.description||edge.id}’ 연결의 통신 프로토콜이 정의되지 않았습니다.`});
  }
  const adjacency=new Map<string,string[]>();for(const edge of snapshot.edges)adjacency.set(edge.source,[...(adjacency.get(edge.source)??[]),edge.target]);const visiting=new Set<string>(),visited=new Set<string>();let hasCycle=false;const visit=(id:string)=>{if(visiting.has(id)){hasCycle=true;return;}if(visited.has(id))return;visiting.add(id);for(const next of adjacency.get(id)??[])visit(next);visiting.delete(id);visited.add(id);};for(const id of ids)visit(id);if(hasCycle)warnings.push({id:"cycle",kind:"cycle",message:"순환 의존성 가능성이 있습니다. 의도된 양방향 통신인지 검토해 주세요."});
  return warnings;
}

export function createInitialSystemDesign(projectId:string,features:FeatureSpec[],flows:UserFlowNode[]):SystemDesignSnapshot{
  const featureIds=features.filter(feature=>feature.parentId).slice(0,8).map(feature=>feature.id);const flowIds=flows.slice(0,6).map(flow=>flow.id);
  return {schemaVersion:1,title:"시스템 설계",summary:"기능명세와 사용자 흐름을 실제 구현 컴포넌트로 연결합니다.",nodes:[
    {id:`${projectId}-client`,type:"client",name:"데스크톱 클라이언트",description:"사용자 입력과 시각적 기획 화면을 제공한다.",technology:"React / TypeScript",deployment:"Tauri WebView",status:"active",linkedFeatureIds:featureIds.slice(0,3),linkedUserFlowIds:flowIds.slice(0,2),linkedWireframeIds:[],codePaths:["src"],testPaths:["src/**/*.test.ts"],configuration:"",position:{x:80,y:220},size:{width:220,height:120}},
    {id:`${projectId}-service`,type:"service",name:"로컬 애플리케이션 서비스",description:"문서 리비전과 시스템 설계를 검증하고 저장한다.",technology:"Rust / Tauri Commands",deployment:"Local process",status:"active",linkedFeatureIds:featureIds.slice(2,7),linkedUserFlowIds:flowIds.slice(2,5),linkedWireframeIds:[],codePaths:["src-tauri/src"],testPaths:["src-tauri/src"],configuration:"",position:{x:430,y:220},size:{width:240,height:120}},
    {id:`${projectId}-database`,type:"database",name:"로컬 SQLite",description:"프로젝트, 문서와 불변 리비전을 저장한다.",technology:"SQLite / SQLx",deployment:"Windows app data",status:"active",linkedFeatureIds:featureIds.slice(4),linkedUserFlowIds:[],linkedWireframeIds:[],codePaths:["src-tauri/migrations"],testPaths:["src-tauri/src"],configuration:"foreign_keys=true",position:{x:800,y:220},size:{width:220,height:120}},
  ],edges:[
    {id:`${projectId}-edge-client-service`,source:`${projectId}-client`,target:`${projectId}-service`,type:"ipc",protocol:"Tauri Invoke",dataFormat:"JSON",isAsync:false,authentication:"GitHub CLI 세션 확인",errorHandling:"입력 내용을 유지하고 재시도 안내",description:"기획 데이터 저장 요청"},
    {id:`${projectId}-edge-service-db`,source:`${projectId}-service`,target:`${projectId}-database`,type:"database_query",protocol:"SQLx",dataFormat:"SQLite rows / JSON snapshot",isAsync:false,authentication:"로컬 프로세스 경계",errorHandling:"트랜잭션 롤백과 오류 메시지",description:"리비전 저장과 조회"},
  ]};
}
