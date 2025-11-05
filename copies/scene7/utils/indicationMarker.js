import { allAssets } from "../../commonFiles/assetsLoader";
import * as THREE from "three";
import getWorldPosititon from "./getWorldPosition";
export function showIndication(scene, camera, target, target2) {
  const indication = allAssets.textures.indication;
  const indication2 = allAssets.textures.indication2;
  const planeGeometry = new THREE.PlaneGeometry(0.3, 0.1, 8, 8);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: indication2,
    transparent: true,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  const planeMaterial2 = new THREE.MeshBasicMaterial({
    map: indication,
    transparent: true,
  });
  const plane2 = new THREE.Mesh(planeGeometry, planeMaterial2);
  const targetWorldPosition = getWorldPosititon(target);
  const targetWorldPosition2 = getWorldPosititon(target2);
  plane.position.copy(targetWorldPosition).add(new THREE.Vector3(0.0, 0.1, 0));
  plane2.position
    .copy(targetWorldPosition2)
    .add(new THREE.Vector3(0.0, 0.1, 0));
  scene.add(plane, plane2);
  plane2.visible = true;
  plane.visible = false;
  let animatinId = null;
  function render() {
    plane.quaternion.copy(camera.quaternion);
    plane2.quaternion.copy(camera.quaternion);
    animatinId = requestAnimationFrame(render);
  }
  render();
  function toggleVisibility() {
    plane2.visible = false;
    plane.visible = true;
  }
  function cleanup() {
    scene.remove(plane, plane2);
    planeGeometry.dispose();
    planeMaterial.dispose();
    planeMaterial2.dispose();
    cancelAnimationFrame(animatinId);
  }
  // Return an object with toggle and cleanup functions
  return { toggleVisibility, cleanup };
}
