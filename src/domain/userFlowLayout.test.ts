import { describe, expect, it } from "vitest";
import type { UserFlowEdge, UserFlowLane, UserFlowNode } from "./userFlow";
import { layoutUserFlow } from "./userFlowLayout";

const lane: UserFlowLane = { id: "lane", title: "사용 흐름", order: 0, positionY: 0, height: 250 };
const node = (id: string, title: string, positionX: number, positionY: number): UserFlowNode => ({
  id,
  projectId: "project",
  laneId: lane.id,
  title,
  description: "",
  kind: id === "start" ? "phase" : "screen",
  positionX,
  positionY,
});
const edge = (sourceNodeId: string, targetNodeId: string): UserFlowEdge => ({
  id: `${sourceNodeId}-${targetNodeId}`,
  projectId: "project",
  sourceNodeId,
  targetNodeId,
});

describe("layoutUserFlow", () => {
  it("기본 생성 ID가 아닌 저장 노드도 연결 순서대로 겹치지 않게 정렬한다", () => {
    const nodes = [node("start", "시작", 90, 120), node("custom-screen", "사용자 화면", 130, 120), node("custom-result", "결과", 160, 120)];
    const edges = [edge("start", "custom-screen"), edge("custom-screen", "custom-result")];
    const result = layoutUserFlow(nodes, edges, [lane]);
    const positions = new Map(result.nodes.map((item) => [item.id, item.positionX]));

    expect(positions.get("custom-screen")! - positions.get("start")!).toBe(320);
    expect(positions.get("custom-result")! - positions.get("custom-screen")!).toBe(320);
  });

  it("같은 열의 분기 노드와 완료 배지가 세로로 겹치지 않을 간격을 둔다", () => {
    const nodes = [node("start", "시작", 90, 120), node("choice-a", "선택 A", 130, 120), node("choice-b", "선택 B", 130, 125)];
    const edges = [edge("start", "choice-a"), edge("start", "choice-b")];
    const result = layoutUserFlow(nodes, edges, [lane]);
    const branches = result.nodes.filter((item) => item.id.startsWith("choice-")).sort((left, right) => left.positionY - right.positionY);

    expect(branches[1].positionY - branches[0].positionY).toBe(112);
    expect(result.lanes[0].height).toBeGreaterThanOrEqual(344);
  });

  it("좁은 정렬도 현재 노드 관계를 유지하면서 최소 열 간격을 보장한다", () => {
    const nodes = [node("start", "시작", 90, 120), node("custom-screen", "사용자 화면", 100, 120)];
    const result = layoutUserFlow(nodes, [edge("start", "custom-screen")], [lane], { compact: true });

    expect(result.nodes.find((item) => item.id === "custom-screen")!.positionX - result.nodes.find((item) => item.id === "start")!.positionX).toBe(250);
  });
});
