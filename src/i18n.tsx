import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "ko" | "en";
const messages = {
  demo: { ko: "공개 데모", en: "Public demo" },
  resetDemo: { ko: "데모 초기화", en: "Reset demo" },
  settings: { ko: "설정", en: "Settings" },
  localOnly: { ko: "로컬 저장 · 외부 전송 없음", en: "Local-only · no external upload" },
  projectIntro: { ko: "아이디어에서 시작합니다.", en: "Start with an idea." },
  projectIntroBody: { ko: "프로젝트 유형, 이름과 핵심 아이디어를 기준으로 필요한 기획 단계를 구성합니다.", en: "Shape a complete planning workflow from the project type, name, and core idea." },
  recentProjects: { ko: "기존 프로젝트", en: "Projects" },
  loading: { ko: "불러오는 중…", en: "Loading…" },
  noProjects: { ko: "아직 저장된 프로젝트가 없습니다.", en: "No saved projects yet." },
  document: { ko: "문서", en: "Document" },
  tree: { ko: "트리", en: "Tree" },
  mindmap: { ko: "마인드맵", en: "Mind map" },
  aiProposal: { ko: "AI 변경안", en: "AI proposals" },
} as const;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof messages) => string;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem("projectstudio:locale") === "en" ? "en" : "ko");
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("projectstudio:locale", locale);
  }, [locale]);
  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t: (key) => messages[key][locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
