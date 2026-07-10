import type { PrdRevision, ProjectWithPrd } from "../domain/project";
import type { ProjectRepository, SavePrdRevisionInput, SaveProjectWithPrdInput } from "../ports/projectRepository";

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

  async savePrdRevision(input: SavePrdRevisionInput): Promise<PrdRevision> {
    const entry = [...this.projects.entries()].find(
      ([, value]) => value.prd.documentId === input.documentId,
    );
    if (!entry) throw new Error("PRD 문서를 찾을 수 없습니다.");

    const [projectId, current] = entry;
    if (current.prd.revisionNumber !== input.expectedRevisionNumber) {
      throw new Error("PRD가 다른 리비전으로 변경됐습니다.");
    }

    const revision: PrdRevision = {
      id: input.revisionId,
      documentId: input.documentId,
      revisionNumber: input.expectedRevisionNumber + 1,
      contentMarkdown: input.contentMarkdown,
      source: "user",
      createdAt: input.createdAt,
    };
    this.projects.set(projectId, { ...current, prd: revision });
    return revision;
  }
}
