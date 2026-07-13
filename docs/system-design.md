# 시스템 설계 캔버스

## 제품 목적

시스템 설계는 기능명세와 유저플로우를 서비스, 데이터 저장소, 외부 시스템, 통신 관계와 연결하고 Codex가 구현 문맥으로 읽을 수 있게 만드는 선택 단계다. 범용 드로잉 도구가 아니라 `기획 안정 ID → 시스템 컴포넌트 → 코드·테스트 경로` 추적에 초점을 둔다.

전체 흐름은 `프로젝트 → PRD → 기능명세 → 유저플로우 → 와이어프레임 → 시스템 설계 → 내보내기`다. 시스템 설계가 불필요한 프로젝트는 건너뛸 수 있다.

## UI 구조와 사용자 흐름

- 왼쪽 팔레트: Client, Service, Database, Cache, Queue, External System, Generic Component, Group 추가, 선택 노드 복제·삭제
- 중앙 캔버스: React Flow 기반 이동, 연결, 확대·축소, 미니맵, 좌→우 기본 정렬
- 오른쪽 상세: 노드 메타데이터와 기획·저장된 와이어프레임·코드·테스트 링크, 연결 프로토콜·인증·오류 처리 편집
- 선택 해제 상태: 규칙 기반 검토와 Codex 변경안 생성·승인·거절
- 저장: 명시적인 `새 리비전 저장`으로 현재 편집본을 불변 리비전으로 확정한다.

## 데이터 모델

MVP는 방식 B인 전체 캔버스 JSON snapshot을 선택했다. `system_designs`는 현재 리비전을 가리키고, `system_design_revisions`는 각 snapshot을 불변 저장한다. `system_design_proposals`는 AI 제안을 현재 원본과 분리한다.

## 관점과 패턴 기반 자동 배치

시스템 설계 snapshot은 노드와 연결을 단일 원본으로 유지하고 `viewType`과 `architecturePattern`을 함께 저장한다. 기존 snapshot에는 두 필드가 없을 수 있으므로 각각 `structural`, `auto`를 기본값으로 읽는다. 뷰마다 노드를 복제하지 않으며 좌표만 선택한 관점과 정렬 전략에서 다시 계산한다.

확장 모델은 `qualityAttributes`, `constraints`, `scenarios`, `decisions`를 snapshot에 저장한다. C4 하위 요소는 `parentId`로 상위 경계와 연결하고 런타임 시나리오는 정상·실패·복구 유형과 순서가 있는 edge ID를 참조한다. AI 결과는 요구사항 연결 후보로 제시해 사용자가 승인하며 기존 검토·구현 메타데이터는 Codex 재생성에서도 보존한다.

검토 점수는 연결성, 요구사항 추적성, 외부 연동 오류 처리와 기능 커버리지를 합성한다. 과도한 허브, 동기 fan-out, 소비자 없는 queue를 검토 후보로 표시하고 리비전 비교는 노드와 edge의 추가·삭제·변경을 ID 기준으로 계산한다.

구현 일치 검사는 저장소 밖 경로와 과도한 탐색을 차단하고 코드·테스트 존재 여부 및 제한된 TypeScript import/export/require와 Rust `use crate` 근거를 수집한다. 노드는 구현 단계와 branch·commit·deployment 상태를 함께 기록할 수 있다.

- 관점: `structural`, `runtime`, `deployment`, `development`
- 정렬: `auto`, `layered`, `hub_spoke`, `pipeline`, `event_driven`, `deployment`
- `auto`는 배포 관점, 메시지 큐·이벤트 연결, 그래프 중심 노드, 분기 수를 순서대로 검사해 가장 가까운 패턴을 선택한다.
- 재정렬 결과는 편집 상태에만 적용되고 사용자가 `새 리비전 저장`을 선택해야 불변 리비전으로 확정된다.
- 구조 뷰를 MVP 기준으로 하며 이후 동일 모델에서 런타임 흐름 overlay, 배포 경계와 C4 수준별 view 정의를 확장한다.

자동 생성은 PRD 문장을 곧바로 상자와 선으로 바꾸는 방식이 아니라 설계 동인, 품질 속성, 제약, 주요 시나리오와 트레이드오프를 먼저 식별해야 한다. 생성 결과는 JSON 검증과 연결성 검토를 통과해도 현재 설계를 직접 덮어쓰지 않고 사용자 승인 대기 제안으로 저장한다.

## C4 drill-down과 구현 일치 검사

노드는 선택적으로 `c4Level`과 `parentId`를 가진다. 한 모델에서 `Context → Container → Component → Code` 수준을 점진적으로 표시하며, 수준별 다이어그램을 별도 복제하지 않는다. 기존 노드는 유형을 기준으로 C4 수준을 추론한다. Context에서는 중심 클라이언트와 외부 시스템, Container에서는 실행 단위와 저장소, Component에서는 내부 책임 단위, Code에서는 모든 노드와 코드·테스트 연결을 보여준다.

런타임 관점은 연결의 `sequence`와 `isAsync`를 사용해 호출 순서, 비동기 점선과 흐름 애니메이션을 표시한다. 배포·개발 관점도 동일 노드·연결을 사용하고 표시와 정렬 규칙만 바꾼다.

`구현 일치 검사`는 설정에 연결된 로컬 Git 저장소를 읽기 전용으로 검사한다. 노드의 `codePaths`와 `testPaths`는 저장소 상대 경로만 허용하며 절대 경로와 `..` 이동을 거부한다. 디렉터리, 파일과 `src/**/*.test.ts` 형태의 제한된 glob을 확인하고 결과를 `verified`, `missing`, `unlinked` 후보로 표시한다. 이 검사는 코드 의미나 런타임 의존성을 확정하지 않으며, 자동 수정 없이 사용자가 검토할 drift 후보만 제공한다.

이 방식은 노드 위치 복원, 리비전 비교, AI 제안 격리, JSON 내보내기가 단순하며 기존 ProjectStudio 문서 리비전 원칙과 일치한다. 노드·연결 단위의 대규모 검색이 필요해지면 별도 인덱스 테이블을 추가할 수 있으나 MVP에서는 과도한 정규화를 피한다.

시스템 설계 마이그레이션은 `src-tauri/migrations/0006_system_designs.sql`, 와이어프레임 영속 페이지는 `0007_wireframe_pages.sql`이며 기존 프로젝트 데이터는 수정하지 않고 새 테이블만 추가한다.

## JSON 계약

최상위 snapshot은 `schemaVersion`, `title`, `summary`, `nodes`, `edges`를 가진다.

- 노드: 안정 ID, 유형, 이름, 설명, 기술, 배포 위치, 상태, 기능·유저플로우·와이어프레임 ID, 코드·테스트 경로, 설정, 위치와 크기
- 연결: 안정 ID, source/target 노드 ID, 유형, 프로토콜, 데이터 형식, 동기 여부, 인증, 오류 처리, 설명
- 검증: 빈·중복 ID, 존재하지 않는 대상, 자기 연결, 중복 연결, 비정상 좌표·크기를 저장 및 AI 반영 전에 차단한다.

생성한 와이어프레임은 프로젝트 ID와 유저플로우 원본 노드 ID를 복합 식별 경계로 SQLite에 upsert한다. 시스템 설계 노드 상세는 저장된 페이지 제목을 체크박스 목록으로 보여주고 내부에는 안정적인 페이지 ID를 기록한다. 같은 유저플로우 화면을 다시 생성하면 페이지 ID는 유지되고 최신 스냅샷으로 갱신된다.

그룹은 시각적 경계이면서 이동 단위다. 그룹 드래그 시작 시 경계 안에 완전히 포함된 일반 노드를 계산하고 그룹 이동 거리만큼 함께 옮긴다. 부분적으로 걸친 노드와 다른 그룹은 예상하지 않은 대량 이동을 막기 위해 포함하지 않는다.

## 리비전과 AI 변경안

사용자 저장은 새 리비전을 생성한다. Codex는 현재 snapshot과 기능명세·유저플로우를 입력으로 받고 JSON Schema에 맞는 완전한 제안 snapshot을 반환한다. 제안은 `pending` 상태로 별도 저장되며 승인 전 현재 설계를 변경하지 않는다. 승인 시 기준 리비전이 현재 리비전인지 다시 확인하고 새 리비전을 만든다. 기준이 달라졌으면 재생성을 요구한다. 거절은 원본을 유지한다.

Codex CLI는 ephemeral·read-only sandbox로 실행하며 출력 개수와 시간 제한을 적용한다. 유료 API는 사용하지 않는다.

## 설계 검토 규칙

검토 결과는 정답 판정이 아닌 `검토 필요` 경고다.

- 연결되지 않은 노드와 기능명세 링크가 없는 노드
- 상태를 다루지만 저장소 연결이 보이지 않는 서비스
- 오류 처리 없는 외부 시스템 연결
- 인증 정보가 없는 HTTP 연결
- 클라이언트의 데이터베이스 직접 연결
- 프로토콜 누락, 존재하지 않는 노드, 순환 의존성 가능성

## 내보내기와 Codex 동기화

- `project-context.md`: 선택한 전체 문맥과 시스템 설계
- `system-design.json`: 원본 snapshot
- `system-design.mmd`: Mermaid `flowchart LR`
- `project-report.pdf`: 시스템 설계 요약 표
- `.projectstudio/system-design.json`, `.projectstudio/system-design.md`: Git 저장소 동기화 문서
- `.projectstudio/manifest.json`: `systemDesign` 경로와 노드·연결 개수
- `.projectstudio/changes/latest.json`: snapshot 변경 기록

## MVP 범위와 제외

포함: 기본 노드·연결 편집, 위치 복원, 그룹 동반 이동, SQLite 리비전, 기능·유저플로우·영속 와이어프레임 링크, Codex 제안 승인·거절, 규칙 검토, Markdown·JSON·PDF·Mermaid 출력.

제외: 클라우드 전체 아이콘, Terraform/Kubernetes 생성, 실제 인프라 배포, 비용 계산, 실시간 협업, 완전한 UML, 여러 설계 뷰와 중첩 그룹 동반 이동.

## 검증

```powershell
pnpm lint
pnpm test
pnpm build
cd src-tauri
cargo fmt --check
cargo check
cargo test
```
