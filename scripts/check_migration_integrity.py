#!/usr/bin/env python3
"""Ensure applied SQL migrations remain byte-for-byte stable across platforms."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "src-tauri" / "migrations"
MANIFEST = MIGRATIONS / "checksums.sha384"


def main() -> int:
    expected: dict[str, str] = {}
    for line_number, line in enumerate(MANIFEST.read_text(encoding="ascii").splitlines(), 1):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 2:
            raise ValueError(f"checksums.sha384:{line_number}: invalid entry")
        checksum, filename = parts
        expected[filename] = checksum.lower()

    sql_files = {path.name: path for path in MIGRATIONS.glob("*.sql")}
    if set(sql_files) != set(expected):
        missing = sorted(set(expected) - set(sql_files))
        untracked = sorted(set(sql_files) - set(expected))
        raise ValueError(f"migration manifest mismatch: missing={missing}, untracked={untracked}")

    for filename, path in sorted(sql_files.items()):
        content = path.read_bytes()
        if b"\r" in content:
            raise ValueError(f"{filename}: migrations must use LF line endings")
        actual = hashlib.sha384(content).hexdigest()
        if actual != expected[filename]:
            raise ValueError(
                f"{filename}: applied migration was modified; add a new migration instead"
            )

    print(f"Verified {len(sql_files)} immutable LF migrations.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
