import type { FeatureSpec } from "./domain/feature";

type FeatureCanvasMode = "tree" | "mindmap";

export function selectFeatureBranch(features:FeatureSpec[],originId:string):FeatureSpec[]{
  const visible=new Set([originId]);
  let changed=true;
  while(changed){
    changed=false;
    for(const feature of features){
      if(feature.parentId&&visible.has(feature.parentId)&&!visible.has(feature.id)){
        visible.add(feature.id);
        changed=true;
      }
    }
  }
  return features.filter(feature=>visible.has(feature.id));
}

export function getFeatureCanvasKey(mode:FeatureCanvasMode,activeBranchId:string):string{
  return `${mode}:${mode==="tree"?activeBranchId:"all"}`;
}
