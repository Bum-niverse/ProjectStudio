import type { UserFlowEdge, UserFlowNode } from "../domain/userFlow";
export interface UserFlowRepository {
  initialize(projectId: string, nodes: UserFlowNode[], edges: UserFlowEdge[]): Promise<{ nodes: UserFlowNode[]; edges: UserFlowEdge[] }>;
  updateNode(node: UserFlowNode): Promise<UserFlowNode>;
  connect(projectId: string, sourceNodeId: string, targetNodeId: string): Promise<UserFlowEdge>;
  createNode(node: UserFlowNode): Promise<UserFlowNode>;
  deleteNode(projectId: string, nodeId: string): Promise<void>;
}
