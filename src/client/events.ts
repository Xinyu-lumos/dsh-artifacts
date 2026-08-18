import { isAppendSurfaceEvent } from "@deepseek-ai/dsh-client-runtime/client";
import type { ConversationNodeDefinition } from "@deepseek-ai/dsh-client-runtime/client";
import type { TurnTailOwnerProps } from "@deepseek-ai/dsh-client-ui-conversation/client";
import type { DiagramPresentationMetadata } from "../shared/diagram.js";
import { parseDiagramPresentationMetadata } from "../shared/validate.js";

export interface DiagramArtifactOccurrence {
  readonly seq: number;
  readonly metadata: DiagramPresentationMetadata;
}

export interface DiagramArtifactsTurnData {
  readonly occurrences: readonly DiagramArtifactOccurrence[];
}

declare module "@deepseek-ai/dsh-client-runtime/client" {
  interface ConversationTurnDataMap {
    /** Valid diagram artifacts produced by successful tool results in this turn. */
    diagramArtifacts: DiagramArtifactsTurnData;
  }
}

interface DiagramArtifactsState extends DiagramArtifactsTurnData {
  readonly turn: number;
}

/** Artifacts visible when the closing assistant message was emitted. */
export function selectDiagramArtifacts(
  owner: TurnTailOwnerProps,
): readonly DiagramArtifactOccurrence[] | null {
  const data = owner.turn.data.get("diagramArtifacts");
  if (data === undefined) return null;
  const occurrences = data.occurrences.filter(({ seq }) => seq <= owner.seq);
  return occurrences.length === 0 ? null : occurrences;
}

/** Turn-local artifact accumulator. It publishes state only, never a view node. */
export const diagramArtifactsDefinition: ConversationNodeDefinition<DiagramArtifactsState> = {
  kind: "diagram-artifacts",
  match: (event) => {
    if (event.type === "turn/start") {
      return { id: String(event.data.turn), role: "start" };
    }
    if (event.type === "tool/result" && isAppendSurfaceEvent(event)) {
      return { id: String(event.data.turn), role: "update" };
    }
    return null;
  },
  start: (_context, match) => {
    if (match.event.type !== "turn/start") {
      throw new Error("diagram-artifacts start requires turn/start");
    }
    return { turn: match.event.data.turn, occurrences: [] };
  },
  update: (context, match) => {
    if (match.event.type !== "tool/result") return context.state;
    if (match.event.data.message.content[0]?.isError === true) return context.state;
    const metadata = parseDiagramPresentationMetadata(match.event.data.meta);
    if (metadata === null) return context.state;
    return {
      ...context.state,
      occurrences: [...context.state.occurrences, { seq: match.event.seq, metadata }],
    };
  },
  buildLocationData: (context, scope) =>
    scope !== "turn" || context.state === undefined
      ? null
      : {
          kind: "turn",
          turn: context.state.turn,
          key: "diagramArtifacts",
          value: { occurrences: context.state.occurrences },
        },
};
