#!/usr/bin/env python3
"""Validate the reusable harness source without assuming a target stack."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL_ROOT = ROOT / ".agents" / "skills"
REQUIRED_FILES = [
    ROOT / "AGENTS.md",
    ROOT / "scripts" / "validate.py",
    ROOT / ".codex" / "validation-commands.json",
    ROOT / ".github" / "workflows" / "validate.yml",
    ROOT / "docs" / "agent-guidelines" / "security.md",
    ROOT / "docs" / "agent-guidelines" / "ui-ux.md",
]
FRONTMATTER = re.compile(r"\A---\n(?P<body>.*?)\n---\n", re.DOTALL)


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED_FILES:
        if not path.is_file():
            errors.append(f"missing required file: {path.relative_to(ROOT)}")

    for skill_file in sorted(SKILL_ROOT.glob("*/SKILL.md")):
        text = skill_file.read_text(encoding="utf-8")
        match = FRONTMATTER.match(text)
        if not match:
            errors.append(f"missing YAML frontmatter: {skill_file.relative_to(ROOT)}")
            continue
        body = match.group("body")
        if not re.search(r"^name:\s*\S+", body, re.MULTILINE):
            errors.append(f"missing name: {skill_file.relative_to(ROOT)}")
        if not re.search(r"^description:\s*.+", body, re.MULTILINE):
            errors.append(f"missing description: {skill_file.relative_to(ROOT)}")

    if not list(SKILL_ROOT.glob("*/SKILL.md")):
        errors.append("no skills found")

    audit_paths = [
        ROOT / "AGENTS.md",
        *sorted((ROOT / ".agents").rglob("*")),
        ROOT / ".codex" / "README.md",
        ROOT / ".codex" / "validation-commands.json",
        ROOT / ".codex" / "validation-commands.example.json",
        *sorted((ROOT / ".github" / "workflows").rglob("*")),
        ROOT / "scripts" / "validate.py",
        ROOT / "scripts" / "validate_harness.py",
        *sorted((ROOT / "docs" / "agent-guidelines").rglob("*")),
    ]
    for path in audit_paths:
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".md", ".txt", ".py", ".ps1", ".sh", ".json", ".yml", ".yaml"}:
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"[A-Za-z]:\\Users\\", text):
            errors.append(f"personal absolute path: {path.relative_to(ROOT)}")

    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
        return 1
    print("Harness structure is valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
