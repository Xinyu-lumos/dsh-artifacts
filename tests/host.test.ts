import { parameterSchemaSpecToJsonSchema, valueSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { apply, createRenderDiagramTool, inject, RENDER_DIAGRAM_PROMPT } from "../src/index.js";
import {
  DIAGRAM_ARTIFACT_SCHEMA,
  DIAGRAM_LIMITS,
  DIAGRAM_SPEC_SCHEMA,
  DIAGRAM_TYPE_VALUES,
  DIRECTION_VALUES,
  THEME_VALUES,
  TONE_VALUES,
} from "../src/shared/diagram.js";
import { DiagramValidationError, parseDiagramPresentationMetadata } from "../src/shared/validate.js";

function validArgs() {
  return {
    artifactId: "  checkout-flow  ",
    title: "  Checkout flow  ",
    diagram: {
      type: "workflow",
      direction: "LR",
      groups: [{ id: " app ", label: " App ", tone: "compute" }],
      nodes: [
        { id: " cart ", label: " Cart ", groupId: " app " },
        { id: " paid ", label: " Paid ", description: " Complete " },
      ],
      edges: [{ from: " cart ", to: " paid ", label: " pay " }],
      theme: "dark",
    },
  };
}

function registered() {
  const tools: unknown[] = [];
  const sections: unknown[] = [];
  apply({
    tools: { register(tool: unknown) { tools.push(tool); return () => {}; } },
    systemPrompt: { section(section: unknown) { sections.push(section); return () => {}; } },
  } as never);
  return { tool: tools[0] as ReturnType<typeof createRenderDiagramTool>, section: sections[0] as {
    name: string; order: number; text: string;
  } };
}

function nestedObjectSchemas(schema: any): any[] {
  const found: any[] = [];
  const visit = (value: any) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "object") found.push(value);
    if (value.properties) Object.values(value.properties).forEach(visit);
    if (value.items) visit(value.items);
  };
  visit(schema);
  return found;
}

describe("host diagram Artifact plugin", () => {
  it("declares the host services it injects", () => {
    expect(inject).toEqual(["tools", "systemPrompt"]);
  });

  it("registers stable model guidance at the tool-guidance order", () => {
    const { section } = registered();
    expect(section).toEqual({ name: "ui:diagram-artifacts", order: 185, text: RENDER_DIAGRAM_PROMPT });
    expect(section.text).toMatch(/explicitly asks/);
    expect(section.text).toMatch(/genuinely benefits/);
    expect(section.text).toMatch(/skip.*trivial/i);
    expect(section.text).toMatch(/stable, session-local artifactId/);
    expect(section.text).toMatch(/complete replacement/);
    expect(section.text).toMatch(/mention the Artifact/);
    expect(section.text).toMatch(/do not repeat its JSON/);
  });

  it("registers the render_diagram tool", () => {
    const { tool } = registered();
    expect(tool.name).toBe("render_diagram");
    expect(tool.description).toMatch(/safe diagram Artifact shown in DSH Web/);
  });

  it("normalizes valid execution arguments into the canonical Artifact", async () => {
    const tool = createRenderDiagramTool();
    const result = await tool.execute(validArgs(), {} as never);
    expect(result).toEqual({
      artifactId: "checkout-flow",
      title: "Checkout flow",
      diagram: {
        type: "workflow", direction: "LR", theme: "dark",
        groups: [{ id: "app", label: "App", tone: "compute" }],
        nodes: [
          { id: "cart", label: "Cart", groupId: "app" },
          { id: "paid", label: "Paid", description: "Complete" },
        ],
        edges: [{ from: "cart", to: "paid", label: "pay" }],
      },
    });
  });

  it("semantically rejects unknown implicit-root arguments", async () => {
    const tool = createRenderDiagramTool();
    await expect(tool.execute({ ...validArgs(), resource: "forbidden" }, {} as never))
      .rejects.toBeInstanceOf(DiagramValidationError);
  });

  it("renders one concise text block without echoing JSON", () => {
    const tool = createRenderDiagramTool();
    const value = { ...validArgs(), artifactId: "checkout-flow", title: "Checkout flow" };
    const content = tool.output.render(validArgs(), value as never);
    expect(content).toEqual([{ type: "text", text: "Diagram Artifact “Checkout flow” is ready." }]);
    expect(content[0] && "text" in content[0] ? content[0].text : "").not.toContain("artifactId");
  });

  it("emits presentation metadata accepted by the shared parser", async () => {
    const tool = createRenderDiagramTool();
    const value = await tool.execute(validArgs(), {} as never);
    const meta = tool.output.presentationMeta!(validArgs(), value as never);
    expect(meta).toEqual({ schemaVersion: 1, kind: "diagram-artifact", ...value });
    expect(parseDiagramPresentationMetadata(meta)).toEqual(meta);
  });

  it("is concurrency safe", () => {
    expect(createRenderDiagramTool().isConcurrencySafe?.(validArgs())).toBe(true);
  });

  it("compiles parameters and output from the shared Artifact and DiagramSpec fragments", () => {
    const tool = createRenderDiagramTool();
    const expectedParameters = parameterSchemaSpecToJsonSchema(DIAGRAM_ARTIFACT_SCHEMA.properties);
    const expectedOutput = valueSchemaSpecToJsonSchema(DIAGRAM_ARTIFACT_SCHEMA);
    const expectedDiagram = valueSchemaSpecToJsonSchema(DIAGRAM_SPEC_SCHEMA);

    expect(tool.parameters).toEqual(expectedParameters);
    expect(tool.output.schema).toEqual(expectedOutput);
    expect((tool.parameters as any).properties.diagram).toEqual(expectedDiagram);

    const diagram = (tool.parameters as any).properties.diagram;
    expect(diagram.properties.type.enum).toEqual(DIAGRAM_TYPE_VALUES);
    expect(diagram.properties.direction.enum).toEqual(DIRECTION_VALUES);
    expect(diagram.properties.theme.enum).toEqual(THEME_VALUES);
    expect(diagram.properties.groups.items.properties.tone.enum).toEqual(TONE_VALUES);
  });

  it("exposes semantic limits and reference rules in model-facing descriptions", () => {
    const parameters = createRenderDiagramTool().parameters as any;
    const diagram = parameters.properties.diagram;
    const group = diagram.properties.groups.items;
    const node = diagram.properties.nodes.items;
    const edge = diagram.properties.edges.items;

    expect(parameters.properties.artifactId.description).toContain(
      `^[A-Za-z0-9][A-Za-z0-9._-]*$`,
    );
    expect(parameters.properties.artifactId.description).toContain(String(DIAGRAM_LIMITS.maxIdLength));
    expect(diagram.description).toContain(`${DIAGRAM_LIMITS.maxGroups} groups`);
    expect(diagram.description).toContain(`${DIAGRAM_LIMITS.maxNodes} nodes`);
    expect(diagram.description).toContain(`${DIAGRAM_LIMITS.maxEdges} edges`);
    expect(diagram.description).toMatch(/globally unique/i);
    expect(diagram.description).toContain(String(DIAGRAM_LIMITS.maxGroupDepth));
    expect(group.properties.parentId.description).toMatch(/reference.*group/i);
    expect(group.properties.parentId.description).toMatch(/cycles.*forbidden/i);
    expect(node.properties.groupId.description).toMatch(/reference.*group/i);
    expect(edge.description).toMatch(/endpoints.*node ids/i);
    expect(edge.description).toMatch(/self edges.*forbidden/i);
    expect(group.properties.label.description).toContain(String(DIAGRAM_LIMITS.maxLabelLength));
    expect(group.properties.description.description).toContain(
      String(DIAGRAM_LIMITS.maxDescriptionLength),
    );
  });

  it("closes every nested parameter and output object schema", () => {
    const tool = createRenderDiagramTool();
    const parameterObjects = nestedObjectSchemas(tool.parameters).slice(1);
    expect(parameterObjects.length).toBeGreaterThan(0);
    expect(parameterObjects.every((schema) => schema.additionalProperties === false)).toBe(true);
    const outputObjects = nestedObjectSchemas(tool.output.schema);
    expect(outputObjects.length).toBeGreaterThan(0);
    expect(outputObjects.every((schema) => schema.additionalProperties === false)).toBe(true);
  });
});
