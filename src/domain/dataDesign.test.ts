import { describe, expect, it } from "vitest";
import { createDataDesignProposal, createExecutionTasks, emptyDataset, initialDataDesign, reviewDataDesign } from "./dataDesign";

describe("data design review", () => {
  it("warns about many-to-many joins and missing contracts", () => {
    const left = emptyDataset(); const right = emptyDataset(); right.id = "right";
    const warnings = reviewDataDesign({ datasets: [left, right], qualityPlan: [], executionTasks: [], proposals: [], relationships: [{ id: "r", sourceDatasetId: left.id, targetDatasetId: right.id, joinKeys: "", joinType: "left", cardinality: "N:N", preserveSourceRows: true, duplicateRisk: "", unmatchedPolicy: "", temporalAlignment: "", spatialMapping: "", unitConversion: "" }] });
    expect(warnings.some(item => item.includes("N:N"))).toBe(true);
    expect(warnings.some(item => item.includes("조인 키"))).toBe(true);
  });
  it("creates subtype-aware tasks and keeps proposals pending", () => {
    const snapshot = initialDataDesign(); snapshot.datasets.push(emptyDataset());
    const tasks = createExecutionTasks("machine_learning", "time_series_forecasting", snapshot);
    expect(tasks.some(task => task.title.includes("시간 기준"))).toBe(true);
    expect(tasks.some(task => task.title.includes("기준 모델"))).toBe(true);
    const proposal = createDataDesignProposal(snapshot);
    expect(proposal.status).toBe("pending");
    expect(proposal.assumptions.length).toBeGreaterThan(0);
  });
});
