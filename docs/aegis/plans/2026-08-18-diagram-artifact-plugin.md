# Diagram Artifact Plugin Implementation Plan

Status: ready for execution.
Spec: [Claude-like Diagram Artifacts](../specs/2026-08-18-claude-like-diagram-artifacts.md)

## TaskStartSnapshot

- Working directory: `C:\DeepSeek`
- Target repository: `C:\DeepSeek\dsh-artifacts` (did not exist before this plan)
- Baseline DSH: `@deepseek-ai/dsh@0.1.0-rc.6`
- Existing target code: none
- Branch/worktree: none; a new single-owner repository does not require a worktree
- Approved scope: diagram Artifacts only; no arbitrary HTML/React V1

## TDD Route

- Mode: off
- Decision: skipped
- Strict authority: not applicable
- Test posture: post-change regression and contract tests
- Reason: the user did not request strict TDD; verification remains mandatory
- Verification: validator/layout unit tests, typecheck, client/host build, package dry-run, DSH composition smoke test

## Compatibility and architecture review

ArchitectureReviewRequired: yes. This adds a host tool contract, a browser client module, session-derived version semantics, and a right-side UI surface. The review must confirm that tool results remain the single persisted owner, no core bundle patch is introduced, and the plugin degrades to normal text/tool output when its client half is absent.

## File map

- `package.json`: dual-face package exports, `dsh.client`, scripts, dependencies
- `cordis.patch.yml`: profile insertion for the host plugin
- `tsconfig.json`, `tsdown.config.ts`: host/client build
- `src/shared/diagram.ts`: shared types, schema literals, limits
- `src/shared/validate.ts`: normalization and semantic reference checks
- `src/index.ts`: host `render_diagram` tool and system-prompt guidance
- `src/client/index.tsx`: browser plugin registration
- `src/client/events.ts`: turn-local projection of successful diagram results
- `src/client/artifact-controller.ts`: open/selection/version reconstruction state
- `src/client/layout/*.ts`: deterministic workflow, architecture, nested-loop layouts
- `src/client/components/*.tsx`: tool view, turn card, drawer, SVG canvas, toolbar
- `src/client/styles.css`: Claude-inspired original visual language using DSH theme variables
- `src/client/export.ts`: SVG and PNG export
- `tests/*.test.ts`: validator, layouts, version grouping, safe export
- `README.md`, `README.zh.md`, `LICENSE`: bilingual usage and compatibility documentation

## Task 1 — Package and build skeleton

Create package metadata, dual exports (`.` and `./client`), `dsh.client` inject declarations, Cordis profile patch, TypeScript configuration, and explicit tsdown host/client entries. Add scripts for build, typecheck, test, and pack verification.

Verification: `pnpm install`, `pnpm run typecheck`, and `pnpm run build` complete; package contains `lib/index.js`, `lib/client.js`, and declarations.

Commit boundary: `chore: scaffold dual-face DSH Artifact plugin`.

## Task 2 — Shared contract and host tool

Implement DiagramSpec types, structural limits, ID/reference normalization, semantic validation, and canonical JSON output. Register `render_diagram` with `defineTool`, return normalized structured presentation metadata, and add concise system-prompt guidance for explicit and automatic use.

Verification: tests cover every diagram type, duplicate IDs, missing targets, limits, text bounds, and unknown fields; host bundle imports successfully.

Commit boundary: `feat: add render_diagram host tool and validated spec`.

## Task 3 — Client event projection and Artifact controller

Register a conversation event definition that records successful `render_diagram` tool results as turn data. Group session results by artifact id and occurrence to reconstruct versions. Implement an observable browser controller for selected Artifact/version and drawer visibility; keep all persistent data derived from the conversation.

Verification: replay fixtures reconstruct stable versions, failed calls are ignored, duplicate artifact ids remain session-local, and changing session clears transient selection safely.

Commit boundary: `feat: derive diagram Artifact versions from session events`.

## Task 4 — SVG renderer and layouts

Implement deterministic layouts for vertical/horizontal workflows, grouped architecture stages, and recursively nested loops. Render React SVG elements with semantic tones, arrow markers, group containers, text wrapping, and responsive viewBox sizing. Do not use `dangerouslySetInnerHTML`.

Verification: deterministic layout fixtures, no overlap in reference diagrams, CJK wrapping cases, light/dark visual fixture snapshots, and invalid specs never reach the renderer.

Commit boundary: `feat: render safe Claude-style SVG diagrams`.

## Task 5 — DSH presentation surfaces

Register the keyed `tool.call.toolview` renderer, additive `conversation.chat.turnTail` card, and root `shell.overlay` drawer. The drawer auto-opens after a successful result, supports resize/full-screen, and restores the selected historical version from a card click. Keep standard DSH tool details and Markdown rendering untouched.

Verification: component tests cover running/success/error states, auto-open policy, card click, version switch, close/reopen, narrow viewport, and keyboard focus/escape behavior.

Commit boundary: `feat: add inline cards and Claude-style Artifact drawer`.

## Task 6 — Export, settings, and documentation

Add preview/source tabs, copy spec/SVG, local SVG download, PNG canvas export, auto-open toggle, and theme behavior. Write English `README.md` and Chinese `README.zh.md` with installation, examples, security boundary, upgrade compatibility, and troubleshooting.

Verification: export tests sanitize filenames and produce non-empty blobs; README commands match package scripts; `pnpm pack --dry-run` includes both READMEs and client bundle.

Commit boundary: `feat: add Artifact export controls and documentation`.

## Task 7 — Integration and publication

Install the local package into an isolated Web profile/composition, verify host tool discovery and browser module discovery, exercise one workflow and one nested-loop fixture, and inspect the rendered UI at the exact test URL. Do not restart or replace the live 3080 server; use an explicitly isolated DSH_HOME only if a temporary server is necessary and requested.

Run final commands: `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `pnpm pack --dry-run`, `git status --short`.

Publish a new GitHub repository after all checks pass. Record the tested DSH version and any remaining manual browser verification honestly.

Commit boundary: `chore: verify and publish dsh-artifacts`.

### Verification record (executed)

- Tested DSH version: 0.1.0-rc.6.
- Installed the package into an isolated DSH_HOME (C:/DeepSeek/.dsh-verify) as a link: bundle; dsh-artifacts was added to dependencies and dsh.profile.bundles. The isolated web profile used only @deepseek-ai/dsh-base plus @deepseek-ai/dsh-web-app (resolved from the DSH install) plus dsh-artifacts.
- Host tool discovery: dsh --profile web --dump-config composed the plugin into the profile tree (id: artifacts / name: dsh-artifacts) alongside ui-tool, ui-conversation, and ui-layout (the slot providers).
- Server boot: dsh web --port 3099 (isolated home; the live 3080 server was not touched) booted cleanly and printed the URL, so the host apply ran without error.
- Browser module discovery: GET /plugins/dsh-artifacts/client.js returned 200 (65,188 bytes) with the window.__ModuleLoader__.load wrapper (id dsh-artifacts); the page HTML contained __DSH_BOOT__ and two dsh-artifacts references (the boot manifest includes the plugin).
- Rendered UI: a headless Chrome screenshot of the test URL decoded to a valid 1440x900 RGB frame with about 99% dark pixels (dark theme) plus light text and accent pixels, i.e. a normal rendered UI rather than a blank or error page.
- Remaining manual verification: an actual render_diagram result rendered in a live session (requires a model provider, which the isolated profile intentionally omitted) and reading the exact UI text labels (no vision provider is configured on this machine). Workflow and nested-loop fixtures are covered by tests/layout.test.ts.

## Risks and rollback

- Pre-release slot contracts may change: pin peer dependencies and fail gracefully when the client bundle does not load.
- Model-generated large graphs may degrade layout: enforce hard limits before rendering.
- Overlay conflicts: use the additive `shell.overlay` seat with a unique id and explicit pointer-event boundaries.
- Replay incompatibility: version the presentation metadata and render unsupported versions as a text fallback.
- Rollback: remove the plugin from the Web profile; no DSH core file or independent data store needs cleanup.
