import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { ToolCallBlock, ToolResultNode } from "@deepseek-ai/dsh-client-runtime/client";
import type { ToolCallViewProps } from "@deepseek-ai/dsh-client-ui-tool/client";
import type { DiagramPresentationMetadata } from "../shared/diagram.js";
import { parseDiagramPresentationMetadata } from "../shared/validate.js";
import { DiagramView } from "./DiagramView.js";
import { artifactController } from "./store.js";
import { listArtifactVersionGroups, selectLatestArtifactVersion } from "./versions.js";

function isSettled(block: ToolCallBlock): block is ToolResultNode {
  return "kind" in block && block.kind === "tool-result";
}

const CARD: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#ffffff",
  overflow: "hidden",
  margin: "4px 0",
};

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 12px",
  borderBottom: "1px solid #f0f0f0",
};

const TITLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const MUTED: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
};

const BODY: CSSProperties = {
  padding: 8,
  background: "#ffffff",
};

const BUTTON: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#f9fafb",
  color: "#111827",
  fontSize: 12,
  padding: "4px 10px",
  cursor: "pointer",
};

function RunningCard() {
  return (
    <div style={CARD}>
      <div style={HEADER}>
        <span style={TITLE}>Diagram</span>
        <span style={MUTED}>Generating...</span>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={CARD}>
      <div style={HEADER}>
        <span style={TITLE}>Diagram</span>
        <span style={MUTED}>Failed</span>
      </div>
      <div style={BODY}>
        <div style={MUTED}>{message}</div>
      </div>
    </div>
  );
}

function DiagramCard(props: {
  metadata: DiagramPresentationMetadata;
  onOpen?: () => void;
}) {
  const { metadata, onOpen } = props;
  return (
    <div style={CARD}>
      <div style={HEADER}>
        <span style={TITLE}>{"Diagram: " + metadata.title}</span>
        {onOpen ? (
          <button type="button" style={BUTTON} onClick={onOpen}>
            Open in panel
          </button>
        ) : null}
      </div>
      <div style={BODY}>
        <DiagramView diagram={metadata.diagram} title={metadata.title} theme="light" />
      </div>
    </div>
  );
}

/** Keyed atomic tool view for the render_diagram tool. */
export function RenderDiagramToolview(props: ToolCallViewProps) {
  const { block, sessionId, useSession } = props;
  const nodes = useSession((s) => s.nodes);
  const groups = useMemo(() => listArtifactVersionGroups(nodes), [nodes]);

  if (!isSettled(block)) return <RunningCard />;

  if (block.isError) {
    return <ErrorCard message={block.error?.name ?? "The diagram tool failed"} />;
  }

  const metadata = parseDiagramPresentationMetadata(block.meta);
  if (metadata === null) {
    return <ErrorCard message="The diagram result is not valid" />;
  }

  const group = groups.find((g) => g.artifactId === metadata.artifactId);
  const version =
    group?.versions.find((v) => v.seq === block.seq)?.version ??
    selectLatestArtifactVersion(group)?.version;

  return (
    <DiagramCard
      metadata={metadata}
      onOpen={
        version === undefined
          ? undefined
          : () => artifactController.openArtifact(sessionId, metadata.artifactId, version)
      }
    />
  );
}
