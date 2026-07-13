import { describe, expect, it } from "vitest";
import { workflowStages } from "./projectWorkflow";

describe("project workflow stages", () => {
  it("keeps the web workflow unchanged", () => {
    expect(workflowStages("web").map(stage => stage.label)).toEqual(["프로젝트", "PRD", "기능명세", "유저플로우", "시스템 설계", "내보내기"]);
  });

  it("uses analysis-specific stage names", () => {
    expect(workflowStages("data_analysis").map(stage => stage.label)).toEqual(["프로젝트 정의", "문제·목표 정의", "데이터 설계", "분석 설계", "데이터 시스템 설계", "실행 계획·내보내기"]);
  });

  it("uses machine-learning-specific stage names", () => {
    expect(workflowStages("machine_learning").map(stage => stage.label)).toEqual(["프로젝트 정의", "문제·목표 정의", "데이터·타깃 설계", "실험 설계", "ML 파이프라인 설계", "실행 계획·내보내기"]);
  });
});
