import{describe,expect,it}from"vitest";import{connectedUserFlowNodeIds,type UserFlowEdge}from"./userFlow";
const edge=(sourceNodeId:string,targetNodeId:string,index:number):UserFlowEdge=>({id:`e${index}`,projectId:"p",sourceNodeId,targetNodeId});
describe("focused user flow",()=>{it("shows two steps in both directions without unrelated branches",()=>{const edges=[edge("a","b",1),edge("b","c",2),edge("c","d",3),edge("d","e",4),edge("x","y",5)];expect([...connectedUserFlowNodeIds(edges,"c",2)].sort()).toEqual(["a","b","c","d","e"]);});});
