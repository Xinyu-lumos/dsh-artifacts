export declare const DIAGRAM_TYPE_VALUES: readonly ["workflow", "architecture", "nested-loop"];
export declare const DIRECTION_VALUES: readonly ["TB", "LR"];
export declare const TONE_VALUES: readonly ["neutral", "compute", "flow", "constraint"];
export declare const THEME_VALUES: readonly ["auto", "light", "dark"];
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
export declare const DIAGRAM_LIMITS: {
    readonly maxGroups: 20;
    readonly maxNodes: 40;
    readonly maxEdges: 80;
    readonly maxGroupDepth: 4;
    readonly maxTitleLength: 120;
    readonly maxLabelLength: 120;
    readonly maxDescriptionLength: 240;
    readonly maxIdLength: 64;
};
export declare const DIAGRAM_GROUP_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "Diagram group. IDs are global; nesting has a maximum depth of 4 and parent cycles are forbidden.";
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly description: string;
            readonly required: true;
        };
        readonly label: {
            readonly type: "string";
            readonly description: string;
            readonly required: true;
        };
        readonly description: {
            readonly type: "string";
            readonly description: string;
        };
        readonly tone: {
            readonly type: "string";
            readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
            readonly description: "Visual semantic tone.";
        };
        readonly parentId: {
            readonly type: "string";
            readonly description: `${string} Must reference the id of another group; parent cycles are forbidden and maximum nesting depth is 4.`;
        };
    };
};
export declare const DIAGRAM_NODE_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "Diagram node. Its id must be globally unique across all nodes and groups.";
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly description: string;
            readonly required: true;
        };
        readonly label: {
            readonly type: "string";
            readonly description: string;
            readonly required: true;
        };
        readonly description: {
            readonly type: "string";
            readonly description: string;
        };
        readonly tone: {
            readonly type: "string";
            readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
            readonly description: "Visual semantic tone.";
        };
        readonly groupId: {
            readonly type: "string";
            readonly description: `${string} Must reference an existing group id.`;
        };
    };
};
export declare const DIAGRAM_EDGE_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "Directed edge. Endpoints must reference node ids; self edges are forbidden.";
    readonly properties: {
        readonly from: {
            readonly type: "string";
            readonly description: `${string} Must reference an existing node id and differ from to.`;
            readonly required: true;
        };
        readonly to: {
            readonly type: "string";
            readonly description: `${string} Must reference an existing node id and differ from from.`;
            readonly required: true;
        };
        readonly label: {
            readonly type: "string";
            readonly description: string;
        };
    };
};
export declare const DIAGRAM_SPEC_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "Complete diagram: at most 20 groups, 40 nodes, and 80 edges. Node/group ids are globally unique; all parentId, groupId, and edge endpoint references must resolve. Group depth is at most 4; parent cycles and self edges are forbidden.";
    readonly properties: {
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["workflow", "architecture", "nested-loop"];
            readonly description: "Diagram layout family.";
            readonly required: true;
        };
        readonly direction: {
            readonly type: "string";
            readonly enum: readonly ["TB", "LR"];
            readonly description: "Primary layout direction.";
            readonly required: true;
        };
        readonly groups: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly description: "Diagram group. IDs are global; nesting has a maximum depth of 4 and parent cycles are forbidden.";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly description: string;
                        readonly required: true;
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly description: string;
                        readonly required: true;
                    };
                    readonly description: {
                        readonly type: "string";
                        readonly description: string;
                    };
                    readonly tone: {
                        readonly type: "string";
                        readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
                        readonly description: "Visual semantic tone.";
                    };
                    readonly parentId: {
                        readonly type: "string";
                        readonly description: `${string} Must reference the id of another group; parent cycles are forbidden and maximum nesting depth is 4.`;
                    };
                };
            };
            readonly description: "At most 20 groups; parentId must reference another group, nesting depth is at most 4, and parent cycles are forbidden.";
            readonly required: true;
        };
        readonly nodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly description: "Diagram node. Its id must be globally unique across all nodes and groups.";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly description: string;
                        readonly required: true;
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly description: string;
                        readonly required: true;
                    };
                    readonly description: {
                        readonly type: "string";
                        readonly description: string;
                    };
                    readonly tone: {
                        readonly type: "string";
                        readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
                        readonly description: "Visual semantic tone.";
                    };
                    readonly groupId: {
                        readonly type: "string";
                        readonly description: `${string} Must reference an existing group id.`;
                    };
                };
            };
            readonly description: "At most 40 nodes; groupId must reference an existing group id.";
            readonly required: true;
        };
        readonly edges: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly description: "Directed edge. Endpoints must reference node ids; self edges are forbidden.";
                readonly properties: {
                    readonly from: {
                        readonly type: "string";
                        readonly description: `${string} Must reference an existing node id and differ from to.`;
                        readonly required: true;
                    };
                    readonly to: {
                        readonly type: "string";
                        readonly description: `${string} Must reference an existing node id and differ from from.`;
                        readonly required: true;
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly description: string;
                    };
                };
            };
            readonly description: "At most 80 edges; endpoints are node ids and self edges are forbidden.";
            readonly required: true;
        };
        readonly theme: {
            readonly type: "string";
            readonly enum: readonly ["auto", "light", "dark"];
            readonly description: "Optional display theme.";
        };
    };
};
export declare const DIAGRAM_ARTIFACT_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "Canonical diagram Artifact returned by render_diagram.";
    readonly properties: {
        readonly artifactId: {
            readonly type: "string";
            readonly description: `Stable session-local Artifact id reused for updates. ${string}`;
            readonly required: true;
        };
        readonly title: {
            readonly type: "string";
            readonly description: "Concise Artifact title; at most 120 characters.";
            readonly required: true;
        };
        readonly diagram: {
            readonly required: true;
            readonly type: "object";
            readonly additionalProperties: false;
            readonly description: "Complete diagram: at most 20 groups, 40 nodes, and 80 edges. Node/group ids are globally unique; all parentId, groupId, and edge endpoint references must resolve. Group depth is at most 4; parent cycles and self edges are forbidden.";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["workflow", "architecture", "nested-loop"];
                    readonly description: "Diagram layout family.";
                    readonly required: true;
                };
                readonly direction: {
                    readonly type: "string";
                    readonly enum: readonly ["TB", "LR"];
                    readonly description: "Primary layout direction.";
                    readonly required: true;
                };
                readonly groups: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly description: "Diagram group. IDs are global; nesting has a maximum depth of 4 and parent cycles are forbidden.";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly description: string;
                                readonly required: true;
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly description: string;
                                readonly required: true;
                            };
                            readonly description: {
                                readonly type: "string";
                                readonly description: string;
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
                                readonly description: "Visual semantic tone.";
                            };
                            readonly parentId: {
                                readonly type: "string";
                                readonly description: `${string} Must reference the id of another group; parent cycles are forbidden and maximum nesting depth is 4.`;
                            };
                        };
                    };
                    readonly description: "At most 20 groups; parentId must reference another group, nesting depth is at most 4, and parent cycles are forbidden.";
                    readonly required: true;
                };
                readonly nodes: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly description: "Diagram node. Its id must be globally unique across all nodes and groups.";
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                                readonly description: string;
                                readonly required: true;
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly description: string;
                                readonly required: true;
                            };
                            readonly description: {
                                readonly type: "string";
                                readonly description: string;
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["neutral", "compute", "flow", "constraint"];
                                readonly description: "Visual semantic tone.";
                            };
                            readonly groupId: {
                                readonly type: "string";
                                readonly description: `${string} Must reference an existing group id.`;
                            };
                        };
                    };
                    readonly description: "At most 40 nodes; groupId must reference an existing group id.";
                    readonly required: true;
                };
                readonly edges: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly description: "Directed edge. Endpoints must reference node ids; self edges are forbidden.";
                        readonly properties: {
                            readonly from: {
                                readonly type: "string";
                                readonly description: `${string} Must reference an existing node id and differ from to.`;
                                readonly required: true;
                            };
                            readonly to: {
                                readonly type: "string";
                                readonly description: `${string} Must reference an existing node id and differ from from.`;
                                readonly required: true;
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly description: string;
                            };
                        };
                    };
                    readonly description: "At most 80 edges; endpoints are node ids and self edges are forbidden.";
                    readonly required: true;
                };
                readonly theme: {
                    readonly type: "string";
                    readonly enum: readonly ["auto", "light", "dark"];
                    readonly description: "Optional display theme.";
                };
            };
        };
    };
};
