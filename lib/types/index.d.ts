import type { Context } from "@deepseek-ai/cordis";
import "@deepseek-ai/dsh-system-prompt";
export declare const inject: readonly ["tools", "systemPrompt"];
export declare const RENDER_DIAGRAM_PROMPT: string;
export declare function createRenderDiagramTool(): import("@deepseek-ai/dsh-tools").ToolDefinition;
export declare function apply(ctx: Context): void;
