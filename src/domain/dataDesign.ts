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
  temporalAlignment: string; spatialMapping: string; unitConversion: string; description?: string;
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

const variable = (sourceName: string, standardName: string, description: string, dataType: string, role: VariableRole, options: Partial<VariableSpec> = {}): VariableSpec => ({
  ...emptyVariable(), sourceName, standardName, description, dataType, role, ...options,
});

export function createInitialDataDesign(projectType: ProjectType, subtype: ProjectSubtype | undefined, projectName: string, projectIdea: string): DataDesignSnapshot {
  const snapshot = initialDataDesign();
  if (projectType !== "machine_learning" && projectType !== "data_analysis") return snapshot;
  const context = `${projectName} ${projectIdea}`.toLowerCase();
  const isMarketDirection = /주가|stock|ohlcv|종가|수익률|거래량/.test(context) && /방향|상승|하락|movement|분류|예측/.test(context);
  if (projectType === "machine_learning" && (subtype === "time_series_forecasting" || isMarketDirection)) {
    const marketDataset: DatasetSpec = {
      ...emptyDataset(), name: "일별 시장 가격 원본", domain: "시장 시계열", description: "[제안] 예측 시점 이전에 공개된 종목별 일별 OHLCV 원본 계약입니다. 실제 제공자·라이선스·수정주가 반영 시점은 사용자가 확정해야 합니다.",
      source: "공개 시장 데이터 제공자 — 확인 필요", collectionMethod: "공식 API 또는 사용 허가된 파일", format: "CSV 또는 Parquet", storageLocation: "data/raw/market", timeGrain: "거래일", spatialGrain: "종목", primaryKeys: "symbol, trading_date", refreshCycle: "거래일 단위", accessPolicy: "연구·포트폴리오 목적의 이용 약관과 재배포 범위 확인", isRawMutable: false,
      variables: [
        variable("symbol", "symbol", "종목 식별자", "string", "identifier", { allowsMissing: false, availableAt: "수집 시점" }),
        variable("date", "trading_date", "거래일", "date", "identifier", { allowsMissing: false, availableAt: "해당 거래일" }),
        ...["open", "high", "low", "close"].map(name => variable(name, name, `${name.toUpperCase()} 가격`, "number", "input", { unit: "통화", allowsMissing: false, availableAt: "해당 거래일 장 마감 후" })),
        variable("volume", "volume", "거래량", "integer", "input", { unit: "주", allowsMissing: false, availableAt: "해당 거래일 장 마감 후" }),
      ],
    };
    const modelingDataset: DatasetSpec = {
      ...emptyDataset(), name: "예측 피처·타깃 테이블", domain: "모델링", description: "[제안] 원본 시장 데이터에서 예측 기준 시점까지 확정된 값만 사용해 생성하는 학습 계약입니다.", source: "일별 시장 가격 원본에서 파생", collectionMethod: "재현 가능한 피처 파이프라인", format: "Parquet", storageLocation: "data/processed/features", timeGrain: "종목 × 거래일", spatialGrain: "종목", primaryKeys: "symbol, feature_date", refreshCycle: "실험별", accessPolicy: "원본 제공자의 이용 범위를 승계", isRawMutable: false,
      variables: [
        variable("symbol", "symbol", "종목 식별자", "string", "identifier", { allowsMissing: false, availableAt: "피처 생성 시점" }),
        variable("feature_date", "feature_date", "예측 입력 기준 거래일", "date", "identifier", { allowsMissing: false, availableAt: "예측 기준일 장 마감 후" }),
        variable("return_1d", "return_1d", "직전 1거래일 수익률", "number", "input", { isDerived: true, derivation: "close(t) / close(t-1) - 1", availableAt: "예측 기준일 장 마감 후", leakageRisk: "분할 경계 밖 가격 참조 금지" }),
        variable("sma_5", "sma_5", "5거래일 이동평균", "number", "input", { isDerived: true, derivation: "t 시점까지의 close 5개 평균", availableAt: "예측 기준일 장 마감 후", leakageRisk: "centered rolling 금지" }),
        variable("volatility_20", "volatility_20", "20거래일 수익률 변동성", "number", "input", { isDerived: true, derivation: "t 시점까지의 return 표준편차", availableAt: "예측 기준일 장 마감 후", leakageRisk: "미래 윈도우 포함 금지" }),
        variable("target_next_day_up", "target_next_day_up", "다음 거래일 종가 상승 여부", "boolean", "target", { isDerived: true, derivation: "close(t+1) > close(t)", categories: "true,false", allowsMissing: false, availableAt: "다음 거래일 장 마감 후", leakageRisk: "학습 레이블 생성에만 사용하고 입력 피처에서 제외" }),
      ],
    };
    snapshot.datasets = [marketDataset, modelingDataset];
    snapshot.relationships = [{ id: crypto.randomUUID(), sourceDatasetId: marketDataset.id, targetDatasetId: modelingDataset.id, joinKeys: "symbol, trading_date → symbol, feature_date", joinType: "left", cardinality: "1:1", preserveSourceRows: false, duplicateRisk: "종목·거래일 중복 시 피처 행 증폭", unmatchedPolicy: "거래일 불일치 행을 격리하고 품질 보고서에 기록", temporalAlignment: "종목별 거래 달력 기준으로 과거 방향 정렬", spatialMapping: "symbol 표준화", unitConversion: "가격 통화와 corporate action 처리 정책 확인", description: "일별 시장 가격을 예측 피처·타깃 생성 기준에 맞춰 연결합니다." }];
    snapshot.qualityPlan = [...new Set([...snapshot.qualityPlan, "허용 범위", "참조 무결성", "시간 연속성", "클래스 불균형", "단위 일관성", "표본 편향", "데이터 드리프트"])];
    return snapshot;
  }
  const dataset = emptyDataset();
  dataset.name = projectType === "machine_learning" ? "학습 데이터 계약 — 확인 필요" : "분석 데이터 계약 — 확인 필요";
  dataset.description = "[제안] 아이디어에서 확인된 데이터 범위를 사용자가 출처·키·변수 단위로 확정하기 위한 초기 계약입니다.";
  dataset.source = "미정 — 사용자 확인 필요";
  dataset.primaryKeys = "미정 — 사용자 확인 필요";
  dataset.variables = projectType === "machine_learning"
    ? [variable("observed_at", "observed_at", "관측 기준 시점", "datetime", "identifier", { availableAt: "수집 시점" }), variable("target", "target", "예측 대상 — 정의 필요", "unknown", "target", { availableAt: "예측 horizon 이후", leakageRisk: "입력 사용 금지" })]
    : [variable("observed_at", "observed_at", "분석 관측 시점", "datetime", "identifier", { availableAt: "수집 시점" })];
  snapshot.datasets = [dataset];
  return snapshot;
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
  if (!snapshot.datasets.length) warnings.push("데이터셋 계약이 없습니다. 출처·키·변수와 타깃을 먼저 정의해야 합니다.");
  for (const dataset of snapshot.datasets) {
    if (!dataset.source.trim()) warnings.push(`${dataset.name}: 데이터 출처가 정해지지 않았습니다.`);
    if (/확인 필요|미정/.test(dataset.source)) warnings.push(`${dataset.name}: 제안된 데이터 출처를 실제 제공자와 이용 조건으로 확정해야 합니다.`);
    if (!dataset.period.trim()) warnings.push(`${dataset.name}: 수집·분석 기간이 정해지지 않았습니다.`);
    if (!dataset.license.trim()) warnings.push(`${dataset.name}: 라이선스와 재배포 가능 범위를 확인해야 합니다.`);
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
    const requiresImplementationLinks = ["in_progress", "validated", "completed", "drift_detected"].includes(task.status);
    if (requiresImplementationLinks && !task.codePaths.length) warnings.push(`${task.id}: 진행 중인 작업과 연결된 코드 경로가 없습니다.`);
    if (requiresImplementationLinks && !task.testPaths.length) warnings.push(`${task.id}: 진행 중인 작업을 검증할 테스트 경로가 없습니다.`);
    if (!task.validationCommands.length) warnings.push(`${task.id}: 검증 명령이 없습니다.`);
  }
  return [...new Set(warnings)];
}
