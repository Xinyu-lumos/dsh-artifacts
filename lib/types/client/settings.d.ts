import type { Theme } from "../shared/diagram.js";
export interface ArtifactSettingsSnapshot {
    /** Whether a successful render opens the drawer automatically. */
    autoOpen: boolean;
    /** Light, dark, or follow the system preference. */
    theme: Theme;
}
export interface ArtifactSettingsStore {
    getSnapshot(): ArtifactSettingsSnapshot;
    subscribe(fn: () => void): () => void;
    setAutoOpen(value: boolean): void;
    setTheme(theme: Theme): void;
}
/** Create an observable settings store, persisted to localStorage when present. */
export declare function createArtifactSettings(initial?: Partial<ArtifactSettingsSnapshot>): ArtifactSettingsStore;
/** One shared settings store per client bundle. */
export declare const artifactSettings: ArtifactSettingsStore;
