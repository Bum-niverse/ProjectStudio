import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { UserFlowNode } from "./domain/userFlow";
export type UserFlowNodeData={node:UserFlowNode};
export type UserFlowLaneData={title:string};
const KIND_LABEL={phase:"대단계",screen:"화면",action:"행동",result:"결과",decision:"분기"} as const;
export function UserFlowNodeCard({data}:NodeProps){const node=(data as UserFlowNodeData).node;return <div className={`user-flow-node kind-${node.kind}`}><Handle className="flow-handle" type="target" position={Position.Left}/><span>{KIND_LABEL[node.kind]}</span><strong>{node.title}</strong><Handle className="flow-handle" type="source" position={Position.Right}/></div>;}
export function UserFlowLaneNode({data}:NodeProps){return <div className="user-flow-lane-node"><span>{(data as UserFlowLaneData).title}</span></div>;}
