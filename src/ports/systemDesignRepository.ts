import type{SystemDesignProposal,SystemDesignSnapshot,SystemDesignSource,SystemDesignWorkspace}from"../domain/systemDesign";
export interface SystemDesignRepository{
  initialize(projectId:string,initialSnapshot:SystemDesignSnapshot,replaceIncompatible?:boolean):Promise<SystemDesignWorkspace>;
  saveRevision(projectId:string,designId:string,snapshot:SystemDesignSnapshot,source:SystemDesignSource):Promise<SystemDesignWorkspace>;
  createProposal(projectId:string,designId:string,baseRevisionId:string,proposedSnapshot:SystemDesignSnapshot,summary:string):Promise<SystemDesignProposal>;
  decideProposal(projectId:string,proposalId:string,decision:"accepted"|"rejected",rejectionReason?:string):Promise<SystemDesignWorkspace>;
}
