import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { ConversationSnapshot, SessionFace, SessionId } from "@deepseek-ai/dsh-client-runtime/client";
import type { Theme } from "../shared/diagram.js";
import type { ArtifactController } from "./artifact-controller.js";
import { DiagramView } from "./DiagramView.js";
import { buildFilename, copyText, downloadPng, downloadSvg, serializeSvgElement } from "./export.js";
import { artifactSettings } from "./settings.js";
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
  width: 520,
  maxWidth: "92vw",
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
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #f0f0f0",
};

const PANEL_TITLE: CSSProperties = {
  flex: 1,
  fontSize: 14,
  fontWeight: 600,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const SELECT: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#f9fafb",
  color: "#111827",
  fontSize: 12,
  padding: "4px 8px",
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

const TAB_BAR: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: "6px 16px 0",
  borderBottom: "1px solid #f0f0f0",
};

const TAB: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#6b7280",
  fontSize: 12,
  padding: "6px 12px",
  cursor: "pointer",
  borderBottom: "2px solid transparent",
};

const TAB_ACTIVE: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#111827",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  cursor: "pointer",
  borderBottom: "2px solid #111827",
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

const SOURCE: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#111827",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const EMPTY: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  padding: 24,
  textAlign: "center",
};

const TOOLBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  borderTop: "1px solid #f0f0f0",
  flexWrap: "wrap",
};

const TOGGLE_LABEL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  color: "#374151",
  marginLeft: "auto",
};

const DEFAULT_PANEL_WIDTH = 520;
const MIN_PANEL_WIDTH = 320;

const RESIZE_HANDLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: 6,
  cursor: "col-resize",
  touchAction: "none",
  zIndex: 2,
};

/** Clamp a numeric value to an inclusive range (used for drawer resize bounds). */
export function clampWidth(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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
  const settings = useSyncExternalStore(artifactSettings.subscribe, artifactSettings.getSnapshot, artifactSettings.getSnapshot);
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [maximized, setMaximized] = useState(false);
  const [resizing, setResizing] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!resizing) return;
    const onMove = (event: globalThis.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - event.clientX;
      setWidth(clampWidth(dragRef.current.startWidth + delta, MIN_PANEL_WIDTH, window.innerWidth));
    };
    const onUp = () => {
      setResizing(false);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (!state.open) {
      setMaximized(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") controller.close();
    };
    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.open, controller]);

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

  const serialize = (): string | null => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return null;
    return serializeSvgElement(svg as SVGSVGElement);
  };

  const handleCopySvg = () => {
    const markup = serialize();
    if (markup) void copyText(markup);
  };

  const handleCopySpec = () => {
    if (version) void copyText(JSON.stringify(version.metadata.diagram, null, 2));
  };

  const handleDownloadSvg = () => {
    if (!version) return;
    const markup = serialize();
    if (markup) downloadSvg(buildFilename(version.metadata.artifactId, version.metadata.title, "svg"), markup);
  };

  const handleDownloadPng = () => {
    if (!version) return;
    const markup = serialize();
    if (markup) void downloadPng(buildFilename(version.metadata.artifactId, version.metadata.title, "svg"), markup);
  };

  const specText = version ? JSON.stringify(version.metadata.diagram, null, 2) : "";

  const panelStyle: CSSProperties = {
    ...PANEL,
    width: maximized ? "100vw" : width,
    maxWidth: maximized ? "100vw" : "92vw",
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    setResizing(true);
  };

  return (
    <div ref={panelRef} style={panelStyle} role="dialog" aria-label="Diagram artifact panel" tabIndex={-1}>
      {maximized ? null : (
        <div
          style={RESIZE_HANDLE}
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize diagram panel"
        />
      )}
      <div style={PANEL_HEADER}>
        <span style={PANEL_TITLE}>{version ? version.metadata.title : "Diagram"}</span>
        <select
          style={SELECT}
          value={settings.theme}
          onChange={(event) => artifactSettings.setTheme(event.target.value as Theme)}
          aria-label="Diagram theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
        <button
          type="button"
          style={BUTTON}
          onClick={() => setMaximized((value) => !value)}
          aria-label={maximized ? "Restore diagram panel" : "Maximize diagram panel"}
        >
          {maximized ? "Restore" : "Maximize"}
        </button>
        <button type="button" style={BUTTON} onClick={() => controller.close()}>
          Close
        </button>
      </div>

      <div style={TAB_BAR} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          style={tab === "preview" ? TAB_ACTIVE : TAB}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "source"}
          style={tab === "source" ? TAB_ACTIVE : TAB}
          onClick={() => setTab("source")}
        >
          Source
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
        <div ref={previewRef} style={{ display: tab === "preview" ? "block" : "none" }}>
          {version ? (
            <DiagramView
              diagram={version.metadata.diagram}
              title={version.metadata.title}
              theme={settings.theme}
            />
          ) : (
            <div style={EMPTY}>This diagram is not available in the current view.</div>
          )}
        </div>
        {tab === "source" ? <pre style={SOURCE}>{specText}</pre> : null}
      </div>

      <div style={TOOLBAR}>
        <button type="button" style={BUTTON} onClick={handleDownloadSvg}>
          Download SVG
        </button>
        <button type="button" style={BUTTON} onClick={handleDownloadPng}>
          Download PNG
        </button>
        <button type="button" style={BUTTON} onClick={handleCopySvg}>
          Copy SVG
        </button>
        <button type="button" style={BUTTON} onClick={handleCopySpec}>
          Copy spec
        </button>
        <label style={TOGGLE_LABEL}>
          <input
            type="checkbox"
            checked={settings.autoOpen}
            onChange={(event) => artifactSettings.setAutoOpen(event.target.checked)}
          />
          Auto-open
        </label>
      </div>
    </div>
  );
}
