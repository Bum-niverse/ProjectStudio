import type {ArchitecturePattern,SystemDesignNode,SystemDesignSnapshot,SystemDesignViewType} from "./systemDesign";

const NODE_WIDTH=240;const NODE_HEIGHT=128;const COLUMN_GAP=280;const ROW_GAP=132;const ORIGIN={x:100,y:120};

export interface SystemDesignLayoutResult{snapshot:SystemDesignSnapshot;resolvedPattern:Exclude<ArchitecturePattern,"auto">;reason:string;}

export function detectArchitecturePattern(snapshot:SystemDesignSnapshot,viewType:SystemDesignViewType=snapshot.viewType??"structural"):Exclude<ArchitecturePattern,"auto">{
  if(viewType==="deployment")return"deployment";
  if(snapshot.nodes.some(node=>node.type==="queue")||snapshot.edges.filter(edge=>edge.type==="event").length>=2)return"event_driven";
  const degree=new Map(snapshot.nodes.map(node=>[node.id,0]));for(const edge of snapshot.edges){degree.set(edge.source,(degree.get(edge.source)??0)+1);degree.set(edge.target,(degree.get(edge.target)??0)+1);}
  const maximum=Math.max(0,...degree.values());if(snapshot.nodes.length>=5&&maximum>=Math.ceil(snapshot.nodes.length*.45))return"hub_spoke";
  const branching=snapshot.nodes.filter(node=>snapshot.edges.filter(edge=>edge.source===node.id).length>1).length;
  if(snapshot.nodes.length>=3&&branching<=1)return"pipeline";
  return"layered";
}

function withPositions(snapshot:SystemDesignSnapshot,positions:Map<string,{x:number;y:number}>,viewType:SystemDesignViewType,pattern:ArchitecturePattern):SystemDesignSnapshot{return{...snapshot,viewType,architecturePattern:pattern,nodes:snapshot.nodes.map(node=>({...node,size:node.type==="group"?node.size:{width:Math.max(node.size.width,NODE_WIDTH),height:Math.max(node.size.height,NODE_HEIGHT)},position:positions.get(node.id)??node.position}))};}
function grid(items:SystemDesignNode[],column:number,positions:Map<string,{x:number;y:number}>){items.forEach((node,index)=>positions.set(node.id,{x:ORIGIN.x+column*(NODE_WIDTH+COLUMN_GAP),y:ORIGIN.y+index*(NODE_HEIGHT+ROW_GAP)}));}

function layered(snapshot:SystemDesignSnapshot){const order:SystemDesignNode["type"][][]=[["client"],["service","component"],["queue","cache"],["database"],["external"],["group"]];const positions=new Map<string,{x:number;y:number}>();const placed=new Set<string>();order.forEach((types,column)=>{const items=snapshot.nodes.filter(node=>types.includes(node.type));grid(items,column,positions);items.forEach(node=>placed.add(node.id));});grid(snapshot.nodes.filter(node=>!placed.has(node.id)),2,positions);return positions;}
function hubSpoke(snapshot:SystemDesignSnapshot){const positions=new Map<string,{x:number;y:number}>();const degree=(id:string)=>snapshot.edges.filter(edge=>edge.source===id||edge.target===id).length;const hub=[...snapshot.nodes].sort((a,b)=>degree(b.id)-degree(a.id))[0];if(!hub)return positions;const radius=Math.max(340,snapshot.nodes.length*34);positions.set(hub.id,{x:ORIGIN.x+radius,y:ORIGIN.y+radius});snapshot.nodes.filter(node=>node.id!==hub.id).forEach((node,index,items)=>{const angle=(Math.PI*2*index)/items.length;positions.set(node.id,{x:ORIGIN.x+radius+Math.cos(angle)*radius,y:ORIGIN.y+radius+Math.sin(angle)*radius});});return positions;}
function pipeline(snapshot:SystemDesignSnapshot){const positions=new Map<string,{x:number;y:number}>();const incoming=new Map(snapshot.nodes.map(node=>[node.id,0]));snapshot.edges.forEach(edge=>incoming.set(edge.target,(incoming.get(edge.target)??0)+1));const queue=snapshot.nodes.filter(node=>(incoming.get(node.id)??0)===0);const rank=new Map<string,number>();queue.forEach(node=>rank.set(node.id,0));for(let pass=0;pass<snapshot.nodes.length;pass++)for(const edge of snapshot.edges){const source=rank.get(edge.source);if(source!==undefined)rank.set(edge.target,Math.max(rank.get(edge.target)??0,source+1));}snapshot.nodes.forEach(node=>{if(!rank.has(node.id))rank.set(node.id,0);});const columns=new Map<number,SystemDesignNode[]>();snapshot.nodes.forEach(node=>{const value=rank.get(node.id)??0;columns.set(value,[...(columns.get(value)??[]),node]);});[...columns.entries()].sort(([a],[b])=>a-b).forEach(([column,nodes])=>grid(nodes,column,positions));return positions;}
function eventDriven(snapshot:SystemDesignSnapshot){const positions=new Map<string,{x:number;y:number}>();const brokers=snapshot.nodes.filter(node=>node.type==="queue");const brokerIds=new Set(brokers.map(node=>node.id));const producers=snapshot.nodes.filter(node=>snapshot.edges.some(edge=>edge.source===node.id&&brokerIds.has(edge.target)));const consumers=snapshot.nodes.filter(node=>snapshot.edges.some(edge=>brokerIds.has(edge.source)&&edge.target===node.id));const used=new Set([...brokers,...producers,...consumers].map(node=>node.id));grid(producers,0,positions);grid(brokers,1,positions);grid(consumers,2,positions);grid(snapshot.nodes.filter(node=>!used.has(node.id)),3,positions);return positions;}
function deployment(snapshot:SystemDesignSnapshot){const groups=new Map<string,SystemDesignNode[]>();snapshot.nodes.forEach(node=>{const boundary=node.type==="external"?"외부 시스템":node.deployment.trim()||"배포 위치 미정";groups.set(boundary,[...(groups.get(boundary)??[]),node]);});const positions=new Map<string,{x:number;y:number}>();[...groups.values()].forEach((nodes,column)=>grid(nodes,column,positions));return positions;}

export function layoutSystemDesign(snapshot:SystemDesignSnapshot,requested:ArchitecturePattern=snapshot.architecturePattern??"auto",viewType:SystemDesignViewType=snapshot.viewType??"structural"):SystemDesignLayoutResult{
  const resolvedPattern=requested==="auto"?detectArchitecturePattern(snapshot,viewType):requested;
  const positions=resolvedPattern==="hub_spoke"?hubSpoke(snapshot):resolvedPattern==="pipeline"?pipeline(snapshot):resolvedPattern==="event_driven"?eventDriven(snapshot):resolvedPattern==="deployment"?deployment(snapshot):layered(snapshot);
  const labels={layered:"계층",hub_spoke:"허브",pipeline:"파이프라인",event_driven:"이벤트",deployment:"배포"};
  return{snapshot:withPositions(snapshot,positions,viewType,requested),resolvedPattern,reason:requested==="auto"?`연결 구조를 분석해 ${labels[resolvedPattern]}형으로 정렬했습니다.`:`${labels[resolvedPattern]}형 규칙으로 정렬했습니다.`};
}
