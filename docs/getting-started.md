# ProjectStudio Windows 설치 및 사용 가이드

## 1. 설치 파일 받기

1. [최신 GitHub Release](https://github.com/Bum-niverse/ProjectStudio/releases/latest)에서 `ProjectStudio_<버전>_x64-setup.exe`를 받습니다.
2. 같은 Release의 `SHA256SUMS.txt`와 설치 파일의 해시를 비교할 수 있습니다.

```powershell
Get-FileHash .\ProjectStudio_0.4.0_x64-setup.exe -Algorithm SHA256
```

ProjectStudio는 아직 유료 코드 서명 인증서를 적용하지 않은 베타라 Windows SmartScreen에서 `알 수 없는 게시자` 경고가 나타날 수 있습니다. GitHub 저장소 소유자와 SHA-256 값이 일치할 때만 설치하세요.

## 2. GitHub CLI 로그인

ProjectStudio는 앱 진입 확인에 이 컴퓨터의 GitHub CLI 세션을 사용합니다. ProjectStudio가 GitHub 비밀번호나 토큰을 직접 받거나 저장하지 않습니다.

```powershell
winget install --id GitHub.cli
gh auth login --hostname github.com --web --git-protocol https
gh auth status
```

설치 후 ProjectStudio를 열고 `GitHub 세션 확인하고 시작`을 누릅니다. GitHub 계정 종류와 관계없이 각 사용자는 자신의 Windows 계정에 있는 별도 로컬 작업대를 사용합니다.

## 3. Codex 연결하기(선택)

Codex CLI가 없어도 프로젝트 생성, 규칙 기반 PRD·기능명세·유저플로우 또는 실행 파이프라인, 시스템 설계 편집과 내보내기를 사용할 수 있습니다.

더 상세한 산출물을 자동 생성하려면 [공식 Codex CLI 안내](https://developers.openai.com/codex/cli)를 따라 Codex CLI를 준비한 뒤 로그인합니다.

```powershell
codex login
codex login status
```

ProjectStudio의 `설정 → LLM 연결 → CODEX CLI`에서 실행 파일 경로를 `codex`로 두고 `연결 확인`을 누릅니다. 이 확인은 버전만 읽으며 프로젝트 문서를 전송하지 않습니다.

## 4. 첫 프로젝트 만들기

1. `프로젝트`에서 웹 서비스, 모바일 앱, 머신러닝 또는 데이터 분석 유형을 선택합니다.
2. 프로젝트 이름과 해결하려는 문제를 입력해 프로젝트를 만듭니다.
3. ProjectStudio가 PRD를 먼저 로컬 SQLite에 저장합니다.
4. Codex CLI가 연결되어 있으면 `Codex로 상세 산출물 생성`을 눌러 현재 PRD에서 기능명세, 수용 기준, 유저플로우 또는 실행 파이프라인과 시스템 설계를 자동 생성합니다.
5. 생성 결과의 품질 점수와 경고를 확인하고 `문서 · 트리 · 마인드맵`, 유저플로우 `전체 보기`와 시스템 설계에서 내용을 검토합니다.
6. 구현 저장소를 연결한 뒤 Markdown·JSON·CSV·Mermaid·PDF로 내보냅니다.

Codex 실행 중에는 현재 프로젝트명, 유형과 PRD가 이 컴퓨터에서 실행한 Codex CLI를 통해 사용자가 로그인한 OpenAI 서비스로 전달될 수 있습니다. 적용되는 보존·데이터 정책은 Codex 로그인 방식과 계정 정책을 따릅니다. ProjectStudio는 Codex를 `read-only`·`ephemeral` 모드와 5분 제한으로 실행하며 결과가 JSON Schema와 참조 무결성 검사를 통과한 경우에만 저장합니다. 생성에 실패해도 기존 PRD와 산출물은 유지됩니다.

## 5. 데이터와 업데이트

- 프로젝트 데이터는 Windows 앱 데이터 폴더의 `projectstudio.db`에 저장됩니다.
- ProjectStudio 서버나 공개 클라우드로 자동 업로드하지 않습니다.
- GitHub 및 Codex 인증 정보는 각 CLI가 관리하며 ProjectStudio DB에 저장하지 않습니다.
- 앱을 제거해도 로컬 DB가 자동으로 삭제된다고 가정하지 마세요.
- 자동 업데이트는 아직 없으므로 새 Release를 내려받아 덮어 설치합니다. 중요한 프로젝트는 업데이트 전에 내보내거나 DB를 백업하세요.

자세한 경계는 [로컬 데이터와 개인정보](privacy.md), 보안 검토 결과는 [공개 데모·0.4.0 보안 검토](security-audit-2026-07-30.md)를 참고하세요.
