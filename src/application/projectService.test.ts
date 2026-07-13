import { describe, expect, it } from "vitest";
import { DevelopmentPrdGenerator } from "../adapters/developmentPrdGenerator";
import { InMemoryProjectRepository } from "../adapters/inMemoryProjectRepository";
import { ProjectValidationError } from "../domain/project";
import { ProjectService } from "./projectService";

function createService(repository = new InMemoryProjectRepository()) {
  const ids = ["project-1", "document-1", "revision-1"];
  return {
    repository,
    service: new ProjectService({
      repository,
      prdGenerator: new DevelopmentPrdGenerator(),
      createId: () => ids.shift() ?? "unexpected-id",
      now: () => "2026-07-10T00:00:00.000Z",
    }),
  };
}

describe("ProjectService", () => {
  it("프로젝트와 개발 모드 PRD를 저장하고 다시 조회한다", async () => {
    const { repository, service } = createService();

    const created = await service.createProject({
      name: " Globeat ",
      idea: " 음악으로 도시를 탐색한다. ",
      projectType: "web",
    });
    const reopened = await repository.listProjects();

    expect(created.project).toMatchObject({
      id: "project-1",
      name: "Globeat",
      idea: "음악으로 도시를 탐색한다.",
      projectType: "web",
    });
    expect(created.prd.contentMarkdown).toContain("# Globeat PRD");
    expect(created.prd.source).toBe("development_mode");
    expect(reopened).toEqual([created]);
  });

  it("빈 이름과 아이디어를 필드 오류로 거절한다", async () => {
    const { service } = createService();

    await expect(service.createProject({ name: " ", idea: "", projectType: "auto" })).rejects.toMatchObject({
      name: "ProjectValidationError",
      fields: {
        name: "프로젝트 이름을 입력해 주세요.",
        idea: "아이디어를 입력해 주세요.",
      },
    } satisfies Partial<ProjectValidationError>);
  });

  it("편집한 PRD를 새 사용자 리비전으로 저장한다", async () => {
    const { service } = createService();
    const created = await service.createProject({ name: "Globeat", idea: "도시 음악 탐색", projectType: "web" });

    const revision = await service.savePrdRevision(created.prd, "  # 수정한 PRD  ");

    expect(revision).toMatchObject({
      revisionNumber: 2,
      contentMarkdown: "# 수정한 PRD",
      source: "user",
    });
  });
});
