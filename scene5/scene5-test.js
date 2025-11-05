import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeMeshUI from 'three-mesh-ui';

import {
  allAssets,
  checkExistingAssets,
  loadAllAsset,
} from "../commonFiles/assetsLoader.js";
import { assetsEntry as currentEntry } from "./assetsEntry.js";
// import { assetsEntry as nextEntry } from "../scene6/assetsEntry.js";
import { initializePhysicsAndPlayer } from "../commonFiles/initializePhysicsAndPlayer.js";
import { setCurrentScene, getUserInfo } from "../data.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
// import { createGUI, destroyGUI } from "../commonFiles/guiManager.js";
import { initializeVR, updateVR, cleanupVR, enablePlayerMovement, disablePlayerMovement, setCollisionMesh } from "../commonFiles/vrManager.js";
import {
  handleCollisions,
  playerState,
  handleHoverboardCollisions,
  togglePlayerControls,
  togglePlayerPhysics,
} from "../commonFiles/playerController.js";
import { GroundedSkybox } from "three/examples/jsm/objects/GroundedSkybox.js";
// import { initializeScene6 } from "../scene6/scene6.js";
import { playAudio, initializeAudioManager ,cleanupAudioManager} from "../commonFiles/audiomanager.js";
import { holographicGlobeShader } from "./holographicGlobeShader.js";
import { initializeElectro, updateElectro, cleanupElectro, startElectroSequence } from "./electrointeraction.js";
import gsap from "gsap"; // At the top, if not already imported
import { initializeScene6 } from "../scene6/scene6.js";
import { assetsEntry as nextEntry } from "../scene6/assetsEntry.js";


import { auth, db } from "../src/firebase.js";
import { doc, updateDoc } from "firebase/firestore";

let underground
let skybox,composer;
let scene, renderer, controls;
let rendererBg, rendererUno;
let unoCanvas, bgCanvas;
// Billboard video plane reference
let hudVideoPlane = null;
// Add resizeHandler at module scope
let resizeHandler = null;

// Add sceneInitialization as a global variable
let sceneInitialization;
let collisionMesh;

let animationFrameId = null;

let camera = null;

// Add at the top with other state variables
let isSceneTransitioning = false;

// Replace unoModel and related variables with a componentModels object
const COMPONENT_KEYS = ['uno', 'nano', 'ldr', 'ir','buck','motordriver',"button","buzzer","pcb","rgb","motor"];
let componentModels = {};
COMPONENT_KEYS.forEach(key => {
  componentModels[key] = {
    model: null,
    orbitControls: null,
    outline: null,
    originalPosition: null,
    originalRotation: null,
    originalScale: null,
    isNearCamera: false,
    isAnimating: false,
    animationDirection: null,
    animationStartTime: 0,
    targetPosition: null,
    targetRotation: null,
    meshes: [],
    hoveredMesh: null,
    hoveredOutlineMesh: null,
    selectedMesh: null,
  };
});
let focusedComponentKey = null;
let meshUIPanel = null;
let meshUIPanelTargetX = 0;
let meshUIPanelVisible = false;
let glassPlane = null;

// At the top, add a constant for animation duration
const COMPONENT_ANIMATION_DURATION = 2.0; // seconds

// --- Nano mesh info mapping ---
const nanoMeshInfo = {
  Body4004: {
    heading: "Microcontroller",
    description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
  },
  Body4001: {
    heading: "Mini USB Port",
    description: "Used to connect the Nano to a computer for programming and serial communication. Also supplies 5V power"
  },
  Body4007: {
    heading: "Reset Button",
    description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
  },
  Body4010: {
    heading: "Power Pins",
    description: "Used to power the board or provide power to external modules/sensors."
  },
  Body4005: {
    heading: "Bootloader / ICSP Header",
    description: "These pins allow direct programming of the microcontroller using an external programmer."
  },
  Body4008: {
    heading: "Crystal Oscillator (16 MHz)",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  },
  Body4006: {
    heading: "LED",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  }
};
// --- buck mesh info mapping ---
const buckMeshInfo = {
  UBEC_2_v1001: {
    heading: "Microcontroller",
    description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
  },
  UBEC_2_v1004: {
    heading: "Mini USB Port",
    description: "Used to connect the buck to a computer for programming and serial communication. Also supplies 5V power"
  },
  UBEC_2_v1003: {
    heading: "Reset Button",
    description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
  },
  UBEC_2_v1006: {
    heading: "Power Pins",
    description: "Used to power the board or provide power to external modules/sensors."
  },
  UBEC_2_v1007: {
    heading: "Bootloader / ICSP Header",
    description: "These pins allow direct programming of the microcontroller using an external programmer."
  },
  UBEC_2_v1008: {
    heading: "Crystal Oscillator (16 MHz)",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  },
  UBEC_2_v1005: {
    heading: "LED",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  }
};
// --- motordriver mesh info mapping ---
const motordriverMeshInfo = {
 "2pinheader1": {
    heading: "Microcontroller",
    description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
  },
  "COMPOUND151": {
    heading: "Mini USB Port",
    description: "Used to connect the motordriver to a computer for programming and serial communication. Also supplies 5V power"
  },
  "2pinheader1001": {
    heading: "Reset Button",
    description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
  },
  "COMPOUND183": {
    heading: "Power Pins",
    description: "Used to power the board or provide power to external modules/sensors."
  },
  "COMPOUND182": {
    heading: "Bootloader / ICSP Header",
    description: "These pins allow direct programming of the microcontroller using an external programmer."
  },
  "COMPOUND181": {
    heading: "Crystal Oscillator (16 MHz)",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  },
  "COMPOUND180": {
    heading: "LED",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  },
  "jstpin": {
    heading: "LED",
    description: "Provides clock signals for the microcontroller, allowing it to run at a stable speed."
  }
};
// --- button mesh info mapping ---
const buttonMeshInfo = {
  "BUTTON_BEINCHEN_004": {
     heading: "Microcontroller",
     description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
   },
   "JST_XH_B3B-XH-A_1x03_P250mm_Vertical003": {
     heading: "Mini USB Port",
     description: "Used to connect the button to a computer for programming and serial communication. Also supplies 5V power"
   },
   "R_0805_2012Metric002001": {
     heading: "Reset Button",
     description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
   },
 
 };
 // --- pcb mesh info mapping ---
const pcbMeshInfo = {
  "jstpin1": {
     heading: "Microcontroller",
     description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
   },
   "jstpin2": {
     heading: "Mini USB Port",
     description: "Used to connect the pcb to a computer for programming and serial communication. Also supplies 5V power"
   },
   "jstpin3": {
     heading: "Reset Button",
     description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
   },
   "jstpin4": {
    heading: "Reset Button",
    description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
  },
  "jstpin5": {
    heading: "Reset Button",
    description: "Restarts the microcontroller. Useful for restarting programs or entering bootloader mode."
  },
 
 };
  // --- motor mesh info mapping ---
const motorMeshInfo = {
  "gear1": {
     heading: "Gears",
     description: 'Used different dimension gears to regulate the torque of the motor.'
   },
   "gear2": {
     heading: "Mini USB Port",
     description: "Used to connect the gear to a computer for programming and serial communication. Also supplies 5V power"
   },
   "gear3": {
    heading: "Mini USB Port",
    description: "Used to connect the gear to a computer for programming and serial communication. Also supplies 5V power"
  },
  
 
 };
  // --- rgb mesh info mapping ---
const rgbMeshInfo = {
  "123": {
     heading: "Microcontroller",
     description: 'It is the "brain" of the board. This IC executes your code and handles input/output operations.'
   },
   "143": {
     heading: "RGB",
     description: "It shows different colors according to the input voltage."
  },
 
 };
 // --- buzzer mesh info mapping ---
const buzzerMeshInfo = {
  "buzzer": {
     heading: "Buzzer",
     description: 'Modulates sound according the input voltage.'
   },
   "jstpin": {
     heading: "JSTXH male pin",
     description: "Used to connect the buzzer to  Arduino for programming and serial communication. Also supplies power"
   },
 
 
 };
// --- IR mesh info mapping ---
const irMeshInfo = {
  mesh_1: {
    heading: "JST Female Connector",
    description: "Used for connecting power and signal lines. It has 3 pins."
  },
  mesh_2: {
    heading: "TSOP IR Receiver",
    description: "Receives modulated IR signals (typically 38kHz), used for remote control detection or proximity sensing."
  },
  mesh_3: {
    heading: "SMD Capacitor",
    description: "Filters noise on power lines to TSOP sensor."
  },
  mesh_4: {
    heading: "SMD Resistors",
    description: "Used for limiting current or pull-up/down configuration for TSOP."
  }
};

// --- UNO mesh info mapping ---
const unoMeshInfo = {
  "jst_2pin1": {
    heading: "JST Female 2-Pin",
    description: "Connect power or single signal modules securely."
  },
  "jst_4pin1": {
    heading: "JST Female 4-Pin",
    description: "Used for I2C sensors, displays, and communication modules. Provides secure and polarized connection."
  },
  "jst_4pin": {
    heading: "JST Female 4-Pin",
    description: "Used for I2C sensors, displays, and communication modules. Provides secure and polarized connection."
  },
  "jst_2pin": {
    heading: "Pin Female Header",
    description: "Used to receive male pins from jumper wires or modules."
  },
  "resistors": {
    heading: "Resistors",
    description: "Limits current flow to protect components. Used for limiting current or pull-up/down configuration."
  },
  "jst_malepin1": {
    heading: "Pin Male Header",
    description: "Provides exposed pins to connect with female headers or breadboards."
  }
};

// --- LDR mesh info mapping ---
const ldrMeshInfo = {
  "ldr_3pinfemale": {
    heading: "JST Female 3-Pin",
    description: "Used to connect the module to Arduino. Carries VCC, GND, and OUT (analog or digital)"
  },
  "ldr": {
    heading: "LDR",
    description: "Detects ambient light intensity. Resistance decreases with increasing light."
  },
  "resistor1_1": {
    heading: "Resistors",
    description: "Forms a voltage divider with the LDR. Converts resistance change to voltage change"
  }
};

function addGlassPlaneBehindUno() {
  if (!glassPlane) return;
  if (componentModels[focusedComponentKey]?.targetPosition && camera) {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    glassPlane.position.copy(componentModels[focusedComponentKey].targetPosition.clone().sub(camDir.clone().multiplyScalar(1.2)));
    glassPlane.lookAt(camera.position);
  }
  glassPlane.visible = true;
}

function removeGlassPlane() {
  if (glassPlane) glassPlane.visible = false;
}

// Define handleKeyPress at the top level
function handleKeyPress(event) {
  if (event.key.toLowerCase() === "y" && !isSceneTransitioning) {
    isSceneTransitioning = true;
    const session = renderer.xr.getSession();
    
    const transitionToNextScene = (isVR) => {
      markSceneCompleted("scene5");
      // Remove the event listener before switching scenes
      window.removeEventListener("keydown", handleKeyPress);
      if (sceneInitialization) {
        sceneInitialization.cleanUpCollider();
      }
      cleanupScene5();
      checkExistingAssets(nextEntry);
      initializeScene6(renderer, isVR).finally(() => {
        isSceneTransitioning = false;
      });
    };

    if (session) {
      session.end().then(() => {
        transitionToNextScene(true);
      }).catch(error => {
        console.error("Error ending VR session:", error);
        isSceneTransitioning = false;
      });
    } else {
      transitionToNextScene(false);
    }
  }
}

// Reusable function for smooth UNO movement
function animateComponentToCamera(key) {
  // Instantly set background to dark sci-fi color
  scene.background = new THREE.Color(0x000714);
  const comp = componentModels[key];
  if (!comp.model || comp.isAnimating) return;
  comp.isAnimating = true;
  comp.animationStartTime = performance.now();
  comp.animationDuration = COMPONENT_ANIMATION_DURATION;
  comp.animationDirection = 'toCamera';
  if (!comp.originalPosition) {
    comp.originalPosition = comp.model.position.clone();
    comp.originalRotation = comp.model.rotation.clone();
    comp.originalScale = comp.model.scale.clone();
  }
  // Define camera direction, position, and left vector
  const camDir = camera.getWorldDirection(new THREE.Vector3());
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  const left = new THREE.Vector3(-1.0, 0, 0).applyQuaternion(camera.quaternion).normalize();
  // Use a single, small left offset for all models
  const offset = left.multiplyScalar(0.4); // All models: slight left
  comp.targetPosition = camPos.clone().add(camDir.multiplyScalar(0.9)).add(offset);
  // Target rotation: smoothly rotate to original + Math.PI on Y
  comp.targetRotation = new THREE.Euler(
    comp.originalRotation.x,
    comp.originalRotation.y - Math.PI,
    comp.originalRotation.z
  );
  if (comp.outline) comp.outline.visible = false;
  if (controls) controls.enabled = false;
  comp.orbitControls.enabled = true;
  const closeButton = document.getElementById('closeUnoButton');
  if (closeButton) closeButton.style.display = 'block';
  focusedComponentKey = key;
  // Return others to original if needed
  COMPONENT_KEYS.forEach(otherKey => {
    if (otherKey !== key && componentModels[otherKey].isNearCamera) {
      animateComponentToOriginal(otherKey);
    }
  });

  // Show mesh UI panel for the first mesh after animation completes
  setTimeout(() => {
    const comp = componentModels[key];
    if (comp.meshes && comp.meshes.length > 0) {
      showMeshUIPanel(comp.meshes[0]);
    }
  }, 1000); // match animation duration
}

function animateComponentToOriginal(key) {
  // Instantly restore background to default (null = skybox or transparent)

  const comp = componentModels[key];
  if (!comp.model || comp.isAnimating || !comp.originalPosition) return;
  comp.isAnimating = true;
  comp.animationStartTime = performance.now();
  comp.animationDuration = COMPONENT_ANIMATION_DURATION;
  comp.animationDirection = 'toOriginal';
  if (comp.outline) comp.outline.visible = true;
  comp.orbitControls.enabled = false;
  if (controls && !window.isElectroSequencePlaying) controls.enabled = true;
  const closeButton = document.getElementById('closeUnoButton');
  if (closeButton) closeButton.style.display = 'none';
  focusedComponentKey = null;
  scene.background = null;
  // --- Do NOT remove focus light here; remove it after animation completes ---
}

function handleComponentClick(key) {
  if (window.isElectroSequencePlaying) return;
  if (!componentModels[key].isNearCamera) {
    animateComponentToCamera(key);
    // Show mesh UI panel for the first mesh after animation completes
    setTimeout(() => {
      const comp = componentModels[key];
      if (comp.meshes && comp.meshes.length > 0) {
        showMeshUIPanel(comp.meshes[0]);
      }
    }, 1000); // match animation duration
  }
}
function createComponentOutline(key) {
  const comp = componentModels[key];
  if (!comp.model) return;
  comp.model.traverse(child => {
    if (child.isMesh) {
      const geometry = child.geometry.clone();
      const scale = 1.01;
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(
          i,
          positions.getX(i) * scale,
          positions.getY(i) * scale,
          positions.getZ(i) * scale
        );
      }
      positions.needsUpdate = true;
      const holographicMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          glowColor: { value: new THREE.Color(0x00ffff) },
          glowIntensity: { value: 1.5 },
          glowPower: { value: 2.0 },
          glowSpeed: { value: 2.0 }
        },
        vertexShader: holographicGlobeShader.vertexShader,
        fragmentShader: holographicGlobeShader.fragmentShader,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      const outlineMesh = new THREE.Mesh(geometry, holographicMaterial);
      outlineMesh.position.copy(child.position);
      outlineMesh.rotation.copy(child.rotation);
      outlineMesh.scale.copy(child.scale);
      comp.model.add(outlineMesh);
      if (!comp.outline) comp.outline = outlineMesh;
    }
  });
}

function createCloseButton() {
  // Create close button
  const closeButton = document.createElement('div');
  closeButton.id = 'closeUnoButton';
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    display: none;
    z-index: 1000;
    text-align: center;
    line-height: 40px;
    transition: background 0.3s ease;
  `;

  // Add hover effect
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = 'rgba(255, 0, 0, 1)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'rgba(255, 0, 0, 0.8)';
  });
  
  // Add click event
  closeButton.addEventListener('click', () => {
    // Don't allow UNO interaction during electro sequence
    if (window.isElectroSequencePlaying) {
      return;
    }
    // Instantly restore background to normal scene
    scene.background = null;
    if (focusedComponentKey) {
      animateComponentToOriginal(focusedComponentKey);
      hideMeshUIPanel();
      removeGlassPlane(); // Remove glass plane immediately
    }
  });
  
  document.body.appendChild(closeButton);
  return closeButton;
}

function createPanel(mesh) {
  // Main panel with glassy feel
  meshUIPanel = new ThreeMeshUI.Block({
    width: 0.9,
    height: 0.7,
    padding: 0.05,
    fontFamily: '/fonts/msdf/Roboto-msdf.json',
    fontTexture: '/fonts/msdf/Roboto-msdf.png',
  
    // Glassy bluish background
    backgroundColor: new THREE.Color(0x00ffff),
    backgroundOpacity: 0.02,
  
    // ✨ Rounded corners mimic a custom sci-fi silhouette
    borderRadius: 0.02,
  
    // 💡 Bright glowing border
    borderWidth: 0.001,
    borderColor: new THREE.Color(0x00ffff),
    borderOpacity: 0.95,
  
    // 🧊 Inner text shadow-like overlay (optional UI trick)
    fontColor: new THREE.Color(0x00ffff)
  });
  

  let meshInfo = null;
  let headingTitle = '';
  if (focusedComponentKey === 'nano' && mesh && mesh.name && nanoMeshInfo[mesh.name]) {
    meshInfo = nanoMeshInfo[mesh.name];
    headingTitle = "Arduino Nano";
  } else if (focusedComponentKey === 'ir' && mesh && mesh.name && irMeshInfo[mesh.name]) {
    meshInfo = irMeshInfo[mesh.name];
    headingTitle = "TSOP IR";
  } else if (focusedComponentKey === 'uno' && mesh && mesh.name && unoMeshInfo[mesh.name]) {
    meshInfo = unoMeshInfo[mesh.name];
    headingTitle = "Expansion board";
  } else if (focusedComponentKey === 'ldr' && mesh && mesh.name && ldrMeshInfo[mesh.name]) {
    meshInfo = ldrMeshInfo[mesh.name];
    headingTitle = "LDR Module";
  } else if (focusedComponentKey === 'buck' && mesh && mesh.parent?.name && buckMeshInfo[mesh.parent?.name]) {
    meshInfo = buckMeshInfo[mesh.parent?.name];
    headingTitle = "Buck Convertor";
  }else if (focusedComponentKey === 'motordriver' && mesh && mesh.parent?.name && motordriverMeshInfo[mesh.parent?.name]) {
    meshInfo = motordriverMeshInfo[mesh.parent?.name];
    headingTitle = "Motor Driver";
  }else if (focusedComponentKey === 'button' && mesh && mesh.parent?.name && buttonMeshInfo[mesh.parent?.name]) {
    meshInfo = buttonMeshInfo[mesh.parent?.name];
    headingTitle = "Button";
  }else if (focusedComponentKey === 'buzzer' && mesh && mesh.parent?.name && buzzerMeshInfo[mesh.parent?.name]) {
    meshInfo = buzzerMeshInfo[mesh.parent?.name];
    headingTitle = "Buzzer";
  }else if (focusedComponentKey === 'pcb' && mesh && mesh.parent?.name && pcbMeshInfo[mesh.parent?.name]) {
    meshInfo = pcbMeshInfo[mesh.parent?.name];
    headingTitle = "PCB";
  }else if (focusedComponentKey === 'rgb' && mesh && mesh.parent?.name && rgbMeshInfo[mesh.parent?.name]) {
    meshInfo = rgbMeshInfo[mesh.parent?.name];
    headingTitle = "RGB";
  } else if (focusedComponentKey === 'motor' && mesh && mesh.parent?.name && motorMeshInfo[mesh.parent?.name]) {
    meshInfo = motorMeshInfo[mesh.parent?.name];
    headingTitle = "motor";
  }

  if (meshInfo) {
    // Title container with glowing effect
    const titleContainer = new ThreeMeshUI.Block({
      width: 0.85,
      height: 0.15,
      backgroundColor: new THREE.Color(0x00a2ff),
      backgroundOpacity: 0.1,
      margin: 0.02,
      padding: 0.02,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0.006,
      borderColor: new THREE.Color(0x00ffff),
      borderOpacity: 0.9,
      borderRadius: 0.02
    });

    titleContainer.add(
      new ThreeMeshUI.Text({
        content: headingTitle,
        fontSize: 0.06,
        fontColor: new THREE.Color(0x00ffff),
        fontOpacity: 0.9
      })
    );

    meshUIPanel.add(titleContainer);

    // Component name with subtle highlight
    const nameContainer = new ThreeMeshUI.Block({
      width: 0.65,
      height: 0.12,
      margin: 0.02,
      padding: 0.025,
      borderWidth: 0.001,
      backgroundColor: new THREE.Color(0x001a33),
      backgroundOpacity: 0.00015,
      justifyContent: 'start',
      borderRadius: 0.02
    });

    nameContainer.add(
      new ThreeMeshUI.Text({
        content: meshInfo.heading,
        fontSize: 0.045,
        fontColor: new THREE.Color(0x00ffff),
        fontOpacity: 0.95
      })
    );

    meshUIPanel.add(nameContainer);

    // Description with glassy background
    const descContainer = new ThreeMeshUI.Block({
      width: 0.85,
      height: 0.25,
      margin: 0.02,
      padding: 0.03,
      backgroundColor: new THREE.Color(0x001a33),
      backgroundOpacity: 0.2,
      justifyContent: 'start',
      borderOpacity:0
    });

    descContainer.add(
      new ThreeMeshUI.Text({
        content: meshInfo.description,
        fontSize: 0.04,
        fontColor: new THREE.Color(0xffffff),
        fontOpacity: 0.85
      })
    );

    meshUIPanel.add(descContainer);

    scene.add(meshUIPanel);

    // Position panel relative to focused model
    if (componentModels[focusedComponentKey]?.model && camera) {
      const box = new THREE.Box3().setFromObject(componentModels[focusedComponentKey].model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Position panel to the left of the model
      meshUIPanel.position.copy(center).add(new THREE.Vector3(-size.x * 1.2, 0.1, 0));
      meshUIPanel.lookAt(camera.position);
    }
  }
}

function showMeshUIPanel(mesh) {
  // Remove existing panel if it exists
  if (meshUIPanel && scene.children.includes(meshUIPanel)) {
    scene.remove(meshUIPanel);
    meshUIPanel = null;
  }

  // Create new panel with the mesh
  createPanel(mesh);

  // Add mesh UI panel to VR clickable objects if in VR mode
  if (window.vrClickableObjects && meshUIPanel) {
    meshUIPanel.userData = {
      ...meshUIPanel.userData,
      isMeshUIPanel: true,
      onClick: () => {
        console.log('VR Controller clicked on mesh UI panel');
        // Handle mesh UI panel click if needed
      }
    };
    window.vrClickableObjects.push(meshUIPanel);
  }
}

function hideMeshUIPanel() {
  if (meshUIPanel) {
    // Remove mesh UI panel from VR clickable objects if in VR mode
    if (window.vrClickableObjects) {
      const index = window.vrClickableObjects.indexOf(meshUIPanel);
      if (index > -1) {
        window.vrClickableObjects.splice(index, 1);
      }
    }
    scene.remove(meshUIPanel);
    meshUIPanel = null;
  }
}

// Add FPP overlay function
export function showFPPOverlay() {
  // Remove any existing overlay
  let existing = document.getElementById('fpp-overlay-container');
  if (existing) existing.remove();

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'fpp-overlay-container';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '20px';
  overlay.style.left = '50%';
  overlay.style.transform = 'translateX(-50%)';
  overlay.style.zIndex = '99999';
  overlay.style.fontFamily = "'Orbitron', 'Segoe UI', Arial, sans-serif";
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.gap = '10px';
  overlay.style.padding = '18px 28px 14px 28px';
  overlay.style.borderRadius = '18px';
  overlay.style.background = 'rgba(20, 30, 40, 0.55)';
  overlay.style.boxShadow = '0 4px 32px 0 rgba(0, 255, 255, 0.18)';
  overlay.style.border = '1.5px solid rgba(0, 255, 255, 0.18)';
  overlay.style.backdropFilter = 'blur(14px) saturate(1.2)';
  overlay.style.transition = 'opacity 1s cubic-bezier(.4,0,.2,1)';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';

  // Title
  const title = document.createElement('div');
  title.textContent = 'You are now Entering first person perspective';
  title.style.color = '#00f6ff';
  title.style.fontSize = '18px';
  title.style.fontWeight = 'bold';
  title.style.textShadow = '0 0 8px #00f6ff88';
  title.style.letterSpacing = '1.5px';
  title.style.marginBottom = '2px';
  overlay.appendChild(title);

  // Controls display (compact)
  const controlsSection = document.createElement('div');
  controlsSection.style.display = 'flex';
  controlsSection.style.flexDirection = 'row';
  controlsSection.style.alignItems = 'center';
  controlsSection.style.gap = '18px';

  // Movement controls (WASD/Arrows)
  const movementControls = document.createElement('div');
  movementControls.style.display = 'flex';
  movementControls.style.flexDirection = 'column';
  movementControls.style.alignItems = 'center';
  movementControls.style.gap = '2px';

  // WASD/Arrow keys (compact)
  const wasdContainer = document.createElement('div');
  wasdContainer.style.display = 'flex';
  wasdContainer.style.flexDirection = 'column';
  wasdContainer.style.alignItems = 'center';
  wasdContainer.style.gap = '1px';

  // Top row (W/Up)
  const topRow = document.createElement('div');
  topRow.style.display = 'flex';
  topRow.style.justifyContent = 'center';
  topRow.style.width = '100%';
  const wKey = createKeyElement('W');
  const upArrow = createKeyElement('↑');
  topRow.appendChild(wKey);
  topRow.appendChild(upArrow);
  wasdContainer.appendChild(topRow);

  // Middle row (A/Left, S/Down, D/Right)
  const middleRow = document.createElement('div');
  middleRow.style.display = 'flex';
  middleRow.style.justifyContent = 'center';
  middleRow.style.width = '100%';
  middleRow.style.gap = '1px';
  const aKey = createKeyElement('A');
  const leftArrow = createKeyElement('←');
  const sKey = createKeyElement('S');
  const downArrow = createKeyElement('↓');
  const dKey = createKeyElement('D');
  const rightArrow = createKeyElement('→');
  middleRow.appendChild(aKey);
  middleRow.appendChild(leftArrow);
  middleRow.appendChild(sKey);
  middleRow.appendChild(downArrow);
  middleRow.appendChild(dKey);
  middleRow.appendChild(rightArrow);
  wasdContainer.appendChild(middleRow);

  // Label
  const wasdLabel = document.createElement('div');
  wasdLabel.textContent = 'MOVE';
  wasdLabel.style.color = '#00f6ff';
  wasdLabel.style.fontSize = '12px';
  wasdLabel.style.marginTop = '1px';
  wasdLabel.style.textShadow = '0 0 4px #00f6ff88';
  wasdLabel.style.letterSpacing = '0.5px';

  movementControls.appendChild(wasdContainer);
  movementControls.appendChild(wasdLabel);

  // Run control (compact)
  const runControl = document.createElement('div');
  runControl.style.display = 'flex';
  runControl.style.flexDirection = 'column';
  runControl.style.alignItems = 'center';
  runControl.style.gap = '1px';
  const shiftKey = createKeyElement('SHIFT');
  shiftKey.style.width = '54px';
  shiftKey.style.fontSize = '15px';
  const runLabel = document.createElement('div');
  runLabel.textContent = 'RUN';
  runLabel.style.color = '#00f6ff';
  runLabel.style.fontSize = '12px';
  runLabel.style.marginTop = '1px';
  runLabel.style.textShadow = '0 0 4px #00f6ff88';
  runLabel.style.letterSpacing = '0.5px';
  runControl.appendChild(shiftKey);
  runControl.appendChild(runLabel);

  controlsSection.appendChild(movementControls);
  controlsSection.appendChild(runControl);
  overlay.appendChild(controlsSection);

  // Helper for key element
  function createKeyElement(label) {
    const key = document.createElement('span');
    key.textContent = label;
    key.style.display = 'inline-block';
    key.style.minWidth = '22px';
    key.style.height = '22px';
    key.style.lineHeight = '22px';
    key.style.background = 'rgba(0,255,255,0.10)';
    key.style.color = '#00f6ff';
    key.style.fontWeight = 'bold';
    key.style.fontSize = '15px';
    key.style.textAlign = 'center';
    key.style.borderRadius = '5px';
    key.style.margin = '0 1px';
    key.style.border = '1px solid #00f6ff33';
    key.style.boxShadow = '0 0 4px #00f6ff22';
    key.style.textShadow = '0 0 4px #00f6ff';
    key.style.userSelect = 'none';
    return key;
  }

  document.body.appendChild(overlay);
  // Fade in
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 50);
  // Fade out after 3 seconds
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 1000);
  }, 6000);
}

export async function initializeScene5(existingRenderer, isVRMode) {
  setCurrentScene("scene5");
  const userInfo = getUserInfo();
  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  // Create GUI after scene initialization
  // const gui = createGUI();
  // // close the GUI by default
  // gui.close();

  // Cancel any existing animation frame
  animationFrameId = null;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Declare these at the top of the function
  let video, videoTexture, material;

  // Setup main camera with proper aspect ratio
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  // camera.position.set(-32, 1, 0); // Moved to loadingScreenHidden-scene5

  // Use existing renderer for background
  renderer = existingRenderer;

  // Ensure renderer is properly configured
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.physicallyCorrectLights = true;

  renderer.toneMapping = THREE.CineonToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Make sure renderer is in the document
  if (!renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }

  console.log(renderer);

  // Initialize loading manager with both camera and renderer
  await loadAllAsset(currentEntry, camera, renderer);

  // Remove the camera.position.set and lookAt from here

  scene = new THREE.Scene();

  // Add camera to scene so its children (like the plane) render
  scene.add(camera);

  // Initialize audio manager with camera and scene
  initializeAudioManager(camera, scene);
  // const video = document.createElement('video'); // This line is removed as video is now declared at the top
  // const videoTexture = new THREE.VideoTexture(video); // This line is removed as videoTexture is now declared at the top
  // videoTexture.minFilter = THREE.LinearFilter; // This line is removed as videoTexture is now declared at the top
  // videoTexture.magFilter = THREE.LinearFilter; // This line is removed as videoTexture is now declared at the top
  // videoTexture.format = THREE.RGBAFormat; // This line is removed as videoTexture is now declared at the top
  // videoTexture.generateMipmaps = false; // This line is removed as videoTexture is now declared at the top
  // const geometry = new THREE.PlaneGeometry(16, 9); // This line is removed as geometry is now declared at the top
  material = new THREE.ShaderMaterial({ // This line is removed as material is now declared at the top
    uniforms: {
      videoTexture: { value: videoTexture }, // This line is removed as videoTexture is now declared at the top
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D videoTexture;
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec4 videoColor = texture2D(videoTexture, vUv);
        float intensity = (videoColor.r + videoColor.g + videoColor.b) / 3.0;
        vec3 enhancedColor = videoColor.rgb * 0.5;
        enhancedColor = clamp(enhancedColor, 0.0, 0.5);
        float alpha = smoothstep(0.15 - 0.05, 0.15 + 0.05, intensity);
        gl_FragColor = vec4(enhancedColor, alpha * videoColor.a);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  // HUD Video Plane Setup
  if (allAssets && allAssets.videotextures && allAssets.videotextures.hudvideo1) {
    video = document.createElement('video');
    video.src = allAssets.videotextures.hudvideo1.path;
    video.loop = true;
    video.muted = false;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.autoplay = false;
    video.preload = 'auto';
    video.style.display = 'none';
    document.body.appendChild(video);

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.generateMipmaps = false;

    const geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      uniforms: { 
        videoTexture: { value: videoTexture },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D videoTexture;
        uniform float time;
        varying vec2 vUv;
        void main() {
          vec4 videoColor = texture2D(videoTexture, vUv);
          float intensity = (videoColor.r + videoColor.g + videoColor.b) / 3.0;
          vec3 enhancedColor = videoColor.rgb * 0.5;
          enhancedColor = clamp(enhancedColor, 0.0, 0.5);
          float alpha = smoothstep(0.15 - 0.05, 0.15 + 0.05, intensity);
          gl_FragColor = vec4(enhancedColor, alpha * videoColor.a);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Only one HUD video plane
    hudVideoPlane = new THREE.Mesh(geometry, material);
    hudVideoPlane.position.set(-32, 1.5, -5.5);
    hudVideoPlane.rotation.set(0, 0, 0);
    hudVideoPlane.renderOrder = 10;
    hudVideoPlane.visible = false;
    scene.add(hudVideoPlane);

    // Expose for electrointeraction.js
    window.hudVideoPlane = hudVideoPlane;
    window.hudVideoElement = video;

    // Remove HUD video plane and element when video ends
    video.addEventListener('ended', () => {
      if (hudVideoPlane && scene) {
        scene.remove(hudVideoPlane);
        hudVideoPlane.geometry.dispose();
        if (hudVideoPlane.material.map) hudVideoPlane.material.map.dispose();
        hudVideoPlane.material.dispose();
        hudVideoPlane = null;
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      window.hudVideoPlane = null;
      window.hudVideoElement = null;
    });
  }

  // 1. Play electrosound and wait for it to finish

  window.addEventListener('loadingScreenHidden-scene5', () => {
    console.log('Loading screen hidden - Scene5 is ready!');
  
  });

  const params = {
    height: 100,
    radius: 1200,
    enabled: true,
  };

  skybox = new GroundedSkybox(
    allAssets.hdris.sky,
    params.height,
    params.radius
  );
  skybox.position.y = 0;
  scene.add(skybox);
  scene.environment = allAssets.hdris.sky;
  scene.environmentIntensity = 0.6;
  // Force an immediate render to ensure proper sizing
  renderer.render(scene, camera);

  controls = new OrbitControls(camera, renderer.domElement);
  // controls.enabled = false;
  // controls.minDistance = 1;
  controls.dampingFactor = 0.25;
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2;
  controls.enablePan = false;
  controls.screenSpacePanning = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.5;

  // Add the event listener after scene initialization is complete
  window.addEventListener("keydown", handleKeyPress);

  sceneInitialization = initializePhysicsAndPlayer(
    allAssets.models.gltf.underground,
    {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    [],
    scene,
    camera,
    controls,
    renderer
  );
  underground = allAssets.models.gltf.underground;
  // Add lights
  // --- Bunker Lighting Setup ---
  // Dim, yellowish ambient light for old bunker feel
  let ambientLight = new THREE.AmbientLight(0xffffff, 0.58); // warm, dim
  scene.add(ambientLight);

  // // Add fog for dusty, old atmosphere
  // scene.fog = new THREE.Fog(0x22231a, 8, 32); // color, near, far

  // Helper: create a flickering point light
  function createFlickerLight(color, intensity, pos, blink=false) {
    const light = new THREE.PointLight(color, intensity, 6, 2.2);
    light.position.set(pos.x, pos.y, pos.z);
    scene.add(light);
    // Flicker/blink effect
    let baseIntensity = intensity;
    let t = Math.random() * 1000;
    function animateFlicker() {
      t += 0.05 + Math.random() * 0.03;
      if (blink) {
        // Blinking: on/off
        light.intensity = (Math.sin(t) > 0.7) ? baseIntensity : 0.05;
      } else {
        // Flicker: random small changes
        light.intensity = baseIntensity * (0.85 + 0.25 * Math.abs(Math.sin(t + Math.random())));
      }
      requestAnimationFrame(animateFlicker);
    }
    animateFlicker();
    return light;
  }

  // Place flickering/blinking lights near each interactive model
  // const modelLightPositions = {
  //   uno: { x: -37, y: 3.5, z: 7.5 },
  //   nano: {x: -38.5, y: 3.7, z: -6.5 },
  //   ldr: {x: -40.5, y: 3.7, z: 1.2  },
   
  // };
  // Object.entries(modelLightPositions).forEach(([key, pos], idx) => {
  //   // Alternate between flicker and blink for variety
  //   createFlickerLight(idx % 2 === 0 ? 0xfff7b2 : 0xffeebb, 1.1, pos, idx % 2 === 1);
  // });

  // // Add a few random bunker lights in the background-39, 2.15, -6.21)
  // createFlickerLight(0xffeebb, 0.9, { x: -36.7, y: 3.82, z: 7.4 }, false);
  // createFlickerLight(0xffeebb, 0.9, { x: -38.5, y: 3.7, z: -6.5 }, false);
  // createFlickerLight(0xffeebb, 0.9, { x: -44.3, y: 4.7, z: 1.1 }, false);

  const clock = new THREE.Clock();

  // Initialize VR if in VR mode - will be done after button creation

  // Add all component models to the scene and set up their state
  COMPONENT_KEYS.forEach((key, idx) => {
    const model = allAssets.models.gltf[key];
    if (model) {
      // Position models with some offset so they don't overlap
      const basePos = { uno: [-32, 1.1, 6.8], nano: [-33, 1.2, 6.8], ldr: [-34, 1.2, 6.8], ir: [-34.7, 1.2, 6.8],buck: [-31.2, 1.13, 6.8],motordriver: [-31.2, 1.13, 5.9],button: [-32, 1.13, 5.9],buzzer: [-32.6, 1.13, 5.9],pcb: [-33.3, 1.13, 5.9],rgb: [-34, 1.13, 5.9],motor: [-34.7, 1.13, 5.9] };
      const pos = basePos[key] || [-32 + idx * 2, 1.1, 7];
      model.position.set(...pos);
      model.scale.set(0.004, 0.004, 0.004);
      model.rotation.set(0, 0, 0);
      scene.add(model);
      componentModels[key].model = model;
      // Collect meshes for raycasting
      componentModels[key].meshes = [];
      model.traverse(obj => {
        if (obj.isMesh && (
          // TEMP: For nano, allow ALL meshes for debugging
          key !== 'nano' || true // nano: allow all
        )) {
          componentModels[key].meshes.push(obj);
        }
        // --- Set material properties for all child meshes ---
        if (obj.isMesh && obj.material) {
          // If material is an array, set for each
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => {
              mat.transparent = true;
              mat.depthWrite = true;
              mat.depthTest = true;
              mat.alphaToCoverage = true;
              mat.premultipliedAlpha = true;
              mat.side = THREE.DoubleSide;
            });
          } else {
            obj.material.transparent = true;
            obj.material.depthWrite = true;
            obj.material.depthTest = true;
            obj.material.alphaToCoverage = true;
            obj.material.premultipliedAlpha = true;
            obj.material.side = THREE.DoubleSide;
          }
        }
        // --- Enable frustum culling for all meshes ---
        if (obj.isMesh) {
          obj.frustumCulled = true;
        }
      });
      // DEBUG: Log all mesh names for nano
      if (key === 'nano') {
        console.log('[DEBUG] Nano model mesh names:');
        model.traverse(obj => {
          if (obj.isMesh) console.log('  -', obj.name);
        });
      }
      if (key === 'buck') {
        console.log('[DEBUG] buck model mesh names and their parents:');
        model.traverse(obj => {
          if (obj.isMesh) {
            console.log(`  - ${obj.name} (parent: ${obj.parent?.name || 'Unnamed'})`);
          }
        });
      }
      if (key === 'motor') {
        console.log('[DEBUG] motor model mesh names and their parents:');
        model.traverse(obj => {
          if (obj.isMesh) {
            console.log(`  - ${obj.name} (parent: ${obj.parent?.name || 'Unnamed'})`);
          }
        });
      }
      if (key === 'ldr') {
        console.log('[DEBUG] ldr model mesh names:');
        model.traverse(obj => {
          if (obj.isMesh) console.log('  -', obj.name);
        });
      }
      
      // Create outline
      createComponentOutline(key);
      // Setup OrbitControls (disabled by default)
      componentModels[key].orbitControls = new OrbitControls(model, renderer.domElement);
      componentModels[key].orbitControls.enabled = false;
      componentModels[key].orbitControls.enablePan = false;
      componentModels[key].orbitControls.enableZoom = false;
      componentModels[key].orbitControls.enableDamping = true;
      componentModels[key].orbitControls.dampingFactor = 0.1;
      componentModels[key].orbitControls.rotateSpeed = 0.7;
    }
  });

  // Initialize Electro interaction (do not auto-start sequence)
  initializeElectro(scene, allAssets, sceneInitialization.playerFunction.player, camera, controls, renderer);

  // After unoModel is loaded, collect all meshes:
  // if (unoModel) {
  //   unoMeshes = [];
  //   unoModel.traverse(obj => {
  //     if (obj.isMesh) unoMeshes.push(obj);
  //   });
  // }

  // --- Add MeshUI Panel for Component Introduction ---
  let componentIntroPanel = new ThreeMeshUI.Block({
    width: 1.8,
    height: 1.1,
    padding: 0.07,
    justifyContent: 'start',
    alignItems: 'center',
    fontFamily: '/fonts/msdf/Roboto-msdf.json',
    fontTexture: '/fonts/msdf/Roboto-msdf.png',
    backgroundOpacity: 0.85,
    backgroundColor: new THREE.Color(0x09206b), // dark blue
    borderRadius: 0.12,
    borderWidth: 0.014,
    borderColor: new THREE.Color(0x1b3a5b),
    borderOpacity: 0.7,
    flexDirection: 'column',
    fontSize: 0.05
  });

  // Heading block
  const headingBlock = new ThreeMeshUI.Block({
    width: 1.5,
    height: 0.18,
    margin: 0.01,
    backgroundOpacity: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  });
  headingBlock.add(new ThreeMeshUI.Text({
    content: 'Component Introduction',
    fontSize: 0.11,
    fontColor: new THREE.Color(0xffffff),
    fontOpacity: 1.0,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.01
  }));
  componentIntroPanel.add(headingBlock);

  // Spacer between heading and steps
  componentIntroPanel.add(new ThreeMeshUI.Block({
    width: 1.4,
    height: 0.04,
    backgroundOpacity: 0
  }));

  // Steps block with beige background
  const stepsBlock = new ThreeMeshUI.Block({
    width: 1.45,
    height: 0.6,
    backgroundOpacity: 0.95,
    backgroundColor: new THREE.Color(0xF5F5DC), // beige
    borderRadius: 0.07,
    padding: 0.05,
    justifyContent: 'start',
    alignItems: 'start',
    flexDirection: 'column',
    margin: 0.01
  });
  // Step 1
  stepsBlock.add(new ThreeMeshUI.Text({
    content: 'Step 1: Click the component you want to inspect\n',
    fontSize: 0.08,
    fontColor: new THREE.Color(0x222222),
    fontWeight: 'bold',
    fontOpacity: 1.0,
    margin: 0.02,
    textAlign: 'left',
  }));
  // Step 2
  stepsBlock.add(new ThreeMeshUI.Text({
    content: 'Step 2: Click on the part you want details about',
    fontSize: 0.08,
    fontColor: new THREE.Color(0x222222),
    fontWeight: 'bold',
    fontOpacity: 1.0,
    margin: 0.02,
    textAlign: 'left',
  }));
  componentIntroPanel.add(stepsBlock);

  componentIntroPanel.position.set(-33, 1.9, 7.5);
  componentIntroPanel.rotation.set(0, Math.PI, 0);
  componentIntroPanel.visible = true;
  scene.add(componentIntroPanel);

  // --- Byte Assembly Panel ---
  let byteAssemblyPanel = new ThreeMeshUI.Block({
    width: 1.4,
    height: 0.35,
    padding: 0.07,
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '/fonts/msdf/Roboto-msdf.json',
    fontTexture: '/fonts/msdf/Roboto-msdf.png',
    backgroundOpacity: 0.85,
    backgroundColor: new THREE.Color(0x09206b), // dark blue
    borderRadius: 0.12,
    borderWidth: 0.014,
    borderColor: new THREE.Color(0x09206b),
    borderOpacity: 0.7,
    flexDirection: 'column',
    fontSize: 0.07
  });
  byteAssemblyPanel.add(new ThreeMeshUI.Text({
    content: 'Assemble parts of Byte',
    fontSize: 0.11,
    fontColor: new THREE.Color(0xffffff),
    fontOpacity: 1.0,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.01
  }));
  byteAssemblyPanel.position.set(-39, 2.15, -6.21);
  byteAssemblyPanel.rotation.set(0, 0, 0);
  byteAssemblyPanel.visible = true;
  scene.add(byteAssemblyPanel);

  // --- Capsule-like MeshUI Start Build Button below Byte Assembly Panel ---
  if (window._startBuildButtonCleanup) window._startBuildButtonCleanup();

  const buttonOptions = {
    width: 0.4,
    height: 0.15,
    justifyContent: 'center',
    offset: 0.05,
    margin: 0.02,
    borderRadius: 0.075
  };

  const hoveredStateAttributes = {
    state: 'hovered',
    attributes: {
      offset: 0.035,
      backgroundColor: new THREE.Color(0xebebd9),
      backgroundOpacity: 1,
      fontColor: new THREE.Color(0xffffff)
    },
  };

  const idleStateAttributes = {
    state: 'idle',
    attributes: {
      offset: 0.035,
      backgroundColor: new THREE.Color(0x666666),
      backgroundOpacity: 0.3,
      fontColor: new THREE.Color(0xffffff)
    },
  };

  const selectedAttributes = {
    state: 'selected',
    attributes: {
      offset: 0.02,
      backgroundColor: new THREE.Color(0x777777),
      fontColor: new THREE.Color(0x222222)
    },
    onSet: async () => {
      if (!isSceneTransitioning) {
        isSceneTransitioning = true;
        try {
          if (sceneInitialization) {
            sceneInitialization.cleanUpCollider();
          }
          cleanupScene5();
          checkExistingAssets(nextEntry);
          const userInfo = getUserInfo();
          const isVR = userInfo && userInfo.modeSelected === 'vr';
          await initializeScene6(renderer, isVR);
        } catch (e) {
          console.error('Error during scene transition:', e);
        } finally {
          isSceneTransitioning = false;
        }
      }
    }
  };

  let startBuildButton = new ThreeMeshUI.Block(buttonOptions);
  startBuildButton.add(new ThreeMeshUI.Text({
    content: 'Start Build',
    fontSize: 0.07,
    fontColor: new THREE.Color(0x000000),
    fontWeight: 'bold',
    fontFamily: '/fonts/msdf/Roboto-msdf.json',
    fontTexture: '/fonts/msdf/Roboto-msdf.png',
    textAlign: 'center',
    letterSpacing: 0.01,
    fontOpacity: 1.0
  }));

  startBuildButton.setupState(selectedAttributes);
  startBuildButton.setupState(hoveredStateAttributes);
  startBuildButton.setupState(idleStateAttributes);
  startBuildButton.setState('idle');

  // Position the button just below the byteAssemblyPanel
  startBuildButton.position.copy(byteAssemblyPanel.position);
  startBuildButton.position.y -= 0.29;
  startBuildButton.position.z += 0.012;
  startBuildButton.rotation.copy(byteAssemblyPanel.rotation);
  startBuildButton.visible = true;
  scene.add(startBuildButton);

  // Capsule shadow for 3D effect
  let startBuildButtonShadow = new ThreeMeshUI.Block({
    width: 0.40,
    height: 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: new THREE.Color(0xffffe3),
    backgroundOpacity: 0.98,
    borderRadius: 0.075,
    borderWidth: 0,
    borderOpacity: 0,
    margin: 0.02
  });
  startBuildButtonShadow.position.copy(byteAssemblyPanel.position);
  startBuildButtonShadow.position.y -= 0.295;
  startBuildButtonShadow.position.z += 0.005;
  startBuildButtonShadow.rotation.copy(byteAssemblyPanel.rotation);
  startBuildButtonShadow.visible = true;
  scene.add(startBuildButtonShadow);

  // --- Pointer event logic for stateful button ---
  function pointerMoveHandler(event) {
    if (!camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(startBuildButton, true);
    if (intersects.length > 0) {
      if (startBuildButton.currentState !== 'hovered') startBuildButton.setState('hovered');
    } else {
      if (startBuildButton.currentState === 'hovered') startBuildButton.setState('idle');
    }
  }
  function pointerDownHandler(event) {
    if (startBuildButton.currentState === 'hovered') startBuildButton.setState('selected');
  }
  function pointerUpHandler(event) {
    if (startBuildButton.currentState === 'selected') startBuildButton.setState('idle');
  }
  renderer.domElement.addEventListener('pointermove', pointerMoveHandler);
  renderer.domElement.addEventListener('pointerdown', pointerDownHandler);
  renderer.domElement.addEventListener('pointerup', pointerUpHandler);

  window._startBuildButtonCleanup = function() {
    renderer.domElement.removeEventListener('pointermove', pointerMoveHandler);
    renderer.domElement.removeEventListener('pointerdown', pointerDownHandler);
    renderer.domElement.removeEventListener('pointerup', pointerUpHandler);
    if (scene && startBuildButton) scene.remove(startBuildButton);
    if (scene && startBuildButtonShadow) scene.remove(startBuildButtonShadow);
    startBuildButton = null;
    startBuildButtonShadow = null;
  };

  // Initialize VR if in VR mode - after button creation
  if (isVRMode) {

    // Create clickable objects array for VR interaction
    const clickableObjects = [];
    
    // Add component models to clickable objects
    COMPONENT_KEYS.forEach(key => {
      const model = allAssets.models.gltf[key];
      if (model) {
        // Add the entire model as clickable
        model.userData = {
          ...model.userData,
          componentKey: key,
          onClick: () => {
            console.log(`VR Controller clicked on ${key} model`);
            if (window.isElectroSequencePlaying) {
              console.log('Electro sequence is playing, ignoring VR click');
              return;
            }
            handleComponentClick(key);
          }
        };
        clickableObjects.push(model);

        // Also add individual meshes for detailed interaction when focused
        model.traverse(child => {
          if (child.isMesh) {
            child.userData = {
              ...child.userData,
              componentKey: key,
              parentModel: model,
              onClick: () => {
                console.log(`VR Controller clicked on ${key} mesh: ${child.name}`);
                if (window.isElectroSequencePlaying) {
                  console.log('Electro sequence is playing, ignoring VR mesh click');
                  return;
                }
                if (focusedComponentKey === key) {
                  // If component is focused, show mesh UI panel
                  showMeshUIPanel(child);
                } else {
                  // If component is not focused, focus it first
                  handleComponentClick(key);
                }
              }
            };
            clickableObjects.push(child);
          }
        });
      }
    });

    // Add start build button to clickable objects
    if (startBuildButton) {
      startBuildButton.userData = {
        ...startBuildButton.userData,
        isStartBuildButton: true,
        onClick: () => {
          console.log('VR Controller clicked on Start Build button');
          if (window.isElectroSequencePlaying) {
            console.log('Electro sequence is playing, ignoring VR button click');
            return;
          }
          if (startBuildButton && startBuildButton.currentState === 'hovered') {
            startBuildButton.setState('selected');
          }
        }
      };
      clickableObjects.push(startBuildButton);
    }

    // Store clickable objects globally for VR updates
    window.vrClickableObjects = clickableObjects;

    initializeVR(
      renderer,
      scene,
      camera,
      sceneInitialization.playerFunction.player,
      // backgroundMusic,
      sceneInitialization.playerFunction.actions,
      clickableObjects,
      (clickedObject) => {
        // Handle VR button click
        if (clickedObject && clickedObject.userData) {
          if (clickedObject.userData.onClick) {
            clickedObject.userData.onClick();
          }
        }
      }
    );

    // Store reference to collision mesh
    collisionMesh = allAssets.models.gltf.underground.collisionMesh;

    // Set collision mesh for VR
    setCollisionMesh(collisionMesh);

    // Enable player movement
    enablePlayerMovement(sceneInitialization.playerFunction.player);

      // Log VR setup completion
  console.log('VR Controller raycasting setup completed for Scene5');
  console.log('Clickable objects:', clickableObjects.length);
  console.log('Component models added:', COMPONENT_KEYS);
  console.log('Start build button added:', !!startBuildButton);

  // Add global function for VR debugging
  window.debugVRClickableObjects = () => {
    console.log('Current VR clickable objects:', window.vrClickableObjects);
    if (window.vrClickableObjects) {
      window.vrClickableObjects.forEach((obj, index) => {
        console.log(`Object ${index}:`, obj.name, obj.userData);
      });
    }
  };
}

  // Billboard the panel in the render loop
  const originalRender = render;
  render = function() {
    // if (componentIntroPanel && camera) {
    //   componentIntroPanel.lookAt(camera.position);
    // }
    if (typeof originalRender === 'function') originalRender();
  };

  // Add pointer move event for UNO mesh hover
  renderer.domElement.addEventListener('pointermove', event => {
    if (!focusedComponentKey) return;
    const comp = componentModels[focusedComponentKey];
    if (!comp.isNearCamera || !comp.meshes.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(comp.meshes, true);
    // DEBUG: Log pointermove intersects
    if (focusedComponentKey === 'nano') {
      console.log('[DEBUG] pointermove nano intersects:', intersects.map(i => i.object.name));
    }
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      // For nano, ir, uno, and ldr, only allow outline for specific mesh names
      if (
        (focusedComponentKey === 'nano' && (!mesh.name || !nanoMeshInfo[mesh.name])) ||
        (focusedComponentKey === 'ir' && (!mesh.name || !irMeshInfo[mesh.name])) ||
        (focusedComponentKey === 'uno' && (!mesh.name || !unoMeshInfo[mesh.name])) ||
        (focusedComponentKey === 'ldr' && (!mesh.name || !ldrMeshInfo[mesh.name])) ||
        (focusedComponentKey === 'buck' && (!mesh.parent?.name || !buckMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'motordriver' && (!mesh.parent?.name || !motordriverMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'button' && (!mesh.parent?.name || !buttonMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'buzzer' && (!mesh.parent?.name || !buzzerMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'pcb' && (!mesh.parent?.name || !pcbMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'rgb' && (!mesh.parent?.name || !rgbMeshInfo[mesh.parent?.name]))||
        (focusedComponentKey === 'motor' && (!mesh.parent?.name || !motorMeshInfo[mesh.parent?.name]))
      ) {
        if (comp.hoveredMesh && comp.hoveredOutlineMesh) {
          comp.hoveredMesh.remove(comp.hoveredOutlineMesh);
          comp.hoveredOutlineMesh.geometry.dispose();
          comp.hoveredOutlineMesh.material.dispose();
        }
        comp.hoveredMesh = null;
        comp.hoveredOutlineMesh = null;
        return;
      }
      if (comp.hoveredMesh !== mesh) {
        if (comp.hoveredMesh && comp.hoveredOutlineMesh) {
          comp.hoveredMesh.remove(comp.hoveredOutlineMesh);
          comp.hoveredOutlineMesh.geometry.dispose();
          comp.hoveredOutlineMesh.material.dispose();
        }
        const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00fff7, side: THREE.BackSide, transparent: true });
        const outlineMesh = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
        outlineMesh.position.copy(mesh.position);
        outlineMesh.rotation.copy(mesh.rotation);
        outlineMesh.scale.copy(mesh.scale).multiplyScalar(1.006);
        mesh.add(outlineMesh);
        comp.hoveredMesh = mesh;
        comp.hoveredOutlineMesh = outlineMesh;
      }
    } else {
      if (comp.hoveredMesh && comp.hoveredOutlineMesh) {
        comp.hoveredMesh.remove(comp.hoveredOutlineMesh);
        comp.hoveredOutlineMesh.geometry.dispose();
        comp.hoveredOutlineMesh.material.dispose();
      }
      comp.hoveredMesh = null;
      comp.hoveredOutlineMesh = null;
    }
  });

  // Create close button
  const closeButton = createCloseButton();

  // Setup separate OrbitControls for uno (disabled by default)
  // if (unoModel && renderer) {
  //   unoOrbitControls = new OrbitControls(unoModel, renderer.domElement);
  //   unoOrbitControls.enabled = false;
  //   unoOrbitControls.enablePan = false;
  //   unoOrbitControls.enableZoom = false;
  //   unoOrbitControls.enableDamping = true;
  //   unoOrbitControls.dampingFactor = 0.1;
  //   unoOrbitControls.rotateSpeed = 0.7;
  // }

  // Add click detection for uno
  renderer.domElement.addEventListener('pointerdown', event => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // If a model is focused, check if a mesh of that model was clicked
    if (focusedComponentKey) {
      const comp = componentModels[focusedComponentKey];
      if (comp.isNearCamera && comp.meshes.length > 0) {
        const intersects = raycaster.intersectObjects(comp.meshes, true);
        // DEBUG: Log pointerdown intersects
        if (focusedComponentKey === 'nano') {
          console.log('[DEBUG] pointerdown nano intersects:', intersects.map(i => i.object.name));
        }
        if (intersects.length > 0) {
          const mesh = intersects[0].object;
          // For nano, ir, uno, and ldr, only allow mesh UI for specific mesh names
          if (
            (focusedComponentKey === 'nano' && (!mesh.name || !nanoMeshInfo[mesh.name])) ||
            (focusedComponentKey === 'ir' && (!mesh.name || !irMeshInfo[mesh.name])) ||
            (focusedComponentKey === 'uno' && (!mesh.name || !unoMeshInfo[mesh.name])) ||
            (focusedComponentKey === 'ldr' && (!mesh.name || !ldrMeshInfo[mesh.name])) ||
            (focusedComponentKey === 'buck' && (!mesh.parent?.name || !buckMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'motordriver' && (!mesh.parent?.name || !motordriverMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'button' && (!mesh.parent?.name || !buttonMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'buzzer' && (!mesh.parent?.name || !buzzerMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'pcb' && (!mesh.parent?.name || !pcbMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'rgb' && (!mesh.parent?.name || !rgbMeshInfo[mesh.parent?.name]))||
            (focusedComponentKey === 'motor' && (!mesh.parent?.name || !motorMeshInfo[mesh.parent?.name]))
          ) {
            hideMeshUIPanel();
            comp.selectedMesh = null;
            return;
          }
          showMeshUIPanel(mesh);
          comp.selectedMesh = mesh;
          return;
        } else {
          // Clicked outside the focused model
          hideMeshUIPanel();
          comp.selectedMesh = null;
          return;
        }
      }
    }

    // If no model is focused, check if a model was clicked to focus/animate it
    let found = false;
    COMPONENT_KEYS.forEach(key => {
      const comp = componentModels[key];
      if (comp.model) {
        const intersects = raycaster.intersectObject(comp.model, true);
        if (intersects.length > 0) {
          handleComponentClick(key);
          found = true;
        }
      }
    });
    if (!found && focusedComponentKey) {
      // If clicked outside, return focused model to original and hide panel
      animateComponentToOriginal(focusedComponentKey);
      hideMeshUIPanel();
    }
  });


  function animate() {
    if (userInfo.modeSelected === "vr") {
      renderer.setAnimationLoop(render);
    } else {
      function loop() {
        if (!camera) {
          cancelAnimationFrame(animationFrameId);
          return;
        }
        animationFrameId = requestAnimationFrame(loop);
        render();
      }
      loop();
    }
  }

  function render() {
    // Check if camera exists before rendering
    if (!camera) {
      return;
    }
      // Billboard the hud video plane
  // if (hudVideoPlane && camera) {
  //   // Make the plane always face the camera
  //   hudVideoPlane.lookAt(camera.position);
  // }

    stats.begin();
    const delta = clock.getDelta();
ThreeMeshUI.update()
    // Update VR if in VR mode
    if (userInfo.modeSelected === "vr") {
      updateVR();
    } else {
      // Update controls only in non-VR mode
      if (controls) {
        controls.update();
      }
    }

    if (sceneInitialization?.playerFunction?.player) {
      const player = sceneInitialization.playerFunction.player;
      player.updateMatrixWorld();

      // Don't update player movement during electro sequence
      if (!window.isElectroSequencePlaying) {
        // Handle collisions with the environment
        if (collisionMesh) {
          handleCollisions(player, collisionMesh, playerState.velocity, delta);
        }

        // Apply any remaining velocity after collision
        if (playerState.velocity.length() > 0) {
          player.position.x += playerState.velocity.x * delta;
          player.position.z += playerState.velocity.z * delta;
          if (!playerState.onGround) {
            player.position.y += playerState.velocity.y * delta;
          }
        }
      }
    }

 

    // Update Electro interaction
    updateElectro(delta);

    // Update animation for all component models
    COMPONENT_KEYS.forEach(key => {
      const comp = componentModels[key];
      if (comp.isAnimating && comp.model) {
        // Guard: skip animation if any required property is missing
        if (!comp.originalPosition || !comp.originalRotation || !comp.originalScale || !comp.targetPosition || !comp.targetRotation) return;
        const elapsed = (performance.now() - comp.animationStartTime) / 1000;
        const duration = comp.animationDuration || COMPONENT_ANIMATION_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease
        if (comp.animationDirection === 'toCamera') {
          comp.model.position.lerpVectors(comp.originalPosition, comp.targetPosition, easeProgress);
          comp.model.scale.lerpVectors(comp.originalScale, new THREE.Vector3(0.006, 0.006, 0.006), easeProgress);
          // Keep rotation at original during move
          comp.model.rotation.copy(comp.originalRotation);
          comp.model.updateMatrix();
          comp.model.updateMatrixWorld();
          if (progress >= 1) {
            comp.model.position.copy(comp.targetPosition);
            comp.model.scale.set(0.006, 0.006, 0.006);
            // Snap rotation to original + Math.PI on Y
            comp.model.rotation.set(
              comp.originalRotation.x,
              comp.originalRotation.y - Math.PI,
              comp.originalRotation.z
            );
            comp.model.updateMatrix();
            comp.model.updateMatrixWorld();
            comp.isAnimating = false;
            comp.isNearCamera = true;
            setSceneIsolation(key); // <--- Hide everything except focused model and meshUIPanel
            if (comp.orbitControls && !window.isElectroSequencePlaying) {
              comp.orbitControls.enabled = true;
              const box = new THREE.Box3().setFromObject(comp.model);
              const center = box.getCenter(new THREE.Vector3());
              comp.orbitControls.target.copy(center);
              comp.orbitControls.update();
            }
            // --- Add focus light ONLY after animation completes ---
            addFocusLightForModel(key);
          }
        } else if (comp.animationDirection === 'toOriginal') {
          comp.model.position.lerpVectors(comp.targetPosition, comp.originalPosition, easeProgress);
          comp.model.scale.lerpVectors(new THREE.Vector3(0.006, 0.006, 0.006), comp.originalScale, easeProgress);
          // Keep rotation fixed at originalRotation during return
          // comp.model.rotation.copy(comp.originalRotation);
          comp.model.updateMatrix();
          comp.model.updateMatrixWorld();
          if (progress >= 1) {
            // Restore exact original state
            comp.model.position.copy(comp.originalPosition);
            comp.model.scale.copy(comp.originalScale);
            comp.model.rotation.copy(comp.originalRotation);
            comp.model.updateMatrix();
            comp.model.updateMatrixWorld();
            comp.isAnimating = false;
            comp.isNearCamera = false;
            if (comp.orbitControls) comp.orbitControls.enabled = false;
            restoreSceneVisibility(); // <--- Restore everything
            // --- Remove focus light ONLY after animation completes ---
            removeFocusLight();
          }
        }
      }
      if (comp.isNearCamera && comp.orbitControls && comp.orbitControls.enabled) {
        comp.orbitControls.update();
      }
    });

    // Update uno orbit controls when near camera
    // if (unoIsNearCamera && unoOrbitControls && unoOrbitControls.enabled) {
    //   unoOrbitControls.update();
    // }

    // In the render() function, before renderer.render(scene, camera):
    ThreeMeshUI.update();

    // In the render() function, remove all code that sets obj.visible = false or restores _prevVisible for UNO-only rendering.
    // Only render the full scene with renderer.render(scene, camera), and keep the glassPlane logic.
    // The only conditional logic should be for adding/removing the glassPlane mesh.
    if (composer && bloomPass && bloomPass.enabled) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    if (!glassPlane && focusedComponentKey && componentModels[focusedComponentKey].isNearCamera) {
      requestAnimationFrame(() => addGlassPlaneBehindUno());
    }
    if (glassPlane && !focusedComponentKey) {
      removeGlassPlane();
    }

    // In the render() function, if unoIsNearCamera, always update glassPlane position/orientation:
    if (focusedComponentKey && componentModels[focusedComponentKey].isNearCamera && glassPlane && componentModels[focusedComponentKey].targetPosition && camera) {
      const camDir = camera.getWorldDirection(new THREE.Vector3());
      glassPlane.position.copy(componentModels[focusedComponentKey].targetPosition.clone().sub(camDir.clone().multiplyScalar(1.2)));
      glassPlane.lookAt(camera.position);
    }
  
    stats.end();
  }

  animate();
  // Define resizeHandler to handle all camera updates
  resizeHandler = () => {
    const aspect = window.innerWidth / window.innerHeight;
    if (camera && renderer) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  window.addEventListener("resize", resizeHandler);

  // After unoModel and unoMeshes are set up, force show the panel for debugging:
  setTimeout(() => {
    // if (unoMeshes && unoMeshes.length > 0) {
    //   showMeshUIPanel(unoMeshes[0]);
    //   console.log('[DEBUG] Forced meshUIPanel show for', unoMeshes[0].name);
    // }
  }, 2000); // Wait 2 seconds for scene to settle

  // Listen for loading screen hidden event to set camera and start electro sequence
  window.addEventListener('loadingScreenHidden-scene5', () => {
    // Set camera to correct initial position for scene5
    camera.position.set(-32, 1, 0);
    camera.lookAt(new THREE.Vector3(-32, 1, -5));
    // Start electro sequence after camera is set
    setTimeout(() => {
      if (typeof startElectroSequence === 'function') {
        startElectroSequence();
      } else if (window.startElectroSequence) {
        window.startElectroSequence();
      }
    }, 100); // Small delay to ensure camera is set
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    sceneInitialization,
  };
}

// Add cleanup function
export function cleanupScene5() {
  // Add memory leak detection logging
  // console.log('Starting Scene5 cleanup...');
  // console.log('Initial memory usage:', performance.memory ? performance.memory.usedJSHeapSize / 1048576 + ' MB' : 'Memory API not available');
  
  // Add at the start of cleanup
  isSceneTransitioning = false;
  


  
  // Remove stats
  const stats = document.querySelector(".stats");
  if (stats) {
    stats.remove();
  }

  // Remove event listeners
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  window.removeEventListener("keydown", handleKeyPress);

  // Clean up animation frame and renderer animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (renderer) {
    renderer.setAnimationLoop(null);
  }

  // Clean up GUI
  // destroyGUI();

  // Disable player movement
  if (sceneInitialization?.playerFunction?.player) {
    disablePlayerMovement(sceneInitialization.playerFunction.player);
  }

  // Clean up VR
  cleanupVR();

  // Clean up Electro interaction
  cleanupElectro();

  // Clean up scene initialization
  if (sceneInitialization) {
    sceneInitialization.cleanUpCollider();
    sceneInitialization = null;
  }

  // Clean up skybox
  if (skybox) {
    if (skybox.material) {
      if (skybox.material.map) skybox.material.map.dispose();
      skybox.material.dispose();
      // Clear material properties
      skybox.material.map = null;
      skybox.material.lightMap = null;
      skybox.material.bumpMap = null;
      skybox.material.normalMap = null;
      skybox.material.specularMap = null;
      skybox.material.envMap = null;
    }
    if (skybox.geometry) {
      skybox.geometry.dispose();
    }
    skybox = null;
  }

  // Clean up scene
  if (scene) {
    
    // Remove all objects from scene
    while (scene.children.length > 0) {
      const object = scene.children[0];
      scene.remove(object);
    }

    // Dispose of geometries and materials
    scene.traverse((object) => {
      
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
            // Clear material properties
            material.map = null;
            material.lightMap = null;
            material.bumpMap = null;
            material.normalMap = null;
            material.specularMap = null;
            material.envMap = null;
          });
        } else {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
          // Clear material properties
          object.material.map = null;
          object.material.lightMap = null;
          object.material.bumpMap = null;
          object.material.normalMap = null;
          object.material.specularMap = null;
          object.material.envMap = null;
        }
      }
      // Clean up any custom properties
      if (object.userData) {
        object.userData = {};
      }
    });
  }

  // Clean up controls
  if (controls) {
    controls.dispose();
  }



  // Clean up close button
  const closeButton = document.getElementById('closeUnoButton');
  if (closeButton) {
    closeButton.remove();
  }

  // Reset variables
  // unoModel = null;
  // unoOriginalPosition = null;
  // unoOriginalRotation = null;
  // unoOriginalScale = null;
  // unoIsNearCamera = false;
  // unoTargetPosition = null;
  // unoTargetRotation = null;
  // unoAnimationProgress = 0;
  // unoAnimationStartTime = 0;
  // unoIsAnimating = false;
  // unoAnimationDirection = null;

  // Reset variables
  scene = null;
  camera = null;
  controls = null;
  skybox = null;
  sceneInitialization = null;
  collisionMesh = null;

  // if (unoOrbitControls) {
  //   unoOrbitControls.dispose();
  //   unoOrbitControls = null;
  // }

  // if (composer) {
  //   composer.dispose();
  //   composer = null;
  // }
  // if (renderPass) {
  //   renderPass.dispose();
  //   renderPass = null;
  // }
  // if (blurPass) {
  //   blurPass.dispose();
  //   blurPass = null;
  // }
  if (window._startBuildButtonCleanup) window._startBuildButtonCleanup();
  window._startBuildButtonCleanup = undefined;
}

// Store references to panels and skybox for isolation
let panelsToHide = [];
let tempLights = [];

function setSceneIsolation(focusedKey) {
  // Only handle visibility, not background color
  // First, hide everything
  scene.traverse(obj => {
    if (obj.type !== 'Scene') {
      obj.visible = false;
    }
  });
  // Then explicitly show what we want visible
  if (componentModels[focusedKey] && componentModels[focusedKey].model) {
    componentModels[focusedKey].model.visible = true;
    componentModels[focusedKey].model.traverse(child => {
      child.visible = true;
    });
  }
  if (meshUIPanel) {
    meshUIPanel.visible = true;
    meshUIPanel.traverse(child => {
      child.visible = true;
    });
  }
  // Make sure camera is visible
  if (camera) {
    camera.visible = true;
  }
  // Enable orbit controls only for focused model
  COMPONENT_KEYS.forEach(key => {
    if (componentModels[key].orbitControls) {
      componentModels[key].orbitControls.enabled = (key === focusedKey);
    }
  });
}

function restoreSceneVisibility() {
  // Remove meshUIPanel if it exists
  if (meshUIPanel) {
    scene.remove(meshUIPanel);
    meshUIPanel = null;
  }
  // Only handle visibility, not background color
  // Show all scene objects
  scene.traverse(obj => {
    if (obj.type !== 'Scene') {
      obj.visible = true;
    }
  });
  // Enable orbit controls for all models only if not focused
  COMPONENT_KEYS.forEach(key => {
    if (componentModels[key].orbitControls) {
      componentModels[key].orbitControls.enabled = false;
    }
  });
}

// --- Focus Light Management ---
let focusLight = null;
function addFocusLightForModel(key) {
  removeFocusLight();
  const comp = componentModels[key];
  if (!comp || !comp.model) return;
  // Place light above and in front of the model
  const box = new THREE.Box3().setFromObject(comp.model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const lightPos = center.clone().add(new THREE.Vector3(0, size.y * 1.2 + 0.2, size.z * 0.7));
  focusLight = new THREE.PointLight(0x00fff7, 2.2, 4.5, 2.2); // Neon cyan, strong, short range
  focusLight.position.copy(lightPos);
  focusLight.castShadow = false;
  focusLight.name = 'focusLight';
  scene.add(focusLight);
  // Optionally, add a rim/back light for more 3D effect
  focusLight.rim = new THREE.PointLight(0xffffff, 0.7, 6, 2.2);
  focusLight.rim.position.copy(center.clone().add(new THREE.Vector3(0, size.y * 0.7, -size.z * 1.2)));
  scene.add(focusLight.rim);
}
function removeFocusLight() {
  if (focusLight) {
    scene.remove(focusLight);
    if (focusLight.rim) scene.remove(focusLight.rim);
    focusLight = null;
  }
}

async function markSceneCompleted(sceneKey) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { [`scenesCompleted.${sceneKey}`]: true });
  } catch (e) {
    console.error("Failed to mark scene completed", e);
  }
}
