import { describe, expect, it } from "vitest";
import type { DiagramSpec } from "../src/shared/diagram.js";
import { TONE_PALETTES, layoutDiagram } from "../src/client/layout.js";

function spec(partial?: Partial<DiagramSpec>): DiagramSpec {
  return {
    type: "workflow",
    direction: "TB",
    groups: [],
    nodes: [],
    edges: [],
    ...partial,
  };
}

const threeNodes = spec({
  nodes: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
  ],
  edges: [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ],
});

describe("layoutDiagram", () => {
  it("is deterministic for identical input", () => {
    const first = layoutDiagram(threeNodes);
    const second = layoutDiagram(threeNodes);
    expect(first).toEqual(second);
  });

  it("places a linear chain along the main axis for TB", () => {
    const model = layoutDiagram(threeNodes);
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    const a = byId.get("a")!;
    const b = byId.get("b")!;
    const c = byId.get("c")!;
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    for (const n of model.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(Number.isFinite(n.width)).toBe(true);
      expect(Number.isFinite(n.height)).toBe(true);
    }
    expect(Number.isFinite(model.width)).toBe(true);
    expect(Number.isFinite(model.height)).toBe(true);
  });

  it("flips the rank axis for LR", () => {
    const tb = layoutDiagram(threeNodes);
    const lr = layoutDiagram(spec({ ...threeNodes, direction: "LR" }));
    const byIdTb = new Map(tb.nodes.map((n) => [n.id, n]));
    const byIdLr = new Map(lr.nodes.map((n) => [n.id, n]));
    expect(byIdTb.get("a")!.y).toBeLessThan(byIdTb.get("c")!.y);
    expect(byIdLr.get("a")!.x).toBeLessThan(byIdLr.get("c")!.x);
  });

  it("keeps sibling nodes in a rank from overlapping", () => {
    const s = spec({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
      edges: [],
    });
    const model = layoutDiagram(s);
    const width = model.nodes[0]!.width;
    const xs = model.nodes.map((n) => n.x).sort((p, q) => p - q);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(width);
    }
  });

  it("draws a back edge as a curved return path", () => {
    const s = spec({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
      ],
    });
    const model = layoutDiagram(s);
    const back = model.edges.find((e) => e.from === "c" && e.to === "a")!;
    expect(back).toBeDefined();
    expect(back.isBack).toBe(true);
    expect(back.path.startsWith("M ")).toBe(true);
    expect(back.path).toContain(" C ");
  });

  it("contains its member nodes inside group bounds", () => {
    const s = spec({
      nodes: [
        { id: "a", label: "Alpha", groupId: "g1" },
        { id: "b", label: "Beta", groupId: "g1" },
      ],
      edges: [{ from: "a", to: "b" }],
      groups: [{ id: "g1", label: "Group One" }],
    });
    const model = layoutDiagram(s);
    const g = model.groups.find((gr) => gr.id === "g1")!;
    expect(g).toBeDefined();
    for (const n of model.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y).toBeGreaterThanOrEqual(g.y);
      expect(n.x + n.width).toBeLessThanOrEqual(g.x + g.width);
      expect(n.y + n.height).toBeLessThanOrEqual(g.y + g.height);
    }
  });

  it("nests child groups inside parent groups", () => {
    const s = spec({
      nodes: [{ id: "a", label: "Alpha", groupId: "child" }],
      edges: [],
      groups: [
        { id: "parent", label: "Parent" },
        { id: "child", label: "Child", parentId: "parent" },
      ],
    });
    const model = layoutDiagram(s);
    const parent = model.groups.find((gr) => gr.id === "parent")!;
    const child = model.groups.find((gr) => gr.id === "child")!;
    expect(child.depth).toBe(1);
    expect(child.x).toBeGreaterThanOrEqual(parent.x);
    expect(child.y).toBeGreaterThanOrEqual(parent.y);
    expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width);
    expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height);
  });

  it("skips a malformed group parent cycle without overflowing", () => {
    const s = spec({
      nodes: [{ id: "n", label: "Node", groupId: "g-a" }],
      edges: [],
      groups: [
        { id: "g-a", label: "A", parentId: "g-b" },
        { id: "g-b", label: "B", parentId: "g-a" },
      ],
    });
    const model = layoutDiagram(s);
    expect(model.groups).toHaveLength(0);
  });

  it("wraps long labels and clamps each line", () => {
    const s = spec({
      nodes: [{ id: "a", label: "A very long label that exceeds the node width and must wrap onto several lines" }],
      edges: [],
    });
    const model = layoutDiagram(s);
    const node = model.nodes[0]!;
    expect(node.lines.length).toBeGreaterThan(1);
    for (const line of node.lines) {
      expect(line.length).toBeLessThanOrEqual(17);
    }
  });

  it("exposes complete hex tone palettes for both themes", () => {
    const tones = ["neutral", "compute", "flow", "constraint"] as const;
    for (const theme of ["light", "dark"] as const) {
      for (const tone of tones) {
        const pal = TONE_PALETTES[theme][tone];
        expect(pal.stroke).toMatch(/^#[0-9a-f]{6}$/);
        expect(pal.fill).toMatch(/^#[0-9a-f]{6}$/);
        expect(pal.accent).toMatch(/^#[0-9a-f]{6}$/);
        expect(pal.groupFill).toMatch(/^#[0-9a-f]{6}$/);
        expect(pal.text).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("skips edges with missing endpoints defensively", () => {
    const s = spec({
      nodes: [{ id: "a", label: "Alpha" }],
      edges: [
        { from: "a", to: "missing" },
        { from: "missing", to: "a" },
      ],
    });
    const model = layoutDiagram(s);
    expect(model.edges).toHaveLength(0);
  });

  it("handles an empty diagram", () => {
    const model = layoutDiagram(spec());
    expect(model.nodes).toHaveLength(0);
    expect(model.edges).toHaveLength(0);
    expect(model.groups).toHaveLength(0);
  });
});
