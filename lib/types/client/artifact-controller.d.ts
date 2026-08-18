export interface ArtifactControllerSnapshot {
    readonly open: boolean;
    readonly sessionId?: string;
    readonly artifactId?: string;
    readonly version?: number;
}
export type ArtifactControllerListener = () => void;
/** Framework-independent observable state for the future artifact UI. */
export declare class ArtifactController {
    #private;
    subscribe: (listener: ArtifactControllerListener) => (() => void);
    getSnapshot: () => ArtifactControllerSnapshot;
    openArtifact(sessionId: string, artifactId: string, version: number): void;
    close(): void;
    selectVersion(version: number): void;
    clearForSession(sessionId: string): void;
}
export declare function createArtifactController(): ArtifactController;
