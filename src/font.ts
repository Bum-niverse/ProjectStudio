export type FontId="ibm-plex-kr"|"system";
export const FONTS:Array<{id:FontId;name:string;description:string;sample:string}>=[
  {id:"ibm-plex-kr",name:"IBM Plex Sans KR",description:"긴 기획 문서와 UI에 맞는 기본 글꼴",sample:"장소와 음악을 연결하는 새로운 경험"},
  {id:"system",name:"시스템 기본",description:"운영체제의 기본 UI 글꼴 사용",sample:"장소와 음악을 연결하는 새로운 경험"},
];
const FONT_KEY="projectstudio:font";
export function loadFont():FontId{const saved=localStorage.getItem(FONT_KEY);return FONTS.some(font=>font.id===saved)?saved as FontId:"ibm-plex-kr";}
export function applyFont(font:FontId){document.documentElement.dataset.font=font;localStorage.setItem(FONT_KEY,font);}
