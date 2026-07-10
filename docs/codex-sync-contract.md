# ProjectStudio Codex 동기화 계약 v0.1

## 목적

ProjectStudio에서 수정한 기획 문서를 Codex가 안정적인 파일 경로와 식별자로 읽고, 변경된 요구사항이 어떤 기능·코드·테스트에 영향을 주는지 추적할 수 있게 한다.

SQLite는 편집 데이터의 단일 원본이다. Markdown과 JSON은 Codex 및 외부 도구를 위한 동기화 산출물이며 직접 수정된 경우에는 가져오기 전 비교·승인을 거친다.

## 저장 구조

연결된 개발 저장소 아래에 다음 구조를 생성한다.

```text
.projectstudio/
  manifest.json
  project.md
  features/
    F-XXXXXX.md
  changes/
    latest.json
```

v0.1 구현 범위는 `project.md`, `manifest.json`, 기능 Markdown과 `changes/latest.json`이다. 요구사항 전용 파일, 변경 이력 보관과 코드·테스트 역동기화는 후속 단계에서 추가한다.

## 안정적인 식별자

- 프로젝트, 요구사항, 기능, 수용 기준은 생성 후 바뀌지 않는 ID를 갖는다.
- 파일명은 제목이 아니라 ID를 기준으로 한다.
- 제목 변경은 파일 경로를 바꾸지 않는다.
- 부모·자식 관계는 ID로 저장한다.

## Markdown 문서

각 기능 문서는 YAML front matter와 사람이 읽는 본문을 함께 가진다.

```markdown
---
id: F-XXXXXX
parentId: R-XXXXXX
status: ready
priority: high
role: 배송 담당자
revision: 4
updatedAt: 2026-07-10T09:00:00Z
---

# 배송지 엑셀/CSV 업로드 및 데이터 검증

## 설명

...

## 수용 기준

- [ ] AC-XXXXXX 엑셀/CSV 업로드 후 배송지 목록이 표시된다.

## 연결된 구현

- file: src/features/import.ts
- test: tests/import.spec.ts
```

## 변경 manifest

`changes/latest.json`은 마지막 동기화 이후 변경된 항목만 기록한다.

```json
{
  "schemaVersion": 1,
  "projectId": "...",
  "generatedAt": "...",
  "baseRevision": 12,
  "revision": 13,
  "changes": [
    {
      "entityType": "feature",
      "entityId": "F-XXXXXX",
      "changeType": "updated",
      "changedFields": ["description", "acceptanceCriteria"],
      "documentPath": ".projectstudio/features/F-XXXXXX.md"
    }
  ]
}
```

## Codex 사용 흐름

1. 사용자가 ProjectStudio에서 문서를 편집하고 저장한다.
2. SQLite에 불변 리비전과 활동 기록을 추가한다.
3. 해당 Markdown, `manifest.json`, `changes/latest.json`을 원자적으로 갱신한다.
4. 사용자는 Codex에 `.projectstudio/changes/latest.json`과 연결 문서를 먼저 읽도록 지시한다.
5. Codex는 변경 ID에서 `trace_links`를 따라 관련 코드·커밋·테스트를 확인한다.
6. 코드 변경 후 검증 결과와 커밋을 다시 ProjectStudio 추적 링크에 연결한다.

## 안전 규칙

- API 키, 토큰, 사용자 홈 경로는 산출물에 기록하지 않는다.
- 파일 쓰기는 연결된 저장소의 `.projectstudio` 아래로 제한한다.
- 임시 파일 작성 후 교체하는 방식으로 부분 저장을 방지한다.
- 외부에서 수정된 파일은 SQLite 원본을 자동 덮어쓰지 않고 변경안으로 가져온다.
