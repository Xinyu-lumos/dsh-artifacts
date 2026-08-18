import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { ToolCallBlock, ToolResultNode } from "@deepseek-ai/dsh-client-runtime/client";
import type { ToolCallViewProps } from "@deepseek-ai/dsh-client-ui-tool/client";
import type { DiagramPresentationMetadata, Theme } from "../shared/diagram.js";
import { parseDiagramPresentationMetadata } from "../shared/validate.js";
import { DiagramView } from "./DiagramView.js";
import { artifactSettings } from "./settings.js";
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
  theme: Theme;
  onOpen?: () => void;
}) {
  const { metadata, theme, onOpen } = props;
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
        <DiagramView diagram={metadata.diagram} title={metadata.title} theme={theme} />
      </div>
    </div>
  );
}

/** Keyed atomic tool view for the render_diagram tool. */
export function RenderDiagramToolview(props: ToolCallViewProps) {
  const { block, sessionId, useSession } = props;
  const settings = useSyncExternalStore(artifactSettings.subscribe, artifactSettings.getSnapshot, artifactSettings.getSnapshot);
  const autoOpenedRef = useRef<string | null>(null);
  const nodes = useSession((s) => s.nodes);
  const groups = useMemo(() => listArtifactVersionGroups(nodes), [nodes]);

  // Precompute settled facts so every hook stays above the early returns.
  let settledResult: ToolResultNode | null = null;
  let isError = false;
  let metadata: DiagramPresentationMetadata | null = null;
  let version: number | undefined;
  if (isSettled(block)) {
    settledResult = block;
    isError = block.isError;
    if (!block.isError) {
      metadata = parseDiagramPresentationMetadata(block.meta);
      if (metadata) {
        const meta = metadata;
        const group = groups.find((g) => g.artifactId === meta.artifactId);
        version =
          group?.versions.find((v) => v.seq === block.seq)?.version ??
          selectLatestArtifactVersion(group)?.version;
      }
    }
  }

  // Auto-open the drawer once per settled result, gated by the setting.
  useEffect(() => {
    if (settledResult === null || isError) return;
    if (metadata === null || version === undefined) return;
    if (!settings.autoOpen) return;
    const key = sessionId + ":" + metadata.artifactId + ":" + settledResult.seq;
    if (autoOpenedRef.current === key) return;
    autoOpenedRef.current = key;
    artifactController.openArtifact(sessionId, metadata.artifactId, version);
  }, [settledResult, isError, metadata, version, settings.autoOpen, sessionId]);

  if (settledResult === null) return <RunningCard />;
  if (isError) {
    return <ErrorCard message={settledResult.error?.name ?? "The diagram tool failed"} />;
  }
  if (metadata === null) {
    return <ErrorCard message="The diagram result is not valid" />;
  }
  const artifactId = metadata.artifactId;
  const resolvedVersion = version;

  return (
    <DiagramCard
      metadata={metadata}
      theme={settings.theme}
      onOpen={
        resolvedVersion === undefined
          ? undefined
          : () => artifactController.openArtifact(sessionId, artifactId, resolvedVersion)
      }
    />
  );
}
