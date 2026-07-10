export type ThemeId = "pure-black" | "light" | "neutral-gray" | "vscode-dark";

export const THEMES: Array<{ id: ThemeId; name: string; description: string; colors: string[] }> = [
  { id: "pure-black", name: "Pure Black", description: "OLED에 어울리는 깊은 검정과 라임 포인트", colors: ["#050506", "#111216", "#d9ff57"] },
  { id: "light", name: "Light", description: "밝은 문서 작업용 흰색과 파란 포인트", colors: ["#f5f6f8", "#ffffff", "#2563eb"] },
  { id: "neutral-gray", name: "Neutral Gray", description: "눈부심을 줄인 중성 회색 작업 환경", colors: ["#25272b", "#303238", "#e5c07b"] },
  { id: "vscode-dark", name: "VS Code Dark", description: "VS Code 계열의 짙은 남회색과 파란 포인트", colors: ["#181818", "#1f1f1f", "#007acc"] },
];

const THEME_KEY = "projectstudio:theme";

export function loadTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY);
  return THEMES.some((theme) => theme.id === saved) ? saved as ThemeId : "pure-black";
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}
