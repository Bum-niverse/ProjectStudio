import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FeatureSpec } from "./domain/feature";

export type FeatureNodeData = { feature: FeatureSpec; label: string };

export function FeatureNodeCard({ data }: NodeProps) {
  const nodeData = data as FeatureNodeData;
  return <div className={`feature-node-card priority-${nodeData.feature.priority}`}>
    {nodeData.feature.parentId && <Handle className="feature-handle input-handle" type="target" position={Position.Left} />}
    <div><strong>{nodeData.feature.title}</strong><small>{nodeData.feature.status} · {nodeData.feature.acceptanceCriteria.length}</small></div>
    <Handle className="feature-handle output-handle" type="source" position={Position.Right} />
  </div>;
}
