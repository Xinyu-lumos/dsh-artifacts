import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { SnapshotSelectorHook } from "@deepseek-ai/dsh-client-ui-slots";
import type { DiagramArtifactOccurrence } from "./events.js";
interface TurnTailCardProps {
    matched: readonly DiagramArtifactOccurrence[];
    sessionId: string;
    useSession: SnapshotSelectorHook<ConversationSnapshot>;
}
/** Compact turn-tail row listing the diagrams produced in the turn. */
export declare function TurnTailCard({ matched, sessionId, useSession }: TurnTailCardProps): import("react/jsx-runtime").JSX.Element | null;
export {};
