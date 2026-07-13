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
    expect(spec.edges.length).toBeGreaterThanOrEqual(spec.nodes.length-spec.lanes.length);
  });
  it("Globeat은 장소 기반 음악 기능군과 흐름을 만든다",()=>{
    const projectId="globeat-project";const features=createDevelopmentFeatureSpec(projectId,"Globeat");const spec=createUserFlowSpec(projectId,features);
    expect(features.some(feature=>feature.title==="3D 지구본 홈")).toBe(true);
    expect(features.some(feature=>feature.title==="외부 플레이리스트 링크 가져오기")).toBe(true);
    expect(features.some(feature=>feature.title==="플레이리스트 발견 및 외부 재생")).toBe(true);
    expect(features.some(feature=>feature.title==="여행 동선과 음악 추억")).toBe(true);
    expect(spec.lanes).toHaveLength(7);
    expect(spec.nodes.length).toBeGreaterThan(40);
    expect(new Set(spec.lanes.map(lane=>lane.colorKey)).size).toBe(6);
    expect(spec.nodes.some(node=>node.title==="플레이리스트 발행"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="클릭 좌표 주변 장소 확인"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="재생목록 URL 붙여넣기·곡 검토"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="외부 앱에서 듣기"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Google OAuth 로그인"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Meta 계정 인증"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="일반 이메일 회원가입"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="세션·프로필 확정"&&node.kind==="action")).toBe(true);
    const authAction=spec.nodes.find(node=>node.title==="로그인 정보 제출");
    const authTargets=spec.edges.filter(edge=>edge.sourceNodeId===authAction?.id).map(edge=>spec.nodes.find(node=>node.id===edge.targetNodeId)?.title);
    expect(authTargets).toEqual(expect.arrayContaining(["Google OAuth 로그인","Instagram/Meta 계정 로그인","일반 이메일 회원가입","이메일 비밀번호 로그인"]));
    const callback=spec.nodes.find(node=>node.title==="인증 콜백·프로필 자동 생성");
    const callbackSources=spec.edges.filter(edge=>edge.targetNodeId===callback?.id);
    expect(callbackSources).toHaveLength(4);
    const secondLaneRoot=`flow-${projectId}-explore`;expect(spec.edges.some(edge=>edge.targetNodeId===secondLaneRoot)).toBe(false);
  });
  it("제품 이름과 무관하게 복수 하위 경로를 분기하고 공통 단계에서 합류한다",()=>{
    const projectId="generic-branch";const features=createDevelopmentFeatureSpec(projectId,"Globeat").map(feature=>{
      const titles:Record<string,string>={[`${projectId}-auth`]:"접속 방식 선택",[`${projectId}-auth-google`]:"경로 A",[`${projectId}-auth-meta`]:"경로 B",[`${projectId}-auth-email-signup`]:"경로 C",[`${projectId}-auth-email-login`]:"경로 D",[`${projectId}-auth-callback-profile`]:"공통 처리 완료"};
      return titles[feature.id]?{...feature,title:titles[feature.id]}:feature;
    });const spec=createUserFlowSpec(projectId,features);const choiceActionId=`flow-${projectId}-auth-interaction`;const targets=spec.edges.filter(edge=>edge.sourceNodeId===choiceActionId).map(edge=>spec.nodes.find(node=>node.id===edge.targetNodeId)?.title);
    expect(targets).toEqual(expect.arrayContaining(["경로 A","경로 B","경로 C","경로 D"]));const common=spec.nodes.find(node=>node.title==="공통 처리 완료");expect(spec.edges.filter(edge=>edge.targetNodeId===common?.id)).toHaveLength(4);
  });
});
