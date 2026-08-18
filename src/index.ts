import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
import "@deepseek-ai/dsh-system-prompt";

import { DIAGRAM_ARTIFACT_SCHEMA } from "./shared/diagram.js";
import { normalizeDiagramArtifact } from "./shared/validate.js";

export const inject = ["tools", "systemPrompt"] as const;

export const RENDER_DIAGRAM_PROMPT = [
  "Use render_diagram when the user explicitly asks for a diagram or when the structure genuinely benefits from one; skip it for trivial answers.",
  "Choose a stable, session-local artifactId. Every update must repeat that artifactId and provide a complete replacement diagram specification.",
  "In the final prose, briefly mention the Artifact and do not repeat its JSON.",
].join(" ");

export function createRenderDiagramTool() {
  return defineTool({
    name: "render_diagram",
    description: "Create or update a safe diagram Artifact shown in DSH Web.",
    parameters: DIAGRAM_ARTIFACT_SCHEMA.properties,
    output: {
      schema: DIAGRAM_ARTIFACT_SCHEMA,
      render(_args, value) {
        return [{ type: "text", text: `Diagram Artifact “${value.title}” is ready.` }];
      },
      presentationMeta(_args, value) {
        return { schemaVersion: 1, kind: "diagram-artifact", ...value };
      },
    },
    isConcurrencySafe() {
      return true;
    },
    async execute(args) {
      return normalizeDiagramArtifact(args);
    },
  });
}

export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: "ui:diagram-artifacts",
    order: 185,
    text: RENDER_DIAGRAM_PROMPT,
  });
  ctx.tools.register(createRenderDiagramTool());
}
