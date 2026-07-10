export type ThemeId = "pure-black" | "light" | "neutral-gray" | "vscode-dark";

export const THEMES: Array<{ id: ThemeId; name: string; description: string; colors: string[] }> = [
  { id: "pure-black", name: "Pure Black", description: "OLED용 검정 작업대와 절제된 라임 강조", colors: ["#000000", "#0b0b0c", "#b7e336"] },
  { id: "light", name: "VS Code Light", description: "Microsoft Light Modern 작업대 팔레트", colors: ["#f8f8f8", "#ffffff", "#005fb8"] },
  { id: "neutral-gray", name: "Neutral Gray", description: "중성 회색 패널과 따뜻한 황금 강조", colors: ["#252526", "#2d2d30", "#c09553"] },
  { id: "vscode-dark", name: "VS Code Dark", description: "Microsoft Dark Modern 작업대 팔레트", colors: ["#181818", "#1f1f1f", "#0078d4"] },
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
