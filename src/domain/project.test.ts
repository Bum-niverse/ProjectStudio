import { describe, expect, it } from "vitest";
import { PROJECT_TYPES, projectTypeLabel } from "./project";

describe("project type options", () => {
  it("offers only the four actively used project types", () => {
    expect(PROJECT_TYPES.map(type => type.id)).toEqual([
      "web",
      "mobile",
      "machine_learning",
      "data_analysis",
    ]);
  });

  it("keeps labels for projects saved with retired types", () => {
    expect(projectTypeLabel("desktop")).toContain("이전 유형");
    expect(projectTypeLabel("backend_cli")).toContain("이전 유형");
    expect(projectTypeLabel("general")).toContain("이전 유형");
  });
});
