import type {
  ConversationMatch,
  ConversationNodeContext,
  SessionEvent,
} from "@deepseek-ai/dsh-client-runtime/client";
import type { TurnTailOwnerProps } from "@deepseek-ai/dsh-client-ui-conversation/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@deepseek-ai/dsh-client-runtime/client", () => ({
  isAppendSurfaceEvent: (event: { surfaceOp?: unknown }) => event.surfaceOp === "append",
}));

import {
  diagramArtifactsDefinition,
  selectDiagramArtifacts,
} from "../src/client/events.js";

const metadata = (artifactId: string, title = artifactId) => ({
  schemaVersion: 1,
  kind: "diagram-artifact",
  artifactId,
  title,
  diagram: {
    type: "workflow",
    direction: "TB",
    groups: [],
    nodes: [{ id: "node-1", label: "Node" }],
    edges: [],
  },
});

type DefinitionState = NonNullable<Parameters<typeof diagramArtifactsDefinition.update>[0]["state"]>;

function startEvent(): SessionEvent<"turn/start"> {
  return { type: "turn/start", seq: 1, time: 1, data: { turn: 7 } };
}

function resultEvent(
  seq: number,
  meta: unknown,
  isError = false,
): SessionEvent<"tool/result"> {
  return {
    type: "tool/result",
    seq,
    time: seq,
    surfaceOp: "append",
    data: {
      turn: 7,
      step: 1,
      message: {
        role: "tool",
        content: [{ type: "text", text: "model-facing text", isError }],
        source: { type: "tool", callId: "call-1" },
      },
      meta: meta as never,
    },
  } as SessionEvent<"tool/result">;
}

function match(event: SessionEvent, role: "start" | "update"): ConversationMatch {
  return { event, view: undefined, role, location: { kind: "unresolved" } };
}

function context(state: DefinitionState): ConversationNodeContext<DefinitionState> & { readonly state: DefinitionState } {
  return {
    key: "diagram-artifacts:7",
    kind: "diagram-artifacts",
    id: "7",
    matches: [],
    start: undefined,
    state,
    current: new Map(),
  };
}

describe("diagramArtifactsDefinition", () => {
  it("matches turn starts and append-surface tool results only", () => {
    expect(diagramArtifactsDefinition.match(startEvent())).toEqual({ id: "7", role: "start" });
    expect(diagramArtifactsDefinition.match(resultEvent(2, metadata("a")))).toEqual({ id: "7", role: "update" });
    expect(diagramArtifactsDefinition.match({ ...resultEvent(2, metadata("a")), surfaceOp: { op: "replace", range: { start: 0, end: 0 } } } as SessionEvent)).toBeNull();
  });

  it("accumulates normalized metadata from successful durable results", () => {
    const state = diagramArtifactsDefinition.start({} as ConversationNodeContext<DefinitionState>, match(startEvent(), "start"), { previous: () => undefined });
    const next = diagramArtifactsDefinition.update(context(state), match(resultEvent(4, metadata("artifact-a", "  Title  ")), "update"));
    expect(next.occurrences).toEqual([{ seq: 4, metadata: metadata("artifact-a", "Title") }]);
  });

  it("ignores error results, invalid metadata, and model-facing text", () => {
    const initial = { turn: 7, occurrences: [] } satisfies DefinitionState;
    const errored = diagramArtifactsDefinition.update(context(initial), match(resultEvent(2, metadata("a"), true), "update"));
    const invalid = diagramArtifactsDefinition.update(context(errored), match(resultEvent(3, { schemaVersion: 1, kind: "diagram-artifact" }), "update"));
    const textOnly = diagramArtifactsDefinition.update(context(invalid), match(resultEvent(4, undefined), "update"));
    expect(errored).toBe(initial);
    expect(invalid).toBe(errored);
    expect(textOnly).toBe(invalid);
  });
});

describe("selectDiagramArtifacts", () => {
  it("cuts off later settlements and returns null when none remain", () => {
    const occurrences = [
      { seq: 4, metadata: metadata("a") },
      { seq: 8, metadata: metadata("b") },
    ];
    const owner = {
      seq: 5,
      turn: { data: { get: () => ({ occurrences }) } },
    } as unknown as TurnTailOwnerProps;
    expect(selectDiagramArtifacts(owner)).toEqual([occurrences[0]]);
    expect(selectDiagramArtifacts({ ...owner, seq: 3 })).toBeNull();
  });
});
