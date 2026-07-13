export type VariableRole = "input" | "target" | "identifier" | "metadata";
export type RelationshipCardinality = "1:1" | "1:N" | "N:1" | "N:N";

export interface VariableSpec {
  id: string; sourceName: string; standardName: string; description: string; dataType: string;
  unit: string; allowedRange: string; categories: string; allowsMissing: boolean; role: VariableRole;
  isDerived: boolean; derivation: string; availableAt: string; leakageRisk: string; containsPersonalData: boolean;
}

export interface DatasetSpec {
  id: string; domain: string; name: string; description: string; source: string; sourceUrl: string;
  collectionMethod: string; format: string; storageLocation: string; period: string; refreshCycle: string;
  timeGrain: string; spatialGrain: string; primaryKeys: string; expectedVolume: string; license: string;
  containsPersonalData: boolean; containsSensitiveData: boolean; accessPolicy: string; isRawMutable: boolean;
  variables: VariableSpec[];
}

export interface DatasetRelationship {
  id: string; sourceDatasetId: string; targetDatasetId: string; joinKeys: string; joinType: "inner" | "left" | "right" | "full";
  cardinality: RelationshipCardinality; preserveSourceRows: boolean; duplicateRisk: string; unmatchedPolicy: string;
  temporalAlignment: string; spatialMapping: string; unitConversion: string;
}

export interface DataDesignSnapshot { datasets: DatasetSpec[]; relationships: DatasetRelationship[]; qualityPlan: string[] }
export interface DataDesignRevision { id: string; projectId: string; revisionNumber: number; snapshot: DataDesignSnapshot; createdAt: string }

export const DATA_QUALITY_RULES = ["필수 컬럼", "스키마", "타입", "허용 범위", "결측률", "중복률", "키 유일성", "참조 무결성", "시간 연속성", "범주 분포", "클래스 불균형", "단위 일관성", "데이터 누수", "표본 편향", "갱신 지연", "데이터 드리프트"];

export function emptyVariable(): VariableSpec { return { id: crypto.randomUUID(), sourceName: "", standardName: "", description: "", dataType: "string", unit: "", allowedRange: "", categories: "", allowsMissing: true, role: "input", isDerived: false, derivation: "", availableAt: "", leakageRisk: "", containsPersonalData: false }; }
export function emptyDataset(): DatasetSpec { return { id: crypto.randomUUID(), domain: "", name: "새 데이터셋", description: "", source: "", sourceUrl: "", collectionMethod: "", format: "CSV", storageLocation: "", period: "", refreshCycle: "", timeGrain: "", spatialGrain: "", primaryKeys: "", expectedVolume: "", license: "", containsPersonalData: false, containsSensitiveData: false, accessPolicy: "", isRawMutable: false, variables: [] }; }
export function initialDataDesign(): DataDesignSnapshot { return { datasets: [], relationships: [], qualityPlan: ["필수 컬럼", "스키마", "타입", "결측률", "중복률", "키 유일성", "데이터 누수"] }; }

export function reviewDataDesign(snapshot: DataDesignSnapshot): string[] {
  const warnings: string[] = [];
  for (const dataset of snapshot.datasets) {
    if (!dataset.source.trim()) warnings.push(`${dataset.name}: 데이터 출처가 정해지지 않았습니다.`);
    if (!dataset.primaryKeys.trim()) warnings.push(`${dataset.name}: 주요 키가 정해지지 않았습니다.`);
    if (!dataset.variables.length) warnings.push(`${dataset.name}: 변수 사전이 비어 있습니다.`);
    if (dataset.isRawMutable) warnings.push(`${dataset.name}: 원본 데이터를 직접 수정하는 계획입니다.`);
    if ((dataset.containsPersonalData || dataset.containsSensitiveData) && !dataset.accessPolicy.trim()) warnings.push(`${dataset.name}: 민감 데이터 접근 정책이 필요합니다.`);
    for (const variable of dataset.variables) if (variable.role === "target" && !variable.availableAt.trim()) warnings.push(`${dataset.name}.${variable.standardName || variable.sourceName}: 타깃 사용 가능 시점이 없어 누수를 검토해야 합니다.`);
  }
  for (const relation of snapshot.relationships) {
    if (relation.cardinality === "N:N") warnings.push("N:N 병합은 행 증폭과 중복 위험을 검토해야 합니다.");
    if (!relation.joinKeys.trim()) warnings.push("데이터셋 관계에 조인 키가 없습니다.");
    if (relation.sourceDatasetId === relation.targetDatasetId) warnings.push("같은 데이터셋을 자기 자신과 연결할 수 없습니다.");
  }
  return [...new Set(warnings)];
}
