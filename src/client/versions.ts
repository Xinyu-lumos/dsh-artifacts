import type {
  ConversationNode,
  ConversationSnapshot,
  ToolResultNode,
} from "@deepseek-ai/dsh-client-runtime/client";
import type { DiagramPresentationMetadata } from "../shared/diagram.js";
import { parseDiagramPresentationMetadata } from "../shared/validate.js";

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

export type ConversationVersionSource =
  | ConversationSnapshot
  | readonly ConversationNode[];

function isConversationSnapshot(
  source: ConversationVersionSource,
): source is ConversationSnapshot {
  return !Array.isArray(source);
}

function sourceNodes(source: ConversationVersionSource): readonly ConversationNode[] {
  return isConversationSnapshot(source) ? source.nodes : source;
}

function isSuccessfulToolResult(node: ConversationNode): node is ToolResultNode {
  return node.kind === "tool-result" && !node.isError;
}

/** Derive in-window artifact history from durable tool-result metadata. */
export function listArtifactVersionGroups(
  source: ConversationVersionSource,
): readonly DiagramArtifactVersionGroup[] {
  const groups = new Map<string, DiagramArtifactVersion[]>();
  for (const node of sourceNodes(source)) {
    if (!isSuccessfulToolResult(node)) continue;
    const metadata = parseDiagramPresentationMetadata(node.meta);
    if (metadata === null) continue;
    let versions = groups.get(metadata.artifactId);
    if (versions === undefined) {
      versions = [];
      groups.set(metadata.artifactId, versions);
    }
    versions.push({
      artifactId: metadata.artifactId,
      version: versions.length + 1,
      seq: node.seq,
      metadata,
    });
  }
  return [...groups].map(([artifactId, versions]) => ({ artifactId, versions }));
}

/** Return the latest loaded version in a group, if any. */
export function selectLatestArtifactVersion(
  group: DiagramArtifactVersionGroup | undefined,
): DiagramArtifactVersion | undefined {
  return group?.versions.at(-1);
}

/** Find one one-based version in a group. */
export function findArtifactVersion(
  group: DiagramArtifactVersionGroup | undefined,
  version: number,
): DiagramArtifactVersion | undefined {
  if (!Number.isSafeInteger(version) || version <= 0) return undefined;
  return group?.versions[version - 1];
}
