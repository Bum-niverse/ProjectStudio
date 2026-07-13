import type{WireframePageModel}from"../domain/wireframe";

export interface WireframeRepository{
  list(projectId:string):Promise<WireframePageModel[]>;
  save(projectId:string,pages:WireframePageModel[]):Promise<WireframePageModel[]>;
}
