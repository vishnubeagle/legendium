import * as THREE from "three";
 
export function BlinkMesh(objects) {
  if (!Array.isArray(objects) || objects.length === 0) {
    console.log("Blinking objects array is empty or invalid");
    return;
  }
 
  // Store original material states for restoration
  const originalMaterials = new Map();
 
  // Prepare each object
  objects.forEach((object) => {
    if (!object) return;
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        originalMaterials.set(child, child.material);
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 1.0;
        child.material.color = new THREE.Color(1, 1, 1);
      }
    });
  });
 
  if (originalMaterials.size === 0) {
    console.log("No meshes with materials found in given objects");
    return;
  }
 
  let time = 0;
  let running = true;
  let animationId;
 
  function animate() {
    if (!running) return;
 
    time += 0.01;
 
    // Cycle colors smoothly using sine functions
    const r = 0.5 + 0.5 * Math.sin(time);
    const g = 0.5 + 0.5 * Math.sin(time + (Math.PI * 2) / 3);
    const b = 0.5 + 0.5 * Math.sin(time + (Math.PI * 4) / 3);
 
    const color = new THREE.Color(r, g, b);
 
    // Apply color + optional blinking effect
    objects.forEach((object) => {
      if (!object) return;
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.copy(color);
          child.material.opacity = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * 2));
        }
      });
    });
 
    animationId = requestAnimationFrame(animate);
  }
 
  animate();
 
  // Return cleanup function
  return () => {
    running = false;
    cancelAnimationFrame(animationId);
 
    // Restore original materials
    originalMaterials.forEach((material, child) => {
      child.material = material;
    });
  };
}
 
export function HideMesh(objects, opacity = 0.0) {
  if (!Array.isArray(objects) || objects.length === 0) {
    console.log("Blinking objects array is empty or invalid");
    return;
  }
 
  // Store original material states for restoration
  const originalMaterials = new Map();
 
  // Prepare each object
  objects.forEach((object) => {
    if (!object) return;
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        originalMaterials.set(child, child.material);
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 1.0;
      }
    });
  });
 
  if (originalMaterials.size === 0) {
    console.log("No meshes with materials found in given objects");
    return;
  }
 
  function animate() {
    // Update opacity for all children of all objects
    objects.forEach((object) => {
      if (!object) return;
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = opacity;
        }
      });
    });
  }
 
  animate();
 
  // Return cleanup function
  return () => {
    // Restore original materials
    originalMaterials.forEach((material, child) => {
      child.material = material;
    });
  };
}
 
 
 