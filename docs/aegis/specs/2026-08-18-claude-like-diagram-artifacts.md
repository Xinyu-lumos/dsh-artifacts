# Claude-like Diagram Artifacts Specification

Status: approved in conversation on 2026-08-18.

## Problem

DeepSeek Harness responses can explain structured systems in prose but do not provide a Claude-like visual Artifact experience. Users need model-triggered diagrams that appear in the same turn, open in a dedicated right-side workspace, remain editable by follow-up prompts, and can be exported.

## Goals

- Automatically or explicitly create diagrams during an answer.
- Show live tool status and a final inline Artifact card.
- Auto-open a Claude-style right-side drawer with preview/source/version controls.
- Support `workflow`, `architecture`, and `nested-loop` diagrams in V1.
- Render safe responsive SVG with light/dark themes and SVG/PNG export.
- Rebuild version history from session tool results without a second database.
- Ship as a proper dual-face DSH plugin without modifying DSH core bundles.

## Non-goals for V1

- Arbitrary model-authored HTML, JavaScript, or React execution.
- A global cross-session Artifact library.
- Pixel-identical copying of Claude visual assets or CSS.
- Replacing the DSH details column or Markdown renderer.

## Product behavior

The model calls `render_diagram` when the user asks for a visualization or when a response has a meaningful multi-step, layered, nested, state, or dependency structure. Trivial responses remain text-only. During the call, a tool view shows progress. On success, the current turn shows an Artifact card and the right drawer opens automatically. Clicking any historical card reopens that version.

Follow-up requests such as "make it horizontal" produce another `render_diagram` call with the same `artifactId` and a complete replacement spec. Versions are ordered by successful tool-result occurrence within the session.

## Tool contract

Tool name: `render_diagram`.

Required input fields:

- `artifactId`: stable session-local slug selected by the model
- `title`: user-facing title
- `diagram`: complete structured DiagramSpec

The tool is stateless. Every call carries the complete current spec. The result returns normalized `{ artifactId, title, diagram }` as structured presentation metadata so replay does not depend on parsing prose.

## DiagramSpec boundary

- `type`: `workflow | architecture | nested-loop`
- `direction`: `TB | LR`
- `groups`: optional recursively nested labeled containers
- `nodes`: stable ids, labels, optional descriptions, semantic tone, group membership
- `edges`: source id, target id, optional label
- `theme`: optional `auto | light | dark`

Limits: 20 groups, 40 nodes, 80 edges, nesting depth 4, title 120 characters, node label 120 characters, description 240 characters. Unknown fields are rejected or removed by normalization. IDs must be unique and every edge/group reference must resolve.

## Client architecture

- `tool.call.toolview`: live and settled `render_diagram` presentation.
- `conversationEvents`: derive successful diagram results as turn-local data.
- `conversation.chat.turnTail`: render one compact Artifact card for each diagram completed in the turn.
- `shell.overlay`: render a resizable right drawer above the standard frame without replacing the owned details panel.
- Browser Artifact controller: selection, open state, and session-derived version list only; persisted truth remains the tool history.

## Visual language

Use an original soft technical-document style inspired by the supplied references: warm neutral canvas, rounded grouped containers, purple compute/optimization nodes, green data-flow nodes, orange constraint nodes, thin neutral arrows, strong title hierarchy, responsive CJK wrapping, and DSH theme variables.

## Security

No raw HTML, script, external font, or external image is accepted. React creates SVG elements directly; all text remains ordinary text nodes. SVG export is serialized from the trusted renderer tree. PNG export draws that SVG to a local canvas. Invalid specs render a bounded error card and never block the text response.

## Acceptance criteria

1. An explicit request for a flow diagram causes a `render_diagram` call and visible tool state.
2. A valid result opens the right drawer and shows a responsive diagram without page navigation.
3. The same `artifactId` called twice exposes two selectable versions after replay/reload.
4. The closing turn contains an inline Artifact card that reopens the correct version.
5. SVG and PNG exports complete locally.
6. Invalid references, over-limit specs, or unsafe fields fail safely.
7. Ordinary text-only answers are unchanged.
8. No DSH compiled client bundle is patched.
