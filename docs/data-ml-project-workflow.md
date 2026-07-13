# 데이터 분석·머신러닝 프로젝트 기획 흐름

## 제품 목적

ProjectStudio는 데이터를 직접 분석하거나 모델을 학습하지 않는다. 데이터 프로젝트의 목적, 데이터 계약, 분석·실험 순서, 성공 기준, 실행 시스템, 코드·테스트·산출물 연결을 구조화하여 사용자 검토를 거친 실행 가능한 문맥을 만든다.

최종 결과는 다음 질문에 답해야 한다.

- 왜 이 프로젝트를 하는가?
- 어떤 데이터를 사용하며 실제 사용 가능 여부는 확인됐는가?
- 데이터는 어떻게 연결·전처리·검증되는가?
- 분석과 실험은 어떤 순서와 분기 조건으로 진행되는가?
- 성공과 중단은 어떤 기준으로 판단하는가?
- 어떤 시스템 구조와 재현 환경에서 실행되는가?
- 어떤 코드·테스트·산출물이 각 계획 항목을 구현하는가?
- Codex가 다음에 수행할 작업은 무엇인가?

## 프로젝트 유형

공통 category는 `web | mobile | data_analysis | machine_learning`이다. 데이터 프로젝트는 subtype을 추가로 가진다.

데이터 분석 subtype:

- `eda`: 탐색적 데이터 분석
- `statistical`: 통계 분석
- `time_series_analysis`: 시계열 분석
- `dashboard_report`: 대시보드·리포트
- `data_pipeline`: 데이터 파이프라인
- `research_reproduction`: 연구·논문 재현
- `other_data`: 기타

머신러닝 subtype:

- `regression`, `classification`, `time_series_forecasting`
- `recommendation`, `anomaly_detection`, `clustering`
- `nlp`, `computer_vision`, `ranking`, `other_ml`

subtype은 생성 질문, 기본 workflow lane, 필수 검토 규칙, Codex prompt의 근거가 된다. AI는 subtype만으로 타깃·데이터·지표·모델을 확정하지 않는다.

## 단계 구조

공통 단계 ID는 저장 호환을 위해 기존 ID를 유지하고 표시와 콘텐츠만 category별로 바꾼다.

| 공통 단계 | 웹·모바일 | 데이터 분석 | 머신러닝 |
| --- | --- | --- | --- |
| `project` | 프로젝트 | 프로젝트 정의 | 프로젝트 정의 |
| `problem_definition` (`prd`) | PRD | 문제·목표 정의 | 문제·목표 정의 |
| `specification` (`features`) | 기능명세 | 데이터 설계 | 데이터·타깃 설계 |
| `workflow` (`user-flow`) | 유저플로우 | 분석 설계 | 실험 설계 |
| `system_design` | 시스템 설계 | 데이터 시스템 설계 | ML 파이프라인 설계 |
| `export` | 내보내기 | 실행 계획·내보내기 | 실행 계획·내보내기 |

기존 URL 없는 단일 앱 구조와 저장 ID는 유지한다. 화면 분기는 중앙 `ProjectWorkflowDefinition`에서만 수행하고 개별 화면에 category 조건을 반복하지 않는다.

## 단계별 입력

### 1. 프로젝트 정의

이름, category, subtype, 상세 아이디어, 배경, 분석 대상, 이해관계자, 활용 방식, 데이터 보유 상태, 공개 여부, 목적 구분, 일정, 실행 환경, 민감 데이터 여부를 기록한다.

데이터 상태는 `owned | partial | none | public_planned | api_planned | direct_collection_planned` 중 하나다. 활용 방식은 의사결정, 탐색, 보고서, 대시보드, 예측, 분류, 추천, 이상 탐지, 자동화, 연구 결과 중 복수 선택할 수 있다.

### 2. 문제·목표 정의

공통: 문제·현재 어려움·필요성·미해결 영향, 이해관계자 역할, 핵심/부가 목표, 제외 범위, 분석 질문, 가설·근거·데이터·검증·판정 기준, 비즈니스/분석/기술/운영/최소 성공 기준, 데이터·권한·개인정보·자원·일정·비용·실시간성·해석 가능성 제약을 기록한다.

데이터 분석은 비교 집단, 기간, 통계 검정·인과 추론 필요, 보고·시각화 목적을 추가한다. ML은 타깃, 관측·예측 단위와 시점, horizon, 지연, 오탐/미탐 비용, 설명 가능성, 배치/온라인 추론을 추가한다.

### 3. 데이터 설계

계층은 `데이터 도메인 → 데이터셋 → 변수 → 전처리 규칙 → 품질 검증 기준`이다.

dataset은 출처·수집·형식·위치·기간·주기·시간/공간 단위·키·규모·라이선스·민감성·권한·원본 변경 정책을 가진다. variable은 원본/표준 이름·설명·타입·단위·범위·범주·결측·역할·생성 방식·사용 가능 시점·누수·개인정보를 가진다.

relationship은 source/target dataset, join key/type, cardinality, 기준 행 유지, 중복 가능성, 실패 처리, 시간 정렬, 지역 매핑, 단위 변환을 가진다. `N:N`은 저장을 막지 않지만 항상 검토 경고를 낸다.

품질 규칙은 스키마·타입·범위·결측률·중복률·키 유일성·참조 무결성·시간 연속성·범주/클래스 분포·단위·누수·표본 편향·갱신 지연·드리프트를 표현한다.

### 4. 분석·실험 설계

기존 스윔레인 엔진을 재사용하되 기본 lane은 데이터 준비, 품질 검증, EDA, 피처 엔지니어링, 모델링, 평가, 해석, 보고·배포다. 데이터 분석은 불필요한 모델링 lane을 숨길 수 있고, ML은 기준 모델·분할·후보 모델·평가·오류 분석을 필수 후보로 제안한다.

노드는 입력 데이터, 처리 작업, 검증, 분기, 분석, 실험, 모델, 평가, 결과, 산출물, 승인 유형을 가진다. 기존 저장 type과의 호환은 화면상 semantic subtype을 description/configuration에 보존한 뒤 후속 schema migration에서 정규화한다.

### 5. 데이터·ML 시스템 설계

흐름은 `source → collect → raw storage → validate → transform → analytical data → analyze/train → evaluate → artifact/model store → report/serve`다.

노드는 source, processing job, storage, notebook/analysis/model, serving artifact를 표현하며 목적·입출력·schema·주기·batch/stream·기술·환경·저장 위치·코드·테스트·dataset/workflow link·실패 처리·재현성·버전을 가진다. 기존 system snapshot의 component type과 configuration을 우선 재사용하고 데이터 전용 subtype은 점진적으로 추가한다.

### 6. 실행 계획·내보내기

프로젝트 개요, 문제 정의, 질문·가설·성공 기준, dataset/variable/relationship, 수집·전처리·품질·EDA·실험 계획, baseline/candidate/metric, 시스템·코드·테스트·일정·위험·미결정을 Markdown·JSON·CSV·PDF·LLM 문맥으로 내보낸다.

execution task는 ID, 제목, 목적, 입력/출력, 선행 작업, dataset/variable/workflow link, 예상 파일, 완료 조건, 검증 명령, 위험을 가진다. 실제 파일 생성·분석 실행은 명시적으로 사용자가 Codex에 넘긴 뒤 수행한다.

## 데이터 모델

```ts
type DataProjectProfile = {
  projectId: string;
  subtype: ProjectSubtype;
  background: string;
  subject: string;
  stakeholders: string[];
  resultUses: string[];
  dataAvailability: DataAvailability;
  dataIsPublic?: boolean;
  purpose: "research" | "portfolio" | "work" | "production";
  schedule: string;
  environment: string;
  containsSensitiveData: boolean;
};

type DatasetSpec = {
  id: string; projectId: string; domain: string; name: string; description: string;
  source: string; sourceUrl?: string; collectionMethod: string; format: string;
  storageLocation: string; period: string; refreshCycle: string;
  timeGrain?: string; spatialGrain?: string; primaryKeys: string[];
  license?: string; containsPersonalData: boolean; containsSensitiveData: boolean;
  accessPolicy: string; isRawMutable: boolean; variables: VariableSpec[];
};

type DatasetRelationship = {
  id: string; sourceDatasetId: string; targetDatasetId: string;
  joinKeys: string[]; joinType: "inner" | "left" | "right" | "full";
  cardinality: "1:1" | "1:N" | "N:1" | "N:N";
  preserveSourceRows: boolean; duplicateRisk: string; unmatchedPolicy: string;
  temporalAlignment?: string; spatialMapping?: string; unitConversion?: string;
};
```

문제 정의, 데이터 설계, workflow, system design, execution plan은 project별 document와 immutable revision으로 저장한다. revision은 `content_json`, 요약 Markdown, source, 생성 시각을 보존한다.

## 데이터 관계도 모델

dataset이 node, relationship이 edge다. 좌표는 revision JSON에 저장한다. 연결 생성 시 self-edge와 순환을 차단하지는 않지만 join key 공백, 동일 dataset, `N:N`, 시간 단위 불일치, 키 유일성 미확인은 경고한다. 경고는 사용자의 명시적 승인 전에는 해결됨으로 표시하지 않는다.

## 분석·실험 workflow 모델

기존 lane/node/edge와 좌표 보존을 재사용한다. 데이터 프로젝트의 node metadata에는 입력/출력 dataset, 변수, 방법, 검증, 실패 처리, 코드, 테스트, 완료 기준을 둔다. split과 metric 제안에는 `reason`, `assumption`, `status: proposed | approved | rejected`를 요구한다.

## 시스템 설계 노드 유형

- source: CSV, Excel, API, DB, scraping, public data, log, sensor, upload
- processing: collector, validation, cleaning, transform, join, aggregation, feature, training, evaluation, inference, streaming, scheduler
- storage: raw/interim/processed, DB, warehouse, lake, feature/model/artifact/experiment store
- analysis/model: notebook, EDA, statistics, baseline, candidate, training pipeline, explainability
- delivery: report, dashboard, API, batch file, alert, model service

MVP는 기존 node type에 data subtype을 추가해 렌더러와 revision을 재사용한다.

## AI 생성 규칙

입력 → category/subtype 확인 → 누락 질문과 가정 분리 → 후보 구조 생성 → schema/graph 검증 → 사용자 검토 → 승인 revision 순서다.

데이터 존재, 타깃, metric, 모델, 인과, 개인정보 사용 가능성, 외부 API 접근을 근거 없이 확정하지 않는다. 모든 추천은 근거·가정·대안·trade-off를 가진다. 시계열은 시간 순서·horizon·lag/rolling·미래 누수를, 추천은 interaction/cold start/편향을, NLP/CV는 라벨·중복·개인정보를, 이상 탐지는 오탐/미탐·threshold를, clustering은 거리·scale·해석을 필수 검토한다.

## 검토 규칙

- dataset 출처·라이선스·접근 권한 미정
- 필수 key·schema·quality rule 없음
- `N:N` join 또는 cardinality 미확인
- 시간 기준·사용 가능 시점·타깃 누수 위험 미정
- ML baseline·split·primary metric·error analysis 없음
- 전체 데이터 전처리 후 split 가능성
- seed·환경·artifact/experiment 저장 위치 없음
- 학습/추론 feature 로직 분리
- 민감 데이터 외부 전송 또는 개인정보 정책 미정
- 계획-코드-테스트-산출물 link 누락과 drift

## 내보내기 계약

`manifest.json`은 category/subtype, revision IDs, dataset/variable/relationship/workflow/system/task count, unresolved warnings를 포함한다. Markdown은 사람이 검토할 근거와 미결정을 우선하며 JSON은 canonical model이다. CSV는 dataset, variable, relationship, quality rule, execution task를 각각 분리한다. LLM prompt는 승인된 항목과 제안/가정을 구분하고 첫 실행 task와 검증 명령을 명시한다.

## 코드·테스트 추적

`problem → dataset → variable → workflow node → system node → code → test → artifact` 안정 ID 링크를 사용한다. 상태는 Planned, Data Pending, Ready, In Progress, Validated, Blocked, Completed, Drift Detected다. 파일 존재 확인만으로 완료를 판정하지 않고 metric/split/schema/version 일치 검사를 별도 수행한다.

## MVP 범위

- category별 6단계 이름과 subtype 저장
- 데이터용 문제·목표 정의 revision
- dataset/variable/relationship 편집과 `N:N` 경고
- 분석·실험 스윔레인 초안과 저장
- 데이터·ML 시스템 설계 subtype과 검토 경고
- execution task 생성과 Markdown/JSON 내보내기
- Codex 문맥·제안 승인/거절, 기본 drift 검사

## 제외 범위

데이터 업로드·자동 분석, 실제 학습/GPU/HPO, 실시간 MLOps, 클라우드 자동 구축, 결론 자동 작성, 대시보드 실행, 데이터 구매는 제외한다.

## 구현 단계

1. 공통 stage definition과 subtype을 도입하고 기존 저장 ID를 유지한다.
2. 프로젝트 profile과 problem definition을 immutable JSON revision으로 저장한다.
3. dataset/variable/relationship 편집과 관계도·품질 경고를 구현한다.
4. 기존 user flow를 category별 analysis/experiment workflow로 확장한다.
5. 기존 system design에 data subtype·검토 규칙·추적 링크를 추가한다.
6. execution task와 export manifest/Markdown/JSON/CSV를 확장한다.
7. Codex schema/prompt와 승인 proposal을 추가하고 전체 회귀를 검증한다.

## 주요 위험

- 기존 PRD/feature/user-flow ID와 새 공통 단계 의미가 혼재할 수 있다.
- SQLite CHECK를 재작성하는 파괴적 migration은 피하고 nullable subtype column과 신규 revision table을 사용해야 한다.
- 지나치게 큰 JSON schema는 Codex 응답 실패율을 높이므로 단계별 생성과 승인으로 분리해야 한다.
- dataset/variable을 실제 schema처럼 보이게 만들어 사용자가 검증된 사실로 오인할 수 있으므로 `proposed/confirmed` 상태와 출처를 표시해야 한다.
- 민감 데이터가 실제로 입력되거나 외부 CLI로 전달되지 않도록 ProjectStudio에는 명세와 최소 예시만 저장하고 경고를 제공해야 한다.
