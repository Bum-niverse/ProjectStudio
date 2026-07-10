import { describe, expect, it } from "vitest";
import { createDevelopmentFeatureSpec } from "./feature";
import { createUserFlowSpec } from "./userFlow";

describe("createUserFlowSpec",()=>{
  it("요구사항별 스윔레인과 다단계 노드를 만든다",()=>{
    const projectId="project-flow";const spec=createUserFlowSpec(projectId,createDevelopmentFeatureSpec(projectId));
    expect(spec.lanes).toHaveLength(2);
    expect(spec.nodes.length).toBeGreaterThan(30);
    expect(spec.nodes.some(node=>node.kind==="phase")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="decision")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="result")).toBe(true);
    expect(spec.edges.length).toBeGreaterThan(30);
  });
  it("Globeat은 장소 기반 음악 기능군과 흐름을 만든다",()=>{
    const projectId="globeat-project";const features=createDevelopmentFeatureSpec(projectId,"Globeat");const spec=createUserFlowSpec(projectId,features);
    expect(features.some(feature=>feature.title==="3D 지구본 홈")).toBe(true);
    expect(features.some(feature=>feature.title==="곡과 Spotify·YouTube 링크 추가")).toBe(true);
    expect(features.some(feature=>feature.title==="플레이리스트 발견 및 외부 재생")).toBe(true);
    expect(spec.lanes).toHaveLength(6);
    expect(spec.nodes.length).toBeGreaterThan(50);
    const secondLaneRoot=`flow-${projectId}-explore`;
    expect(spec.edges.some(edge=>edge.targetNodeId===secondLaneRoot)).toBe(true);
  });
});
