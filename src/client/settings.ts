import type { Theme } from "../shared/diagram.js";

export interface ArtifactSettingsSnapshot {
  /** Whether a successful render opens the drawer automatically. */
  autoOpen: boolean;
  /** Light, dark, or follow the system preference. */
  theme: Theme;
}

const STORAGE_KEY = "dsh-artifacts.settings";

function readStored(): Partial<ArtifactSettingsSnapshot> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStored(value: ArtifactSettingsSnapshot): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage may be unavailable; the in-memory value still applies this session
  }
}

export interface ArtifactSettingsStore {
  getSnapshot(): ArtifactSettingsSnapshot;
  subscribe(fn: () => void): () => void;
  setAutoOpen(value: boolean): void;
  setTheme(theme: Theme): void;
}

/** Create an observable settings store, persisted to localStorage when present. */
export function createArtifactSettings(initial?: Partial<ArtifactSettingsSnapshot>): ArtifactSettingsStore {
  const stored = readStored();
  let snapshot: ArtifactSettingsSnapshot = {
    autoOpen: initial?.autoOpen ?? stored.autoOpen ?? true,
    theme: initial?.theme ?? stored.theme ?? "light",
  };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    setAutoOpen(value) {
      snapshot = { ...snapshot, autoOpen: value };
      writeStored(snapshot);
      emit();
    },
    setTheme(theme) {
      snapshot = { ...snapshot, theme };
      writeStored(snapshot);
      emit();
    },
  };
}

/** One shared settings store per client bundle. */
export const artifactSettings = createArtifactSettings();
