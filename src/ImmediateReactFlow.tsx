import {
  applyNodeChanges,
  ReactFlow as ReactFlowBase,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowProps,
} from "@xyflow/react";
import { useCallback, useState } from "react";

export function ImmediateReactFlow<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(props: ReactFlowProps<NodeType, EdgeType>) {
  const { nodes, onNodesChange, ...reactFlowProps } = props;
  const [lastExternalNodes, setLastExternalNodes] = useState(nodes);
  const [interactiveNodes, setInteractiveNodes] = useState<NodeType[]>(() => nodes ?? []);

  if (nodes !== lastExternalNodes) {
    setLastExternalNodes(nodes);
    setInteractiveNodes(nodes ?? []);
  }

  const handleNodesChange = useCallback((changes: NodeChange<NodeType>[]) => {
    setInteractiveNodes((current) => applyNodeChanges(changes, current));
    onNodesChange?.(changes);
  }, [onNodesChange]);

  return (
    <ReactFlowBase
      {...reactFlowProps}
      nodeDragThreshold={0}
      nodes={nodes === undefined ? undefined : interactiveNodes}
      onNodesChange={nodes === undefined ? onNodesChange : handleNodesChange}
    />
  );
}
