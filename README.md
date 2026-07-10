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

MVP 아키텍처와 초기 데이터 모델을 확정하고 첫 수직 기능 구현을 준비하고 있습니다. 초기 구현은 개인용 로컬 프로그램에 집중하며 로그인, 결제, 다중 사용자 협업은 제외합니다.

- [MVP 아키텍처와 구현 계획](docs/mvp-architecture.md)
- [개발 진행](docs/progress.md)
- [제품 초안](docs/product-brief.md)

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

현재 브라우저 개발 미리보기는 메모리 저장소를 사용합니다. Tauri 네이티브 셸과 SQLite 연결 후 로컬 영속 저장으로 교체합니다.
