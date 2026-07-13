import { describe, expect, it } from "vitest";
import { createDataDesignProposal, createExecutionTasks, createInitialDataDesign, emptyDataset, initialDataDesign, reviewDataDesign } from "./dataDesign";

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
  it("creates a leakage-aware stock movement data contract without claiming a provider", () => {
    const snapshot = createInitialDataDesign("machine_learning", "time_series_forecasting", "주가 방향 예측기", "OHLCV로 다음 거래일 상승과 하락을 분류한다.");
    expect(snapshot.datasets).toHaveLength(2);
    expect(snapshot.datasets[0].source).toContain("확인 필요");
    expect(snapshot.datasets.flatMap(dataset => dataset.variables).some(item => item.role === "target" && item.availableAt.includes("다음 거래일"))).toBe(true);
    expect(snapshot.relationships[0].temporalAlignment).toContain("과거");
  });
  it("warns when the data contract is empty", () => {
    expect(reviewDataDesign(initialDataDesign())).toContain("데이터셋 계약이 없습니다. 출처·키·변수와 타깃을 먼저 정의해야 합니다.");
  });
});
