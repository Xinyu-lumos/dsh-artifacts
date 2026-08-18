import type { DiagramArtifact, DiagramPresentationMetadata } from "./diagram.js";
export interface DiagramViolation {
    readonly path: string;
    readonly message: string;
}
export declare class DiagramValidationError extends Error {
    readonly violations: readonly DiagramViolation[];
    constructor(violations: readonly DiagramViolation[]);
}
export declare function normalizeDiagramArtifact(input: unknown): DiagramArtifact;
export declare function parseDiagramPresentationMetadata(input: unknown): DiagramPresentationMetadata | null;
