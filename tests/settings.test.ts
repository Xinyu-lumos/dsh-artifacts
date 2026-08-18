import { describe, expect, it } from "vitest";
import { createArtifactSettings } from "../src/client/settings.js";

describe("createArtifactSettings", () => {
  it("defaults to auto-open enabled and light theme", () => {
    const store = createArtifactSettings();
    expect(store.getSnapshot()).toEqual({ autoOpen: true, theme: "light" });
  });

  it("applies initial overrides", () => {
    const store = createArtifactSettings({ autoOpen: false, theme: "dark" });
    expect(store.getSnapshot()).toEqual({ autoOpen: false, theme: "dark" });
  });

  it("updates values and notifies subscribers", () => {
    const store = createArtifactSettings();
    const seen: boolean[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot().autoOpen));
    store.setAutoOpen(false);
    store.setTheme("auto");
    expect(store.getSnapshot()).toEqual({ autoOpen: false, theme: "auto" });
    expect(seen.length).toBe(2);
    unsubscribe();
    store.setAutoOpen(true);
    expect(seen.length).toBe(2);
  });
});
