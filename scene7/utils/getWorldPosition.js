import { Vector3 } from "three";

export default function getWorldPosititon(object) {
  const worldPosition = new Vector3();
  object.getWorldPosition(worldPosition);
  return worldPosition;
}
