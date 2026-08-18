/** Browser-side Cordis service dependencies. */
export const inject = [
  "slots",
  "locale",
  "conversationEvents",
  "connection",
] as const;

/** Register the browser half of the artifacts plugin. */
export function apply(_ctx: unknown): void {
  // Feature behavior begins in later tasks.
}
