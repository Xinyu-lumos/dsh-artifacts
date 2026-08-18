import type { DiagramSpec, Direction, Theme } from "../shared/diagram.js";
import type { ResolvedTheme } from "./layout.js";
/**
 * Resolve an optional theme to a concrete light/dark value.
 * "auto" consults prefers-color-scheme when a media-query function is
 * available (browser) or injectable (tests); otherwise it falls back to light.
 */
export declare function resolveTheme(theme: Theme | undefined, mql?: (query: string) => {
    readonly matches: boolean;
}): ResolvedTheme;
export interface DiagramViewProps {
    /** The diagram spec to render (validated upstream by the host tool). */
    diagram: DiagramSpec;
    /** Optional override of the spec's own direction. */
    direction?: Direction;
    /** Display theme; auto resolves to the system preference. */
    theme?: Theme;
    /** Accessible title; also used for the SVG title/desc. */
    title?: string;
    /** Optional className appended to the root svg element. */
    className?: string;
}
/**
 * Claude-Artifact-style diagram view. Renders SVG directly via React elements,
 * so all text is auto-escaped and no HTML/script/style string is ever injected.
 * No external images, fonts, or resources are referenced.
 */
export declare const DiagramView: import("react").NamedExoticComponent<DiagramViewProps>;
