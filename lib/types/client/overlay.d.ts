import type { SessionFace, SessionId } from "@deepseek-ai/dsh-client-runtime/client";
import type { ArtifactController } from "./artifact-controller.js";
export interface ArtifactOverlayInjected {
    controller: ArtifactController;
    getSession: (id: string) => SessionFace | undefined;
    getCurrentSessionId: () => SessionId | undefined;
    subscribeSessions: (fn: () => void) => () => void;
}
/** Clamp a numeric value to an inclusive range (used for drawer resize bounds). */
export declare function clampWidth(value: number, min: number, max: number): number;
/** Right-side drawer rendered by the shell.overlay list seat while an artifact is open. */
export declare function ArtifactOverlay(props: ArtifactOverlayInjected): import("react/jsx-runtime").JSX.Element | null;
