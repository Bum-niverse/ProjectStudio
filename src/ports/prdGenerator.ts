export interface PrdDraftInput {
  projectName: string;
  idea: string;
  projectType: import("../domain/project").ProjectType;
}

export interface PrdGenerator {
  readonly mode: "development" | "external";
  generateDraft(input: PrdDraftInput): Promise<string>;
}
