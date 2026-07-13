---
name: validate-task
description: 변경 후 프로젝트별 test, lint, typecheck, build와 도메인 검사를 실제로 실행하고 증거를 기록한다.
---

# 절차

1. 완료 조건과 검증 계획을 확인한다.
2. 설정된 `scripts/validate.py`를 기본 진입점으로 실행한다.
3. 스크립트가 없거나 충분하지 않으면 저장소의 공식 명령을 직접 실행한다.
4. 실패 검사를 삭제·skip·완화하지 않는다.
5. 수정 후 관련 검사와 회귀 검사를 다시 실행한다.
6. 실행하지 않은 검사는 `not_run`, 환경상 불가능한 검사는 `blocked`로 기록한다.
7. 결과를 `.codex/validation-report.json`과 `.codex/task-log.md`에 기록한다.
8. 필수 검사가 실패하면 완료를 선언하지 않는다.
