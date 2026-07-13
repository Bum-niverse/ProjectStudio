# ProjectStudio 보안 점검 — 2026-07-14

## 범위와 위협 모델

ProjectStudio는 로컬 Tauri 애플리케이션이다. 이번 점검은 WebView에서 Rust command로 넘어가는 입력, 로컬 SQLite, Git 저장소 동기화, 문서 내보내기, Codex·GitHub CLI 실행, 번들 설정과 의존성을 대상으로 했다. 공격자는 변조된 렌더러 입력을 command에 전달할 수 있지만 운영체제 사용자 계정 자체를 이미 장악하지는 않았다고 가정했다.

## 조치한 발견 사항

### 높음 — 내보내기 파일명 경로 이탈

LLM 대상 문자열이 파일명 일부로 직접 사용되어 `../`와 같은 값이 command 경계를 통과하면 선택한 출력 폴더 밖의 파일에 쓸 수 있었다.

- 형식, 섹션과 LLM 대상을 서버 측 allowlist로 검증한다.
- LLM 프롬프트 파일명은 사용자 입력을 조합하지 않고 고정 매핑한다.
- 비정상 대상과 경로 형태 입력을 거부하는 Rust 테스트를 추가했다.

### 중간 — 연결되지 않은 Git 저장소에 동기화 가능

동기화 command가 화면에서 전달한 임의 Git 경로를 신뢰했다. 이제 SQLite 프로젝트에 저장된 경로를 canonicalize해 요청 경로와 일치하는지 확인한 후에만 `.projectstudio`를 생성한다. 검증 전에는 대상 경로에 어떤 파일도 만들지 않는다.

### 중간 — Tauri Content Security Policy 미설정

`csp: null` 상태를 제거하고 기본 출처를 애플리케이션 자체로 제한했다. 스크립트, 이미지, 폰트, IPC, object와 frame 경계를 명시했다. 기존 React Flow 인라인 스타일 호환 때문에 `style-src 'unsafe-inline'`은 남아 있으며 후속 강화 대상이다.

### 낮음 — Git 저장소 표시 검증 부족

`.git` 경로가 존재하기만 하면 저장소로 인정하던 검사를 디렉터리 여부 검사로 강화했다.

## 확인 결과

- `pnpm audit --audit-level=moderate`: 알려진 moderate 이상 취약점 없음
- 저장소 추적 파일에서 일반적인 private key, GitHub token, OpenAI key, service-role 표식 검색: 발견 없음
- 외부 프로세스 실행은 shell 문자열 결합이 아니라 고정 실행 파일과 인자 배열을 사용함
- Codex 입력 길이, JSON schema, timeout과 임시 파일 정리 경계가 존재함
- 구현 drift 파일 조회는 상대 경로, canonical 경계, 파일 수와 크기를 제한함

## 잔여 위험과 운영 경계

- Windows 설치 파일의 코드 서명은 아직 구성되지 않았다. 배포 시 게시자 신뢰 경고가 나타날 수 있다.
- 로컬 GitHub CLI와 Codex CLI 자체 및 사용자의 인증 상태는 신뢰 경계 밖이다.
- CSP의 인라인 스타일 허용은 현재 UI 라이브러리 호환을 위한 예외다. nonce 기반 스타일 적용 가능성을 후속 검토한다.
- 실제 타인 계정이나 운영 데이터를 사용한 침투 테스트는 수행하지 않았다.
- 이 문서는 코드와 로컬 빌드 설정 점검 결과이며, 배포된 설치 파일의 실제 네트워크 응답을 검증한 기록은 아니다.
