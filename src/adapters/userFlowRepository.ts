import { invoke, isTauri } from "@tauri-apps/api/core";
import type { UserFlowEdge, UserFlowNode } from "../domain/userFlow";
import type { UserFlowRepository } from "../ports/userFlowRepository";

class TauriUserFlowRepository implements UserFlowRepository {
  initialize(projectId: string, nodes: UserFlowNode[], edges: UserFlowEdge[],replaceExisting=false) { return invoke<{nodes:UserFlowNode[];edges:UserFlowEdge[]}>("initialize_user_flow", { input: { projectId, nodes, edges, replaceExisting,createdAt: new Date().toISOString() } }); }
  updateNode(node: UserFlowNode) { return invoke<UserFlowNode>("update_user_flow_node", { input: { node, updatedAt: new Date().toISOString() } }); }
  connect(projectId: string, sourceNodeId: string, targetNodeId: string) { return invoke<UserFlowEdge>("connect_user_flow_nodes", { input: { id: `flow-edge-${crypto.randomUUID()}`, projectId, sourceNodeId, targetNodeId, createdAt: new Date().toISOString() } }); }
  createNode(node:UserFlowNode){return invoke<UserFlowNode>("create_user_flow_node",{input:{node,createdAt:new Date().toISOString()}});}
  deleteNode(projectId:string,nodeId:string){return invoke<void>("delete_user_flow_node",{projectId,nodeId});}
}
class BrowserUserFlowRepository implements UserFlowRepository {
  async initialize(_projectId:string,nodes:UserFlowNode[],edges:UserFlowEdge[]){return {nodes,edges};}
  async updateNode(node:UserFlowNode){return node;}
  async connect(projectId:string,sourceNodeId:string,targetNodeId:string){return {id:`flow-edge-${crypto.randomUUID()}`,projectId,sourceNodeId,targetNodeId};}
  async createNode(node:UserFlowNode){return node;}
  async deleteNode(){return;}
}
export function createUserFlowRepository():UserFlowRepository{return isTauri()?new TauriUserFlowRepository():new BrowserUserFlowRepository();}
