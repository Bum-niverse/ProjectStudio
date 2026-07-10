import type { ProjectWithPrd } from "../domain/project";

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
}
