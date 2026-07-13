#!/usr/bin/env python3
"""Guard React Flow's transparent internal layers against theme regressions."""
from pathlib import Path


styles = (Path(__file__).resolve().parents[1] / "src" / "styles.css").read_text(encoding="utf-8")
transparent_rule = ".react-flow__renderer,.react-flow__pane { background:transparent !important; }"
opaque_internal_rule = ".react-flow,.react-flow__renderer,.react-flow__pane { background:var(--theme-canvas)"

if transparent_rule not in styles or opaque_internal_rule in styles:
    raise SystemExit("React Flow renderer와 pane은 노드가 가려지지 않도록 투명해야 합니다.")

print("React Flow canvas layer check passed.")
