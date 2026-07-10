import type { PrdDraftInput, PrdGenerator } from "../ports/prdGenerator";

export class DevelopmentPrdGenerator implements PrdGenerator {
  readonly mode = "development" as const;

  async generateDraft({ projectName, idea }: PrdDraftInput): Promise<string> {
    return `# ${projectName} PRD

## 제품 목표

${idea}

## 대상 사용자

- 해결하려는 문제를 직접 소유하고 제품을 만들어 가는 개인 사용자

## 핵심 문제

- 아이디어를 검증 가능한 제품 요구사항과 개발 작업으로 구체화해야 한다.

## 초기 범위

- 가장 중요한 사용자 흐름을 작은 수직 기능으로 구현한다.
- 결과를 저장하고 다시 열어 이어서 편집할 수 있다.

## 제외 범위

- 로그인, 결제, 다중 사용자 실시간 협업

## 성공 기준

- 사용자가 핵심 흐름을 처음부터 끝까지 완료할 수 있다.
- 저장된 결과가 재실행 후에도 동일하게 복원된다.
`;
  }
}
