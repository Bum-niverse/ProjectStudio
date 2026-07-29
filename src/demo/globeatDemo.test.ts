import { describe, expect, it } from "vitest";
import fixture from "./globeat-demo.json";

describe("public Globeat demo fixture", () => {
  it("contains the complete reviewable planning workspace", () => {
    expect(fixture.projectWithPrd.project.name).toBe("Globeat");
    expect(fixture.features).toHaveLength(151);
    expect(fixture.userFlow.nodes).toHaveLength(110);
    expect(fixture.userFlow.edges).toHaveLength(97);
    expect(fixture.systemDesign.revision.snapshot.nodes).toHaveLength(13);
  });

  it("does not expose local paths or credential values", () => {
    const serialized = JSON.stringify(fixture);
    expect(serialized).not.toMatch(/[A-Za-z]:\\Users\\/u);
    expect(serialized).not.toMatch(/\/Users\//u);
    expect(serialized).not.toMatch(/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u);
    expect(serialized).not.toMatch(/(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"']+/iu);
  });
});
