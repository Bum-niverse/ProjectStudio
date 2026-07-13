import{invoke,isTauri}from"@tauri-apps/api/core";
import type{WireframePageModel}from"../domain/wireframe";
import type{WireframeRepository}from"../ports/wireframeRepository";

const storageKey=(projectId:string)=>`projectstudio:${projectId}:wireframes`;
class TauriWireframeRepository implements WireframeRepository{
  list(projectId:string){return invoke<WireframePageModel[]>("list_wireframe_pages",{projectId});}
  save(projectId:string,pages:WireframePageModel[]){return invoke<WireframePageModel[]>("save_wireframe_pages",{input:{projectId,pages,updatedAt:new Date().toISOString()}});}
}
class BrowserWireframeRepository implements WireframeRepository{
  async list(projectId:string){const value=localStorage.getItem(storageKey(projectId));return value?JSON.parse(value)as WireframePageModel[]:[];}
  async save(projectId:string,pages:WireframePageModel[]){const existing=await this.list(projectId);const next=[...existing.filter(item=>!pages.some(page=>page.sourceNodeId===item.sourceNodeId)),...pages];localStorage.setItem(storageKey(projectId),JSON.stringify(next));return next;}
}
export const createWireframeRepository=():WireframeRepository=>isTauri()?new TauriWireframeRepository():new BrowserWireframeRepository();
