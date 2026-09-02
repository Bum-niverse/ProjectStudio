import {describe,expect,it} from "vitest";
import {layoutFeatures} from "./FeatureMap";
import {createDevelopmentFeatureSpec,summarizeFeatureCompletion} from "./domain/feature";
import {getFeatureCanvasKey,selectFeatureBranch} from "./featureTree";

describe("feature tree layout",()=>{
  it("대주제 시트는 해당 가지를 표시하고 전환할 때 캔버스를 다시 맞춘다",()=>{
    const features=createDevelopmentFeatureSpec("branch-project","업무 기록 도구","기록을 만들고 다시 확인한다.");
    const root=features.find(feature=>!feature.parentId);
    const branches=features.filter(feature=>feature.parentId===root?.id);
    const firstBranch=selectFeatureBranch(features,branches[0].id);
    const secondBranch=selectFeatureBranch(features,branches[1].id);

    expect(firstBranch[0].id).toBe(branches[0].id);
    expect(firstBranch.length).toBeGreaterThan(1);
    expect(secondBranch.length).toBeGreaterThan(1);
    expect(layoutFeatures(firstBranch,"tree","default",branches[0].id)).toHaveLength(firstBranch.length);
    expect(getFeatureCanvasKey("tree",branches[0].id)).not.toBe(getFeatureCanvasKey("tree",branches[1].id));
    expect(getFeatureCanvasKey("mindmap",branches[0].id)).toBe(getFeatureCanvasKey("mindmap",branches[1].id));
  });

  it("기능 완료와 수용 기준 충족을 별도 개발 지표로 계산한다",()=>{
    const features=createDevelopmentFeatureSpec("summary-project","업무 기록 도구","기록을 저장한다.").slice(0,2).map((feature,index)=>({
      ...feature,
      status:index===0?"done" as const:"in_progress" as const,
      acceptanceCriteria:feature.acceptanceCriteria.map((criterion,criterionIndex)=>({...criterion,isMet:index===0||criterionIndex===0})),
    }));
    const summary=summarizeFeatureCompletion(features);
    expect(summary.total).toBe(2);
    expect(summary.done).toBe(1);
    expect(summary.featurePercent).toBe(50);
    expect(summary.criteriaMet).toBeGreaterThan(0);
    expect(summary.criteriaPercent).toBeGreaterThan(0);
  });

  it("기본 정렬은 좁은 정렬보다 연결 관계를 넓게 펼친다",()=>{
    const features=createDevelopmentFeatureSpec("layout-project","업무 기록 도구","사용자가 기록을 만들고 저장한 결과를 다시 확인한다.");
    const expanded=layoutFeatures(features,"tree","default");
    const compact=layoutFeatures(features,"tree","compact");
    const childIds=new Set(features.flatMap(feature=>feature.parentId?[feature.parentId]:[]));
    const expandedLeafRows=expanded.filter(node=>!childIds.has(node.id)).map(node=>node.position.y).sort((a,b)=>a-b);
    const compactLeafRows=compact.filter(node=>!childIds.has(node.id)).map(node=>node.position.y).sort((a,b)=>a-b);
    const minimumGap=(rows:number[])=>Math.min(...rows.slice(1).map((value,index)=>value-rows[index]));
    expect(minimumGap(expandedLeafRows)).toBeGreaterThanOrEqual(118);
    expect(minimumGap(compactLeafRows)).toBeGreaterThanOrEqual(68);
    expect(Math.max(...expanded.map(node=>node.position.x))).toBeGreaterThan(Math.max(...compact.map(node=>node.position.x)));
  });

  it("마인드맵은 루트 주변에 기능을 방사형으로 배치한다",()=>{
    const features=createDevelopmentFeatureSpec("mindmap-project","여행 계획","여행 일정을 만들고 공유한다.");
    const nodes=layoutFeatures(features,"mindmap");
    const root=nodes.find(node=>node.id==="mindmap-project-root");
    const nonRoot=nodes.filter(node=>node.id!==root?.id);
    expect(root?.position).toEqual({x:430,y:260});
    expect(new Set(nonRoot.map(node=>`${Math.round(node.position.x)},${Math.round(node.position.y)}`)).size).toBeGreaterThan(8);
    expect(nonRoot.some(node=>node.position.x<430)).toBe(true);
    expect(nonRoot.some(node=>node.position.x>430)).toBe(true);
  });
});
