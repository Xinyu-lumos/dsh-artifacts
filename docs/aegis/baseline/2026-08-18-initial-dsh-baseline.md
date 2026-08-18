# Initial DSH Integration Baseline

Status: verified against installed `@deepseek-ai/dsh@0.1.0-rc.6` on 2026-08-18.

## Verified facts

1. A package can ship a host plugin at `exports["."]` and a browser plugin at `exports["./client"]`.
2. `package.json` field `dsh.client` declares browser inject dependencies and `platform: web`; DSH discovers the browser bundle without patching core files.
3. `tool.call.toolview` is the keyed extension point for a custom tool presentation.
4. `conversation.chat.turnTail` is an additive chain rendered after a closing Assistant node and before message actions.
5. `shell.overlay` is an additive root-scoped surface suitable for a right-side Artifact drawer.
6. The built-in right `details` column has a single owner. Replacing it would remove the existing tool-details seat, so V1 must not claim it.
7. `MarkdownText` is a direct mdast renderer with pinned DOM fixtures and no public fence-renderer slot; patching it is not the V1 integration path.
8. Host tools register through `ctx.tools.register(defineTool(...))`; model guidance registers through `ctx.systemPrompt`.

## Compatibility boundary

The first release targets DSH `0.1.0-rc.6`. Client slot names and owner props are internal pre-release contracts and must be re-verified for later DSH versions.

## Source-of-truth decision

Artifact versions are reconstructed from persisted `render_diagram` tool results in the session event stream. V1 adds no second database and no independent Artifact persistence owner.
