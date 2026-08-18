import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagramView, resolveTheme } from "../src/client/DiagramView.js";

const diagram = {
  type: "workflow" as const,
  direction: "TB" as const,
  groups: [],
  nodes: [
    { id: "a", label: "<script>alert(1)</script>" },
    { id: "b", label: "Beta" },
  ],
  edges: [{ from: "a", to: "b", label: "<img src=x onerror=alert(1)>" }],
};

describe("resolveTheme", () => {
  it("returns explicit themes directly", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves auto from an injected media query", () => {
    expect(resolveTheme("auto", () => ({ matches: true }))).toBe("dark");
    expect(resolveTheme("auto", () => ({ matches: false }))).toBe("light");
  });

  it("falls back to light when the media query throws or is absent", () => {
    expect(
      resolveTheme("auto", () => {
        throw new Error("unavailable");
      }),
    ).toBe("light");
    expect(resolveTheme(undefined)).toBe("light");
  });
});

describe("DiagramView", () => {
  it("escapes labels and never emits raw HTML", () => {
    const html = renderToStaticMarkup(<DiagramView diagram={diagram} theme="light" title="Test" />);
    expect(html).toContain("<svg");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  it("does not use dangerouslySetInnerHTML", () => {
    const html = renderToStaticMarkup(<DiagramView diagram={diagram} theme="dark" />);
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders markers, paths, and node text", () => {
    const html = renderToStaticMarkup(<DiagramView diagram={diagram} theme="light" />);
    expect(html).toContain("<marker");
    expect(html).toContain("<path");
    expect(html).toContain("Beta");
  });
});
