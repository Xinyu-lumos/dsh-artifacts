import { ArtifactController, createArtifactController } from "./artifact-controller.js";

/** One shared drawer state per client bundle (single browser module instance). */
export const artifactController: ArtifactController = createArtifactController();
