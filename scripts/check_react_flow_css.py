#!/usr/bin/env python3
"""Guard React Flow's transparent internal layers against theme regressions."""
from pathlib import Path


styles = (Path(__file__).resolve().parents[1] / "src" / "styles.css").read_text(encoding="utf-8")
transparent_rule = ".react-flow__renderer,.react-flow__pane { background:transparent !important; }"
opaque_internal_rule = ".react-flow,.react-flow__renderer,.react-flow__pane { background:var(--theme-canvas)"

if transparent_rule not in styles or opaque_internal_rule in styles:
    raise SystemExit("React Flow renderer와 pane은 노드가 가려지지 않도록 투명해야 합니다.")

theme_blocks = [":root { --theme-bg:", ':root[data-theme="light"] { --theme-bg:', ':root[data-theme="neutral-gray"] { --theme-bg:', ':root[data-theme="vscode-dark"] { --theme-bg:']
for theme in theme_blocks:
    start = styles.find(theme)
    end = styles.find("}", start)
    block = styles[start:end]
    if start < 0 or "--theme-node:" not in block or "--theme-connector:" not in block:
        raise SystemExit(f"{theme}에 노드·연결선 대비 토큰이 필요합니다.")

for page in ["src/UserFlowPage.tsx", "src/SystemDesignPage.tsx"]:
    source = Path(page).read_text(encoding="utf-8")
    if 'type:"straight"' in source or 'type:"smoothstep"' not in source:
        raise SystemExit(f"{page}의 연결선은 분기 가능한 직교 라우팅을 사용해야 합니다.")

system_page = Path("src/SystemDesignPage.tsx").read_text(encoding="utf-8")
if "key={canvasViewportKey}" not in system_page or "setCanvasFitRevision(current=>current+1)" not in system_page:
    raise SystemExit("시스템 설계는 C4 수준·정렬 변경 후 표시 노드에 viewport를 다시 맞춰야 합니다.")

print("React Flow canvas layer check passed.")
