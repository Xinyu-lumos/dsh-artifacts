import { describe, expect, it, vi } from "vitest";
import { ArtifactController } from "../src/client/artifact-controller.js";

describe("ArtifactController", () => {
  it("publishes immutable snapshots and supports unsubscribe", () => {
    const controller = new ArtifactController();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.openArtifact("session-a", "artifact-a", 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toEqual({ open: true, sessionId: "session-a", artifactId: "artifact-a", version: 1 });
    expect(Object.isFrozen(controller.getSnapshot())).toBe(true);
    unsubscribe();
    controller.selectVersion(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify for idempotent operations", () => {
    const controller = new ArtifactController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.close();
    controller.openArtifact("session-a", "artifact-a", 1);
    controller.openArtifact("session-a", "artifact-a", 1);
    controller.selectVersion(1);
    expect(listener).toHaveBeenCalledTimes(1);
    controller.close();
    controller.close();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clears stale selection when the active session changes", () => {
    const controller = new ArtifactController();
    controller.openArtifact("session-a", "artifact-a", 2);
    controller.clearForSession("session-a");
    expect(controller.getSnapshot().artifactId).toBe("artifact-a");
    controller.clearForSession("session-b");
    expect(controller.getSnapshot()).toEqual({ open: false });
  });

  it("validates ids and positive versions", () => {
    const controller = new ArtifactController();
    expect(() => controller.openArtifact("", "artifact-a", 1)).toThrow(TypeError);
    expect(() => controller.openArtifact("session-a", " ", 1)).toThrow(TypeError);
    expect(() => controller.openArtifact("session-a", "artifact-a", 0)).toThrow(RangeError);
    expect(() => controller.openArtifact("session-a", "artifact-a", 1.5)).toThrow(RangeError);
    expect(() => controller.selectVersion(1)).toThrow(/without an artifact/);
    controller.openArtifact("session-a", "artifact-a", 1);
    expect(() => controller.selectVersion(-1)).toThrow(RangeError);
  });
});
