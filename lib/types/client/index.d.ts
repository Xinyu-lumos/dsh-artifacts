import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
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
export declare const inject: readonly ["conversationEvents", "slots", "sessions"];
/** Register durable diagram-artifact state and the three UI surfaces. */
export declare function apply(ctx: ClientContext): void;
