import type { FeatureSpec } from "./feature";

export type UserFlowNodeKind = "phase" | "screen" | "action" | "result" | "decision";
export interface UserFlowNode { id: string; projectId: string; laneId: string; title: string; description: string; kind: UserFlowNodeKind; positionX: number; positionY: number; }
export interface UserFlowEdge { id: string; projectId: string; sourceNodeId: string; targetNodeId: string; }
export interface UserFlowLane { id: string; title: string; positionY: number; height: number; }
export interface UserFlowSpec { nodes: UserFlowNode[]; edges: UserFlowEdge[]; lanes: UserFlowLane[]; }

export function createUserFlowSpec(projectId: string, features: FeatureSpec[]): UserFlowSpec {
  const root = features.find((feature) => !feature.parentId);
  const requirements = features.filter((feature) => feature.parentId === root?.id);
  const nodes: UserFlowNode[] = []; const edges: UserFlowEdge[] = [];
  const lanes = requirements.map((requirement, laneIndex) => ({ id: requirement.id, title: requirement.title, positionY: laneIndex * 230, height: 230 }));
  requirements.forEach((requirement, laneIndex) => {
    const laneY = laneIndex * 230;
    const children = features.filter((feature) => feature.parentId === requirement.id);
    const phaseId = `flow-${requirement.id}`;
    nodes.push({ id: phaseId, projectId, laneId: requirement.id, title: requirement.title, description: requirement.description, kind: "phase", positionX: 120, positionY: laneY + 88 });
    let previousId = phaseId; let column = 1;
    children.forEach((child, childIndex) => {
      const childId = `flow-${child.id}`; const childX = 120 + column * 250;
      nodes.push({ id: childId, projectId, laneId: requirement.id, title: child.title, description: child.description, kind: childIndex % 3 === 2 ? "decision" : "screen", positionX: childX, positionY: laneY + 72 });
      edges.push({ id: `edge-${previousId}-${childId}`, projectId, sourceNodeId: previousId, targetNodeId: childId }); previousId = childId; column += 1;
      const details = features.filter((feature) => feature.parentId === child.id);
      details.forEach((detail, detailIndex) => {
        const detailId = `flow-${detail.id}`;
        nodes.push({ id: detailId, projectId, laneId: requirement.id, title: detail.title.replace(child.title, "").trim() || detail.title, description: detail.description, kind: detailIndex === details.length - 1 ? "result" : "action", positionX: childX + 210, positionY: laneY + 24 + detailIndex * 58 });
        edges.push({ id: `edge-${childId}-${detailId}`, projectId, sourceNodeId: childId, targetNodeId: detailId });
      });
      column += details.length > 0 ? 1 : 0;
    });
  });
  return { nodes, edges, lanes };
}
