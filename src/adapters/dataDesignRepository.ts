import { invoke, isTauri } from "@tauri-apps/api/core";
import { initialDataDesign, normalizeDataDesign, type DataDesignRevision, type DataDesignSnapshot } from "../domain/dataDesign";

interface StoredRevision { id: string; projectId: string; revisionNumber: number; contentJson: string; createdAt: string }
const parse = (value: StoredRevision): DataDesignRevision => ({ id: value.id, projectId: value.projectId, revisionNumber: value.revisionNumber, snapshot: normalizeDataDesign(JSON.parse(value.contentJson) as Partial<DataDesignSnapshot>), createdAt: value.createdAt });
const key = (projectId: string) => `projectstudio:${projectId}:data-design`;

export interface DataDesignRepository { initialize(projectId: string): Promise<DataDesignRevision>; save(projectId: string, current: DataDesignRevision, snapshot: DataDesignSnapshot): Promise<DataDesignRevision> }

class TauriRepository implements DataDesignRepository {
  async initialize(projectId: string) { return parse(await invoke<StoredRevision>("initialize_data_design", { input: { projectId, revisionId: crypto.randomUUID(), contentJson: JSON.stringify(initialDataDesign()), createdAt: new Date().toISOString() } })); }
  async save(projectId: string, current: DataDesignRevision, snapshot: DataDesignSnapshot) { return parse(await invoke<StoredRevision>("save_data_design_revision", { input: { projectId, revisionId: crypto.randomUUID(), expectedRevisionNumber: current.revisionNumber, contentJson: JSON.stringify(snapshot), createdAt: new Date().toISOString() } })); }
}

class BrowserRepository implements DataDesignRepository {
  async initialize(projectId: string) { const stored = localStorage.getItem(key(projectId)); if (stored) { const parsed = JSON.parse(stored) as DataDesignRevision; return { ...parsed, snapshot: normalizeDataDesign(parsed.snapshot) }; } const value = { id: crypto.randomUUID(), projectId, revisionNumber: 1, snapshot: initialDataDesign(), createdAt: new Date().toISOString() }; localStorage.setItem(key(projectId), JSON.stringify(value)); return value; }
  async save(projectId: string, current: DataDesignRevision, snapshot: DataDesignSnapshot) { const value = { id: crypto.randomUUID(), projectId, revisionNumber: current.revisionNumber + 1, snapshot, createdAt: new Date().toISOString() }; localStorage.setItem(key(projectId), JSON.stringify(value)); return value; }
}

export const createDataDesignRepository = (): DataDesignRepository => isTauri() ? new TauriRepository() : new BrowserRepository();
