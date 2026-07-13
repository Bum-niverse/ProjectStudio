#!/usr/bin/env bash
set -euo pipefail

target="${1:?Usage: install-harness.sh /path/to/target-project}"
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="$(cd "$target" && pwd)"

case "$target_dir/" in
  "$source_dir/"*) echo "Target must not be the harness source or its child directory." >&2; exit 2 ;;
esac

conflicts=0
while IFS= read -r -d '' source_file; do
  relative_path="${source_file#"$source_dir/"}"
  case "$relative_path" in
    .git/*|CUSTOM_INSTRUCTIONS.txt|CODEX_APPLY_INSTRUCTIONS.md) continue ;;
  esac
  destination="$target_dir/$relative_path"
  if [[ -e "$destination" ]]; then
    printf 'Existing file was not overwritten: %s\n' "$relative_path"
    conflicts=1
    continue
  fi
  mkdir -p "$(dirname "$destination")"
  cp "$source_file" "$destination"
done < <(find "$source_dir" -type f -print0)

echo "Harness files copied without overwriting existing files."
if [[ "$conflicts" -eq 1 ]]; then
  echo "Ask Codex to inspect and merge conflicting files."
fi
echo "Next: configure project validation commands and CI."
