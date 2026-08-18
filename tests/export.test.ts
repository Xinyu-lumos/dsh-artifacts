import { describe, expect, it } from "vitest";
import { buildFilename, makeSvgBlob, sanitizeFilename } from "../src/client/export.js";

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeFilename('a\\b:c*d?e"f<g>h|i')).toBe("a-b-c-d-e-f-g-h-i");
  });

  it("collapses whitespace and hyphens", () => {
    expect(sanitizeFilename("  hello   world  ")).toBe("hello-world");
    expect(sanitizeFilename("a--b")).toBe("a-b");
  });

  it("trims leading and trailing dots and hyphens", () => {
    expect(sanitizeFilename("...hidden")).toBe("hidden");
    expect(sanitizeFilename("-dash-")).toBe("dash");
  });

  it("falls back to a safe default for empty or all-unsafe input", () => {
    expect(sanitizeFilename("")).toBe("diagram");
    expect(sanitizeFilename("///")).toBe("diagram");
  });

  it("truncates very long names", () => {
    expect(sanitizeFilename("x".repeat(200)).length).toBe(80);
  });
});

describe("buildFilename", () => {
  it("combines a sanitized title and id with an extension", () => {
    expect(buildFilename("flow-1", "My Flow", "svg")).toBe("My-Flow-flow-1.svg");
  });

  it("uses only the id when the title is empty", () => {
    expect(buildFilename("flow-1", "", "svg")).toBe("flow-1.svg");
  });
});

describe("makeSvgBlob", () => {
  it("produces a non-empty svg blob", () => {
    const blob = makeSvgBlob("<svg></svg>");
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("image/svg+xml;charset=utf-8");
  });
});
