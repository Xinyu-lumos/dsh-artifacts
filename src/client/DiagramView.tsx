import { memo, useMemo } from "react";
import type { DiagramSpec, Direction, Theme } from "../shared/diagram.js";
import { DEFAULT_TONE, TONE_PALETTES, layoutDiagram } from "./layout.js";
import type { ResolvedTheme } from "./layout.js";

/**
 * Resolve an optional theme to a concrete light/dark value.
 * "auto" consults prefers-color-scheme when a media-query function is
 * available (browser) or injectable (tests); otherwise it falls back to light.
 */
export function resolveTheme(
  theme: Theme | undefined,
  mql?: (query: string) => { readonly matches: boolean },
): ResolvedTheme {
  if (theme === "light" || theme === "dark") return theme;
  if (mql) {
    try {
      return mql("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  return "light";
}

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
export const DiagramView = memo(function DiagramView(props: DiagramViewProps) {
  const { diagram, direction, theme, title, className } = props;
  const resolved = useMemo(() => resolveTheme(theme), [theme]);
  const dir = direction ?? diagram.direction;
  const model = useMemo(() => layoutDiagram(diagram, { direction: dir, theme: resolved }), [diagram, dir, resolved]);

  const palettes = TONE_PALETTES[resolved];
  const edgeColor = resolved === "light" ? "#6b7280" : "#8b95a5";
  const markerId = resolved === "light" ? "dsh-artifact-arrow-light" : "dsh-artifact-arrow-dark";
  const rootClass = "dsh-artifact-diagram" + (className ? " " + className : "");
  const label = title ?? "Diagram";
  const viewBox = "0 0 " + model.width + " " + model.height;

  return (
    <svg
      className={rootClass}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      width="100%"
      style={{ height: "auto", display: "block" }}
    >
      <title>{label}</title>
      <desc>{"Diagram artifact" + (title ? ": " + title : "")}</desc>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeColor} />
        </marker>
      </defs>

      {model.groups.map((group) => {
        const pal = palettes[group.tone ?? DEFAULT_TONE];
        return (
          <g key={"g-" + group.id}>
            <rect
              x={group.x}
              y={group.y}
              width={group.width}
              height={group.height}
              rx={8}
              fill={pal.groupFill}
              stroke={pal.stroke}
              strokeOpacity={0.35}
            />
            <text
              x={group.x + 12}
              y={group.y + 17}
              fontSize={13}
              fontWeight={600}
              fill={pal.text}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {group.label}
            </text>
          </g>
        );
      })}

      {model.edges.map((edge, index) => (
        <g key={"e-" + index}>
          <path
            d={edge.path}
            fill="none"
            stroke={edgeColor}
            strokeWidth={1.5}
            markerEnd={"url(#" + markerId + ")"}
          />
          {edge.label ? (
            <text
              x={edge.labelX}
              y={edge.labelY}
              fontSize={11}
              fill={edgeColor}
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {edge.label}
            </text>
          ) : null}
        </g>
      ))}

      {model.nodes.map((node) => {
        const pal = palettes[node.tone ?? DEFAULT_TONE];
        const centerY = node.y + node.height / 2;
        const lineStartY = centerY - ((node.lines.length - 1) * 18) / 2;
        return (
          <g key={"n-" + node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={8}
              fill={pal.fill}
              stroke={pal.stroke}
              strokeWidth={1.5}
            />
            {node.lines.map((line, li) => (
              <text
                key={"l-" + li}
                x={node.x + node.width / 2}
                y={lineStartY + li * 18 + 12}
                fontSize={13}
                fill={pal.text}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
});
