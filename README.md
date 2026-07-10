# ProjectStudio

개인 프로젝트의 아이디어를 PRD, 기능명세, 유저플로우와 와이어프레임으로 발전시키고 실제 코드·커밋·테스트·완료 상태까지 추적하는 로컬 우선 데스크톱 프로그램입니다.

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

프로젝트 → PRD → 기능명세의 첫 수직 흐름과 로컬 SQLite 저장을 구현했습니다. 흰색·검은색·회색·VS Code Dark 테마를 설정에서 바꿀 수 있고, 로컬 Codex/Git/GitHub CLI 상태와 프로젝트 저장소 연결을 관리할 수 있습니다. 초기 구현은 개인용 로컬 프로그램에 집중하며 로그인, 결제, 다중 사용자 협업은 제외합니다.

- [MVP 아키텍처와 구현 계획](docs/mvp-architecture.md)
- [개발 진행](docs/progress.md)
- [제품 초안](docs/product-brief.md)
- [Codex 동기화 계약](docs/codex-sync-contract.md)

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

Rust 버전과 필수 컴포넌트는 `rust-toolchain.toml`에 고정되어 있습니다. Tauri 실행 시 SQLite 데이터베이스는 운영체제의 앱 데이터 디렉터리에 생성됩니다.
