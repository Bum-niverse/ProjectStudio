# 공개 데모·0.4.0 보안 검토

검토일: 2026-07-30

## 범위와 위협 모델

공개 GitHub Pages 데모, Globeat fixture, 한국어·영어 전환, Codex 출력 언어 전달, GitHub Actions Pages 배포와 공개 Windows 배포 문서를 검토했다. 주요 위협은 로컬 데이터·경로·credential의 데모 번들 유출, 브라우저에서 데스크톱 권한 호출, 제3자 추적, 저장형 스크립트 실행과 배포 산출물 혼입이다.

## 결과

- 심각·높음·중간 위험 발견 없음.
- 공개 fixture에는 사용자 로컬 절대 경로, 이메일 주소, private key와 실제 credential 값이 없다.
- 데모는 `isTauri()`가 거짓인 브라우저 저장소만 사용하며 SQLite, 파일 시스템, Tauri command와 로컬 CLI를 호출하지 않는다.
- 별도 서버, analytics, 광고와 제3자 스크립트를 추가하지 않았다.
- 데모 편집 결과는 해당 브라우저 `localStorage`에만 남고 초기화 버튼으로 제거할 수 있다.
- Codex 언어 값은 `ko` 또는 `en` 유니온으로 제한되고, 기존 JSON Schema·참조 무결성 검사를 우회하지 않는다.
- 감사 중 발견된 PostCSS 8.5.17 이하 경로 노출과 brace-expansion 5.0.7 이하 DoS 전이 의존성은 workspace override로 각각 8.5.18과 5.0.8에 고정했다. 재검사 결과 알려진 취약점은 0건이다.

## 자동 검증

- fixture 개수와 로컬 경로·credential 패턴 회귀 테스트
- 기능명세 마인드맵 방사형 배치 회귀 테스트
- ESLint, Vitest, TypeScript/Vite build, Rust fmt/test
- `pnpm audit --audit-level=moderate`
- Git diff 비밀정보 패턴 검사

## 잔여 위험

- GitHub Pages는 저장소에서 사용자 지정 응답 헤더를 구성할 수 없어 데스크톱 Tauri CSP와 동일한 응답 CSP를 보장하지 않는다. 데모는 정적 same-origin asset만 사용하고 사용자 HTML을 삽입하지 않는다.
- Windows 설치 파일은 코드 서명 인증서가 없어 SmartScreen 경고가 표시될 수 있다. Release checksum과 게시 저장소 확인이 필요하다.
- ProjectStudio는 사용자가 별도로 인증한 GitHub·Codex CLI를 신뢰 경계 밖의 로컬 도구로 취급한다.
