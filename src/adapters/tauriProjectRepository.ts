import { invoke } from "@tauri-apps/api/core";
import type { PrdRevision, ProjectWithPrd } from "../domain/project";
import type { ProjectRepository, SavePrdRevisionInput, SaveProjectWithPrdInput } from "../ports/projectRepository";

export class TauriProjectRepository implements ProjectRepository {
  saveProjectWithInitialPrd(input: SaveProjectWithPrdInput): Promise<ProjectWithPrd> {
    return invoke<ProjectWithPrd>("save_project_with_initial_prd", { input });
  }

  listProjects(): Promise<ProjectWithPrd[]> {
    return invoke<ProjectWithPrd[]>("list_projects");
  }

  savePrdRevision(input: SavePrdRevisionInput): Promise<PrdRevision> {
    return invoke<PrdRevision>("save_prd_revision", { input });
  }
}
