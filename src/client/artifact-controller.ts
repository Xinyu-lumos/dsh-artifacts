export interface ArtifactControllerSnapshot {
  readonly open: boolean;
  readonly sessionId?: string;
  readonly artifactId?: string;
  readonly version?: number;
}

export type ArtifactControllerListener = () => void;

const CLOSED_SNAPSHOT: ArtifactControllerSnapshot = Object.freeze({ open: false });

function requiredId(value: string, name: string): string {
  if (value.trim().length === 0) throw new TypeError(`${name} is required`);
  return value;
}

function positiveVersion(version: number): number {
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new RangeError("version must be a positive safe integer");
  }
  return version;
}

/** Framework-independent observable state for the future artifact UI. */
export class ArtifactController {
  #snapshot: ArtifactControllerSnapshot = CLOSED_SNAPSHOT;
  readonly #listeners = new Set<ArtifactControllerListener>();

  subscribe = (listener: ArtifactControllerListener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): ArtifactControllerSnapshot => this.#snapshot;

  openArtifact(sessionId: string, artifactId: string, version: number): void {
    const next = Object.freeze({
      open: true,
      sessionId: requiredId(sessionId, "sessionId"),
      artifactId: requiredId(artifactId, "artifactId"),
      version: positiveVersion(version),
    });
    this.#replace(next);
  }

  close(): void {
    if (!this.#snapshot.open) return;
    this.#replace(Object.freeze({ ...this.#snapshot, open: false }));
  }

  selectVersion(version: number): void {
    const nextVersion = positiveVersion(version);
    if (this.#snapshot.sessionId === undefined || this.#snapshot.artifactId === undefined) {
      throw new Error("cannot select a version without an artifact");
    }
    if (this.#snapshot.version === nextVersion) return;
    this.#replace(Object.freeze({ ...this.#snapshot, version: nextVersion }));
  }

  clearForSession(sessionId: string): void {
    const activeSessionId = requiredId(sessionId, "sessionId");
    if (this.#snapshot.sessionId === undefined || this.#snapshot.sessionId === activeSessionId) return;
    this.#replace(CLOSED_SNAPSHOT);
  }

  #replace(next: ArtifactControllerSnapshot): void {
    const current = this.#snapshot;
    if (
      current.open === next.open &&
      current.sessionId === next.sessionId &&
      current.artifactId === next.artifactId &&
      current.version === next.version
    ) {
      return;
    }
    this.#snapshot = next;
    for (const listener of [...this.#listeners]) listener();
  }
}

export function createArtifactController(): ArtifactController {
  return new ArtifactController();
}
