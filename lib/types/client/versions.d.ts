import type { ConversationNode, ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { DiagramPresentationMetadata } from "../shared/diagram.js";
export interface DiagramArtifactVersion {
    readonly artifactId: string;
    readonly version: number;
    readonly seq: number;
    readonly metadata: DiagramPresentationMetadata;
}
export interface DiagramArtifactVersionGroup {
    readonly artifactId: string;
    readonly versions: readonly DiagramArtifactVersion[];
}
export type ConversationVersionSource = ConversationSnapshot | readonly ConversationNode[];
/** Derive in-window artifact history from durable tool-result metadata. */
export declare function listArtifactVersionGroups(source: ConversationVersionSource): readonly DiagramArtifactVersionGroup[];
/** Return the latest loaded version in a group, if any. */
export declare function selectLatestArtifactVersion(group: DiagramArtifactVersionGroup | undefined): DiagramArtifactVersion | undefined;
/** Find one one-based version in a group. */
export declare function findArtifactVersion(group: DiagramArtifactVersionGroup | undefined, version: number): DiagramArtifactVersion | undefined;
