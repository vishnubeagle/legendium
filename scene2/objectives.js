// Objectives for Scene 2
export const objectives = {
  1: {
    main: "Get into the bluezone",
    sub: "Reach the trigger area to meet Electro."
  },
  2: {
    main: "Get the Hoverboard",
    sub: "Electro will guide you to the hoverboard."
  },
  3: {
    main: "Press E to get into the hoverboard",
    sub: "Use the E key to mount the hoverboard."
  },
  4: {
    main: "Reach the university entrance",
    sub: "Use the hoverboard"
  }
};

// Import UI functions from common file
export { showObjective, hideObjective, cleanupObjectives } from "../commonFiles/ObjectiveUI.js";

// Create wrapper functions that pass the scene-specific objectives
export function showSceneObjective(objectiveNumber) {
  // Import the function dynamically to avoid circular dependency issues
  import("../commonFiles/ObjectiveUI.js").then(({ showObjective: showObjectiveUI }) => {
    showObjectiveUI(objectiveNumber, objectives);
  });
}

export function hideSceneObjective() {
  import("../commonFiles/ObjectiveUI.js").then(({ hideObjective: hideObjectiveUI }) => {
    hideObjectiveUI();
  });
}

export function cleanupSceneObjectives() {
  import("../commonFiles/ObjectiveUI.js").then(({ cleanupObjectives: cleanupObjectivesUI }) => {
    cleanupObjectivesUI();
  });
}
