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
export declare const TONE_PALETTES: Record<ResolvedTheme, Record<Tone, TonePalette>>;
export declare const DEFAULT_TONE: Tone;
export declare function layoutDiagram(spec: DiagramSpec, options?: LayoutOptions): LayoutModel;
