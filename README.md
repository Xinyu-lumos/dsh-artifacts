# dsh-artifacts

Claude-Artifact-style diagram rendering for DeepSeek Harness. When the model
calls the <code>render_diagram</code> tool, the diagram renders directly in the
conversation as an inline SVG card, with an optional right-side panel for a
larger, versioned view and export.

## Features

- Inline SVG diagram cards rendered inside the tool result (no reload, no extra window).
- Three deterministic layouts: <code>workflow</code> (vertical or horizontal), <code>architecture</code> (grouped stages), and <code>nested-loop</code> (recursive loops).
- Automatic versioning: every successful render of the same artifact id becomes a new version you can switch between.
- A right-side panel with Preview / Source tabs, a version selector, theme (light / dark / auto), resizable width, full-screen mode, and an auto-open toggle; Escape closes it.
- Export the current diagram as SVG or PNG, or copy the SVG markup / spec JSON.
- Lightweight, white-background, clean design; SVG is built from React elements, so no raw HTML or script is ever injected.

## Requirements

- DeepSeek Harness <code>0.1.0-rc.6</code> (pre-release; later versions may shift slot contracts).
- A Web profile where the plugin is installed.

## Installation

1. Install the plugin into your DSH Web profile.
2. Add the plugin to the host plugin profile (see <code>cordis.patch.yml</code>).
3. Reload the DSH Web page.

The host half registers the <code>render_diagram</code> tool and system-prompt
guidance; the browser half registers the inline card, the turn card, and the
right-side drawer. If the browser half is absent, the tool still returns its
canonical JSON and the conversation degrades to normal text/tool output.

## Usage

Ask the model to draw a diagram. The model calls <code>render_diagram</code>
with an artifact id, a title, and a diagram spec. For example:

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

The diagram appears inline. Use "Open in panel" for the larger drawer, switch
versions with the pill buttons, and use the footer toolbar to download or copy.

Reuse the same <code>artifactId</code> to create a new version; the drawer and
turn card reconstruct the version history from the conversation itself. Nothing
is stored in a separate database.

## Diagram types

- <code>workflow</code>: nodes and edges laid out top-to-bottom or left-to-right.
- <code>architecture</code>: grouped stages rendered as containers.
- <code>nested-loop</code>: loops that can contain child loops recursively.

## Settings

- Theme: light, dark, or follow the system.
- Auto-open: open the panel automatically when a diagram finishes rendering.

Settings persist in browser localStorage under <code>dsh-artifacts.settings</code>.

## Security boundary

- The plugin renders SVG through React elements only; it never injects raw HTML, scripts, styles, or external resources.
- Diagram specs are validated against closed schemas and hard limits before rendering; invalid specs show a bounded error card and never block the text.
- Export filenames are sanitized, and downloads are local blobs (nothing is uploaded).

## Upgrade compatibility

- Pin peer dependencies to <code>0.1.0-rc.6</code>.
- Slot contracts (<code>tool.call.toolview</code>, <code>conversation.chat.turnTail</code>, <code>shell.overlay</code>) are pre-release and may drift; re-verify on upgrade.
- The presentation metadata is schema-versioned; unsupported versions render as a text fallback.

## Troubleshooting

- Diagram not shown: confirm the browser half loaded (reload the page) and that the profile includes the plugin.
- Invalid spec error: the model produced a diagram outside the size or shape limits; ask it to simplify.
- PNG export empty: the diagram has no intrinsic size; reopen it and export again from the Preview tab.

## Development

    pnpm install
    pnpm run typecheck
    pnpm test
    pnpm run build
    pnpm pack --dry-run

## License

MIT
