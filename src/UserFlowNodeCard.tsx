import {Handle,NodeToolbar,Position,type NodeProps} from "@xyflow/react";
import type{UserFlowNode}from"./domain/userFlow";

export type UserFlowNodeData={node:UserFlowNode;onSelect?:(node:UserFlowNode)=>void;onAdd?:(node:UserFlowNode)=>void;onEdit?:(node:UserFlowNode)=>void;onDelete?:(node:UserFlowNode)=>void;onCompletionChange?:(node:UserFlowNode,isCompleted:boolean)=>void};
export type UserFlowLaneData={title:string;colorKey?:UserFlowNode["colorKey"]};
const KIND_LABEL={phase:"대단계",screen:"화면",action:"행동",result:"결과",decision:"선택"}as const;
const KIND_ICON={phase:"■",screen:"▣",action:"○",result:"✓",decision:"◇"}as const;

export function UserFlowNodeCard({data,selected}:NodeProps){
  const nodeData=data as UserFlowNodeData;const node=nodeData.node;
  return <div className={`user-flow-node kind-${node.kind} color-${node.colorKey??"violet"} ${node.isCompleted?"is-completed":""}`} onClick={()=>nodeData.onSelect?.(node)}>
    <NodeToolbar isVisible={selected} position={Position.Top}><div className="node-action-toolbar"><button aria-label={`${node.title} 다음 단계 추가`} title="다음 단계 추가" onClick={event=>{event.stopPropagation();nodeData.onAdd?.(node);}} type="button">＋</button><button aria-label={`${node.title} 편집`} title="단계 편집" onClick={event=>{event.stopPropagation();nodeData.onEdit?.(node);}} type="button">✎</button><button aria-label={`${node.title} 삭제`} className="danger" title="단계 삭제" onClick={event=>{event.stopPropagation();nodeData.onDelete?.(node);}} type="button">×</button></div></NodeToolbar>
    <Handle className="flow-handle" type="target" position={Position.Left}/><span className="flow-node-kind"><i aria-hidden="true">{KIND_ICON[node.kind]}</i>{KIND_LABEL[node.kind]}</span><strong>{node.title}</strong><label className="flow-node-completion" onClick={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()}><input aria-label={`${node.title} 흐름 검수 완료`} checked={Boolean(node.isCompleted)} onChange={event=>nodeData.onCompletionChange?.(node,event.currentTarget.checked)} type="checkbox"/><span>{node.isCompleted?"검수됨":"미검수"}</span></label><Handle className="flow-handle" type="source" position={Position.Right}/>
  </div>;
}
export function UserFlowLaneNode({data}:NodeProps){const lane=data as UserFlowLaneData;return <div className={`user-flow-lane-node color-${lane.colorKey??"violet"}`}><span>{lane.title}</span></div>;}
