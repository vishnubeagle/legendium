import * as THREE from "three";

export function WireConfig(
  scene,
  points,
  particleCount,
  lineWidth,
  colorOfWire,
  onComplete
) {
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3).fill(9999);
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: colorOfWire,
    size: lineWidth, // Adjust size for visibility
    depthWrite: false,
    transparent: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);

  const glowGeometry = new THREE.SphereGeometry(0, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: "#cfff01",
    opacity: 0.0,
    transparent: true,
    visible: true,
  });
  const glowParticle = new THREE.Mesh(glowGeometry, glowMaterial);

  let particleIndex = 0; // Track the current particle index
  let currentSegmentIndex = 0; // Track the current segment in the path
  let segmentProgress = 0; // Progress along the current segment (0 to 1)
  let animateFlag = true;

  function animateWireFrame() {
    if (!animateFlag) return;

    if (currentSegmentIndex < points.length - 1) {
      const start = points[currentSegmentIndex];
      const end = points[currentSegmentIndex + 1];

      // Linear interpolation between start and end points
      const positionOnSegment = new THREE.Vector3()
        .lerpVectors(start, end, segmentProgress)
        .add(new THREE.Vector3(0, 0, 0)); // Slight Z-offset

      // Set the current particle's position in the geometry
      if (particleIndex < particleCount) {
        particleGeometry.attributes.position.setXYZ(
          particleIndex,
          positionOnSegment.x,
          positionOnSegment.y,
          positionOnSegment.z
        );
        particleIndex++;
        particleGeometry.attributes.position.needsUpdate = true; // Mark for update
      }

      // Move the glowParticle along with the segment
      glowParticle.position.copy(positionOnSegment);

      // Advance along the segment
      segmentProgress += 0.005; // Adjust this speed as needed
      if (segmentProgress >= 1) {
        segmentProgress = 0; // Reset progress for the next segment
        currentSegmentIndex++; // Move to the next segment
      }
    } else {
      // Animation is complete, call onComplete
      if (onComplete) {
        onComplete();
      }
      return; // Stop animation
    }

    requestAnimationFrame(animateWireFrame);
  }

  // Public API to control the animation
  return {
    particles: particles,
    start: () => {
      animateFlag = true;
      scene.add(particles);
      scene.add(glowParticle);
      animateWireFrame();
    },
    stop: () => {
      animateFlag = false;
    },
    reset: () => {
      particleIndex = 0;
      currentSegmentIndex = 0;
      segmentProgress = 0;
    },
    dispose: () => {
      scene.remove(particles);
      scene.remove(glowParticle);
      particleGeometry.dispose();
      particleMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
    },
  };
}
