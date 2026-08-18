# dsh-artifacts

<p align="center">
  English | <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-3167E3?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.1.0--rc.6-3167E3?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/dsh--artifacts-v0.1.0-3167E3?style=flat-square">
</p>

`dsh-artifacts` is a standalone community plugin that brings Claude-Artifact-style diagrams to DeepSeek Harness. When the model calls the `render_diagram` tool, the diagram renders directly in the conversation as an inline SVG card, with an optional right-side panel for a larger, versioned view and export.

## Features

- **Inline SVG cards** — diagrams render inside the tool result with no reload and no extra window.
- **Three deterministic layouts** — `workflow` (vertical or horizontal), `architecture` (grouped stages), and `nested-loop` (recursive loops).
- **Automatic versioning** — every successful render of the same artifact id becomes a new version you can switch between.
- **Versioned drawer** — a right-side panel with Preview / Source tabs, a version selector, theme (light / dark / auto), resizable width, full-screen mode, and an auto-open toggle; Escape closes it.
- **Export** — download the current diagram as SVG or PNG, or copy the SVG markup / spec JSON.
- **Safe by construction** — SVG is built from React elements only, so no raw HTML or script is ever injected.

## Requirements

- DeepSeek Harness `0.1.0-rc.6` (pre-release; later versions may shift slot contracts).
- A Web profile where the plugin is installed.

## Install

```sh
dsh plugin --profile web add https://github.com/Xinyu-lumos/dsh-artifacts
```

Restart the `web` profile (or hard-refresh the page), then ask the model to draw a diagram.

For local development:

```sh
dsh plugin --profile web add ./dsh-artifacts
```

## Usage

Ask the model to draw a diagram. The model calls `render_diagram` with an artifact id, a title, and a diagram spec:

```js
render_diagram(
  artifactId: "auth-flow",
  title: "Authentication flow",
  diagram: {
    "type": "workflow",
    "direction": "TB",
    "nodes": [
      { "id": "start", "label": "Start" },
      { "id": "login", "label": "Login" },
      { "id": "done", "label": "Done" }
    ],
    "edges": [
      { "from": "start", "to": "login" },
      { "from": "login", "to": "done" }
    ],
    "groups": []
  }
)
```

The diagram appears inline. Use "Open in panel" for the larger drawer, switch versions with the pill buttons, and use the footer toolbar to download or copy.

Reuse the same `artifactId` to create a new version; the drawer and turn card reconstruct the version history from the conversation itself. Nothing is stored in a separate database.

## Diagram types

- `workflow` — nodes and edges laid out top-to-bottom or left-to-right.
- `architecture` — grouped stages rendered as containers.
- `nested-loop` — loops that can contain child loops recursively.

## Scope

The plugin uses only the official Harness Tool and Slot APIs (`tool.call.toolview`, `conversation.chat.turnTail`, `shell.overlay`); it does not patch DSH core files. Tool results remain the single persisted source of truth, and the conversation degrades to normal text/tool output when the browser half is absent.

## Settings

- Theme: light, dark, or follow the system.
- Auto-open: open the panel automatically when a diagram finishes rendering.

Settings persist in browser localStorage under `dsh-artifacts.settings`.

## Security

- Renders SVG through React elements only — never injects raw HTML, scripts, styles, or external resources.
- Validates diagram specs against closed schemas and hard limits before rendering; invalid specs show a bounded error card and never block the text.
- Sanitizes export filenames; downloads are local blobs (nothing is uploaded).

## Upgrade compatibility

- Pin peer dependencies to `0.1.0-rc.6`.
- Slot contracts are pre-release and may drift; re-verify on upgrade.
- Presentation metadata is schema-versioned; unsupported versions render as a text fallback.

## Troubleshooting

- Diagram not shown: confirm the browser half loaded (reload the page) and that the profile includes the plugin.
- Invalid spec error: the model produced a diagram outside the size or shape limits; ask it to simplify.
- PNG export empty: the diagram has no intrinsic size; reopen it and export again from the Preview tab.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
pnpm pack --dry-run
```

## License

MIT
