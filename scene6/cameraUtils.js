import { gsap } from "gsap";
import * as THREE from "three";

/**
 * Smoothly animates the camera to look at a target position.
 * @param {THREE.Camera} camera - The camera to animate.
 * @param {THREE.Vector3} lookTarget - The position to look at.
 * @param {number} duration - Animation duration in seconds.
 * @param {function} [onComplete] - Optional callback after animation.
 */
export function animateCameraLookAt(camera, lookTarget, duration = 2, onComplete) {
  const startQuat = camera.quaternion.clone();
  camera.lookAt(lookTarget);
  const endQuat = camera.quaternion.clone();
  camera.quaternion.copy(startQuat);
  const dummy = { t: 0 };
  gsap.to(dummy, {
    t: 1,
    duration,
    ease: "power2.inOut",
    onUpdate: () => {
      camera.quaternion.copy(startQuat).slerp(endQuat, dummy.t);
    },
    onComplete: () => {
      camera.quaternion.copy(endQuat);
      camera.lookAt(lookTarget);
      if (onComplete) onComplete();
    }
  });
} 