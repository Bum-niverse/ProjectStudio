import { describe, expect, it } from "vitest";
import { createDevelopmentFeatureSpec } from "./feature";
import { createExecutionPipelineSpec, createUserFlowSpec } from "./userFlow";

describe("createUserFlowSpec",()=>{
  it("새 데이터 프로젝트는 ProjectStudio 기능이 아닌 아이디어 기반 흐름을 만든다",()=>{
    const projectId="stock-project";const features=createDevelopmentFeatureSpec(projectId,"주가 방향 예측기","과거 주가 데이터와 이동평균으로 다음 거래일 상승·하락을 분류하고 백테스트한다.");
    expect(features.some(feature=>feature.title==="데이터 수집과 품질 관리")).toBe(true);
    expect(features.some(feature=>feature.title==="시간 순서 검증과 백테스트")).toBe(true);
    expect(features.some(feature=>feature.title==="PRD 생성·편집")).toBe(false);
    const spec=createExecutionPipelineSpec(projectId,features,"machine_learning");
    expect(spec.lanes.map(lane=>lane.title)).toEqual(expect.arrayContaining(["데이터 준비","분할·누수","모델링·평가","해석·전달"]));
    expect(spec.nodes.some(node=>node.title.includes("기준 모델"))).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="screen")).toBe(false);
    expect(spec.nodes.some(node=>node.kind==="phase")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="result")).toBe(true);
  });
  it("시계열과 통계 프로젝트에 특화 단계를 적용한다",()=>{
    const ml=createExecutionPipelineSpec("ml",[],"machine_learning","time_series_forecasting");
    const analysis=createExecutionPipelineSpec("da",[],"data_analysis","statistical");
    expect(ml.nodes.some(node=>node.title.includes("rolling"))).toBe(true);
    expect(ml.nodes.some(node=>node.title.includes("MASE"))).toBe(true);
    expect(analysis.nodes.some(node=>node.title.includes("효과 크기"))).toBe(true);
  });
  it("요구사항별 스윔레인과 다단계 노드를 만든다",()=>{
    const projectId="project-flow";const spec=createUserFlowSpec(projectId,createDevelopmentFeatureSpec(projectId));
    expect(spec.lanes).toHaveLength(3);
    expect(spec.nodes.length).toBeGreaterThanOrEqual(12);
    expect(spec.nodes.some(node=>node.kind==="phase")).toBe(true);
    expect(spec.edges.length).toBeGreaterThan(spec.lanes.length);
    expect(spec.nodes.some(node=>node.kind==="result")).toBe(true);
    expect(spec.nodes.some(node=>node.kind==="action"&&/선택|입력|제출|저장/.test(node.title))).toBe(true);
    expect(spec.nodes.every(node=>!node.title.includes("저장·변경 이력"))).toBe(true);
    expect(spec.nodes.every(node=>!/RLS|데이터베이스|캐시 갱신|토큰 저장/.test(node.title))).toBe(true);
    for(const decision of spec.nodes.filter(node=>node.kind==="decision"))expect(spec.edges.filter(edge=>edge.sourceNodeId===decision.id).length).toBeGreaterThanOrEqual(2);
    expect(spec.nodes.every(node=>node.title!=="문제 확인 후 다시 시도")).toBe(true);
    expect(spec.edges.length).toBeGreaterThanOrEqual(spec.nodes.length-spec.lanes.length);
  });
  it("Globeat은 장소 기반 음악 기능군과 흐름을 만든다",()=>{
    const projectId="globeat-project";const features=createDevelopmentFeatureSpec(projectId,"Globeat");const spec=createUserFlowSpec(projectId,features);
    expect(features.some(feature=>feature.title==="3D 지구본 홈")).toBe(true);
    expect(features.some(feature=>feature.title==="외부 플레이리스트 링크 가져오기")).toBe(true);
    expect(features.some(feature=>feature.title==="플레이리스트 발견 및 외부 재생")).toBe(true);
    expect(features.some(feature=>feature.title==="여행 동선과 음악 추억")).toBe(true);
    expect(spec.lanes).toHaveLength(6);
    expect(spec.lanes.some(lane=>/광고|코인|정책|신고/.test(lane.title))).toBe(false);
    expect(spec.nodes.length).toBeGreaterThan(40);
    expect(new Set(spec.lanes.map(lane=>lane.colorKey)).size).toBe(6);
    expect(spec.nodes.some(node=>node.title==="플레이리스트 발행"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="플레이리스트 커버 사진 추가"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="YouTube 플레이리스트 링크 입력"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="여행 사진 추가"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="대표사진 선택"&&node.kind==="action")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Google 계정 선택 화면"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="Meta 계정 선택 화면"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.some(node=>node.title==="이메일 회원가입 화면"&&node.kind==="screen")).toBe(true);
    expect(spec.nodes.every(node=>!node.title.includes("콜백")&&!node.title.includes("자동 생성"))).toBe(true);
    const authAction=spec.nodes.find(node=>node.title==="가입 또는 로그인 방식 선택");
    const authTargets=spec.edges.filter(edge=>edge.sourceNodeId===authAction?.id).map(edge=>spec.nodes.find(node=>node.id===edge.targetNodeId)?.title);
    expect(authTargets).toEqual(expect.arrayContaining(["Google 계정 선택 화면","Meta 계정 선택 화면","이메일 회원가입 화면","이메일 로그인 화면"]));
    expect(spec.nodes.filter(node=>node.title==="프로필 화면")).toHaveLength(4);
    const secondLaneRoot=`flow-${projectId}-explore`;expect(spec.edges.some(edge=>edge.targetNodeId===secondLaneRoot)).toBe(false);
  });
  it("제품 이름과 무관하게 복수 하위 경로를 열 기반으로 분기한다",()=>{
    const projectId="generic-branch";const features=createDevelopmentFeatureSpec(projectId,"Globeat").map(feature=>{
      const titles:Record<string,string>={[`${projectId}-onboarding`]:"접속 흐름",[`${projectId}-auth`]:"접속 방식 선택",[`${projectId}-auth-google`]:"경로 A",[`${projectId}-auth-meta`]:"경로 B",[`${projectId}-auth-email-signup`]:"경로 C",[`${projectId}-auth-email-login`]:"경로 D",[`${projectId}-auth-callback-profile`]:"공통 완료 화면"};
      return titles[feature.id]?{...feature,title:titles[feature.id]}:feature;
    });const spec=createUserFlowSpec(projectId,features);const choiceActionId=`flow-${projectId}-onboarding-choice`;const targets=spec.edges.filter(edge=>edge.sourceNodeId===choiceActionId).map(edge=>spec.nodes.find(node=>node.id===edge.targetNodeId)?.title);
    expect(targets).toEqual(expect.arrayContaining(["경로 A 화면","경로 B 화면","경로 C 화면","경로 D 화면"]));expect(spec.nodes.filter(node=>node.laneId===`${projectId}-onboarding`).every(node=>typeof node.depth==="number")).toBe(true);
  });
});
