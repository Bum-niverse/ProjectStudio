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

print("React Flow canvas layer check passed.")
