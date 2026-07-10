import { invoke, isTauri } from "@tauri-apps/api/core";
import type { FeatureSpec } from "../domain/feature";
import type { FeaturePosition, FeatureRepository } from "../ports/featureRepository";

class TauriFeatureRepository implements FeatureRepository {
  initialize(projectId: string, sourceDocumentId: string, features: FeatureSpec[]) {
    return invoke<FeatureSpec[]>("initialize_feature_spec", { input: { projectId, sourceDocumentId, features, createdAt: new Date().toISOString() } });
  }
  async listPositions(projectId: string) { return (await invoke<Omit<FeaturePosition, "projectId">[]>("list_feature_positions", { projectId })).map((position) => ({ ...position, projectId })); }
  savePosition(position: FeaturePosition) {
    return invoke<void>("save_feature_position", { input: { ...position, updatedAt: new Date().toISOString() } });
  }
  updateFeature(projectId: string, feature: FeatureSpec) {
    return invoke<FeatureSpec>("update_feature", { input: { projectId, feature, updatedAt: new Date().toISOString() } });
  }
  reparentFeature(projectId: string, featureId: string, parentId: string) {
    return invoke<FeatureSpec[]>("reparent_feature", { input: { projectId, featureId, parentId, updatedAt: new Date().toISOString() } });
  }
  disconnectFeature(projectId:string,featureId:string){return invoke<FeatureSpec[]>("disconnect_feature",{input:{projectId,featureId,updatedAt:new Date().toISOString()}});}
  createFeature(projectId: string, feature: FeatureSpec) { return invoke<FeatureSpec[]>("create_feature", { input: { projectId, feature, createdAt: new Date().toISOString() } }); }
  deleteFeature(projectId: string, featureId: string) { return invoke<FeatureSpec[]>("delete_feature", { projectId, featureId }); }
}

class BrowserFeatureRepository implements FeatureRepository {
  async initialize(_projectId: string, _sourceDocumentId: string, features: FeatureSpec[]) { return features; }
  async listPositions(projectId: string) { return JSON.parse(localStorage.getItem(`projectstudio:${projectId}:feature-positions`) ?? "[]") as FeaturePosition[]; }
  async savePosition(position: FeaturePosition) {
    const key = `projectstudio:${position.projectId}:feature-positions`;
    const current = JSON.parse(localStorage.getItem(key) ?? "[]") as FeaturePosition[];
    localStorage.setItem(key, JSON.stringify([...current.filter((item) => item.featureId !== position.featureId || item.viewMode !== position.viewMode), position]));
  }
  async updateFeature(_projectId: string, feature: FeatureSpec) { return feature; }
  async reparentFeature(_projectId: string, featureId: string, parentId: string) { return Promise.resolve([]).then(() => { throw new Error(`브라우저 미리보기에서는 ${featureId} → ${parentId} 관계를 저장할 수 없습니다.`); }); }
  async disconnectFeature(_projectId:string,featureId:string){return Promise.resolve([]).then(()=>{throw new Error(`브라우저 미리보기에서는 ${featureId} 연결을 삭제할 수 없습니다.`);});}
  async createFeature(_projectId: string, feature: FeatureSpec) { return [feature]; }
  async deleteFeature() { return []; }
}

export function createFeatureRepository(): FeatureRepository {
  return isTauri() ? new TauriFeatureRepository() : new BrowserFeatureRepository();
}
