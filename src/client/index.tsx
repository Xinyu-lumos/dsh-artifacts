import type { Context } from "@deepseek-ai/cordis";
import { diagramArtifactsDefinition } from "./events.js";

export * from "./artifact-controller.js";
export * from "./events.js";
export * from "./versions.js";
export * from "./layout.js";
export * from "./DiagramView.js";

/** Browser-side Cordis service dependencies. */
export const inject = ["conversationEvents"] as const;

/** Register durable diagram-artifact conversation state. */
export function apply(ctx: Context): void {
  ctx.conversationEvents.register(diagramArtifactsDefinition);
}
