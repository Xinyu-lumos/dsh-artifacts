import type {
  DiagramArtifact,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  DiagramPresentationMetadata,
  DiagramSpec,
  DiagramType,
  Direction,
  Theme,
  Tone,
} from "./diagram.js";
import { DIAGRAM_LIMITS } from "./diagram.js";

export interface DiagramViolation {
  readonly path: string;
  readonly message: string;
}

export class DiagramValidationError extends Error {
  readonly violations: readonly DiagramViolation[];

  constructor(violations: readonly DiagramViolation[]) {
    super(violations.map(({ path, message }) => `${path}: ${message}`).join("; "));
    this.name = "DiagramValidationError";
    this.violations = Object.freeze(violations.map((violation) => Object.freeze({ ...violation })));
  }
}

type RecordValue = Record<string, unknown>;
type AddViolation = (path: string, message: string) => void;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TYPES = new Set<DiagramType>(["workflow", "architecture", "nested-loop"]);
const DIRECTIONS = new Set<Direction>(["TB", "LR"]);
const TONES = new Set<Tone>(["neutral", "compute", "flow", "constraint"]);
const THEMES = new Set<Theme>(["auto", "light", "dark"]);

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: RecordValue, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function checkUnknown(record: RecordValue, known: readonly string[], path: string, add: AddViolation): void {
  const knownSet = new Set(known);
  for (const key of Object.keys(record).filter((key) => !knownSet.has(key)).sort()) {
    add(`${path}.${key}`, "unknown property");
  }
}

function requiredString(
  record: RecordValue,
  key: string,
  path: string,
  maxLength: number,
  add: AddViolation,
  id = false,
): string | undefined {
  const value = hasOwn(record, key) ? record[key] : undefined;
  const fieldPath = `${path}.${key}`;
  if (typeof value !== "string") {
    add(fieldPath, value === undefined ? "is required" : "must be a string");
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length === 0) add(fieldPath, "must not be empty");
  if ([...normalized].length > maxLength) add(fieldPath, `must be at most ${maxLength} characters`);
  if (id && normalized.length > 0 && !ID_PATTERN.test(normalized)) {
    add(fieldPath, "must start with an alphanumeric character and contain only A-Za-z0-9._-");
  }
  return normalized;
}

function optionalString(
  record: RecordValue,
  key: string,
  path: string,
  maxLength: number,
  add: AddViolation,
  id = false,
): string | undefined {
  if (!hasOwn(record, key)) return undefined;
  const value = record[key];
  const fieldPath = `${path}.${key}`;
  if (typeof value !== "string") {
    add(fieldPath, "must be a string");
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length === 0) add(fieldPath, "must not be empty");
  if ([...normalized].length > maxLength) add(fieldPath, `must be at most ${maxLength} characters`);
  if (id && normalized.length > 0 && !ID_PATTERN.test(normalized)) {
    add(fieldPath, "must start with an alphanumeric character and contain only A-Za-z0-9._-");
  }
  return normalized;
}

function enumValue<T extends string>(
  record: RecordValue,
  key: string,
  path: string,
  values: ReadonlySet<T>,
  expected: string,
  add: AddViolation,
  optional = false,
): T | undefined {
  if (optional && !hasOwn(record, key)) return undefined;
  const value = hasOwn(record, key) ? record[key] : undefined;
  const fieldPath = `${path}.${key}`;
  if (typeof value !== "string") {
    add(fieldPath, value === undefined ? "is required" : "must be a string");
    return undefined;
  }
  const normalized = value.trim();
  if (!values.has(normalized as T)) {
    add(fieldPath, `must be one of: ${expected}`);
    return undefined;
  }
  return normalized as T;
}

function parseGroups(value: unknown, path: string, add: AddViolation): DiagramGroup[] {
  if (!Array.isArray(value)) {
    add(path, value === undefined ? "is required" : "must be an array");
    return [];
  }
  if (value.length > DIAGRAM_LIMITS.maxGroups) add(path, `must contain at most ${DIAGRAM_LIMITS.maxGroups} items`);
  const result: DiagramGroup[] = [];
  const count = Math.min(value.length, DIAGRAM_LIMITS.maxGroups);
  for (let index = 0; index < count; index += 1) {
    const item = value[index];
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      add(itemPath, "must be an object");
      continue;
    }
    const id = requiredString(item, "id", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    const label = requiredString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
    const description = optionalString(item, "description", itemPath, DIAGRAM_LIMITS.maxDescriptionLength, add);
    const tone = enumValue(item, "tone", itemPath, TONES, "neutral | compute | flow | constraint", add, true);
    const parentId = optionalString(item, "parentId", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    checkUnknown(item, ["id", "label", "description", "tone", "parentId"], itemPath, add);
    result.push({
      ...(id !== undefined ? { id } : { id: "" }),
      ...(label !== undefined ? { label } : { label: "" }),
      ...(description !== undefined ? { description } : {}),
      ...(tone !== undefined ? { tone } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
    });
  }
  return result;
}

function parseNodes(value: unknown, path: string, add: AddViolation): DiagramNode[] {
  if (!Array.isArray(value)) {
    add(path, value === undefined ? "is required" : "must be an array");
    return [];
  }
  if (value.length > DIAGRAM_LIMITS.maxNodes) add(path, `must contain at most ${DIAGRAM_LIMITS.maxNodes} items`);
  const result: DiagramNode[] = [];
  const count = Math.min(value.length, DIAGRAM_LIMITS.maxNodes);
  for (let index = 0; index < count; index += 1) {
    const item = value[index];
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      add(itemPath, "must be an object");
      continue;
    }
    const id = requiredString(item, "id", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    const label = requiredString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
    const description = optionalString(item, "description", itemPath, DIAGRAM_LIMITS.maxDescriptionLength, add);
    const tone = enumValue(item, "tone", itemPath, TONES, "neutral | compute | flow | constraint", add, true);
    const groupId = optionalString(item, "groupId", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    checkUnknown(item, ["id", "label", "description", "tone", "groupId"], itemPath, add);
    result.push({
      ...(id !== undefined ? { id } : { id: "" }),
      ...(label !== undefined ? { label } : { label: "" }),
      ...(description !== undefined ? { description } : {}),
      ...(tone !== undefined ? { tone } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
    });
  }
  return result;
}

function parseEdges(value: unknown, path: string, add: AddViolation): DiagramEdge[] {
  if (!Array.isArray(value)) {
    add(path, value === undefined ? "is required" : "must be an array");
    return [];
  }
  if (value.length > DIAGRAM_LIMITS.maxEdges) add(path, `must contain at most ${DIAGRAM_LIMITS.maxEdges} items`);
  const result: DiagramEdge[] = [];
  const count = Math.min(value.length, DIAGRAM_LIMITS.maxEdges);
  for (let index = 0; index < count; index += 1) {
    const item = value[index];
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      add(itemPath, "must be an object");
      continue;
    }
    const from = requiredString(item, "from", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    const to = requiredString(item, "to", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
    const label = optionalString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
    checkUnknown(item, ["from", "to", "label"], itemPath, add);
    result.push({
      ...(from !== undefined ? { from } : { from: "" }),
      ...(to !== undefined ? { to } : { to: "" }),
      ...(label !== undefined ? { label } : {}),
    });
  }
  return result;
}

function parseDiagram(value: unknown, path: string, add: AddViolation): DiagramSpec | undefined {
  if (!isRecord(value)) {
    add(path, value === undefined ? "is required" : "must be an object");
    return undefined;
  }
  const type = enumValue(value, "type", path, TYPES, "workflow | architecture | nested-loop", add);
  const direction = enumValue(value, "direction", path, DIRECTIONS, "TB | LR", add);
  const groups = parseGroups(value.groups, `${path}.groups`, add);
  const nodes = parseNodes(value.nodes, `${path}.nodes`, add);
  const edges = parseEdges(value.edges, `${path}.edges`, add);
  const theme = enumValue(value, "theme", path, THEMES, "auto | light | dark", add, true);
  checkUnknown(value, ["type", "direction", "groups", "nodes", "edges", "theme"], path, add);
  return {
    ...(type !== undefined ? { type } : { type: "workflow" }),
    ...(direction !== undefined ? { direction } : { direction: "TB" }),
    groups,
    nodes,
    edges,
    ...(theme !== undefined ? { theme } : {}),
  };
}

function validateSemantics(diagram: DiagramSpec, path: string, add: AddViolation): void {
  const groupIndices = new Map<string, number>();
  const nodeIndices = new Map<string, number>();
  const allIds = new Map<string, string>();

  diagram.groups.forEach((group, index) => {
    if (!group.id || !ID_PATTERN.test(group.id)) return;
    const idPath = `${path}.groups[${index}].id`;
    const first = allIds.get(group.id);
    if (first !== undefined) add(idPath, `duplicates ${first}`);
    else {
      allIds.set(group.id, idPath);
      groupIndices.set(group.id, index);
    }
  });
  diagram.nodes.forEach((node, index) => {
    if (!node.id || !ID_PATTERN.test(node.id)) return;
    const idPath = `${path}.nodes[${index}].id`;
    const first = allIds.get(node.id);
    if (first !== undefined) add(idPath, `duplicates ${first}`);
    else {
      allIds.set(node.id, idPath);
      nodeIndices.set(node.id, index);
    }
  });

  const parentIndices: Array<number | undefined> = new Array(diagram.groups.length);
  const active = diagram.groups.map((group) => Boolean(group.id && groupIndices.has(group.id)));
  diagram.groups.forEach((group, index) => {
    if (!group.parentId || !active[index]) return;
    const parentIndex = groupIndices.get(group.parentId);
    if (parentIndex === undefined) {
      add(`${path}.groups[${index}].parentId`, `references unknown group "${group.parentId}"`);
      return;
    }
    parentIndices[index] = parentIndex;
  });

  // Each group has at most one parent. Coloring each vertex once and memoizing
  // its outcome keeps ancestry validation linear even for shared chains.
  const states = new Uint8Array(diagram.groups.length); // 0 = unseen, 1 = visiting, 2 = resolved
  const positions = new Int32Array(diagram.groups.length);
  positions.fill(-1);
  const depths: Array<number | undefined> = new Array(diagram.groups.length);
  const cycleMembers = new Set<number>();
  const cycleReaching = new Set<number>();

  for (let startIndex = 0; startIndex < diagram.groups.length; startIndex += 1) {
    if (!active[startIndex] || states[startIndex] !== 0) continue;
    const chain: number[] = [];
    let current: number | undefined = startIndex;
    while (current !== undefined && states[current] === 0) {
      states[current] = 1;
      positions[current] = chain.length;
      chain.push(current);
      current = parentIndices[current];
    }

    if (current !== undefined && states[current] === 1) {
      const cycleStart = positions[current]!;
      for (let index = cycleStart; index < chain.length; index += 1) {
        cycleMembers.add(chain[index]!);
      }
      for (const index of chain) cycleReaching.add(index);
    } else if (current !== undefined && cycleReaching.has(current)) {
      for (const index of chain) cycleReaching.add(index);
    } else {
      let depth = current === undefined ? 0 : depths[current]!;
      for (let index = chain.length - 1; index >= 0; index -= 1) {
        depth += 1;
        depths[chain[index]!] = depth;
      }
    }

    for (const index of chain) {
      states[index] = 2;
      positions[index] = -1;
    }
  }

  diagram.groups.forEach((_group, index) => {
    if (cycleMembers.has(index)) {
      add(`${path}.groups[${index}].parentId`, "creates a parent cycle");
    } else if (cycleReaching.has(index)) {
      add(`${path}.groups[${index}].parentId`, "parent ancestry enters a cycle");
    }
  });

  diagram.groups.forEach((_group, index) => {
    const depth = depths[index];
    if (depth !== undefined && depth > DIAGRAM_LIMITS.maxGroupDepth) {
      add(`${path}.groups[${index}].parentId`, `produces nesting depth ${depth}; maximum is ${DIAGRAM_LIMITS.maxGroupDepth}`);
    }
  });

  diagram.nodes.forEach((node, index) => {
    if (node.groupId !== undefined && !groupIndices.has(node.groupId)) {
      add(`${path}.nodes[${index}].groupId`, `references unknown group "${node.groupId}"`);
    }
  });
  diagram.edges.forEach((edge, index) => {
    if (edge.from && !nodeIndices.has(edge.from)) add(`${path}.edges[${index}].from`, `references unknown node "${edge.from}"`);
    if (edge.to && !nodeIndices.has(edge.to)) add(`${path}.edges[${index}].to`, `references unknown node "${edge.to}"`);
    if (edge.from && edge.to && edge.from === edge.to) add(`${path}.edges[${index}]`, "self edges are not allowed");
  });
}

export function normalizeDiagramArtifact(input: unknown): DiagramArtifact {
  const violations: DiagramViolation[] = [];
  const add: AddViolation = (path, message) => violations.push({ path, message });
  if (!isRecord(input)) throw new DiagramValidationError([{ path: "$", message: "must be an object" }]);

  const artifactId = requiredString(input, "artifactId", "$", DIAGRAM_LIMITS.maxIdLength, add, true);
  const title = requiredString(input, "title", "$", DIAGRAM_LIMITS.maxTitleLength, add);
  const diagram = parseDiagram(input.diagram, "$.diagram", add);
  checkUnknown(input, ["artifactId", "title", "diagram"], "$", add);
  if (diagram !== undefined) validateSemantics(diagram, "$.diagram", add);

  if (violations.length > 0) throw new DiagramValidationError(violations);
  return { artifactId: artifactId!, title: title!, diagram: diagram! };
}

export function parseDiagramPresentationMetadata(input: unknown): DiagramPresentationMetadata | null {
  if (!isRecord(input) || input.schemaVersion !== 1 || input.kind !== "diagram-artifact") return null;
  const keys = Object.keys(input);
  const allowed = new Set(["schemaVersion", "kind", "artifactId", "title", "diagram"]);
  if (keys.some((key) => !allowed.has(key))) return null;
  try {
    const artifact = normalizeDiagramArtifact({
      artifactId: input.artifactId,
      title: input.title,
      diagram: input.diagram,
    });
    return { schemaVersion: 1, kind: "diagram-artifact", ...artifact };
  } catch (error) {
    if (error instanceof DiagramValidationError) return null;
    throw error;
  }
}
