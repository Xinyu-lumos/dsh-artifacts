import type { ClientContext, SessionFace, SessionId } from "@deepseek-ai/dsh-client-runtime/client";
import type {} from "@deepseek-ai/dsh-client-ui-layout/client";
import { diagramArtifactsDefinition, selectDiagramArtifacts } from "./events.js";
import { ArtifactOverlay } from "./overlay.js";
import { RenderDiagramToolview } from "./render-toolview.js";
import { artifactController } from "./store.js";
import { TurnTailCard } from "./turn-tail.js";

/**
 * Minimal structural face for the client sessions service. A dual-face plugin
 * type-checks against both the host (dsh-session) and client (dsh-client-runtime)
 * Context augmentations, which declare conflicting sessions members; a local
 * structural type sidesteps that conflict for the two lookups the overlay needs.
 */
interface SessionsFace {
  binding(id: SessionId): { readonly session: SessionFace } | undefined;
  list: {
    getSnapshot(): { readonly current: SessionId | undefined };
    subscribe(fn: () => void): () => void;
  };
}

export * from "./artifact-controller.js";
export * from "./events.js";
export * from "./versions.js";
export * from "./layout.js";
export * from "./DiagramView.js";
export * from "./export.js";
export * from "./settings.js";
export * from "./store.js";
export { ArtifactOverlay, type ArtifactOverlayInjected } from "./overlay.js";
export { RenderDiagramToolview } from "./render-toolview.js";
export { TurnTailCard } from "./turn-tail.js";

/** Browser-side Cordis service dependencies. */
export const inject = ["conversationEvents", "slots", "sessions"] as const;

/** Register durable diagram-artifact state and the three UI surfaces. */
export function apply(ctx: ClientContext): void {
  const sessions = ctx.get("sessions") as unknown as SessionsFace;

  ctx.conversationEvents.register(diagramArtifactsDefinition);

  ctx.slots.inject("tool.call.toolview", () =>
    ctx.slots.register(
      { name: "tool.call.toolview", key: "render_diagram" },
      RenderDiagramToolview,
    ),
  );

  ctx.slots.inject("conversation.chat.turnTail", () =>
    ctx.slots.register(
      { name: "conversation.chat.turnTail", select: selectDiagramArtifacts },
      TurnTailCard,
    ),
  );

  ctx.slots.inject("shell.overlay", () =>
    ctx.slots.register(
      {
        name: "shell.overlay",
        id: "dsh-artifacts",
        order: 50,
        label: "Artifacts",
        inject: () => ({
          controller: artifactController,
          getSession: (id: string) => sessions.binding(id as SessionId)?.session,
          getCurrentSessionId: () => sessions.list.getSnapshot().current,
          subscribeSessions: (fn: () => void) => sessions.list.subscribe(fn),
        }),
      },
      ArtifactOverlay,
    ),
  );
}
