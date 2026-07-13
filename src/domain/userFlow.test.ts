import { describe, expect, it } from "vitest";
import { createDevelopmentFeatureSpec } from "./feature";
import { createExecutionPipelineSpec, createUserFlowSpec, isIncompleteGeneratedFlow, reconcileUserFlowLanes } from "./userFlow";

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
    expect(spec.nodes.every(node=>node.id.includes(projectId))).toBe(true);
  });
  it("시계열과 통계 프로젝트에 특화 단계를 적용한다",()=>{
    const ml=createExecutionPipelineSpec("ml",[],"machine_learning","time_series_forecasting");
    const analysis=createExecutionPipelineSpec("da",[],"data_analysis","statistical");
    expect(ml.nodes.some(node=>node.title.includes("rolling"))).toBe(true);
    expect(ml.nodes.some(node=>node.title.includes("MASE"))).toBe(true);
    expect(analysis.nodes.some(node=>node.title.includes("효과 크기"))).toBe(true);
  });
  it("저장된 분석 레인 ID가 달라도 생성된 스윔레인에 순서대로 복원한다",()=>{
    const generated=createExecutionPipelineSpec("analysis",[],"data_analysis","eda");
    const persisted=generated.nodes.map(node=>({...node,laneId:["prepare","quality","analysis","report"][generated.lanes.findIndex(lane=>lane.id===node.laneId)]}));
    const reconciled=reconcileUserFlowLanes(persisted,generated.lanes);
    expect(reconciled.didRemap).toBe(true);
    for(const lane of reconciled.lanes)expect(reconciled.nodes.filter(node=>node.laneId===lane.id).length).toBeGreaterThan(0);
  });
  it("기본 단계 일부만 남은 실행 파이프라인을 불완전 상태로 판정한다",()=>{
    const generated=createExecutionPipelineSpec("analysis",[],"data_analysis","eda");
    expect(isIncompleteGeneratedFlow([generated.nodes.find(node=>node.title==="분석 해석")!],generated.nodes)).toBe(true);
    expect(isIncompleteGeneratedFlow([{...generated.nodes[0],id:"pipeline-2-3"}],generated.nodes)).toBe(true);
    expect(isIncompleteGeneratedFlow([{...generated.nodes[0],id:"custom-node",title:"사용자 정의 단계"}],generated.nodes)).toBe(false);
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
  it("프로젝트 이름과 무관하게 같은 아이디어에는 같은 범용 구조를 만든다",()=>{
    const idea="사용자가 기록을 만들고 저장한 결과를 다시 확인한다.";
    const first=createDevelopmentFeatureSpec("first","첫 프로젝트",idea).map(({id,parentId,title})=>({id:id.replace(/^first/,"project"),parentId:parentId?.replace(/^first/,"project"),title:title.replace("첫 프로젝트","프로젝트")}));
    const second=createDevelopmentFeatureSpec("second","두 번째 프로젝트",idea).map(({id,parentId,title})=>({id:id.replace(/^second/,"project"),parentId:parentId?.replace(/^second/,"project"),title:title.replace("두 번째 프로젝트","프로젝트")}));
    expect(first).toEqual(second);
  });
});
