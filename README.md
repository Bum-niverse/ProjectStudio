# ProjectStudio

개인 프로젝트의 아이디어를 PRD, 기능명세, 유저플로우와 와이어프레임으로 발전시키고 실제 코드·커밋·테스트·완료 상태까지 추적하는 로컬 우선 데스크톱 프로그램입니다.

앱을 열면 GitHub 로그인 잠금 화면이 먼저 표시됩니다. 현재 개인 작업대는 `Bum-niverse` GitHub 사용자 ID만 허용하며 로그인 전에는 로컬 프로젝트 데이터베이스를 읽지 않습니다. 인증 토큰은 ProjectStudio가 저장하지 않고 GitHub CLI의 Windows keyring 세션을 사용합니다. 소유자 로그인 후 개발자 모드를 켜면 Tauri 개발 서버에서 프론트엔드 변경사항이 HMR로 즉시 반영됩니다.

첫 실제 사용 프로젝트는 Globeat입니다.

## 목표

- AI 채팅 기반 기획
- 시각적 PRD와 계층형 기능명세
- 유저플로우와 와이어프레임
- 코멘트, 변경 기록과 AI 변경안 승인·거절
- Markdown/JSON 내보내기
- 기획 항목과 Git 브랜치·커밋·코드·테스트 연결
- 기획부터 개발 완료까지 상태 추적

## 현재 단계

프로젝트 → PRD → 기능명세의 첫 수직 흐름과 로컬 SQLite 저장을 구현했습니다. Pure Black·VS Code Light·Neutral Gray·VS Code Dark 테마를 설정에서 바꿀 수 있으며, Light/Dark 테마는 공식 VS Code Modern 색상 토큰에 맞춰 배경과 글씨 대비를 함께 전환합니다. 로컬 Codex/Git/GitHub CLI 상태와 프로젝트 저장소 연결도 관리할 수 있습니다. 초기 구현은 개인용 로컬 프로그램에 집중하며 로그인, 결제, 다중 사용자 협업은 제외합니다.

- [MVP 아키텍처와 구현 계획](docs/mvp-architecture.md)
- [개발 진행](docs/progress.md)
- [제품 초안](docs/product-brief.md)
- [Codex 동기화 계약](docs/codex-sync-contract.md)
- [UI/UX 설계 및 검수 기준](docs/ui-ux-guidelines.md)

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm tauri dev
```

브라우저 개발 미리보기는 메모리 저장소를 사용하고, Tauri 데스크톱 앱은 SQLite에 프로젝트와 PRD를 영속 저장합니다.

데스크톱 앱의 설정에서 로컬 Git 저장소를 지정한 뒤 `Codex 문서 동기화`를 실행하면 기능 문서와 변경 목록이 해당 저장소의 `.projectstudio` 폴더에 생성됩니다. API 키나 GitHub 토큰은 ProjectStudio에 저장하지 않습니다.

기능명세의 `AI 변경안`에서는 원본과 제안을 나란히 비교하고 승인 또는 거절할 수 있습니다. 승인 전에는 원본을 수정하지 않으며, 승인 시 기능명세와 수용 기준을 한 번에 반영하고 활동 기록을 남깁니다. 현재 제안 생성기는 외부 전송이 없는 로컬 개발 모드입니다.

4단계 유저플로우는 기능명세를 요구사항별 가로 스윔레인과 다단계 흐름으로 자동 펼칩니다. 대단계·화면·행동·분기·결과 노드를 구분하며, 노드 이동과 연결, 확대·축소, 기본 정렬과 우측 상세 편집을 지원합니다.

5단계 와이어프레임은 유저플로우에서 생성 후보 페이지를 모아 대주제별 접이식 목록으로 보여줍니다. 필요한 페이지와 데스크톱·모바일 디바이스를 고르면 외부 전송 없는 로컬 프리뷰로 화면 블록 초안을 만들고 페이지별 결과를 넘겨 볼 수 있습니다. Codex는 실제 CLI 생성까지 지원하며 Claude·Antigravity·Ollama 실제 생성과 SQLite 리비전 저장은 다음 구현 범위입니다.

Codex가 연결된 경우 `Codex` 생성 도구는 전달용 문서를 만드는 것이 아니라 선택한 유저플로우를 Codex CLI가 직접 해석해 페이지별 화면 구성 블록을 생성합니다. ProjectStudio는 구조화 결과를 검증한 뒤 동일한 와이어프레임 미리보기 화면에 표시합니다.

Codex는 각 화면 블록의 캔버스 좌표와 크기까지 반환합니다. 결과 화면은 설명 카드가 아니라 헤더, 검색, 지도·이미지 자리, 지표 카드, 폼, 표·목록, 상세 패널과 버튼이 배치된 실제 저충실도 화면 구성으로 표시됩니다.

6단계 내보내기는 프로젝트 개요, PRD, 기능명세·수용 기준과 유저플로우를 CSV 묶음, A4 PDF 보고서와 LLM용 Markdown으로 정리합니다. Codex·Claude·Antigravity·범용 LLM용 실행 프롬프트를 함께 만들며 모든 파일은 사용자가 지정한 로컬 폴더의 `ProjectStudio-Exports` 아래에 저장됩니다.

Rust 버전과 필수 컴포넌트는 `rust-toolchain.toml`에 고정되어 있습니다. Tauri 실행 시 SQLite 데이터베이스는 운영체제의 앱 데이터 디렉터리에 생성됩니다.
