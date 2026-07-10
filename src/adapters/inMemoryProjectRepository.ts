import type { ProjectWithPrd } from "../domain/project";
import type { ProjectRepository, SaveProjectWithPrdInput } from "../ports/projectRepository";

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, ProjectWithPrd>();

  async saveProjectWithInitialPrd(input: SaveProjectWithPrdInput): Promise<ProjectWithPrd> {
    const result: ProjectWithPrd = {
      project: {
        id: input.projectId,
        name: input.projectName,
        idea: input.idea,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      },
      prd: {
        id: input.revisionId,
        documentId: input.documentId,
        revisionNumber: 1,
        contentMarkdown: input.prdMarkdown,
        source: "development_mode",
        createdAt: input.createdAt,
      },
    };

    this.projects.set(input.projectId, result);
    return result;
  }

  async listProjects(): Promise<ProjectWithPrd[]> {
    return [...this.projects.values()].sort((left, right) =>
      right.project.updatedAt.localeCompare(left.project.updatedAt),
    );
  }
}
