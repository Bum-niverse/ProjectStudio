import { describe, expect, it } from "vitest";
import { emptyDataset, reviewDataDesign } from "./dataDesign";

describe("data design review", () => {
  it("warns about many-to-many joins and missing contracts", () => {
    const left = emptyDataset(); const right = emptyDataset(); right.id = "right";
    const warnings = reviewDataDesign({ datasets: [left, right], qualityPlan: [], relationships: [{ id: "r", sourceDatasetId: left.id, targetDatasetId: right.id, joinKeys: "", joinType: "left", cardinality: "N:N", preserveSourceRows: true, duplicateRisk: "", unmatchedPolicy: "", temporalAlignment: "", spatialMapping: "", unitConversion: "" }] });
    expect(warnings.some(item => item.includes("N:N"))).toBe(true);
    expect(warnings.some(item => item.includes("조인 키"))).toBe(true);
  });
});
