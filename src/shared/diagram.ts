export type DiagramType = "workflow" | "architecture" | "nested-loop";
export type Direction = "TB" | "LR";
export type Tone = "neutral" | "compute" | "flow" | "constraint";
export type Theme = "auto" | "light" | "dark";

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
