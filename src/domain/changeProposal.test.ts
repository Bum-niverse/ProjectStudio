import { describe, expect, it, vi } from "vitest";
import { createDevelopmentProposal } from "./changeProposal";
import type { FeatureSpec } from "./feature";

describe("createDevelopmentProposal", () => {
  it("원본을 바꾸지 않고 설명과 오류 복구 기준을 제안한다", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "proposal-criterion" });
    const feature: FeatureSpec = {
      id: "feature-1", title: "문서 저장", description: "문서를 저장한다.", status: "planned",
      priority: "high", role: "사용자", sortOrder: 1, acceptanceCriteria: [],
    };

    const result = createDevelopmentProposal(feature);

    expect(feature.status).toBe("planned");
    expect(feature.acceptanceCriteria).toHaveLength(0);
    expect(result.proposedFeature.status).toBe("ready");
    expect(result.proposedFeature.description).toContain("오류 복구");
    expect(result.proposedFeature.acceptanceCriteria[0]?.description).toContain("다시 시도");
    vi.unstubAllGlobals();
  });
});
