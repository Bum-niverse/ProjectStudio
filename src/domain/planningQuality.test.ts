import { describe, expect, it } from "vitest";
import type { PlanningArtifacts } from "./planningQuality";
import { inspectPlanningQuality } from "./planningQuality";

const createArtifacts = (prdMarkdown: string): PlanningArtifacts => ({
  prdMarkdown,
  features: [
    { id: "root", title: "제품", status: "planned", priority: "critical", role: "소유자", description: "제품", sortOrder: 0, acceptanceCriteria: [] },
    { id: "feature", parentId: "root", title: "결과 화면", status: "planned", priority: "critical", role: "사용자", description: "로딩·빈 상태·오류를 표시하고 로그인 권한을 확인한다.", sortOrder: 1, acceptanceCriteria: [{ id: "ac", description: "결과를 확인한다.", isMet: false, sortOrder: 0 }] },
  ],
  userFlow: {
    nodes: [
      { id: "start", projectId: "p", laneId: "feature", title: "시작", description: "", kind: "screen", positionX: 0, positionY: 0 },
      { id: "action", projectId: "p", laneId: "feature", title: "조회", description: "", kind: "action", positionX: 1, positionY: 0 },
      { id: "result", projectId: "p", laneId: "feature", title: "완료", description: "", kind: "result", positionX: 2, positionY: 0 },
    ],
    edges: [
      { id: "e1", projectId: "p", sourceNodeId: "start", targetNodeId: "action" },
      { id: "e2", projectId: "p", sourceNodeId: "action", targetNodeId: "result" },
    ],
  },
  systemDesign: {
    schemaVersion: 1,
    title: "설계",
    summary: "웹 서비스",
    nodes: [
      { id: "client", name: "Client", type: "client", description: "화면", technology: "React", deployment: "WebView", status: "active", linkedFeatureIds: ["feature"], linkedUserFlowIds: ["start"], linkedWireframeIds: [], codePaths: [], testPaths: [], configuration: "", position: { x: 0, y: 0 }, size: { width: 200, height: 100 } },
      { id: "api", name: "API", type: "service", description: "요청", technology: "Rust", deployment: "Local", status: "active", linkedFeatureIds: [], linkedUserFlowIds: [], linkedWireframeIds: [], codePaths: [], testPaths: [], configuration: "", position: { x: 1, y: 0 }, size: { width: 200, height: 100 } },
      { id: "db", name: "DB", type: "database", description: "저장", technology: "SQLite", deployment: "Local", status: "active", linkedFeatureIds: [], linkedUserFlowIds: [], linkedWireframeIds: [], codePaths: [], testPaths: [], configuration: "", position: { x: 2, y: 0 }, size: { width: 200, height: 100 } },
    ],
    edges: [
      { id: "a", source: "client", target: "api", type: "ipc", protocol: "IPC", dataFormat: "JSON", isAsync: false, authentication: "local", errorHandling: "retry", description: "요청" },
      { id: "b", source: "api", target: "db", type: "database_query", protocol: "SQL", dataFormat: "rows", isAsync: false, authentication: "local", errorHandling: "rollback", description: "저장" },
    ],
  },
});

describe("planning quality", () => {
  it("웹·앱 산출물의 내부 처리 유저플로우를 차단한다", () => {
    const artifacts = createArtifacts("웹 앱 사용자가 로그인한다.");
    artifacts.userFlow.nodes[1].title = "데이터베이스 저장";
    const report = inspectPlanningQuality(artifacts);
    expect(report.projectType).toBe("web");
    expect(report.gate).toBe("blocked");
    expect(report.findings.map(item => item.id)).toContain("flow-internals");
  });

  it("머신러닝 프로젝트의 누수·분할·평가·재현성 누락을 찾는다", () => {
    const report = inspectPlanningQuality(createArtifacts("주가 상승 하락을 예측하는 머신러닝 모델"));
    expect(report.projectType).toBe("machine_learning");
    expect(report.findings.map(item => item.id)).toEqual(expect.arrayContaining(["ml-source", "ml-split", "ml-leakage", "ml-evaluation", "ml-reproducibility"]));
  });

  it("데이터 분석 프로젝트의 스키마·병합·무결성·계보를 검사한다", () => {
    const report = inspectPlanningQuality(createArtifacts("여러 CSV를 결합해 매출 데이터 분석 대시보드를 만든다."));
    expect(report.projectType).toBe("data_analysis");
    expect(report.findings.map(item => item.id)).toEqual(expect.arrayContaining(["data-source", "data-schema", "data-join", "data-integrity", "data-lineage"]));
  });
});
