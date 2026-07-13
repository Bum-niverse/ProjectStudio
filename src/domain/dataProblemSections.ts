import type { PrdSectionDefinition } from "./prdBlocks";
import type { ProjectType } from "./project";

const field = (id: string, placeholder: string) => ({ id, title: id, placeholder });

export function dataProblemSections(projectType: ProjectType): PrdSectionDefinition[] {
  const common: PrdSectionDefinition[] = [
    { id: "problem", title: "문제 정의", icon: "?", description: "분석이 필요한 이유와 결과가 바꿀 의사결정을 정의합니다.", fields: [field("사용자 문제", "해결하려는 문제와 현재 어려움"), field("분석 필요성", "왜 지금 이 분석이 필요한지"), field("결과 행동", "결과가 이어질 의사결정 또는 행동"), field("미해결 영향", "해결하지 않을 경우의 영향")] },
    { id: "stakeholders", title: "이해관계자", icon: "◎", description: "결과 사용자, 의사결정자, 데이터 제공자와 영향 대상을 구분합니다.", fields: [field("결과 사용자", "결과를 사용할 사람"), field("의사결정자", "결과로 결정하는 사람"), field("데이터 제공자", "데이터 소유자 또는 기관"), field("영향 대상", "결과의 영향을 받는 집단")] },
    { id: "goals", title: "목표와 범위", icon: "★", description: "목표, 제외 범위와 최소 완료 기준을 정의합니다.", fields: [field("제품 목표", "핵심 목표"), field("부가 목표", "부가 목표"), field("제외 범위", "다루지 않을 것"), field("사용자 시나리오", "결과 활용 시나리오"), field("완료 기준", "최소 완료 기준")] },
    { id: "questions", title: "분석 질문과 가설", icon: "∑", description: "알고 싶은 것과 검증 가능한 가설을 분리합니다.", fields: [field("분석 질문", "집단·기간·변수·패턴을 포함한 질문"), field("가설", "가설, 근거, 필요한 데이터, 검증 방법과 판정 기준")] },
    { id: "success", title: "성공 기준", icon: "✓", description: "비즈니스·분석·기술·운영 성공을 각각 정의합니다.", fields: [field("비즈니스 성공 기준", "의사결정 또는 성과 변화"), field("분석 성공 기준", "질문에 답했다고 판단할 기준"), field("기술 성공 기준", "재현성·정확도·실행 시간"), field("운영 가능성 기준", "비용·지연·유지보수"), field("핵심 지표", "핵심·보조 지표와 선택 근거")] },
    { id: "constraints", title: "제약과 위험", icon: "△", description: "데이터·권한·개인정보·자원·비용과 미결정을 기록합니다.", fields: [field("데이터 제약", "기간, 접근 권한, 데이터 존재 여부"), field("개인정보 제약", "개인정보와 민감정보 처리"), field("실행 제약", "연산 자원, 일정, 비용, 실시간성"), field("해석 가능성", "설명이 필요한 수준"), field("리스크", "가정, 제한, 미결정 사항")] },
  ];
  if (projectType === "machine_learning") common.splice(4, 0, { id: "ml-target", title: "예측·판단 계약", icon: "ML", description: "타깃과 관측·예측 시점을 명확히 하여 누수를 방지합니다.", fields: [field("예측 대상", "예측 또는 판단 대상"), field("타깃 변수", "타깃 후보와 근거"), field("관측 단위", "한 예측의 관측 단위"), field("입력 시점", "사용 가능한 입력 기준 시점"), field("예측 시점", "예측 시점과 horizon"), field("오탐·미탐 비용", "상대 비용"), field("추론 방식", "배치·온라인, 지연, 제공 방식")] });
  else common.splice(4, 0, { id: "analysis-contract", title: "분석 계약", icon: "DA", description: "비교·기간·검정·해석과 시각화 범위를 정의합니다.", fields: [field("비교 집단", "비교할 집단과 기준"), field("분석 기간", "시작·종료와 제외 기간"), field("통계 검정", "검정, 가정, 유의수준, 효과 크기"), field("인과 추론", "인과 여부와 식별 가정"), field("시각화 요구", "보고·대시보드 목적과 해석 대상")] });
  return common;
}
