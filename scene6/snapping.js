import * as THREE from "three";
import { gsap } from "gsap";

/**
 * Returns a snap handler function that checks if the dragged object is close to its snap point and snaps it if so.
 * @returns {function(THREE.Object3D): boolean}
 */
export function getSnapHandler() {
  // Snap point for the female pin
  const FIRST_FEMALE_PIN_SNAP_POINT = new THREE.Vector3(-0.03, 1.77, -3.26);
  // Snap point for the nano model
  const NANO_SNAP_POINT = new THREE.Vector3(-0.005, 1.757, -3.45); // Adjust as needed
  const NANO_SNAP_POINT_LESSON2 = new THREE.Vector3(-0.005, 1.757, -3.37); // Example, update as needed
  const SECOND_FEMALE_PIN_SNAP_POINT = new THREE.Vector3(-0.63, 1.77, -3.25); // Example coordinates, update as needed
  // Add snap points for both sides of jstPin2
  const JSTPIN2_SIDE1_SNAP_POINT = new THREE.Vector3(-0.01, 1.82, -3.25); // Side 1
  const JSTPIN2_SIDE2_SNAP_POINT = new THREE.Vector3(0.45, 1.85, -3); // Side 2
  // Battery JST female pin snap point (align near battery terminals)
  const JSTPIN_BATTERY_SNAP_POINT = new THREE.Vector3(0.239, 1.78, -3.36);
  const JSTPIN_BATTERY_SNAP_POINT_LESSON2 = new THREE.Vector3(-0.22, 1.777, -3.46);
  const SNAP_THRESHOLD = 0.1; // Distance threshold for snapping

  /**
   * Checks if the dragged object is close to its snap point and snaps it if so.
   * @param {THREE.Object3D} draggedPinModel - The object being dragged
   * @returns {boolean} - True if snapped, false otherwise
   */
  function snapIfClose(draggedPinModel) {
    if (!draggedPinModel) return false;
    if (window.disableNanoSnap) return false;
    let snapPoint = FIRST_FEMALE_PIN_SNAP_POINT;
    let shouldRotateRGBLED = false;
    
    // Use lesson2 snap point for nano if lesson2 is active
    if (window.nanoModel && draggedPinModel === window.nanoModel) {
      if (window.getCurrentLesson && window.getCurrentLesson() === 'lesson2') {
        snapPoint = NANO_SNAP_POINT_LESSON2;
      } else {
        snapPoint = NANO_SNAP_POINT;
      }
    }
    // Snap the second pin4Female to its own snap point
    if (
      window.secondPin4Female &&
      draggedPinModel === window.secondPin4Female
    ) {
      snapPoint = SECOND_FEMALE_PIN_SNAP_POINT;
      shouldRotateRGBLED = true; // Rotate RGB LED when JST pin snaps
    }
    // Snap logic for both sides of jstPin2
    if (window.jstPin2Side1 && draggedPinModel === window.jstPin2Side1) {
      snapPoint = JSTPIN2_SIDE1_SNAP_POINT;
    }
    if (window.jstPin2Side2 && draggedPinModel === window.jstPin2Side2) {
      snapPoint = JSTPIN2_SIDE2_SNAP_POINT;
    }
    // Snap logic for battery JST female pin
    if (window.jstPinBatterySide1 && draggedPinModel === window.jstPinBatterySide1) {
      if (window.getCurrentLesson && window.getCurrentLesson() === 'lesson2') {
        snapPoint = JSTPIN_BATTERY_SNAP_POINT_LESSON2;
      } else {
        snapPoint = JSTPIN_BATTERY_SNAP_POINT;
      }
    }
    // Remove rgbLEDModel drag and snap logic
    const pinPos = draggedPinModel.position;
    const distance = pinPos.distanceTo(snapPoint);
    if (distance < SNAP_THRESHOLD) {
      draggedPinModel.position.copy(snapPoint);
      
      // Rotate RGB LED when JST pin snaps
      if (shouldRotateRGBLED && window.rgbLEDModel) {
        console.log("Rotating RGB LED after JST pin snap");
        // Animate the rotation for a smoother effect
        const startRotation = window.rgbLEDModel.rotation.clone();
        const endRotation = new THREE.Euler(0, -Math.PI, -Math.PI);
        gsap.to(window.rgbLEDModel.rotation, {
          x: endRotation.x,
          y: endRotation.y,
          z: endRotation.z,
          duration: 0.8,
          ease: "power2.out"
        });
        
        // Update the second JST pin to align with the rotated RGB LED
        if (window.jstPin && window.jstPin.pinGLTF2) {
          console.log("Updating second JST pin position and rotation");
          window.secondPin4Female = window.jstPin.pinGLTF2;
          window.jstPin.pinGLTF2.rotation.y = -Math.PI  / 2;
          window.jstPin.pinGLTF2.rotation.z = -Math.PI / 2;
          window.jstPin.pinGLTF2.rotation.x = Math.PI / 2;
          window.jstPin.updatePosition(SECOND_FEMALE_PIN_SNAP_POINT, window.jstPin.pinGLTF2);
        }
      }
      
      return true;
    }
    return false;
  }

  return snapIfClose;
}
