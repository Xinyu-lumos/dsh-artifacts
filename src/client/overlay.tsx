import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { ConversationSnapshot, SessionFace, SessionId } from "@deepseek-ai/dsh-client-runtime/client";
import type { ArtifactController } from "./artifact-controller.js";
import { DiagramView } from "./DiagramView.js";
import { findArtifactVersion, listArtifactVersionGroups } from "./versions.js";

export interface ArtifactOverlayInjected {
  controller: ArtifactController;
  getSession: (id: string) => SessionFace | undefined;
  getCurrentSessionId: () => SessionId | undefined;
  subscribeSessions: (fn: () => void) => () => void;
}

const PANEL: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: 480,
  maxWidth: "90vw",
  background: "#ffffff",
  borderLeft: "1px solid #e5e7eb",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
  display: "flex",
  flexDirection: "column",
  zIndex: 1000,
};

const PANEL_HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #f0f0f0",
};

const PANEL_TITLE: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const CLOSE_BUTTON: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#f9fafb",
  color: "#111827",
  fontSize: 12,
  padding: "4px 10px",
  cursor: "pointer",
};

const VERSION_BAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderBottom: "1px solid #f0f0f0",
  flexWrap: "wrap",
};

const VERSION_PILL: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 999,
  background: "#f9fafb",
  color: "#111827",
  fontSize: 12,
  padding: "2px 9px",
  cursor: "pointer",
};

const VERSION_PILL_ACTIVE: CSSProperties = {
  border: "1px solid #111827",
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  fontSize: 12,
  padding: "2px 9px",
  cursor: "pointer",
};

const PANEL_BODY: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: 16,
  background: "#ffffff",
};

const EMPTY: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  padding: 24,
  textAlign: "center",
};

function useSessionSnapshot(session: SessionFace | undefined): ConversationSnapshot | undefined {
  const subscribe = useMemo(
    () => (session ? (fn: () => void) => session.subscribe(fn) : () => () => {}),
    [session],
  );
  const getSnapshot = useMemo(
    () =>
      session
        ? () => session.getSnapshot()
        : () => undefined as unknown as ConversationSnapshot,
    [session],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Right-side drawer rendered by the shell.overlay list seat while an artifact is open. */
export function ArtifactOverlay(props: ArtifactOverlayInjected) {
  const { controller, getSession, getCurrentSessionId, subscribeSessions } = props;
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const currentSessionId = useSyncExternalStore(subscribeSessions, getCurrentSessionId, getCurrentSessionId);

  // Every hook runs before any early return (Rules of Hooks), so the open ->
  // closed transition never changes the hook count.
  const openSessionId = state.open ? state.sessionId : undefined;
  const session = openSessionId === undefined ? undefined : getSession(openSessionId);
  const snapshot = useSessionSnapshot(session);
  const groups = useMemo(() => listArtifactVersionGroups(snapshot ?? []), [snapshot]);

  useEffect(() => {
    if (currentSessionId === undefined) {
      if (state.open) controller.close();
    } else {
      controller.clearForSession(currentSessionId);
    }
  }, [currentSessionId, controller, state.open]);

  if (
    !state.open ||
    state.sessionId === undefined ||
    state.artifactId === undefined ||
    state.version === undefined
  ) {
    return null;
  }

  if (currentSessionId !== state.sessionId) return null;

  const group = groups.find((g) => g.artifactId === state.artifactId);
  const versions = group?.versions ?? [];
  const version = findArtifactVersion(group, state.version);

  return (
    <div style={PANEL} role="dialog" aria-label="Diagram artifact panel">
      <div style={PANEL_HEADER}>
        <span style={PANEL_TITLE}>{version ? version.metadata.title : "Diagram"}</span>
        <button type="button" style={CLOSE_BUTTON} onClick={() => controller.close()}>
          Close
        </button>
      </div>

      {versions.length > 1 ? (
        <div style={VERSION_BAR}>
          {versions.map((v) => (
            <button
              key={v.version}
              type="button"
              style={v.version === state.version ? VERSION_PILL_ACTIVE : VERSION_PILL}
              onClick={() => controller.selectVersion(v.version)}
            >
              {"v" + v.version}
            </button>
          ))}
        </div>
      ) : null}

      <div style={PANEL_BODY}>
        {version ? (
          <DiagramView
            diagram={version.metadata.diagram}
            title={version.metadata.title}
            theme="light"
          />
        ) : (
          <div style={EMPTY}>This diagram is not available in the current view.</div>
        )}
      </div>
    </div>
  );
}
