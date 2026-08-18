/**
 * Safe export helpers for diagram artifacts. All filenames are sanitized and
 * all downloads are local blobs; nothing is uploaded anywhere.
 */
/** Reduce an arbitrary title or id to a safe, single-segment file stem. */
export declare function sanitizeFilename(input: string): string;
/** Build a filename like "title-id.ext" with both parts sanitized. */
export declare function buildFilename(artifactId: string, title: string, ext: string): string;
/** Trigger a local download of a blob. */
export declare function downloadBlob(filename: string, blob: Blob): void;
/** Build the standard SVG blob used for download and rasterization. */
export declare function makeSvgBlob(markup: string): Blob;
/** Download SVG markup as a local .svg file. */
export declare function downloadSvg(filename: string, svgMarkup: string): void;
/** Rasterize SVG markup to a PNG and download it. Resolves false on failure. */
export declare function downloadPng(filename: string, svgMarkup: string, scale?: number): Promise<boolean>;
/**
 * Serialize a live SVG element to standalone markup, injecting explicit
 * width/height (from the viewBox) so it rasterizes at a stable size.
 */
export declare function serializeSvgElement(svg: SVGSVGElement): string;
/** Copy text to the clipboard; falls back to a hidden textarea when needed. */
export declare function copyText(text: string): Promise<boolean>;
