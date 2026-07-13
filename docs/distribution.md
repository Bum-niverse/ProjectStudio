# ProjectStudio Windows 베타 배포 및 업데이트

## 사용자 준비

설치형 ProjectStudio는 Node.js, pnpm, Rust와 개발 소스가 필요하지 않다. GitHub 로그인 잠금을 사용하려면 GitHub CLI가 필요하다.

```powershell
winget install --id GitHub.cli
gh auth login --hostname github.com --web --git-protocol https
```

Codex, Claude, Antigravity와 Ollama는 선택 사항이다. 설치되지 않아도 로컬 프리뷰를 포함한 기본 기획 기능은 동작한다.

## 설치 파일 생성

개발 저장소에서 다음 명령을 실행한다.

```powershell
pnpm install --frozen-lockfile
pnpm tauri build
```

결과는 `src-tauri/target/release/bundle/nsis`와 `src-tauri/target/release/bundle/msi`에 생성된다. 일반 지인 공유에는 설치 과정이 단순한 NSIS `.exe`를 우선 사용하고 관리형 설치가 필요하면 MSI를 사용한다.

## private GitHub 공유

저장소는 private으로 유지한다. 소스를 함께 개발할 지인만 GitHub 저장소 Collaborator로 초대한다. 단순 사용자는 소스 접근 권한 없이 빌드된 설치 파일만 전달한다. 설치 파일에 프로젝트 SQLite, GitHub 토큰, 로컬 경로와 내보낸 문서가 포함되지 않았는지 배포 전에 확인한다.

## Windows 경고

현재 베타 설치 파일에는 유료 코드 서명 인증서를 적용하지 않는다. 따라서 Windows SmartScreen이 `알 수 없는 게시자` 경고를 표시할 수 있다. 파일의 커밋, 버전과 SHA-256 체크섬을 함께 전달하고 신뢰할 수 있는 지인에게만 공유한다.

```powershell
Get-FileHash .\ProjectStudio_0.3.0_x64-setup.exe -Algorithm SHA256
```

## 업데이트

현재 자동 업데이트 서버는 사용하지 않는다.

1. `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전을 함께 올린다.
2. 테스트 후 새 NSIS와 MSI를 빌드한다.
3. 파일명, 버전, 커밋 ID와 SHA-256을 사용자에게 전달한다.
4. 사용자는 ProjectStudio를 종료하고 새 설치 파일을 실행해 덮어 설치한다.
5. 실행 후 설정에서 버전과 로컬 데이터 경로를 확인한다.

앱 데이터는 설치 폴더 밖의 Windows 앱 데이터 폴더에 있으므로 정상적인 덮어 설치에서는 기존 프로젝트가 유지된다. 그래도 베타 업데이트 전에는 내보내기 또는 SQLite 복사를 권장한다.
