import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { SnapshotSelectorHook } from "@deepseek-ai/dsh-client-ui-slots";
import type { DiagramArtifactOccurrence } from "./events.js";
import { artifactController } from "./store.js";
import { listArtifactVersionGroups, selectLatestArtifactVersion } from "./versions.js";

const ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  margin: "4px 0",
};

const LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
};

const CHIP: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 999,
  background: "#f9fafb",
  color: "#111827",
  fontSize: 12,
  padding: "3px 10px",
  cursor: "pointer",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

interface TurnTailCardProps {
  matched: readonly DiagramArtifactOccurrence[];
  sessionId: string;
  useSession: SnapshotSelectorHook<ConversationSnapshot>;
}

/** Compact turn-tail row listing the diagrams produced in the turn. */
export function TurnTailCard({ matched, sessionId, useSession }: TurnTailCardProps) {
  const nodes = useSession((s) => s.nodes);
  const groups = useMemo(() => listArtifactVersionGroups(nodes), [nodes]);

  const artifacts = useMemo(() => {
    const seen = new Set<string>();
    const result: { artifactId: string; title: string; latestVersion: number }[] = [];
    for (const occurrence of matched) {
      if (seen.has(occurrence.metadata.artifactId)) continue;
      seen.add(occurrence.metadata.artifactId);
      const group = groups.find((g) => g.artifactId === occurrence.metadata.artifactId);
      const latest = selectLatestArtifactVersion(group)?.version;
      if (latest === undefined) continue;
      result.push({
        artifactId: occurrence.metadata.artifactId,
        title: occurrence.metadata.title,
        latestVersion: latest,
      });
    }
    return result;
  }, [matched, groups]);

  if (artifacts.length === 0) return null;

  return (
    <div style={ROW}>
      <span style={LABEL}>Diagrams</span>
      {artifacts.map((artifact) => (
        <button
          key={artifact.artifactId}
          type="button"
          style={CHIP}
          title={artifact.title + " (v" + artifact.latestVersion + ")"}
          onClick={() =>
            artifactController.openArtifact(sessionId, artifact.artifactId, artifact.latestVersion)
          }
        >
          {artifact.title + " v" + artifact.latestVersion}
        </button>
      ))}
    </div>
  );
}
