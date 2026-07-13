import {describe,expect,it} from "vitest";
import {layoutFeatures} from "./FeatureMap";
import {createDevelopmentFeatureSpec} from "./domain/feature";

describe("feature tree layout",()=>{
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
});
