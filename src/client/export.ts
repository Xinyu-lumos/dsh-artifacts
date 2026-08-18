/**
 * Safe export helpers for diagram artifacts. All filenames are sanitized and
 * all downloads are local blobs; nothing is uploaded anywhere.
 */

/** Reduce an arbitrary title or id to a safe, single-segment file stem. */
export function sanitizeFilename(input: string): string {
  const trimmed = (input ?? "").trim();
  const cleaned = trimmed
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return cleaned.slice(0, 80) || "diagram";
}

/** Build a filename like "title-id.ext" with both parts sanitized. */
export function buildFilename(artifactId: string, title: string, ext: string): string {
  const id = sanitizeFilename(artifactId);
  const base = title && title.trim() ? sanitizeFilename(title) : "";
  const stem = base ? base + "-" + id : id;
  return stem + "." + ext;
}

/** Trigger a local download of a blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build the standard SVG blob used for download and rasterization. */
export function makeSvgBlob(markup: string): Blob {
  return new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
}

/** Download SVG markup as a local .svg file. */
export function downloadSvg(filename: string, svgMarkup: string): void {
  downloadBlob(filename, makeSvgBlob(svgMarkup));
}

/** Rasterize SVG markup to a PNG and download it. Resolves false on failure. */
export function downloadPng(filename: string, svgMarkup: string, scale = 2): Promise<boolean> {
  return new Promise((resolve) => {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      try {
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(filename.replace(/\.svg$/, ".png"), blob);
            resolve(true);
          } else {
            resolve(false);
          }
        }, "image/png");
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Serialize a live SVG element to standalone markup, injecting explicit
 * width/height (from the viewBox) so it rasterizes at a stable size.
 */
export function serializeSvgElement(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    clone.setAttribute("width", String(vb.width));
    clone.setAttribute("height", String(vb.height));
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("style");
  return new XMLSerializer().serializeToString(clone);
}

/** Copy text to the clipboard; falls back to a hidden textarea when needed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
