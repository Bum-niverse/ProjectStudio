import type { FeatureSpec } from "./feature";
import { projectTypeLabel, type ProjectType } from "./project";
import type { SystemDesignSnapshot } from "./systemDesign";
import type { UserFlowEdge, UserFlowNode } from "./userFlow";

export type QualitySeverity="error"|"warning"|"info";
export interface QualityFinding{id:string;severity:QualitySeverity;artifact:"prd"|"feature"|"user_flow"|"system_design"|"traceability";title:string;detail:string;recommendation:string}
export interface PlanningQualityReport{projectType:ProjectType;projectTypeLabel:string;score:number;gate:"pass"|"review"|"blocked";checks:number;passedChecks:number;findings:QualityFinding[]}
export interface PlanningArtifacts{projectType?:ProjectType;prdMarkdown:string;features:FeatureSpec[];userFlow:{nodes:UserFlowNode[];edges:UserFlowEdge[]};systemDesign:SystemDesignSnapshot}

export function classifyProject(prdMarkdown:string,features:FeatureSpec[]):ProjectType{
  const text=`${prdMarkdown} ${features.map(feature=>`${feature.title} ${feature.description}`).join(" ")}`.toLowerCase();
  if(/머신러닝|machine learning|모델 학습|예측|분류|회귀|피처|레이블|백테스트/.test(text))return"machine_learning";
  if(/데이터 분석|대시보드|리포트|etl|데이터 수집|전처리|시각화|통계 분석/.test(text))return"data_analysis";
  if(/모바일|android|ios/.test(text))return"mobile";
  if(/데스크톱|tauri|electron|windows 프로그램/.test(text))return"desktop";
  if(/api|백엔드|cli|자동화 도구/.test(text))return"backend_cli";
  if(/웹|화면|로그인|회원가입|사용자|버튼|페이지|서비스/.test(text))return"web";
  return"general";
}

export function inspectPlanningQuality(artifacts:PlanningArtifacts):PlanningQualityReport{
  const projectType=artifacts.projectType&&artifacts.projectType!=="auto"?artifacts.projectType:classifyProject(artifacts.prdMarkdown,artifacts.features);const findings:QualityFinding[]=[];let checks=0;let passed=0;
  const text=[artifacts.prdMarkdown,...artifacts.features.flatMap(feature=>[feature.title,feature.description,...feature.acceptanceCriteria.map(item=>item.description)]),...artifacts.userFlow.nodes.flatMap(node=>[node.title,node.description]),artifacts.systemDesign.summary,...artifacts.systemDesign.nodes.flatMap(node=>[node.name,node.description,node.technology])].join(" ").toLowerCase();
  const check=(condition:boolean,finding:QualityFinding)=>{checks++;if(condition)passed++;else findings.push(finding);};
  const featureIds=new Set(artifacts.features.map(feature=>feature.id));const flowIds=new Set(artifacts.userFlow.nodes.map(node=>node.id));const roots=artifacts.features.filter(feature=>!feature.parentId);
  check(roots.length===1,{id:"feature-root",severity:"error",artifact:"feature",title:"기능명세 루트가 하나가 아닙니다.",detail:`루트 ${roots.length}개가 발견됐습니다.`,recommendation:"제품 루트 하나 아래 대주제와 하위 기능을 배치하세요."});
  check(artifacts.features.length>=12,{id:"feature-depth",severity:"warning",artifact:"feature",title:"기능명세가 충분히 세분화되지 않았습니다.",detail:`현재 ${artifacts.features.length}개 기능입니다.`,recommendation:"핵심 목표를 화면·행동·결과·오류 복구와 데이터 책임으로 세분화하세요."});
  check(artifacts.features.filter(feature=>feature.parentId).every(feature=>feature.acceptanceCriteria.length>0),{id:"acceptance",severity:"warning",artifact:"feature",title:"수용 기준이 없는 기능이 있습니다.",detail:"검증 가능한 완료 조건이 누락됐습니다.",recommendation:"정상·실패·권한 또는 데이터 경계 조건을 구체적인 문장으로 작성하세요."});
  const isInterface=["web","mobile","desktop","general"].includes(projectType);
  check(isInterface?artifacts.userFlow.nodes.some(node=>node.kind==="screen")&&artifacts.userFlow.nodes.some(node=>node.kind==="action")&&artifacts.userFlow.nodes.some(node=>node.kind==="result"):artifacts.userFlow.nodes.some(node=>node.kind==="phase")&&artifacts.userFlow.nodes.some(node=>node.kind==="result"),{id:"flow-contract",severity:"error",artifact:"user_flow",title:isInterface?"화면·행동·결과 흐름이 완전하지 않습니다.":"실행 파이프라인의 시작·결과가 완전하지 않습니다.",detail:isInterface?"유저플로우의 필수 사용자 가시 단계가 누락됐습니다.":"입력부터 결과까지 실행 경계가 누락됐습니다.",recommendation:isInterface?"현재 화면 → 구체적인 사용자 행동 → 다음 화면 또는 결과를 연결하세요.":"입력 → 검증 → 처리 → 결과·실패 산출물을 연결하세요."});
  check(!isInterface||!artifacts.userFlow.nodes.some(node=>/RLS|SQL|데이터베이스 저장|토큰 갱신|URL 안전 검증|내부 처리/.test(`${node.title} ${node.description}`)),{id:"flow-internals",severity:"error",artifact:"user_flow",title:"유저플로우에 내부 구현이 섞였습니다.",detail:"사용자가 직접 수행하거나 확인할 수 없는 단계가 있습니다.",recommendation:"내부 처리는 기능 수용 기준이나 시스템 설계로 이동하세요."});
  const connectedFlowIds=new Set(artifacts.userFlow.edges.flatMap(edge=>[edge.sourceNodeId,edge.targetNodeId]));
  check(artifacts.userFlow.nodes.every(node=>connectedFlowIds.has(node.id)||artifacts.userFlow.nodes.length===1),{id:"isolated-flow",severity:"warning",artifact:"user_flow",title:"고립된 유저플로우 노드가 있습니다.",detail:"앞뒤 화면과 연결되지 않은 단계가 발견됐습니다.",recommendation:"진입 경로와 다음 화면 또는 완료 결과를 연결하세요."});
  check(artifacts.systemDesign.nodes.length>=3&&artifacts.systemDesign.edges.length>=2,{id:"architecture-depth",severity:"warning",artifact:"system_design",title:"시스템 설계가 핵심 책임을 설명하기에 얕습니다.",detail:`노드 ${artifacts.systemDesign.nodes.length}개, 연결 ${artifacts.systemDesign.edges.length}개입니다.`,recommendation:"클라이언트·서비스·저장소·외부 시스템과 통신 경계를 분리하세요."});
  const linkedFeatures=new Set(artifacts.systemDesign.nodes.flatMap(node=>node.linkedFeatureIds));
  check([...linkedFeatures].every(id=>featureIds.has(id)),{id:"feature-links",severity:"error",artifact:"traceability",title:"존재하지 않는 기능명세 연결이 있습니다.",detail:"시스템 설계의 기능 ID가 현재 명세와 일치하지 않습니다.",recommendation:"실제 기능 ID만 연결하고 후보 링크는 승인 전 확정하지 마세요."});
  const linkedFlows=new Set(artifacts.systemDesign.nodes.flatMap(node=>node.linkedUserFlowIds));
  check([...linkedFlows].every(id=>flowIds.has(id)),{id:"flow-links",severity:"error",artifact:"traceability",title:"존재하지 않는 유저플로우 연결이 있습니다.",detail:"시스템 설계의 유저플로우 ID가 현재 모델과 일치하지 않습니다.",recommendation:"현재 유저플로우 노드만 연결하세요."});
  if(["web","mobile","desktop"].includes(projectType)){
    check(/로딩|빈 상태|오류|실패/.test(text),{id:"app-states",severity:"warning",artifact:"feature",title:"화면 상태 정의가 부족합니다.",detail:"로딩·빈 상태·오류 상태를 찾기 어렵습니다.",recommendation:"핵심 화면마다 loading, empty, error와 재시도 동작을 정의하세요."});
    check(/인증|로그인|권한|공개 범위|소유권/.test(text),{id:"app-access",severity:"warning",artifact:"feature",title:"인증·권한 경계가 불명확합니다.",detail:"사용자별 접근 조건을 찾기 어렵습니다.",recommendation:"익명·로그인·소유자·관리자 접근을 서버 기준으로 구분하세요."});
  }
  if(projectType==="machine_learning"){
    check(/데이터 출처|원천 데이터|수집/.test(text),{id:"ml-source",severity:"error",artifact:"prd",title:"학습 데이터 출처가 없습니다.",detail:"데이터의 출처·기간·대상을 확인할 수 없습니다.",recommendation:"원천 데이터, 기준 시점, 수집 실패와 버전을 정의하세요."});
    check(/시간 순서|시계열 분할|train|validation|test|학습 구간|검증 구간/.test(text),{id:"ml-split",severity:"error",artifact:"feature",title:"학습·검증 분할 기준이 없습니다.",detail:"평가 시점의 데이터 격리가 불명확합니다.",recommendation:"시간순 또는 목적에 맞는 train/validation/test 분할을 고정하세요."});
    check(/누수|leakage|미래 정보/.test(text),{id:"ml-leakage",severity:"error",artifact:"feature",title:"데이터 누수 검사가 없습니다.",detail:"미래·타깃 파생 정보 사용 여부를 확인할 수 없습니다.",recommendation:"피처별 기준 시점과 target leakage 검사를 추가하세요."});
    check(/기준선|baseline/.test(text)&&/정확도|f1|auc|mae|rmse|평가지표|성능 지표/.test(text),{id:"ml-evaluation",severity:"warning",artifact:"feature",title:"기준선 또는 평가 지표가 부족합니다.",detail:"모델 개선 여부를 비교할 기준이 불완전합니다.",recommendation:"단순 기준선과 목적에 맞는 평가 지표를 함께 정의하세요."});
    check(/seed|시드|재현|버전/.test(text),{id:"ml-reproducibility",severity:"warning",artifact:"system_design",title:"학습 재현성 정보가 부족합니다.",detail:"데이터·코드·모델·시드 버전을 찾기 어렵습니다.",recommendation:"입력 버전, random seed, 환경과 모델 산출물 경로를 기록하세요."});
  }
  if(projectType==="data_analysis"){
    check(/데이터 출처|원천 데이터|수집/.test(text),{id:"data-source",severity:"error",artifact:"prd",title:"분석 데이터 출처가 없습니다.",detail:"어떤 데이터로 분석하는지 불명확합니다.",recommendation:"출처, 기준 시점, 단위와 갱신 주기를 정의하세요."});
    check(/스키마|컬럼|타입|단위/.test(text),{id:"data-schema",severity:"warning",artifact:"feature",title:"입력 스키마 검사가 없습니다.",detail:"컬럼 타입과 단위를 확인할 수 없습니다.",recommendation:"필수 컬럼, 타입, 단위, 허용 범위를 명시하세요."});
    check(/조인|병합|키|cardinality|카디널리티/.test(text),{id:"data-join",severity:"warning",artifact:"feature",title:"병합 키와 카디널리티가 불명확합니다.",detail:"중복 행을 만드는 다대다 결합 위험을 검사하지 못합니다.",recommendation:"병합 키 유일성과 예상 행 수를 정의하세요."});
    check(/결측|중복|이상치/.test(text),{id:"data-integrity",severity:"error",artifact:"feature",title:"결측·중복·이상치 검사가 없습니다.",detail:"분석 전 데이터 무결성 기준이 누락됐습니다.",recommendation:"변경 전후 행 수, 중복, 결측률과 값 범위를 검증하세요."});
    check(/재현|버전|lineage|계보|원본/.test(text),{id:"data-lineage",severity:"warning",artifact:"system_design",title:"데이터 계보와 재현성이 부족합니다.",detail:"입력에서 결과까지의 버전을 추적하기 어렵습니다.",recommendation:"raw를 보존하고 processed·derived 결과의 입력 버전과 실행 시각을 기록하세요."});
  }
  const penalty=findings.reduce((sum,finding)=>sum+(finding.severity==="error"?14:finding.severity==="warning"?7:2),0);const score=Math.max(0,100-penalty);const gate=findings.some(finding=>finding.severity==="error")?"blocked":findings.length?"review":"pass";
  return{projectType,projectTypeLabel:projectTypeLabel(projectType),score,gate,checks,passedChecks:passed,findings};
}
