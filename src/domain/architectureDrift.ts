export type DriftStatus="verified"|"missing"|"unlinked";
export interface ArchitectureDriftItem{nodeId:string;status:DriftStatus;existingCodePaths:string[];missingCodePaths:string[];existingTestPaths:string[];missingTestPaths:string[];message:string;}
export interface ArchitectureDriftReport{repositoryPath:string;checkedAt:string;items:ArchitectureDriftItem[];}
