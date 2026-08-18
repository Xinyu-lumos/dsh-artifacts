import { describe, expect, it } from "vitest";
import { DIAGRAM_LIMITS } from "../src/shared/diagram.js";
import {
  DiagramValidationError,
  normalizeDiagramArtifact,
  parseDiagramPresentationMetadata,
} from "../src/shared/validate.js";

function validArtifact(type: "workflow" | "architecture" | "nested-loop" = "workflow") {
  return {
    artifactId: "order-flow",
    title: "Order flow",
    diagram: {
      type,
      direction: "TB",
      groups: [{ id: "service", label: "Service", tone: "compute" }],
      nodes: [
        { id: "start", label: "Start", groupId: "service", description: "Entry" },
        { id: "finish", label: "Finish", tone: "flow" },
      ],
      edges: [{ from: "start", to: "finish", label: "next" }],
      theme: "auto",
    },
  };
}

function violations(input: unknown) {
  try {
    normalizeDiagramArtifact(input);
    throw new Error("expected validation failure");
  } catch (error) {
    expect(error).toBeInstanceOf(DiagramValidationError);
    return (error as DiagramValidationError).violations;
  }
}

describe("normalizeDiagramArtifact", () => {
  it.each(["workflow", "architecture", "nested-loop"] as const)("accepts a valid %s", (type) => {
    expect(normalizeDiagramArtifact(validArtifact(type)).diagram.type).toBe(type);
  });

  it("trims strings, returns a canonical copy, and does not mutate input", () => {
    const input = {
      artifactId: "  artifact.one  ",
      title: "  A title  ",
      ignored: undefined,
      diagram: {
        type: " workflow ", direction: " TB ", theme: " dark ", groups: [
          { id: " g1 ", label: " Group ", description: " Desc ", tone: " compute " },
        ],
        nodes: [{ id: " n1 ", label: " Node ", groupId: " g1 " }],
        edges: [],
      },
    };
    const accepted = { ...input };
    delete (accepted as { ignored?: unknown }).ignored;
    const result = normalizeDiagramArtifact(accepted);
    expect(result).toEqual({
      artifactId: "artifact.one", title: "A title", diagram: {
        type: "workflow", direction: "TB", groups: [
          { id: "g1", label: "Group", description: "Desc", tone: "compute" },
        ], nodes: [{ id: "n1", label: "Node", groupId: "g1" }], edges: [], theme: "dark",
      },
    });
    expect(accepted.diagram.groups[0]!.id).toBe(" g1 ");
    expect(result).not.toBe(accepted);
    expect(result.diagram).not.toBe(accepted.diagram);
  });

  it("rejects unknown properties at every closed-shape level", () => {
    const input = validArtifact() as Record<string, any>;
    input.extra = true;
    input.diagram.extra = true;
    input.diagram.groups[0].extra = true;
    input.diagram.nodes[0].extra = true;
    input.diagram.edges[0].extra = true;
    expect(violations(input).map((v) => v.path)).toEqual([
      "$.diagram.groups[0].extra",
      "$.diagram.nodes[0].extra",
      "$.diagram.edges[0].extra",
      "$.diagram.extra",
      "$.extra",
    ]);
  });

  it("accumulates wrong object, array, and scalar shapes", () => {
    const result = violations({ artifactId: 1, title: null, diagram: {
      type: 4, direction: false, groups: {}, nodes: "nodes", edges: null, theme: 2,
    } });
    expect(result.map((v) => v.path)).toEqual([
      "$.artifactId", "$.title", "$.diagram.type", "$.diagram.direction",
      "$.diagram.groups", "$.diagram.nodes", "$.diagram.edges", "$.diagram.theme",
    ]);
    expect(violations([])[0]).toEqual({ path: "$", message: "must be an object" });
  });

  it("rejects invalid enums and id formats", () => {
    const input = validArtifact() as Record<string, any>;
    input.artifactId = "bad id";
    input.diagram.type = "sequence";
    input.diagram.direction = "DOWN";
    input.diagram.theme = "blue";
    input.diagram.groups[0].tone = "hot";
    input.diagram.nodes[0].id = "_bad";
    expect(violations(input).map((v) => v.path)).toEqual([
      "$.artifactId", "$.diagram.type", "$.diagram.direction", "$.diagram.groups[0].tone",
      "$.diagram.nodes[0].id", "$.diagram.theme", "$.diagram.edges[0].from",
    ]);
  });

  it("requires IDs to be unique across nodes and groups", () => {
    const input = validArtifact();
    input.diagram.nodes[0]!.id = "service";
    expect(violations(input)).toContainEqual({
      path: "$.diagram.nodes[0].id",
      message: "duplicates $.diagram.groups[0].id",
    });
  });

  it("rejects missing group and endpoint references plus self edges", () => {
    const input = validArtifact();
    input.diagram.groups[0]!.parentId = "missing";
    input.diagram.nodes[0]!.groupId = "missing";
    input.diagram.edges = [
      { from: "missing", to: "finish" },
      { from: "start", to: "missing" },
      { from: "start", to: "start" },
    ];
    expect(violations(input).map((v) => v.path)).toEqual([
      "$.diagram.groups[0].parentId", "$.diagram.nodes[0].groupId",
      "$.diagram.edges[0].from", "$.diagram.edges[1].to", "$.diagram.edges[2]",
    ]);
  });

  it("detects all members of a parent cycle in group order", () => {
    const input = validArtifact("nested-loop");
    input.diagram.groups = [
      { id: "a", label: "A", parentId: "c" },
      { id: "b", label: "B", parentId: "a" },
      { id: "c", label: "C", parentId: "b" },
    ];
    input.diagram.nodes[0]!.groupId = "a";
    expect(violations(input).filter((v) => v.message.includes("cycle")).map((v) => v.path)).toEqual([
      "$.diagram.groups[0].parentId", "$.diagram.groups[1].parentId", "$.diagram.groups[2].parentId",
    ]);
  });

  it("detects a self-cycle", () => {
    const input = validArtifact("nested-loop");
    input.diagram.groups = [{ id: "self", label: "Self", parentId: "self" }];
    input.diagram.nodes[0]!.groupId = "self";
    expect(violations(input)).toContainEqual({
      path: "$.diagram.groups[0].parentId",
      message: "creates a parent cycle",
    });
  });

  it("detects two disjoint parent cycles", () => {
    const input = validArtifact("nested-loop");
    input.diagram.groups = [
      { id: "a", label: "A", parentId: "b" },
      { id: "b", label: "B", parentId: "a" },
      { id: "c", label: "C", parentId: "d" },
      { id: "d", label: "D", parentId: "c" },
    ];
    input.diagram.nodes[0]!.groupId = "a";
    expect(violations(input).filter((v) => v.message.includes("cycle"))).toEqual(
      [0, 1, 2, 3].map((index) => ({
        path: `$.diagram.groups[${index}].parentId`,
        message: "creates a parent cycle",
      })),
    );
  });

  it("marks descendants whose ancestry enters a cycle without reporting finite depth", () => {
    const input = validArtifact("nested-loop");
    input.diagram.groups = [
      { id: "descendant", label: "Descendant", parentId: "a" },
      { id: "a", label: "A", parentId: "b" },
      { id: "b", label: "B", parentId: "a" },
    ];
    input.diagram.nodes[0]!.groupId = "descendant";
    const result = violations(input);
    expect(result).toContainEqual({
      path: "$.diagram.groups[0].parentId",
      message: "parent ancestry enters a cycle",
    });
    expect(result.filter((v) => v.message.includes("nesting depth"))).toEqual([]);
  });

  it("accepts depth exactly 4 and rejects depth 5", () => {
    const depthFour = validArtifact("nested-loop");
    depthFour.diagram.groups = Array.from({ length: DIAGRAM_LIMITS.maxGroupDepth }, (_, index) => ({
      id: `g${index + 1}`, label: `G${index + 1}`, ...(index ? { parentId: `g${index}` } : {}),
    }));
    depthFour.diagram.nodes[0]!.groupId = `g${DIAGRAM_LIMITS.maxGroupDepth}`;
    expect(normalizeDiagramArtifact(depthFour).diagram.groups).toHaveLength(DIAGRAM_LIMITS.maxGroupDepth);

    const depthFive = validArtifact("nested-loop");
    depthFive.diagram.groups = Array.from({ length: DIAGRAM_LIMITS.maxGroupDepth + 1 }, (_, index) => ({
      id: `g${index + 1}`, label: `G${index + 1}`, ...(index ? { parentId: `g${index}` } : {}),
    }));
    depthFive.diagram.nodes[0]!.groupId = `g${DIAGRAM_LIMITS.maxGroupDepth + 1}`;
    expect(violations(depthFive)).toContainEqual({
      path: `$.diagram.groups[${DIAGRAM_LIMITS.maxGroupDepth}].parentId`,
      message: `produces nesting depth ${DIAGRAM_LIMITS.maxGroupDepth + 1}; maximum is ${DIAGRAM_LIMITS.maxGroupDepth}`,
    });
  });

  it("memoizes long-chain depths with deterministic violation ordering", () => {
    const input = validArtifact("nested-loop");
    input.diagram.groups = Array.from({ length: DIAGRAM_LIMITS.maxGroups }, (_, index) => ({
      id: `g${index + 1}`, label: `G${index + 1}`, ...(index ? { parentId: `g${index}` } : {}),
    }));
    input.diagram.nodes[0]!.groupId = `g${DIAGRAM_LIMITS.maxGroups}`;
    const first = violations(input).filter((v) => v.message.includes("nesting depth"));
    const second = violations(input).filter((v) => v.message.includes("nesting depth"));
    expect(second).toEqual(first);
    expect(first.map((v) => v.path)).toEqual(
      Array.from(
        { length: DIAGRAM_LIMITS.maxGroups - DIAGRAM_LIMITS.maxGroupDepth },
        (_, index) => `$.diagram.groups[${index + DIAGRAM_LIMITS.maxGroupDepth}].parentId`,
      ),
    );
  });

  it("enforces all collection limits without inspecting excess elements", () => {
    const input = validArtifact();
    const groups: any[] = Array.from({ length: DIAGRAM_LIMITS.maxGroups }, (_, index) => ({
      id: `g${index}`, label: `Group ${index}`,
    }));
    const nodes: any[] = Array.from({ length: DIAGRAM_LIMITS.maxNodes }, (_, index) => ({
      id: `n${index}`, label: `Node ${index}`,
    }));
    const edges: any[] = Array.from({ length: DIAGRAM_LIMITS.maxEdges }, () => ({ from: "n0", to: "n1" }));
    for (const [items, limit] of [
      [groups, DIAGRAM_LIMITS.maxGroups],
      [nodes, DIAGRAM_LIMITS.maxNodes],
      [edges, DIAGRAM_LIMITS.maxEdges],
    ] as const) {
      Object.defineProperty(items, limit, { get: () => { throw new Error("excess element inspected"); } });
    }
    input.diagram.groups = groups;
    input.diagram.nodes = nodes;
    input.diagram.edges = edges;
    expect(violations(input)).toEqual([
      { path: "$.diagram.groups", message: `must contain at most ${DIAGRAM_LIMITS.maxGroups} items` },
      { path: "$.diagram.nodes", message: `must contain at most ${DIAGRAM_LIMITS.maxNodes} items` },
      { path: "$.diagram.edges", message: `must contain at most ${DIAGRAM_LIMITS.maxEdges} items` },
    ]);
  });

  it("uses the exported ID length limit as the single length authority", () => {
    const accepted = validArtifact();
    accepted.artifactId = "a".repeat(DIAGRAM_LIMITS.maxIdLength);
    expect(normalizeDiagramArtifact(accepted).artifactId).toHaveLength(DIAGRAM_LIMITS.maxIdLength);

    const rejected = validArtifact();
    rejected.artifactId = "a".repeat(DIAGRAM_LIMITS.maxIdLength + 1);
    expect(violations(rejected)).toEqual([{
      path: "$.artifactId",
      message: `must be at most ${DIAGRAM_LIMITS.maxIdLength} characters`,
    }]);
  });

  it("enforces title, label, and description text limits after trimming", () => {
    const input = validArtifact();
    input.title = "t".repeat(DIAGRAM_LIMITS.maxTitleLength + 1);
    input.diagram.groups[0]!.label = "g".repeat(DIAGRAM_LIMITS.maxLabelLength + 1);
    input.diagram.groups[0]!.description = "d".repeat(DIAGRAM_LIMITS.maxDescriptionLength + 1);
    input.diagram.nodes[0]!.label = "n".repeat(DIAGRAM_LIMITS.maxLabelLength + 1);
    input.diagram.edges[0]!.label = "e".repeat(DIAGRAM_LIMITS.maxLabelLength + 1);
    expect(violations(input).map((v) => v.path)).toEqual([
      "$.title", "$.diagram.groups[0].label", "$.diagram.groups[0].description",
      "$.diagram.nodes[0].label", "$.diagram.edges[0].label",
    ]);
  });

  it("keeps violations in stable traversal order", () => {
    const input = {
      zzz: true, artifactId: " ", title: 3, diagram: {
        type: "bad", direction: "bad", groups: [{ label: " ", aaa: 1 }],
        nodes: [null], edges: [{ from: "x", to: "x", zzz: 1 }], yyy: true,
      }, aaa: true,
    };
    const first = violations(input);
    const second = violations(input);
    expect(second).toEqual(first);
    expect(first.map((v) => v.path)).toEqual([
      "$.artifactId", "$.title", "$.diagram.type", "$.diagram.direction",
      "$.diagram.groups[0].id", "$.diagram.groups[0].label", "$.diagram.groups[0].aaa",
      "$.diagram.nodes[0]", "$.diagram.edges[0].zzz", "$.diagram.yyy",
      "$.aaa", "$.zzz", "$.diagram.edges[0].from", "$.diagram.edges[0].to", "$.diagram.edges[0]",
    ]);
  });
});

describe("parseDiagramPresentationMetadata", () => {
  it("parses and normalizes valid persisted metadata", () => {
    const artifact = validArtifact();
    artifact.title = "  Saved diagram  ";
    expect(parseDiagramPresentationMetadata({ schemaVersion: 1, kind: "diagram-artifact", ...artifact })).toMatchObject({
      schemaVersion: 1, kind: "diagram-artifact", title: "Saved diagram",
    });
  });

  it.each([
    null,
    { schemaVersion: 2, kind: "diagram-artifact" },
    { schemaVersion: 1, kind: "other" },
    { schemaVersion: 1, kind: "diagram-artifact", extra: true, ...validArtifact() },
    { schemaVersion: 1, kind: "diagram-artifact", ...validArtifact(), diagram: {} },
  ])("returns null for invalid metadata", (input) => {
    expect(parseDiagramPresentationMetadata(input)).toBeNull();
  });
});
