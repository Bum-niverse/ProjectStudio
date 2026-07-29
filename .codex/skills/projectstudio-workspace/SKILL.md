---
name: projectstudio-workspace
description: Operate the user's ProjectStudio local-first desktop planning workspace. Use when the user asks to open, run, inspect, modify, test, package, export, or continue work on ProjectStudio; mentions its PRD, feature specification, tree, mind map, user flow, system design, `.projectstudio` documents, or asks to use ProjectStudio in a new chat.
---

# ProjectStudio workspace

Work only in `C:\Users\Kim Beom soo\OneDrive\Documents\ProjectStudio` for source changes. Do not substitute similarly named workspace copies.

## Start or open the app

Run `scripts/start_projectstudio.ps1` with `-Mode Auto` when the user asks to open or use ProjectStudio. The script reuses a running process, otherwise opens an installed/release build, then falls back to the development build.

Use `-Mode Dev` only when the user asks for live code changes or developer mode. Use `-Mode Installed` when validating the distributable application. Report which executable or command was used. Do not claim the UI was verified unless it was inspected separately.

## Modify the product

1. Read `AGENTS.md`, `README.md`, and `docs/product-brief.md` completely before making changes.
2. Read `docs/ui-ux-guidelines.md` completely for UI work.
3. Inspect `git status`, the current branch, and `origin` before editing. Preserve unrelated changes.
4. Treat every workspace as independent; do not introduce project-name-specific schemas, prompts, or UI.
5. Do not add libraries, paid APIs, or external AI providers without explaining them first.
6. Keep ProjectStudio local-first. Authentication does not imply SQLite encryption or cloud sync.
7. Update relevant product/progress documentation for verified behavior.
8. Run proportional checks. For a full change use `pnpm lint`, `pnpm test`, `pnpm build`, `cargo fmt --check --manifest-path src-tauri/Cargo.toml`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
9. Commit only intended files and push the public `origin` after checks pass unless the user asks not to publish.

Use the bundled Codex Node/pnpm runtime when `pnpm` is unavailable in `PATH`.

## Package and share

Build Windows bundles with `pnpm tauri build`. Prefer the NSIS setup EXE for general Windows installation and keep MSI as an alternative. Upload binaries and SHA-256 checksums to the public GitHub Release rather than committing them to Git history. State that unsigned packages can trigger Windows SmartScreen.

## Data and tool boundaries

- Project data lives in the current Windows user's Tauri app-data directory as SQLite.
- GitHub authentication is supplied by GitHub CLI; ProjectStudio does not store the token.
- Codex, Claude, Antigravity, and local LLM tools are optional.
- Never expose credentials, tokens, or private project documents in logs or public releases.
