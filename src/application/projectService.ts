import {
  ProjectValidationError,
  type CreateProjectInput,
  type PrdRevision,
  type ProjectValidationErrors,
  type ProjectWithPrd,
} from "../domain/project";
import type { PrdGenerator } from "../ports/prdGenerator";
import type { ProjectRepository } from "../ports/projectRepository";

export interface ProjectServiceDependencies {
  repository: ProjectRepository;
  prdGenerator: PrdGenerator;
  createId?: () => string;
  now?: () => string;
}

export class ProjectService {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(private readonly dependencies: ProjectServiceDependencies) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async createProject(input: CreateProjectInput): Promise<ProjectWithPrd> {
    const name = input.name.trim();
    const idea = input.idea.trim();
    const fields: ProjectValidationErrors = {};

    if (!name) fields.name = "프로젝트 이름을 입력해 주세요.";
    if (!idea) fields.idea = "아이디어를 입력해 주세요.";
    if (input.projectType === "auto") fields.projectType = "새 프로젝트의 유형을 선택해 주세요.";
    if ((input.projectType === "data_analysis" || input.projectType === "machine_learning") && !input.projectSubtype) fields.projectSubtype = "데이터 프로젝트의 세부 유형을 선택해 주세요.";
    if (Object.keys(fields).length > 0) throw new ProjectValidationError(fields);

    const createdAt = this.now();
    const prdMarkdown = await this.dependencies.prdGenerator.generateDraft({
      projectName: name,
      idea,
      projectType: input.projectType,
      projectSubtype: input.projectSubtype,
    });

    return this.dependencies.repository.saveProjectWithInitialPrd({
      projectId: this.createId(),
      projectName: name,
      idea,
      projectType: input.projectType,
      projectSubtype: input.projectSubtype,
      documentId: this.createId(),
      revisionId: this.createId(),
      prdTitle: `${name} PRD`,
      prdMarkdown,
      createdAt,
    });
  }

  listProjects(): Promise<ProjectWithPrd[]> {
    return this.dependencies.repository.listProjects();
  }

  async savePrdRevision(currentRevision: PrdRevision, contentMarkdown: string): Promise<PrdRevision> {
    const normalizedContent = contentMarkdown.trim();
    if (!normalizedContent) throw new Error("PRD 내용은 비워둘 수 없습니다.");

    return this.dependencies.repository.savePrdRevision({
      documentId: currentRevision.documentId,
      revisionId: this.createId(),
      expectedRevisionNumber: currentRevision.revisionNumber,
      contentMarkdown: normalizedContent,
      createdAt: this.now(),
    });
  }
}
