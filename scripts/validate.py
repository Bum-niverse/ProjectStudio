#!/usr/bin/env python3
"""Project validation entrypoint configured with .codex/validation-commands.json."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict


class ValidationCommand(TypedDict):
    name: str
    cmd: list[str]


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / ".codex" / "validation-commands.json"
REPORT = ROOT / ".codex" / "validation-report.json"
MAX_OUTPUT_CHARS = 4000


def load_commands() -> list[ValidationCommand]:
    if not CONFIG.exists():
        return []

    raw = json.loads(CONFIG.read_text(encoding="utf-8"))
    commands = raw.get("commands", [])
    if not isinstance(commands, list):
        raise ValueError("commands must be a list")

    validated: list[ValidationCommand] = []
    for index, item in enumerate(commands):
        if not isinstance(item, dict):
            raise ValueError(f"commands[{index}] must be an object")
        name = item.get("name")
        cmd = item.get("cmd")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"commands[{index}].name must be a non-empty string")
        if not isinstance(cmd, list) or not cmd or not all(isinstance(part, str) and part for part in cmd):
            raise ValueError(f"commands[{index}].cmd must be a non-empty string array")
        validated.append({"name": name, "cmd": cmd})
    return validated


def run_check(command: ValidationCommand) -> dict[str, object]:
    executable = shutil.which(command["cmd"][0])
    if executable is None:
        return {
            "name": command["name"],
            "command": command["cmd"],
            "status": "blocked",
            "returncode": None,
            "stdout_tail": "",
            "stderr_tail": f'Executable not found: {command["cmd"][0]}',
        }

    resolved_command = [executable, *command["cmd"][1:]]
    try:
        process = subprocess.run(
            resolved_command,
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            shell=False,
            timeout=1800,
        )
        return {
            "name": command["name"],
            "command": command["cmd"],
            "status": "passed" if process.returncode == 0 else "failed",
            "returncode": process.returncode,
            "stdout_tail": process.stdout[-MAX_OUTPUT_CHARS:],
            "stderr_tail": process.stderr[-MAX_OUTPUT_CHARS:],
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "name": command["name"],
            "command": command["cmd"],
            "status": "blocked",
            "returncode": None,
            "stdout_tail": "",
            "stderr_tail": str(error)[-MAX_OUTPUT_CHARS:],
        }


def write_report(overall_status: str, checks: list[dict[str, object]], message: str | None = None) -> None:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, object] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall_status": overall_status,
        "checks": checks,
    }
    if message:
        payload["message"] = message
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    try:
        commands = load_commands()
    except (OSError, json.JSONDecodeError, ValueError) as error:
        write_report("invalid_configuration", [], str(error))
        print(f"Invalid validation configuration: {error}", file=sys.stderr)
        return 2

    if not commands:
        message = "Configure .codex/validation-commands.json for this project."
        write_report("not_configured", [], message)
        print(message, file=sys.stderr)
        return 2

    results = [run_check(command) for command in commands]
    overall = "passed" if all(result["status"] == "passed" for result in results) else "failed"
    write_report(overall, results)
    for result in results:
        print(f'[{str(result["status"]).upper()}] {result["name"]}: {" ".join(result["command"])}')
    return 0 if overall == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
