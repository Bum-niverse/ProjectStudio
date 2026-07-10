export interface Project {
  id: string;
  name: string;
  idea: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrdRevision {
  id: string;
  documentId: string;
  revisionNumber: number;
  contentMarkdown: string;
  source: "user" | "development_mode" | "ai";
  createdAt: string;
}

export interface ProjectWithPrd {
  project: Project;
  prd: PrdRevision;
}

export interface CreateProjectInput {
  name: string;
  idea: string;
}

export interface ProjectValidationErrors {
  name?: string;
  idea?: string;
}

export class ProjectValidationError extends Error {
  readonly fields: ProjectValidationErrors;

  constructor(fields: ProjectValidationErrors) {
    super("프로젝트 입력을 확인해 주세요.");
    this.name = "ProjectValidationError";
    this.fields = fields;
  }
}
