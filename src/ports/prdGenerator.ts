export interface PrdDraftInput {
  projectName: string;
  idea: string;
}

export interface PrdGenerator {
  readonly mode: "development" | "external";
  generateDraft(input: PrdDraftInput): Promise<string>;
}
