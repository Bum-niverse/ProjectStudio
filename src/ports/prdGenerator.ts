export interface PrdDraftInput {
  projectName: string;
  idea: string;
  projectType: import("../domain/project").ProjectType;
  projectSubtype?: import("../domain/project").ProjectSubtype;
}

export interface PrdGenerator {
  readonly mode: "development" | "external";
  generateDraft(input: PrdDraftInput): Promise<string>;
}
