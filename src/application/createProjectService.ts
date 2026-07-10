import { isTauri } from "@tauri-apps/api/core";
import { DevelopmentPrdGenerator } from "../adapters/developmentPrdGenerator";
import { InMemoryProjectRepository } from "../adapters/inMemoryProjectRepository";
import { TauriProjectRepository } from "../adapters/tauriProjectRepository";
import type { ProjectRepository } from "../ports/projectRepository";
import { ProjectService } from "./projectService";

export function createProjectService(): ProjectService {
  const repository: ProjectRepository = isTauri()
    ? new TauriProjectRepository()
    : new InMemoryProjectRepository();

  return new ProjectService({
    repository,
    prdGenerator: new DevelopmentPrdGenerator(),
  });
}
