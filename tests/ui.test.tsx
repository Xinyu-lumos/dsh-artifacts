import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ConversationSnapshot, SessionFace } from "@deepseek-ai/dsh-client-runtime/client";
import { createArtifactController } from "../src/client/artifact-controller.js";
import { ArtifactOverlay } from "../src/client/overlay.js";
import { RenderDiagramToolview } from "../src/client/render-toolview.js";

const diagram = {
  type: "workflow" as const,
  direction: "TB" as const,
  groups: [],
  nodes: [{ id: "a", label: "Start" }],
  edges: [],
};

const metadata = {
  schemaVersion: 1,
  kind: "diagram-artifact",
  artifactId: "flow-1",
  title: "Flow",
  diagram,
};

const resultNode = {
  kind: "tool-result",
  seq: 1,
  isError: false,
  meta: metadata,
};

const snapshot = { nodes: [resultNode] } as unknown as ConversationSnapshot;

const session = {
  getSnapshot: () => snapshot,
  subscribe: () => () => {},
} as unknown as SessionFace;

function useSessionMock<S>(sel: (s: ConversationSnapshot) => S): S {
  return sel(snapshot);
}

describe("ArtifactOverlay", () => {
  it("renders nothing while closed", () => {
    const controller = createArtifactController();
    const html = renderToStaticMarkup(
      <ArtifactOverlay
        controller={controller}
        getSession={() => session}
        getCurrentSessionId={() => undefined}
        subscribeSessions={() => () => {}}
      />,
    );
    expect(html).toBe("");
  });

  it("renders the panel title and diagram while open", () => {
    const controller = createArtifactController();
    controller.openArtifact("sess-1", "flow-1", 1);
    const html = renderToStaticMarkup(
      <ArtifactOverlay
        controller={controller}
        getSession={() => session}
        getCurrentSessionId={() => "sess-1" as never}
        subscribeSessions={() => () => {}}
      />,
    );
    expect(html).toContain("Flow");
    expect(html).toContain("<svg");
    expect(html).toContain("Close");
  });
});

describe("RenderDiagramToolview", () => {
  const sessionId = "sess-1";

  it("shows a pending card while the call is running", () => {
    const block = { name: "render_diagram", callId: "c1" } as never;
    const html = renderToStaticMarkup(
      <RenderDiagramToolview block={block} sessionId={sessionId} useSession={useSessionMock} />,
    );
    expect(html).toContain("Generating");
    expect(html).not.toContain("<svg");
  });

  it("shows an error card on a failed result", () => {
    const block = { kind: "tool-result", seq: 1, isError: true, error: { name: "Boom" } } as never;
    const html = renderToStaticMarkup(
      <RenderDiagramToolview block={block} sessionId={sessionId} useSession={useSessionMock} />,
    );
    expect(html).toContain("Failed");
    expect(html).toContain("Boom");
    expect(html).not.toContain("<svg");
  });

  it("renders the inline diagram card for a settled result", () => {
    const block = { kind: "tool-result", seq: 1, isError: false, meta: metadata } as never;
    const html = renderToStaticMarkup(
      <RenderDiagramToolview block={block} sessionId={sessionId} useSession={useSessionMock} />,
    );
    expect(html).toContain("Diagram: Flow");
    expect(html).toContain("<svg");
    expect(html).toContain("Open in panel");
  });
});
