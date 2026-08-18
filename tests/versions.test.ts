import type {
  ConversationNode,
  ConversationSnapshot,
  ToolResultNode,
} from "@deepseek-ai/dsh-client-runtime/client";
import { describe, expect, it } from "vitest";
import {
  findArtifactVersion,
  listArtifactVersionGroups,
  selectLatestArtifactVersion,
} from "../src/client/versions.js";

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

function result(seq: number, artifactId: string, options: { error?: boolean; meta?: unknown } = {}): ConversationNode {
  return {
    kind: "tool-result",
    seq,
    time: seq,
    callId: `call-${seq}`,
    call: null,
    callTime: null,
    content: [],
    isError: options.error ?? false,
    meta: options.meta ?? metadata(artifactId),
    callView: null,
    resultView: null,
    subCalls: [],
  } satisfies ToolResultNode;
}

describe("artifact version helpers", () => {
  it("preserves event and artifact order while numbering repeated ids", () => {
    const groups = listArtifactVersionGroups([
      result(2, "alpha"),
      result(3, "beta"),
      result(5, "alpha"),
    ]);
    expect(groups.map(({ artifactId }) => artifactId)).toEqual(["alpha", "beta"]);
    expect(groups[0]?.versions.map(({ seq, version }) => [seq, version])).toEqual([[2, 1], [5, 2]]);
    expect(groups[1]?.versions[0]?.version).toBe(1);
  });

  it("ignores errors and invalid metadata", () => {
    const groups = listArtifactVersionGroups([
      result(1, "ignored", { error: true }),
      result(2, "ignored", { meta: { artifactId: "ignored" } }),
      result(3, "kept"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.artifactId).toBe("kept");
  });

  it("replays identically after node-array recreation and accepts snapshots", () => {
    const nodes = [result(1, "a"), result(2, "a")];
    const recreated = nodes.map((node) => ({ ...node })) as ConversationNode[];
    const snapshot = { nodes: recreated } as ConversationSnapshot;
    expect(listArtifactVersionGroups(snapshot)).toEqual(listArtifactVersionGroups(nodes));
  });

  it("selects latest and finds requested one-based versions", () => {
    const [group] = listArtifactVersionGroups([result(1, "a"), result(2, "a")]);
    expect(selectLatestArtifactVersion(group)?.version).toBe(2);
    expect(findArtifactVersion(group, 1)?.seq).toBe(1);
    expect(findArtifactVersion(group, 0)).toBeUndefined();
    expect(findArtifactVersion(group, 3)).toBeUndefined();
    expect(selectLatestArtifactVersion(undefined)).toBeUndefined();
  });
});
