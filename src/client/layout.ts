import type { DiagramSpec, Direction, Tone } from "../shared/diagram.js";

/** A theme with `auto` already resolved to a concrete value. */
export type ResolvedTheme = "light" | "dark";

export interface LayoutOptions {
  direction?: Direction;
  theme?: ResolvedTheme;
}

export interface LayoutNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly lines: readonly string[];
  readonly tone?: Tone;
  readonly groupId?: string;
}

export interface LayoutGroup {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly tone?: Tone;
  readonly parentId?: string;
  readonly depth: number;
}

export interface LayoutEdge {
  readonly from: string;
  readonly to: string;
  readonly path: string;
  readonly label?: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly isBack: boolean;
}

export interface LayoutModel {
  readonly direction: Direction;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNode[];
  readonly groups: readonly LayoutGroup[];
  readonly edges: readonly LayoutEdge[];
}

export interface TonePalette {
  readonly stroke: string;
  readonly fill: string;
  readonly accent: string;
  readonly groupFill: string;
  readonly text: string;
}

const LIGHT_PALETTES: Record<Tone, TonePalette> = {
  neutral: { stroke: "#5b6472", fill: "#ffffff", accent: "#8a93a6", groupFill: "#f3f5f9", text: "#1f2430" },
  compute: { stroke: "#2563eb", fill: "#eff6ff", accent: "#3b82f6", groupFill: "#eaf2ff", text: "#1e3a8a" },
  flow: { stroke: "#059669", fill: "#ecfdf5", accent: "#10b981", groupFill: "#e7f7ef", text: "#065f46" },
  constraint: { stroke: "#d97706", fill: "#fffbeb", accent: "#f59e0b", groupFill: "#fef3c7", text: "#92400e" },
};

const DARK_PALETTES: Record<Tone, TonePalette> = {
  neutral: { stroke: "#9aa4b2", fill: "#1c2128", accent: "#c2cbd6", groupFill: "#242b34", text: "#e6eaf0" },
  compute: { stroke: "#60a5fa", fill: "#17243a", accent: "#3b82f6", groupFill: "#1c2c4a", text: "#dbeafe" },
  flow: { stroke: "#34d399", fill: "#0f2a20", accent: "#10b981", groupFill: "#12352a", text: "#d1fae5" },
  constraint: { stroke: "#fbbf24", fill: "#2b2210", accent: "#f59e0b", groupFill: "#33290f", text: "#fef3c7" },
};

export const TONE_PALETTES: Record<ResolvedTheme, Record<Tone, TonePalette>> = {
  light: LIGHT_PALETTES,
  dark: DARK_PALETTES,
};

export const DEFAULT_TONE: Tone = "neutral";

const NODE_WIDTH = 160;
const NODE_PAD_X = 12;
const NODE_PAD_Y = 9;
const LINE_HEIGHT = 18;
const UNIT_WIDTH = 8;
const MAX_LINE_UNITS = Math.floor((NODE_WIDTH - NODE_PAD_X * 2) / UNIT_WIDTH);
const RANK_GAP_MAIN = 56;
const NODE_GAP_CROSS = 24;
const CANVAS_PAD = 16;
const GROUP_PAD = 16;
const GROUP_HEADER = 26;
const BACK_EDGE_BOW = 44;

function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x2fffd) ||
    (cp >= 0x30000 && cp <= 0x3fffd)
  );
}

function charUnits(ch: string): number {
  return isWideCodePoint(ch.codePointAt(0) ?? 0) ? 2 : 1;
}

function wrapText(text: string, maxUnits: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  let units = 0;
  for (const ch of trimmed) {
    const u = charUnits(ch);
    if (units + u > maxUnits && line.length > 0) {
      lines.push(line);
      line = ch === " " ? "" : ch;
      units = line === "" ? 0 : u;
    } else {
      line += ch;
      units += u;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function nodeHeight(lines: readonly string[]): number {
  return Math.max(lines.length, 1) * LINE_HEIGHT + NODE_PAD_Y * 2;
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

interface PlacedNode {
  readonly id: string;
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;
  readonly lines: readonly string[];
  readonly tone?: Tone;
  readonly groupId?: string;
}

function assignRanks(nodeIds: readonly string[], edges: readonly { from: string; to: string }[]): Map<string, number> {
  const idSet = new Set(nodeIds);
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const incoming = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue;
    outgoing.get(edge.from)!.push(edge.to);
    incoming.get(edge.to)!.push(edge.from);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }
  const rank = new Map<string, number>();
  const queue: string[] = nodeIds.filter((id) => indegree.get(id) === 0);
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++]!;
    const predRanks = incoming.get(id)!.map((p) => rank.get(p) ?? 0);
    rank.set(id, predRanks.length > 0 ? Math.max(...predRanks) + 1 : 0);
    for (const to of outgoing.get(id)!) {
      indegree.set(to, (indegree.get(to) ?? 1) - 1);
      if (indegree.get(to) === 0) queue.push(to);
    }
  }
  let next = 0;
  for (const r of rank.values()) next = Math.max(next, r + 1);
  for (const id of nodeIds) {
    if (!rank.has(id)) rank.set(id, next++);
  }
  return rank;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function unionBounds(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function layoutDiagram(spec: DiagramSpec, options: LayoutOptions = {}): LayoutModel {
  const direction = options.direction ?? spec.direction;
  const theme: ResolvedTheme = options.theme ?? "light";

  const placed = new Map<string, PlacedNode>();
  const nodeOrder: PlacedNode[] = [];
  for (const node of spec.nodes) {
    const lines = wrapText(node.label, MAX_LINE_UNITS);
    const placedNode: PlacedNode = {
      id: node.id,
      x: 0,
      y: 0,
      width: NODE_WIDTH,
      height: nodeHeight(lines),
      lines,
      tone: node.tone,
      groupId: node.groupId,
    };
    placed.set(node.id, placedNode);
    nodeOrder.push(placedNode);
  }

  const rank = assignRanks(
    spec.nodes.map((n) => n.id),
    spec.edges,
  );
  const maxRank = nodeOrder.length === 0 ? -1 : Math.max(...rank.values());
  const buckets: PlacedNode[][] = Array.from({ length: Math.max(maxRank + 1, 0) }, () => []);
  for (const node of nodeOrder) buckets[rank.get(node.id) ?? 0].push(node);

  let mainCursor = 0;
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    let crossCursor = 0;
    let mainSize = 0;
    for (const node of bucket) {
      if (direction === "TB") {
        node.x = crossCursor;
        node.y = mainCursor;
        crossCursor += node.width + NODE_GAP_CROSS;
        mainSize = Math.max(mainSize, node.height);
      } else {
        node.x = mainCursor;
        node.y = crossCursor;
        crossCursor += node.height + NODE_GAP_CROSS;
        mainSize = Math.max(mainSize, node.width);
      }
    }
    mainCursor += mainSize + RANK_GAP_MAIN;
  }

  const groupById = new Map<string, { id: string; label: string; tone?: Tone; parentId?: string }>();
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const g of spec.groups) {
    groupById.set(g.id, { id: g.id, label: g.label, tone: g.tone, parentId: g.parentId });
    children.set(g.id, []);
  }
  for (const g of spec.groups) {
    if (g.parentId && groupById.has(g.parentId)) {
      children.get(g.parentId)!.push(g.id);
    } else {
      roots.push(g.id);
    }
  }
  const depthOf = new Map<string, number>();
  const visit = (id: string, depth: number): void => {
    if (depthOf.has(id)) return;
    depthOf.set(id, depth);
    for (const child of children.get(id) ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  for (const g of spec.groups) if (!depthOf.has(g.id)) depthOf.set(g.id, 0);

  const groupRects = new Map<string, Rect>();
  const directNodeIds = new Map<string, string[]>();
  for (const g of spec.groups) directNodeIds.set(g.id, []);
  for (const node of spec.nodes) {
    if (node.groupId && directNodeIds.has(node.groupId)) directNodeIds.get(node.groupId)!.push(node.id);
  }
  const laidOut = new Set<string>();
  const visiting = new Set<string>();
  const layoutGroup = (gid: string): void => {
    if (laidOut.has(gid) || visiting.has(gid)) return;
    visiting.add(gid);
    for (const child of children.get(gid) ?? []) layoutGroup(child);
    visiting.delete(gid);
    const rects: Rect[] = [];
    for (const nid of directNodeIds.get(gid) ?? []) {
      const n = placed.get(nid);
      if (n) rects.push({ x: n.x, y: n.y, width: n.width, height: n.height });
    }
    for (const child of children.get(gid) ?? []) {
      const r = groupRects.get(child);
      if (r) rects.push(r);
    }
    const bounds = unionBounds(rects);
    if (bounds === null) {
      groupRects.set(gid, { x: 0, y: 0, width: NODE_WIDTH, height: GROUP_HEADER + GROUP_PAD * 2 });
      laidOut.add(gid);
      return;
    }
    groupRects.set(gid, {
      x: bounds.x - GROUP_PAD,
      y: bounds.y - GROUP_PAD - GROUP_HEADER,
      width: bounds.width + GROUP_PAD * 2,
      height: bounds.height + GROUP_PAD * 2 + GROUP_HEADER,
    });
    laidOut.add(gid);
  };
  for (const root of roots) layoutGroup(root);

  const allRects: Rect[] = [
    ...nodeOrder.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })),
    ...[...groupRects.values()],
  ];
  const canvas = unionBounds(allRects);
  if (canvas === null) {
    return { direction, theme, width: 0, height: 0, nodes: [], groups: [], edges: [] };
  }
  const offsetX = CANVAS_PAD - canvas.x;
  const offsetY = CANVAS_PAD - canvas.y;
  for (const node of nodeOrder) {
    node.x += offsetX;
    node.y += offsetY;
  }

  const groups: LayoutGroup[] = [];
  for (const g of spec.groups) {
    const rect = groupRects.get(g.id);
    if (rect === undefined) continue;
    groups.push({
      id: g.id,
      x: rect.x + offsetX,
      y: rect.y + offsetY,
      width: rect.width,
      height: rect.height,
      label: g.label,
      tone: g.tone,
      parentId: g.parentId,
      depth: depthOf.get(g.id) ?? 0,
    });
  }

  const edges: LayoutEdge[] = [];
  const nodeById = new Map(nodeOrder.map((n) => [n.id, n]));
  for (const edge of spec.edges) {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!source || !target) continue;
    const sourceRank = rank.get(source.id) ?? 0;
    const targetRank = rank.get(target.id) ?? 0;
    const isBack = targetRank <= sourceRank;
    let path: string;
    let labelX: number;
    let labelY: number;
    if (!isBack) {
      if (direction === "TB") {
        const x0 = source.x + source.width / 2;
        const x1 = target.x + target.width / 2;
        const y0 = source.y + source.height;
        const y1 = target.y;
        const midY = (y0 + y1) / 2;
        path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(x0) + " " + fmt(midY) + ", " + fmt(x1) + " " + fmt(midY) + ", " + fmt(x1) + " " + fmt(y1);
        labelX = (x0 + x1) / 2;
        labelY = midY - 6;
      } else {
        const x0 = source.x + source.width;
        const x1 = target.x;
        const y0 = source.y + source.height / 2;
        const y1 = target.y + target.height / 2;
        const midX = (x0 + x1) / 2;
        path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(midX) + " " + fmt(y0) + ", " + fmt(midX) + " " + fmt(y1) + ", " + fmt(x1) + " " + fmt(y1);
        labelX = midX;
        labelY = (y0 + y1) / 2 - 6;
      }
    } else if (direction === "TB") {
      const x0 = source.x + source.width;
      const x1 = target.x + target.width;
      const y0 = source.y + source.height / 2;
      const y1 = target.y + target.height / 2;
      const xMid = Math.max(x0, x1) + BACK_EDGE_BOW;
      path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(xMid) + " " + fmt(y0) + ", " + fmt(xMid) + " " + fmt(y1) + ", " + fmt(x1) + " " + fmt(y1);
      labelX = xMid + 4;
      labelY = (y0 + y1) / 2;
    } else {
      const x0 = source.x + source.width / 2;
      const x1 = target.x + target.width / 2;
      const y0 = source.y + source.height;
      const y1 = target.y + target.height;
      const yMid = Math.max(y0, y1) + BACK_EDGE_BOW;
      path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(x0) + " " + fmt(yMid) + ", " + fmt(x1) + " " + fmt(yMid) + ", " + fmt(x1) + " " + fmt(y1);
      labelX = (x0 + x1) / 2;
      labelY = yMid + 12;
    }
    edges.push({ from: edge.from, to: edge.to, path, label: edge.label, labelX, labelY, isBack });
  }

  const width = canvas.width + CANVAS_PAD * 2;
  const height = canvas.height + CANVAS_PAD * 2;
  const nodes: LayoutNode[] = nodeOrder.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    lines: n.lines,
    tone: n.tone,
    groupId: n.groupId,
  }));

  return { direction, theme, width, height, nodes, groups, edges };
}
