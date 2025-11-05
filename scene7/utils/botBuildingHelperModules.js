import getWorldPosititon from "./getWorldPosition";
import { gsap } from "gsap";
import * as THREE from "three";
// In BotBuilding.js, update the setupForNextSetup function definition and calls
export function setupForNextSetup(
  raycasterSetup,
  stepCounter,
  sidepanelInstance,
  assembeldBotCopy,
  texture,
  meshName,
  instructionText // Add this new parameter for the step's text
) {
  raycasterSetup.updateStep(stepCounter);
  sidepanelInstance.updateElement(
    assembeldBotCopy.get(meshName).mesh,
    texture,
    meshName,
    instructionText
  );
  raycasterSetup.addSidePanelObjects(...sidepanelInstance.elements);
}
export function getDistance(raycasterSetup, target) {
  const dropPos = getWorldPosititon(raycasterSetup.draggedComponent);
  const targetPos = getWorldPosititon(target);
  const distance = dropPos.distanceTo(targetPos);
  return { distance, targetPos };
}
export function snappingEffect(object, [x, y, z]) {
  const orginalPosition = object.position.clone();
  object.position.add(new THREE.Vector3(x, y, z));
  gsap.to(object.position, {
    x: orginalPosition.x,
    y: orginalPosition.y,
    z: orginalPosition.z,
  });
}
