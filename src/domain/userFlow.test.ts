import { describe, expect, it } from "vitest";
import { createDevelopmentFeatureSpec } from "./feature";
import { createUserFlowSpec } from "./userFlow";

describe("createUserFlowSpec",()=>{
  it("요구사항별 스윔레인과 다단계 노드를 만든다",()=>{
    const projectId="project-flow";const spec=createUserFlowSpec(projectId,createDevelopmentFeatureSpec(projectId));
    expect(spec.lanes).toHaveLength(2);
    expect(spec.nodes.length).toBeGreaterThan(20);
    expect(spec.nodes.some(node=>node.kind==="phase")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="decision")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="result")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="action"&&node.title.endsWith("실행"))).toBe(true);
    expect(spec.nodes.every(node=>!node.title.includes("오류 복구")&&!node.title.includes("저장·변경 이력"))).toBe(true);
    expect(spec.edges.length).toBe(spec.nodes.length-spec.lanes.length);
  });
  it("Globeat은 장소 기반 음악 기능군과 흐름을 만든다",()=>{
    const projectId="globeat-project";const features=createDevelopmentFeatureSpec(projectId,"Globeat");const spec=createUserFlowSpec(projectId,features);
    expect(features.some(feature=>feature.title==="3D 지구본 홈")).toBe(true);
    expect(features.some(feature=>feature.title==="곡과 Spotify·YouTube 링크 추가")).toBe(true);
    expect(features.some(feature=>feature.title==="플레이리스트 발견 및 외부 재생")).toBe(true);
    expect(spec.lanes).toHaveLength(6);
    expect(spec.nodes.length).toBeGreaterThan(40);
    expect(new Set(spec.lanes.map(lane=>lane.colorKey)).size).toBe(6);
    expect(spec.nodes.some(node=>node.title==="플레이리스트 발행"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="클릭 좌표 주변 장소 확인"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="외부 앱에서 듣기"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Google OAuth 로그인"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Meta 계정 인증"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="일반 이메일 회원가입"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="세션·프로필 확정"&&node.kind==="action")).toBe(true);
    const secondLaneRoot=`flow-${projectId}-explore`;expect(spec.edges.some(edge=>edge.targetNodeId===secondLaneRoot)).toBe(false);
  });
});
