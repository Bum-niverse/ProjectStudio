export interface PrdFieldDefinition { id:string; title:string; placeholder:string }
export interface PrdSectionDefinition { id:string; title:string; icon:string; description:string; fields:PrdFieldDefinition[] }
export type PrdBlockValues=Record<string,string>;

export const PRD_SECTIONS:PrdSectionDefinition[]=[
  {id:"overview",title:"개요",icon:"▣",description:"제품이 무엇이며 왜 필요한지 한눈에 설명합니다.",fields:[
    {id:"한 줄 정의",title:"한 줄 정의",placeholder:"제품을 한 문장으로 정의하세요."},{id:"제품 목표",title:"제품 목표",placeholder:"이 제품이 만들어낼 핵심 변화를 작성하세요."},{id:"배경",title:"배경",placeholder:"시장·사용 환경과 지금 이 제품이 필요한 이유를 작성하세요."},
  ]},
  {id:"problem",title:"문제 및 해결 방안",icon:"★",description:"사용자가 겪는 문제와 제품의 해결 방식을 연결합니다.",fields:[
    {id:"사용자 문제",title:"사용자 문제",placeholder:"현재 사용자가 겪는 구체적인 불편과 원인을 작성하세요."},{id:"해결 방안",title:"해결 방안",placeholder:"제품이 문제를 어떤 흐름으로 해결하는지 작성하세요."},{id:"차별점",title:"차별점",placeholder:"기존 대안과 다른 점을 작성하세요."},
  ]},
  {id:"target",title:"타겟 및 시나리오",icon:"♟",description:"누가 어떤 상황에서 제품을 사용하는지 정의합니다.",fields:[
    {id:"타겟 사용자",title:"타겟 사용자",placeholder:"핵심 사용자군과 각 사용자의 목적을 작성하세요."},{id:"사용자 시나리오",title:"사용자 시나리오",placeholder:"진입부터 목표 달성까지 대표 흐름을 작성하세요."},
  ]},
  {id:"success",title:"성공",icon:"◎",description:"제품이 유효하다고 판단할 수 있는 측정 기준을 정의합니다.",fields:[
    {id:"핵심 지표",title:"핵심 지표",placeholder:"활성화·완료·재방문 등 측정 가능한 지표를 작성하세요."},{id:"완료 기준",title:"MVP 완료 기준",placeholder:"첫 버전을 완료했다고 판단할 조건을 작성하세요."},
  ]},
  {id:"risks",title:"위험 요소",icon:"△",description:"실패 가능성과 범위 밖 항목을 미리 분리합니다.",fields:[
    {id:"리스크",title:"리스크",placeholder:"기술·정책·사용성·운영 위험과 대응 방향을 작성하세요."},{id:"제외 범위",title:"초기 제외 범위",placeholder:"이번 버전에서 구현하지 않을 항목을 작성하세요."},
  ]},
  {id:"attributes",title:"속성 설정",icon:"✓",description:"기능명세 생성에 사용할 제품 분류와 사용 환경을 정의합니다.",fields:[
    {id:"카테고리",title:"카테고리",placeholder:"예: 여행 · 음악 · 지도"},{id:"사용자 역할",title:"사용자 역할",placeholder:"예: 여행자, 큐레이터, 운영자"},{id:"기기",title:"기기",placeholder:"예: 반응형 웹, 모바일 웹, 데스크톱"},
  ]},
];

const FIELD_ALIASES:Record<string,string>={"대상 사용자":"타겟 사용자","핵심 문제":"사용자 문제","초기 범위":"해결 방안","성공 기준":"핵심 지표","제외 범위":"제외 범위"};

export function parsePrdMarkdown(markdown:string):PrdBlockValues{
  const values:PrdBlockValues={};let current="";const lines=markdown.split(/\r?\n/);const preamble:string[]=[];
  for(const line of lines){const heading=line.match(/^#{2,3}\s+(.+)$/);if(heading){current=FIELD_ALIASES[heading[1].trim()]??heading[1].trim();values[current]??="";continue;}if(/^#\s+/.test(line))continue;if(current)values[current]=`${values[current]}\n${line}`.trim();else if(line.trim())preamble.push(line.trim());}
  if(preamble.length&&!values["한 줄 정의"])values["한 줄 정의"]=preamble.join("\n");
  return values;
}

export function serializePrdMarkdown(projectTitle:string,values:PrdBlockValues,definitions:PrdSectionDefinition[]=PRD_SECTIONS):string{
  const sections=definitions.map(section=>`## ${section.title}\n\n${section.fields.map(field=>`### ${field.title}\n\n${values[field.id]?.trim()||"작성 필요"}`).join("\n\n")}`).join("\n\n");
  return `# ${projectTitle}\n\n${sections}\n`;
}

export function prdCompletion(values:PrdBlockValues,definitions:PrdSectionDefinition[]=PRD_SECTIONS):number{
  const fields=definitions.flatMap(section=>section.fields);const completed=fields.filter(field=>values[field.id]?.trim()&&values[field.id]?.trim()!=="작성 필요").length;
  return Math.round(completed/fields.length*100);
}
