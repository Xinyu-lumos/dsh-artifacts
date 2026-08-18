export const DIAGRAM_TYPE_VALUES = ["workflow", "architecture", "nested-loop"] as const;
export const DIRECTION_VALUES = ["TB", "LR"] as const;
export const TONE_VALUES = ["neutral", "compute", "flow", "constraint"] as const;
export const THEME_VALUES = ["auto", "light", "dark"] as const;

export type DiagramType = (typeof DIAGRAM_TYPE_VALUES)[number];
export type Direction = (typeof DIRECTION_VALUES)[number];
export type Tone = (typeof TONE_VALUES)[number];
export type Theme = (typeof THEME_VALUES)[number];

export interface DiagramGroup {
  id: string;
  label: string;
  description?: string;
  tone?: Tone;
  parentId?: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  description?: string;
  tone?: Tone;
  groupId?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramSpec {
  type: DiagramType;
  direction: Direction;
  groups: DiagramGroup[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  theme?: Theme;
}

export interface DiagramArtifact {
  artifactId: string;
  title: string;
  diagram: DiagramSpec;
}

export interface DiagramPresentationMetadata extends DiagramArtifact {
  schemaVersion: 1;
  kind: "diagram-artifact";
}

export const DIAGRAM_LIMITS = {
  maxGroups: 20,
  maxNodes: 40,
  maxEdges: 80,
  maxGroupDepth: 4,
  maxTitleLength: 120,
  maxLabelLength: 120,
  maxDescriptionLength: 240,
  maxIdLength: 64,
} as const;

const idDescription =
  `Must match ^[A-Za-z0-9][A-Za-z0-9._-]*$ and contain at most ${DIAGRAM_LIMITS.maxIdLength} characters.`;
const globallyUniqueIdDescription =
  `${idDescription} Node and group IDs must be globally unique across the diagram.`;
const labelDescription = `Required label; at most ${DIAGRAM_LIMITS.maxLabelLength} characters.`;
const optionalLabelDescription = `Optional label; at most ${DIAGRAM_LIMITS.maxLabelLength} characters.`;
const descriptionDescription = `Optional description; at most ${DIAGRAM_LIMITS.maxDescriptionLength} characters.`;

const TONE_SCHEMA = {
  type: "string",
  enum: TONE_VALUES,
  description: "Visual semantic tone.",
} as const;

export const DIAGRAM_GROUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: `Diagram group. IDs are global; nesting has a maximum depth of ${DIAGRAM_LIMITS.maxGroupDepth} and parent cycles are forbidden.`,
  properties: {
    id: { type: "string", description: globallyUniqueIdDescription, required: true },
    label: { type: "string", description: labelDescription, required: true },
    description: { type: "string", description: descriptionDescription },
    tone: TONE_SCHEMA,
    parentId: {
      type: "string",
      description: `${idDescription} Must reference the id of another group; parent cycles are forbidden and maximum nesting depth is ${DIAGRAM_LIMITS.maxGroupDepth}.`,
    },
  },
} as const;

export const DIAGRAM_NODE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: "Diagram node. Its id must be globally unique across all nodes and groups.",
  properties: {
    id: { type: "string", description: globallyUniqueIdDescription, required: true },
    label: { type: "string", description: labelDescription, required: true },
    description: { type: "string", description: descriptionDescription },
    tone: TONE_SCHEMA,
    groupId: {
      type: "string",
      description: `${idDescription} Must reference an existing group id.`,
    },
  },
} as const;

export const DIAGRAM_EDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: "Directed edge. Endpoints must reference node ids; self edges are forbidden.",
  properties: {
    from: {
      type: "string",
      description: `${idDescription} Must reference an existing node id and differ from to.`,
      required: true,
    },
    to: {
      type: "string",
      description: `${idDescription} Must reference an existing node id and differ from from.`,
      required: true,
    },
    label: { type: "string", description: optionalLabelDescription },
  },
} as const;

export const DIAGRAM_SPEC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: `Complete diagram: at most ${DIAGRAM_LIMITS.maxGroups} groups, ${DIAGRAM_LIMITS.maxNodes} nodes, and ${DIAGRAM_LIMITS.maxEdges} edges. Node/group ids are globally unique; all parentId, groupId, and edge endpoint references must resolve. Group depth is at most ${DIAGRAM_LIMITS.maxGroupDepth}; parent cycles and self edges are forbidden.`,
  properties: {
    type: { type: "string", enum: DIAGRAM_TYPE_VALUES, description: "Diagram layout family.", required: true },
    direction: { type: "string", enum: DIRECTION_VALUES, description: "Primary layout direction.", required: true },
    groups: {
      type: "array",
      items: DIAGRAM_GROUP_SCHEMA,
      description: `At most ${DIAGRAM_LIMITS.maxGroups} groups; parentId must reference another group, nesting depth is at most ${DIAGRAM_LIMITS.maxGroupDepth}, and parent cycles are forbidden.`,
      required: true,
    },
    nodes: {
      type: "array",
      items: DIAGRAM_NODE_SCHEMA,
      description: `At most ${DIAGRAM_LIMITS.maxNodes} nodes; groupId must reference an existing group id.`,
      required: true,
    },
    edges: {
      type: "array",
      items: DIAGRAM_EDGE_SCHEMA,
      description: `At most ${DIAGRAM_LIMITS.maxEdges} edges; endpoints are node ids and self edges are forbidden.`,
      required: true,
    },
    theme: { type: "string", enum: THEME_VALUES, description: "Optional display theme." },
  },
} as const;

export const DIAGRAM_ARTIFACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: "Canonical diagram Artifact returned by render_diagram.",
  properties: {
    artifactId: {
      type: "string",
      description: `Stable session-local Artifact id reused for updates. ${idDescription}`,
      required: true,
    },
    title: {
      type: "string",
      description: `Concise Artifact title; at most ${DIAGRAM_LIMITS.maxTitleLength} characters.`,
      required: true,
    },
    diagram: { ...DIAGRAM_SPEC_SCHEMA, required: true },
  },
} as const;
