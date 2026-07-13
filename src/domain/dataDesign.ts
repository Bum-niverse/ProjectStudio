import type { ProjectSubtype, ProjectType } from "./project";

export type VariableRole = "input" | "target" | "identifier" | "metadata";
export type RelationshipCardinality = "1:1" | "1:N" | "N:1" | "N:N";
export type TrackingStatus = "planned" | "data_pending" | "ready" | "in_progress" | "validated" | "blocked" | "completed" | "drift_detected";

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

export interface ExecutionTask {
  id: string; title: string; purpose: string; input: string; output: string; prerequisiteTaskIds: string[];
  relatedDatasetIds: string[]; relatedVariableIds: string[]; relatedWorkflowNodeIds: string[];
  expectedFiles: string[]; completionCriteria: string[]; validationCommands: string[]; risks: string[];
  codePaths: string[]; testPaths: string[]; artifactPaths: string[]; status: TrackingStatus;
}

export interface DataDesignProposal {
  id: string; summary: string; status: "pending" | "accepted" | "rejected";
  proposedQualityRules: string[]; assumptions: string[]; createdAt: string; decidedAt?: string;
}

export interface DataDesignSnapshot {
  datasets: DatasetSpec[];
  relationships: DatasetRelationship[];
  qualityPlan: string[];
  executionTasks: ExecutionTask[];
  proposals: DataDesignProposal[];
}
export interface DataDesignRevision { id: string; projectId: string; revisionNumber: number; snapshot: DataDesignSnapshot; createdAt: string }

export const DATA_QUALITY_RULES = ["필수 컬럼", "스키마", "타입", "허용 범위", "결측률", "중복률", "키 유일성", "참조 무결성", "시간 연속성", "범주 분포", "클래스 불균형", "단위 일관성", "데이터 누수", "표본 편향", "갱신 지연", "데이터 드리프트"];

export function emptyVariable(): VariableSpec {
  return { id: crypto.randomUUID(), sourceName: "", standardName: "", description: "", dataType: "string", unit: "", allowedRange: "", categories: "", allowsMissing: true, role: "input", isDerived: false, derivation: "", availableAt: "", leakageRisk: "", containsPersonalData: false };
}
export function emptyDataset(): DatasetSpec {
  return { id: crypto.randomUUID(), domain: "", name: "새 데이터셋", description: "", source: "", sourceUrl: "", collectionMethod: "", format: "CSV", storageLocation: "", period: "", refreshCycle: "", timeGrain: "", spatialGrain: "", primaryKeys: "", expectedVolume: "", license: "", containsPersonalData: false, containsSensitiveData: false, accessPolicy: "", isRawMutable: false, variables: [] };
}
export function initialDataDesign(): DataDesignSnapshot {
  return { datasets: [], relationships: [], qualityPlan: ["필수 컬럼", "스키마", "타입", "결측률", "중복률", "키 유일성", "데이터 누수"], executionTasks: [], proposals: [] };
}

export function normalizeDataDesign(value: Partial<DataDesignSnapshot>): DataDesignSnapshot {
  return { datasets: value.datasets ?? [], relationships: value.relationships ?? [], qualityPlan: value.qualityPlan ?? [], executionTasks: value.executionTasks ?? [], proposals: value.proposals ?? [] };
}

export function createExecutionTasks(projectType: ProjectType, subtype: ProjectSubtype | undefined, snapshot: DataDesignSnapshot): ExecutionTask[] {
  const datasets = snapshot.datasets.map(dataset => dataset.id);
  const isMl = projectType === "machine_learning";
  const stages = isMl
    ? [
      ["DATA", "원본 데이터 계약 검증", "스키마·결측·중복·키·시점 계약을 검사한다.", "reports/data_quality/schema.json"],
      ["SPLIT", subtype === "time_series_forecasting" ? "시간 기준 데이터 분할" : "학습·검증·테스트 분할", "분할 이전 전체 데이터 학습과 누수를 차단한다.", "data/processed/splits"],
      ["BASELINE", "기준 모델 구현", "후보 모델보다 먼저 비교 기준과 핵심 지표를 확정한다.", "reports/baseline_metrics.json"],
      ["MODEL", "후보 모델 학습과 평가", "동일 분할·지표로 후보를 비교하고 오류를 분석한다.", "reports/model_evaluation.md"],
      ["REPRO", "재현성과 산출물 검증", "seed·환경·데이터·모델 버전과 실행 명령을 기록한다.", "reports/reproducibility.md"],
    ]
    : [
      ["DATA", "원본 데이터 계약 검증", "스키마·결측·중복·키와 병합 조건을 검사한다.", "reports/data_quality/schema.json"],
      ["PREP", "분석 데이터셋 생성", "원본을 보존하고 정제·병합·파생 규칙을 재현 가능하게 실행한다.", "data/processed/analysis.parquet"],
      ["EDA", "탐색적 분석 수행", "분포·추세·집단 차이와 품질 위험을 기록한다.", "reports/eda.md"],
      ["ANALYSIS", subtype === "statistical" ? "통계 검정과 효과 크기 평가" : "핵심 분석 질문 검증", "가정과 해석 한계를 포함해 분석 질문에 답한다.", "reports/analysis.md"],
      ["REPORT", "결과 검토와 보고서 구성", "결론·근거·미결정 사항과 다음 행동을 연결한다.", "reports/final_report.md"],
    ];
  return stages.map((stage, index) => ({
    id: `TASK-${stage[0]}-${String(index + 1).padStart(3, "0")}`, title: stage[1], purpose: stage[2],
    input: index === 0 ? "데이터 명세와 원본 데이터" : stages[index - 1][3], output: stage[3],
    prerequisiteTaskIds: index ? [`TASK-${stages[index - 1][0]}-${String(index).padStart(3, "0")}`] : [],
    relatedDatasetIds: datasets, relatedVariableIds: [], relatedWorkflowNodeIds: [], expectedFiles: [stage[3]],
    completionCriteria: ["입력·출력 계약을 기록한다.", "정상·경계·실패 사례를 검증한다.", "재현 가능한 실행 명령을 제공한다."],
    validationCommands: ["pytest"], risks: [], codePaths: [], testPaths: [], artifactPaths: [stage[3]], status: datasets.length ? "planned" : "data_pending",
  }));
}

export function createDataDesignProposal(snapshot: DataDesignSnapshot): DataDesignProposal {
  const missing = DATA_QUALITY_RULES.filter(rule => !snapshot.qualityPlan.includes(rule));
  return { id: crypto.randomUUID(), summary: "현재 데이터 계약을 기준으로 누락된 품질 검사를 제안합니다.", status: "pending", proposedQualityRules: missing, assumptions: ["실제 데이터가 아닌 작성된 명세만 검토했습니다.", "제안은 승인 전까지 품질 계획에 반영되지 않습니다."], createdAt: new Date().toISOString() };
}

export function reviewDataDesign(snapshot: DataDesignSnapshot): string[] {
  const warnings: string[] = [];
  for (const dataset of snapshot.datasets) {
    if (!dataset.source.trim()) warnings.push(`${dataset.name}: 데이터 출처가 정해지지 않았습니다.`);
    if (!dataset.primaryKeys.trim()) warnings.push(`${dataset.name}: 주요 키가 정해지지 않았습니다.`);
    if (!dataset.variables.length) warnings.push(`${dataset.name}: 변수 사전이 비어 있습니다.`);
    if (dataset.isRawMutable) warnings.push(`${dataset.name}: 원본 데이터를 직접 수정하는 계획입니다.`);
    if ((dataset.containsPersonalData || dataset.containsSensitiveData) && !dataset.accessPolicy.trim()) warnings.push(`${dataset.name}: 민감 데이터 접근 정책이 필요합니다.`);
    for (const variable of dataset.variables) {
      if (variable.role === "target" && !variable.availableAt.trim()) warnings.push(`${dataset.name}.${variable.standardName || variable.sourceName}: 타깃 사용 가능 시점이 없어 누수를 검토해야 합니다.`);
      if (variable.isDerived && !variable.derivation.trim()) warnings.push(`${dataset.name}.${variable.standardName || variable.sourceName}: 파생 변수 생성 규칙이 없습니다.`);
    }
  }
  for (const relation of snapshot.relationships) {
    if (relation.cardinality === "N:N") warnings.push("N:N 병합은 행 증폭과 중복 위험을 검토해야 합니다.");
    if (!relation.joinKeys.trim()) warnings.push("데이터셋 관계에 조인 키가 없습니다.");
    if (relation.sourceDatasetId === relation.targetDatasetId) warnings.push("같은 데이터셋을 자기 자신과 연결할 수 없습니다.");
    if (!relation.unmatchedPolicy.trim()) warnings.push("병합 실패 행의 처리 방식이 정해지지 않았습니다.");
  }
  for (const task of snapshot.executionTasks) {
    if (!task.codePaths.length) warnings.push(`${task.id}: 계획과 연결된 코드 경로가 없습니다.`);
    if (!task.testPaths.length) warnings.push(`${task.id}: 완료를 검증할 테스트 경로가 없습니다.`);
    if (!task.validationCommands.length) warnings.push(`${task.id}: 검증 명령이 없습니다.`);
  }
  return [...new Set(warnings)];
}
