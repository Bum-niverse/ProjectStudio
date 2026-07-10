import type { PrdRevision, ProjectWithPrd } from "../domain/project";

export interface SaveProjectWithPrdInput {
  projectId: string;
  projectName: string;
  idea: string;
  documentId: string;
  revisionId: string;
  prdTitle: string;
  prdMarkdown: string;
  createdAt: string;
}

export interface ProjectRepository {
  saveProjectWithInitialPrd(input: SaveProjectWithPrdInput): Promise<ProjectWithPrd>;
  listProjects(): Promise<ProjectWithPrd[]>;
  savePrdRevision(input: SavePrdRevisionInput): Promise<PrdRevision>;
}

export interface SavePrdRevisionInput {
  documentId: string;
  revisionId: string;
  expectedRevisionNumber: number;
  contentMarkdown: string;
  createdAt: string;
}
