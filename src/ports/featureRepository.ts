import type { FeatureSpec } from "../domain/feature";

export type FeatureViewMode = "tree" | "mindmap";
export interface FeaturePosition { projectId: string; featureId: string; viewMode: FeatureViewMode; positionX: number; positionY: number }
export interface FeatureRepository {
  initialize(projectId: string, sourceDocumentId: string, features: FeatureSpec[]): Promise<FeatureSpec[]>;
  listPositions(projectId: string): Promise<FeaturePosition[]>;
  savePosition(position: FeaturePosition): Promise<void>;
  updateFeature(projectId: string, feature: FeatureSpec): Promise<FeatureSpec>;
  reparentFeature(projectId: string, featureId: string, parentId: string): Promise<FeatureSpec[]>;
  createFeature(projectId: string, feature: FeatureSpec): Promise<FeatureSpec[]>;
  deleteFeature(projectId: string, featureId: string): Promise<FeatureSpec[]>;
}
