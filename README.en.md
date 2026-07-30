# ProjectStudio

ProjectStudio is a local-first desktop workspace that turns a product idea into a versioned PRD, hierarchical feature specifications, user flows or execution pipelines, and system architecture—then connects those planning artifacts to code, commits, tests, and implementation status.

[Open the Globeat public demo](https://bum-niverse.github.io/ProjectStudio/) · [Download the latest Windows release](https://github.com/Bum-niverse/ProjectStudio/releases/latest)

The public demo requires no installation or sign-in. It contains a sanitized Globeat workspace with a PRD, 151 feature specifications, tree and mind-map views, 110 user-flow nodes, and system architecture.

![ProjectStudio demo showing the Globeat workspace](docs/assets/readme/globeat-workflow-demo.gif)

## Three-Minute Workflow

1. Install the Windows release and sign in with [GitHub CLI](https://cli.github.com/).
2. Enter an idea and project type. ProjectStudio immediately stores the first PRD revision in local SQLite.
3. If Codex CLI is available locally, select **Generate detailed artifacts with Codex**. ProjectStudio sends the current structured PRD to Codex and requests feature nodes, acceptance criteria, user flows, and system-design artifacts.
4. Review the results in document, tree, mind-map, and all-user-flow views. AI proposals do not modify the source document until approved.
5. Connect an implementation repository and export Markdown, JSON, CSV, Mermaid, PlantUML, Structurizr, or PDF artifacts.

The UI supports Korean and English. New Codex generations follow the selected language; previously saved project content is not translated automatically.

## Core Capabilities

### Structured planning

Create versioned PRDs, three-level feature specifications, testable acceptance criteria, screen-oriented user flows, data/ML execution pipelines, and C4-style system designs.

### Visual traceability

Switch between document, tree, and mind-map views. Explore requirement-based swimlanes, runtime scenarios, ADRs, quality attributes, and links from requirements to code and tests.

### Approval-based AI changes

Codex output is validated for schema shape, minimum detail, stable identifiers, and reference integrity. Suggested changes remain separate until the user explicitly approves them.

### Local-first handoff

Projects and immutable revisions are stored in local SQLite. ProjectStudio uses existing local GitHub CLI and Codex CLI sessions and does not store their tokens.

## Technology

- React and TypeScript
- Tauri and Rust
- SQLite
- React Flow
- Vite and Vitest
- Local Codex CLI and Git/GitHub CLI integration

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm tauri dev
```

Run the complete validation workflow with:

```bash
python scripts/validate.py
```

## Security and Privacy

- Project content and revisions remain in the current Windows user's local app-data directory.
- GitHub and Codex credentials are not stored by ProjectStudio.
- The public demo is a static build containing only reviewed fixture data.
- AI proposals require user approval before they modify canonical documents.
- Windows beta packages are currently unsigned and may trigger a SmartScreen warning; verify the release source and SHA-256 checksum.

See `docs/privacy.md`, `docs/distribution.md`, and `docs/security-audit-2026-07-30.md` for details.

