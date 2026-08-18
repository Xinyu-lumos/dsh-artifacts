import type { ConversationNodeDefinition } from "@deepseek-ai/dsh-client-runtime/client";
import type { TurnTailOwnerProps } from "@deepseek-ai/dsh-client-ui-conversation/client";
import type { DiagramPresentationMetadata } from "../shared/diagram.js";
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
export declare function selectDiagramArtifacts(owner: TurnTailOwnerProps): readonly DiagramArtifactOccurrence[] | null;
/** Turn-local artifact accumulator. It publishes state only, never a view node. */
export declare const diagramArtifactsDefinition: ConversationNodeDefinition<DiagramArtifactsState>;
export {};
