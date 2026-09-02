import type { UserFlowEdge, UserFlowLane, UserFlowNode } from "./userFlow";

interface UserFlowLayoutOptions {
  compact?: boolean;
}

function depthByConnection(nodes: UserFlowNode[], edges: UserFlowEdge[]): Map<string, number> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const laneEdges = edges.filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  const depths = new Map<string, number>();

  for (const edge of laneEdges) {
    outgoing.set(edge.sourceNodeId, [...(outgoing.get(edge.sourceNodeId) ?? []), edge.targetNodeId]);
    incomingCount.set(edge.targetNodeId, (incomingCount.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue = nodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.positionY - right.positionY);
  for (const node of queue) depths.set(node.id, 0);

  while (queue.length) {
    const source = queue.shift()!;
    const sourceDepth = depths.get(source.id) ?? 0;
    for (const targetId of outgoing.get(source.id) ?? []) {
      depths.set(targetId, Math.max(depths.get(targetId) ?? 0, sourceDepth + 1));
      const remaining = (incomingCount.get(targetId) ?? 1) - 1;
      incomingCount.set(targetId, remaining);
      if (remaining === 0) {
        const target = nodes.find((node) => node.id === targetId);
        if (target) queue.push(target);
      }
    }
  }

  for (const node of nodes) {
    if (!depths.has(node.id)) depths.set(node.id, Math.max(0, node.depth ?? 0));
  }
  return depths;
}

export function layoutUserFlow(
  nodes: UserFlowNode[],
  edges: UserFlowEdge[],
  lanes: UserFlowLane[],
  options: UserFlowLayoutOptions = {},
): { nodes: UserFlowNode[]; lanes: UserFlowLane[] } {
  const compact = options.compact ?? false;
  const columnStep = compact ? 250 : 320;
  const rowStep = compact ? 88 : 112;
  const laneGap = compact ? 20 : 28;
  const knownLaneIds = new Set(lanes.map((lane) => lane.id));
  const missingLaneIds = [...new Set(nodes.map((node) => node.laneId))].filter((id) => !knownLaneIds.has(id));
  const orderedLanes = [
    ...lanes.slice().sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    ...missingLaneIds.map((id, index): UserFlowLane => ({
      id,
      title: `사용 흐름 ${lanes.length + index + 1}`,
      order: lanes.length + index,
      positionY: 0,
      height: 250,
    })),
  ];

  let laneY = 0;
  const positionedNodes: UserFlowNode[] = [];
  const positionedLanes: UserFlowLane[] = [];

  for (const [laneIndex, lane] of orderedLanes.entries()) {
    const laneNodes = nodes.filter((node) => node.laneId === lane.id);
    if (!laneNodes.length) continue;
    const depths = depthByConnection(laneNodes, edges);
    const rowsByDepth = new Map<number, UserFlowNode[]>();
    for (const node of laneNodes) {
      const depth = depths.get(node.id) ?? 0;
      rowsByDepth.set(depth, [...(rowsByDepth.get(depth) ?? []), node]);
    }
    for (const depthNodes of rowsByDepth.values()) {
      depthNodes.sort((left, right) => left.positionY - right.positionY || left.title.localeCompare(right.title, "ko"));
    }

    const maxRows = Math.max(1, ...[...rowsByDepth.values()].map((items) => items.length));
    const height = Math.max(250, maxRows * rowStep + 120);
    const centerY = laneY + height / 2;
    for (const [depth, depthNodes] of rowsByDepth) {
      const startY = centerY - ((depthNodes.length - 1) * rowStep) / 2;
      depthNodes.forEach((node, row) => positionedNodes.push({
        ...node,
        depth,
        positionX: 90 + depth * columnStep,
        positionY: startY + row * rowStep,
      }));
    }
    positionedLanes.push({ ...lane, order: laneIndex, positionY: laneY, height });
    laneY += height + laneGap;
  }

  return { nodes: positionedNodes, lanes: positionedLanes };
}
