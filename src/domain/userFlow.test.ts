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
  it("Globeat은 배송 운영 기능군과 흐름을 만든다",()=>{
    const projectId="globeat-project";const features=createDevelopmentFeatureSpec(projectId,"Globeat");const spec=createUserFlowSpec(projectId,features);
    expect(features.some(feature=>feature.title==="배송지 엑셀/CSV 업로드 및 검증")).toBe(true);
    expect(features.some(feature=>feature.title==="배차 후보 생성 및 확정")).toBe(true);
    expect(features.some(feature=>feature.title==="기사 모바일 배송 링크 발송 및 수행")).toBe(true);
    expect(spec.lanes).toHaveLength(5);
    expect(spec.nodes.length).toBeGreaterThan(50);
  });
});
