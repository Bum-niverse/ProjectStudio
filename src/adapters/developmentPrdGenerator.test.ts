import{describe,expect,it}from"vitest";
import{createDevelopmentPrdValues}from"./developmentPrdGenerator";

describe("아이디어 기반 PRD 생성",()=>{
  it("데이터 분석 유형은 데이터 계보와 병합 품질을 중심으로 작성한다",()=>{
    const values=createDevelopmentPrdValues("매출 분석","여러 CSV를 병합해 월별 매출을 시각화한다.","data_analysis");
    expect(values["해결 방안"]).toContain("카디널리티");
    expect(values["완료 기준"]).toContain("병합 전후 행 수");
    expect(values["카테고리"]).toContain("데이터 분석");
    expect(values["제품 목표"]).not.toContain("모델 학습");
  });
  it("상세한 데이터 프로젝트 아이디어를 여러 PRD 블록으로 확장한다",()=>{
    const values=createDevelopmentPrdValues("주가 방향 예측기","무료 과거 주가 데이터를 수집해 과거 수익률과 이동평균을 만들고 다음 거래일의 상승·하락을 분류한다. 시간 순서 백테스트로 동전 던지기 기준선과 비교한다.");
    expect(values["해결 방안"]).toContain("피처와 레이블");
    expect(values["차별점"]).toContain("단순 기준선");
    expect(values["완료 기준"]).toContain("미래 정보");
    expect(values["리스크"]).toContain("과적합");
    expect(values["제외 범위"]).toContain("자동매매");
    expect(values["카테고리"]).toContain("머신러닝");
  });

  it("일반 아이디어는 원문을 보존하고 확인되지 않은 속성을 검토 대상으로 둔다",()=>{
    const values=createDevelopmentPrdValues("동네 도서 교환","이웃이 읽은 책을 등록하고 가까운 장소에서 서로 교환한다. 교환 약속과 완료 상태를 기록한다.");
    expect(values["제품 목표"]).toContain("이웃이 읽은 책");
    expect(values["배경"]).toContain("사용자 조사에서 검증");
    expect(values["타겟 사용자"]).toContain("확정 필요");
    expect(values["사용자 시나리오"]).toContain("결과 확인·저장");
  });
});
