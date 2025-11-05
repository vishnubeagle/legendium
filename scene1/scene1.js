import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  allAssets,
  checkExistingAssets,
  loadAllAsset,
} from "../commonFiles/assetsLoader.js";
import { assetsEntry as currentEntry } from "./assetsEntry.js";
import { assetsEntry as nextEntry } from "../scene2/assetsEntry.js";
import { initializePhysicsAndPlayer } from "../commonFiles/initializePhysicsAndPlayer.js";
import { setCurrentScene, getUserInfo } from "../data.js";
// import Stats from "three/examples/jsm/libs/stats.module.js";
import { initializeScene2 } from "../scene2/scene2.js";
import { setCameraAndControls, playerState,handleCollisions,switchToFirstPerson } from "../commonFiles/playerController.js";
import { createMinimap, updateMinimap, cleanupMinimap } from "./minimap.js";
import { objectives, showObjective, hideObjective, cleanupObjectives } from "./objectives.js";
import { spreadInstancedRandomOnUVArea } from "../commonFiles/uvSpread.js";
import {
  initializeElectro,
  updateElectro,
  startElectroSequence,
  setDependencies,
  startElectroAppearanceSequence,
  cleanupElectro,
  triggerAutoMoveAndDisableControls,
  getElectroState
} from "./electrointeraction.js";
import { TriggerPoint } from "../commonFiles/triggerPoint.js";
import { Portal, handlePortalSceneSwitch } from "../commonFiles/portal.js";
import { auth, db } from "../src/firebase.js";
import { doc, updateDoc } from "firebase/firestore";
import {
  initializeVR, updateVR, cleanupVR, enablePlayerMovement, disablePlayerMovement, setCollisionMesh
} from "../commonFiles/vrManager.js";

// Import inventory
import { createInventoryButton, showInventory, cleanupInventory } from "./inventory.js";
import { markSceneVisited } from "../data.js";

let scene, camera, renderer, controls;
let resizeHandler = null;
let animationFrameId = null;
let sceneInitialization = null;
let isSceneTransitioning = false;
let portal = null;
let triggerPoint = null;
let electroComponents = null;
let hologramEffect = null;
let electroFocusCamera, isElectroFocusActive = false, isCameraTransitioning = false;
let ufo = null;
let transitionStartTime = 0;
const transitionDuration = 1.5;
let transitionStartPosition = new THREE.Vector3();
let transitionStartQuaternion = new THREE.Quaternion();
let transitionTargetPosition = new THREE.Vector3();
let transitionTargetQuaternion = new THREE.Quaternion();

// Add cactus and carnivorous plant variables
let cactus = null;
let carnivorous = null;
let isCactusAnimating = false;
let isCarnivorousAnimating = false;
let cactusMixer = null;
let carnivorousMixer = null;
let cactusAction = null;
let carnivorousAction = null;
let cactusAnimations = {};
let carnivorousAnimations = {};
let playerLife = 100;
let isVignetteActive = false;
let vignetteOverlay = null;
let lifeBarContainer = null;
let deathScreenContainer = null;
let isPlayerDead = false;
let ATTACK_DISTANCE = 5;
// Avatar-style hanging mesh (e.g., pink vines) swing vars
const USE_SHADER_SWAY_FOR_HANGING = true;
let avatarHangingMesh = null;
let avatarHangingMeshPivot = null;
let avatarHangingSwayUniforms = [];
let backgroundAudio;
let attackAudio = null;

let collisionMesh = null;

// Function to set hologram effect (exported for electrointeraction.js)
export function setHologramEffect(effect) {
  hologramEffect = effect;
}

// Function to get UFO reference (exported for electrointeraction.js)
export function getUFO() {
  return ufo;
}

// Add this function to setup the plants
function setupPlants(scene, assets) {
  // Setup Cactus
  if (assets.models.gltf.cactus) {
    cactus = assets.models.gltf.cactus;
    cactus.position.set(-5, 2.25, -37.5); //'-4.635', '3.839', '-38.986']
    cactus.rotation.y = -Math.PI / 2;
    cactus.scale.set(3, 3, 3);
    // Ensure cactus is rendered opaque (fix alpha/see-through issues)
    cactus.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.depthTest = true;
          // If texture has alpha, prefer alphaTest cutout instead of blending
          mat.alphaTest = (mat.alphaMap || (mat.map && mat.map.format === THREE.RGBAFormat)) ? 0.5 : 0.0;
          mat.side = THREE.FrontSide;
          mat.alphaToCoverage = false;
          mat.premultipliedAlpha = false;
          mat.needsUpdate = true;
        });
      }
    });
    scene.add(cactus);

    // Set up animation mixer if animations exist
    if (assets.models.animations.cactus) {
      cactusMixer = assets.models.animations.cactus.mixer;
      cactusAnimations = assets.models.animations.cactus.actions;

      // Configure all animations
      Object.values(cactusAnimations).forEach((action) => {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      });

      // Set the first animation as the default action
      cactusAction = Object.values(cactusAnimations)[0];
    } else {
      console.log("WARNING: No cactus animations found in allAssets");
    }
  } else {
    console.log("WARNING: Cactus model not found in assets");
  }

  // Setup Carnivorous Plant
  if (assets.models.gltf.carnivorus) {
    console.log("Found carnivorous model");
    carnivorous = assets.models.gltf.carnivorus;
    carnivorous.position.set(-4, 6, 0);
    carnivorous.scale.set(2.5, 2.5, 2.5);
    
    // Add material properties to carnivorous plant
    carnivorous.traverse((child) => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.depthWrite = true;
        child.material.depthTest = true;
        child.material.alphaToCoverage = true;
        child.material.premultipliedAlpha = true;
        child.material.side = THREE.DoubleSide;
      }
    });
    
    scene.add(carnivorous);
    console.log("Carnivorous position set to:", carnivorous.position);

    // Set up animation mixer if animations exist
    if (assets.models.animations.carnivorus) {
      console.log("Found carnivorous animations in allAssets");
      carnivorousMixer = assets.models.animations.carnivorus.mixer;
      carnivorousAnimations = assets.models.animations.carnivorus.actions;

      // Configure all animations
      Object.values(carnivorousAnimations).forEach((action) => {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      });

      // Set the first animation as the default action
      carnivorousAction = Object.values(carnivorousAnimations)[0];
      console.log(
        "Carnivorous animations configured:",
        Object.keys(carnivorousAnimations)
      );
    } else {
      console.log("WARNING: No carnivorous animations found in allAssets");
    }
  } else {
    console.log("WARNING: Carnivorous model not found in assets");
  }
}

// Function to check distance between two points
function getDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) +
      Math.pow(point1.y - point2.y, 2) +
      Math.pow(point1.z - point2.z, 2)
  );
}

// Function to create and show vignette effect
function createVignetteEffect() {
  if (vignetteOverlay) {
    document.body.removeChild(vignetteOverlay);
  }

  vignetteOverlay = document.createElement("div");
  vignetteOverlay.style.position = "fixed";
  vignetteOverlay.style.top = "0";
  vignetteOverlay.style.left = "0";
  vignetteOverlay.style.width = "100%";
  vignetteOverlay.style.height = "100%";
  vignetteOverlay.style.pointerEvents = "none";
  vignetteOverlay.style.zIndex = "1000";
  vignetteOverlay.style.background =
    "radial-gradient(circle at center, transparent 0%, rgba(255, 0, 0, 0.4) 100%)";
  vignetteOverlay.style.transition = "opacity 0.3s ease-in-out";
  vignetteOverlay.style.opacity = "0";
  document.body.appendChild(vignetteOverlay);
}

// Function to show/hide vignette effect
function toggleVignette(show) {
  if (vignetteOverlay) {
    vignetteOverlay.style.opacity = show ? "1" : "0";
  }
}

// Function to create a modern life bar
function createLifeBar() {
  if (lifeBarContainer) {
    document.body.removeChild(lifeBarContainer);
  }

  // Main container (holds heart + bar)
  lifeBarContainer = document.createElement("div");
  lifeBarContainer.style.position = "fixed";
  lifeBarContainer.style.bottom = "40px";
  lifeBarContainer.style.left = "50px";
  lifeBarContainer.style.display = "flex";
  lifeBarContainer.style.alignItems = "center";
  lifeBarContainer.style.gap = "8px"; // spacing between heart and bar
  lifeBarContainer.style.zIndex = "1000";

  // Heart icon
  const heartIcon = document.createElement("div");
  heartIcon.innerHTML = "❤️";
  heartIcon.style.fontSize = "18px";
  heartIcon.style.textShadow = "0 0 6px rgba(255,0,0,0.9), 0 0 12px rgba(255,50,50,0.8)";
  lifeBarContainer.appendChild(heartIcon);

  // Metallic outer frame
  const frame = document.createElement("div");
  frame.style.width = "320px";
  frame.style.height = "22px";
  frame.style.borderRadius = "6px";
  frame.style.padding = "2px";
  frame.style.background = "linear-gradient(135deg, #cfcfcf, #777, #e5e5e5)";
  frame.style.boxShadow = "0 0 10px rgba(255,255,255,0.4), inset 0 0 8px rgba(0,0,0,0.6)";
  frame.style.clipPath = "polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)"; // beveled
  frame.style.overflow = "hidden";
  frame.style.position = "relative";

  // Inner black area
  const barWrapper = document.createElement("div");
  barWrapper.style.width = "100%";
  barWrapper.style.height = "100%";
  barWrapper.style.background = "rgba(0,0,0,0.7)";
  barWrapper.style.clipPath = "inherit"; // same trapezoid
  barWrapper.style.overflow = "hidden";
  barWrapper.style.position = "relative";

  // Fill bar
  const lifeBarInner = document.createElement("div");
  lifeBarInner.id = "life-bar-inner";
  lifeBarInner.style.width = "100%";
  lifeBarInner.style.height = "100%";
  lifeBarInner.style.transition = "width 0.3s ease-out, background 0.3s ease-out";
  lifeBarInner.style.clipPath = "inherit";

  // Gloss shine overlay
  const gloss = document.createElement("div");
  gloss.style.position = "absolute";
  gloss.style.top = "0";
  gloss.style.left = "0";
  gloss.style.width = "100%";
  gloss.style.height = "100%";
  gloss.style.background = "linear-gradient(120deg, rgba(255,255,255,0.25) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.25) 100%)";
  gloss.style.animation = "shine 3s infinite linear";
  gloss.style.pointerEvents = "none";

  // Text (percentage)
  const lifeText = document.createElement("div");
  lifeText.id = "life-text";
  lifeText.style.position = "absolute";
  lifeText.style.width = "100%";
  lifeText.style.height = "100%";
  lifeText.style.display = "flex";
  lifeText.style.alignItems = "center";
  lifeText.style.justifyContent = "center";
  lifeText.style.color = "#fff";
  lifeText.style.fontFamily = "'Orbitron', sans-serif";
  lifeText.style.fontSize = "11px";
  lifeText.style.fontWeight = "bold";
  lifeText.style.textShadow = "0 0 5px #000, 0 0 10px rgba(255,255,255,0.8)";
  lifeText.style.zIndex = "2";

  // Append hierarchy
  barWrapper.appendChild(lifeBarInner);
  barWrapper.appendChild(gloss);
  barWrapper.appendChild(lifeText);
  frame.appendChild(barWrapper);
  lifeBarContainer.appendChild(frame);
  document.body.appendChild(lifeBarContainer);

  // Shine animation keyframes
  const styleTag = document.createElement("style");
  styleTag.innerHTML = `
    @keyframes shine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(styleTag);

  updateLifeDisplay();
}

function updateLifeDisplay() {
  const lifeBarInner = document.getElementById("life-bar-inner");
  const lifeText = document.getElementById("life-text");

  if (lifeBarInner && lifeText) {
    const percentage = Math.max(0, Math.min(100, playerLife));

    // Gradient colors: Green → Yellow → Red
    let barColor;
    if (percentage > 60) {
      barColor = "linear-gradient(90deg, #33ff66, #00cc33)";
    } else if (percentage > 30) {
      barColor = "linear-gradient(90deg, #ffcc00, #ff9900)";
    } else {
      barColor = "linear-gradient(90deg, #ff3300, #cc0000)";
    }

    lifeBarInner.style.width = `${percentage}%`;
    lifeBarInner.style.background = barColor;
    lifeText.textContent = `${Math.round(percentage)}%`;

    if (percentage <= 0 && !isPlayerDead) {
      isPlayerDead = true;
      createDeathScreen();
      setTimeout(respawnPlayer, 3000);
    }
  }
}



// Function to create death screen
function createDeathScreen() {
  if (deathScreenContainer) {
    document.body.removeChild(deathScreenContainer);
  }

  deathScreenContainer = document.createElement("div");
  deathScreenContainer.style.position = "fixed";
  deathScreenContainer.style.top = "0";
  deathScreenContainer.style.left = "0";
  deathScreenContainer.style.width = "100%";
  deathScreenContainer.style.height = "100%";
  deathScreenContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  deathScreenContainer.style.display = "flex";
  deathScreenContainer.style.flexDirection = "column";
  deathScreenContainer.style.justifyContent = "center";
  deathScreenContainer.style.alignItems = "center";
  deathScreenContainer.style.zIndex = "2000";
  deathScreenContainer.style.fontFamily = "'Orbitron', sans-serif";
  deathScreenContainer.style.color = "#ff0000";
  deathScreenContainer.style.textShadow = "0 0 20px rgba(255, 0, 0, 0.8)";
  deathScreenContainer.style.opacity = "0";
  deathScreenContainer.style.transition = "opacity 1s ease-in-out";

  const deathText = document.createElement("div");
  deathText.textContent = "YOU DIED";
  deathText.style.fontSize = "72px";
  deathText.style.fontWeight = "bold";
  deathText.style.marginBottom = "30px";
  deathText.style.animation = "pulse 2s infinite";

  const respawnText = document.createElement("div");
  respawnText.textContent = "Respawning...";
  respawnText.style.fontSize = "24px";
  respawnText.style.opacity = "0.8";

  deathScreenContainer.appendChild(deathText);
  deathScreenContainer.appendChild(respawnText);
  document.body.appendChild(deathScreenContainer);

  // Add pulse animation style
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Fade in the death screen
  setTimeout(() => {
    deathScreenContainer.style.opacity = "1";
  }, 100);

  return deathScreenContainer;
}

// Function to respawn player
function respawnPlayer() {
  if (!sceneInitialization?.playerFunction?.player) return;

  const player = sceneInitialization.playerFunction.player;

  // Reset player position to initial position
  player.position.set(-58, 10, 5);
  player.rotation.y = Math.PI / 2;

  // Reset player life
  playerLife = 100;
  updateLifeDisplay();

  // Reset vignette effect
  toggleVignette(false);

  // Reset animation states
  isCactusAnimating = false;
  isCarnivorousAnimating = false;

  // Fade out death screen
  if (deathScreenContainer) {
    deathScreenContainer.style.opacity = "0";
    setTimeout(() => {
      if (deathScreenContainer && deathScreenContainer.parentNode) {
        deathScreenContainer.parentNode.removeChild(deathScreenContainer);
        deathScreenContainer = null;
      }
    }, 1000);
  }

  isPlayerDead = false;
}

export async function initializeScene1(existingRenderer, isVRMode) {
  setCurrentScene("scene1");
  await markSceneVisited("scene1");
  const userInfo = getUserInfo();
  // const stats = new Stats();
  // stats.showPanel(0);
  // document.body.appendChild(stats.dom);

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
  );
  camera.position.set(0, 0, 0);

  // Electro focus camera for closeup
  electroFocusCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
  );

  // Position for closeup of Electro (tweak as needed)
  electroFocusCamera.position.set(-16, 10.5, -12);
  electroFocusCamera.lookAt(new THREE.Vector3(-10, 9.8, -12));

  scene = new THREE.Scene();
  renderer = existingRenderer;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
      switchToFirstPerson(camera, controls);
  if (!renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }

  await loadAllAsset(currentEntry, camera, renderer, scene);
  console.log(allAssets);
  
  // Create a simple sky background
  // const canvas = document.createElement('canvas');
  // canvas.width = 256;
  // canvas.height = 256;
  // const context = canvas.getContext('2d');
  
  // const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  // gradient.addColorStop(0, '#87CEEB');   // Sky blue at top
  // gradient.addColorStop(1, '#E0F6FF');   // Light blue at bottom
  
  // context.fillStyle = gradient;
  // context.fillRect(0, 0, canvas.width, canvas.height);
  
  // const gradientTexture = new THREE.CanvasTexture(canvas);
  // scene.background = gradientTexture;
  
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.render(scene, camera);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;

  sceneInitialization = initializePhysicsAndPlayer(
    allAssets.models.gltf.garden,
    {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    },
    [],
    scene,
    camera,
    controls,
    renderer
  );

  setCameraAndControls(camera, controls, scene);

  const handleKeyPress = (event) => {
    if (event.key.toLowerCase() === "y" && !isSceneTransitioning) {
      isSceneTransitioning = true;
      const session = renderer.xr.getSession();
      const transitionToNextScene = (isVR) => {
        window.removeEventListener("keydown", handleKeyPress);
           markSceneCompleted("scene1");
        if (sceneInitialization) {
          sceneInitialization.cleanUpCollider();
        }
        cleanupScene1();
        checkExistingAssets(nextEntry);
        initializeScene2(renderer, isVR).finally(() => {
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
  };
  window.addEventListener("keydown", handleKeyPress);

  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  directionalLight.castShadow = true;
  // scene.add(directionalLight);
  
  const clock = new THREE.Clock();

  // Helper function to calculate distance between two points
  function getDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
        Math.pow(point1.y - point2.y, 2) +
        Math.pow(point1.z - point2.z, 2)
    );
  }

async function markSceneCompleted(sceneKey) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("No authenticated user; skipping scene completion update");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { [`scenesCompleted.${sceneKey}`]: true });
  } catch (e) {
    console.error("Failed to mark scene completed", e);
  }
}


  // Helper function to move player to safe position
  function movePlayerToSafePosition(player, position, rotation) {
    if (!player) return;
    player.position.set(position.x, position.y, position.z);
    player.rotation.set(rotation.x, rotation.y, rotation.z);
    if (playerState) {
      playerState.velocity.set(0, 0, 0);
    }
  }

  // Add camera transition helpers
  function startElectroFocusCameraTransition() {
    isCameraTransitioning = true;
    transitionStartTime = performance.now();
    transitionStartPosition.copy(camera.position);
    transitionStartQuaternion.copy(camera.quaternion);
    transitionTargetPosition.copy(electroFocusCamera.position);
    transitionTargetQuaternion.copy(electroFocusCamera.quaternion);
    isElectroFocusActive = true;
    if (controls) controls.enabled = false;
  }

  function startMainCameraTransition() {
    // Check if cleanup is in progress and wait if necessary
    const electroState = getElectroState();
    if (electroState?.isCleanupInProgress) {
      // Wait for cleanup to complete before starting camera transition
      setTimeout(() => startMainCameraTransition(), 50);
      return;
    }
    
    // Add a small delay to ensure cleanup is complete before camera transition
    setTimeout(() => {
      isCameraTransitioning = true;
      transitionStartTime = performance.now();
      transitionStartPosition.copy(electroFocusCamera.position);
      transitionStartQuaternion.copy(electroFocusCamera.quaternion);
      transitionTargetPosition.copy(camera.position);
      transitionTargetQuaternion.copy(camera.quaternion);
      isElectroFocusActive = false;
      if (controls) controls.enabled = true;
    }, 100); // 100ms delay to allow cleanup to complete
  }

  // Initialize UFO
  function initializeUFO() {
    if (!scene || !allAssets) {
      console.error("Scene or assets not initialized when trying to create UFO");
      return;
    }

    const ufoModel = allAssets.models.gltf.ufo;
    if (!ufoModel) {
      console.error("UFO model not found in assets");
      return;
    }

    ufo = ufoModel.clone();
    ufo.visible = false;
    ufo.scale.set(0.1, 0.1, 0.1); // Scale down the UFO
    scene.add(ufo);
    console.log("UFO added to scene");
  }

  // Setup portal
  const portalPosition = new THREE.Vector3(2, 5.4, -61);
  const portalRotation = new THREE.Euler(0, Math.PI/8, 0);
  portal = new Portal(scene, portalPosition, portalRotation);

  // Helper: add lightweight vertex sway via shader for hanging mesh
  function addSwayToMaterial(material, minY, maxY) {
    if (!material || material.userData?.__hasHangingSway) return;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uMinY = { value: minY };
      shader.uniforms.uMaxY = { value: maxY };
      shader.uniforms.uAmpX = { value: 0.01 };
      shader.uniforms.uAmpZ = { value: 0.3 };
      shader.uniforms.uFreqX = { value: 0.18 };
      shader.uniforms.uFreqZ = { value: 0.25 };
      shader.uniforms.uPhase = { value: 1.3 };
      avatarHangingSwayUniforms.push(shader.uniforms);

      shader.vertexShader = `uniform float uTime;\nuniform float uMinY;\nuniform float uMaxY;\nuniform float uAmpX;\nuniform float uAmpZ;\nuniform float uFreqX;\nuniform float uFreqZ;\nuniform float uPhase;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n\n  float normY = clamp((position.y - uMinY) / max(0.0001, (uMaxY - uMinY)), 0.0, 1.0);\n  float heightWeight = 1.0 - normY;\n  float swayX = uAmpX * sin(uTime * uFreqX + uPhase);\n  float swayZ = uAmpZ * sin(uTime * uFreqZ);\n  transformed.x += swayX * heightWeight;\n  transformed.z += swayZ * heightWeight;\n`
      );
    };
    material.userData = material.userData || {};
    material.userData.__hasHangingSway = true;
    material.needsUpdate = true;
  }

  function setupHangingSway(targetMesh) {
    if (!targetMesh || !targetMesh.geometry) return;
    if (!targetMesh.geometry.boundingBox) targetMesh.geometry.computeBoundingBox();
    const box = targetMesh.geometry.boundingBox;
    const materials = Array.isArray(targetMesh.material)
      ? targetMesh.material
      : [targetMesh.material];
    materials.forEach((mat) => addSwayToMaterial(mat, box.min.y, box.max.y));
  }

  // Create minimap
  createMinimap(scene, sceneInitialization, portal);

  // Setup grass and vegetation
  if (allAssets.models.gltf.garden) {
    let groundMesh = null;
    allAssets.models.gltf.garden.traverse((child) => {
      if (child.isMesh && child.name === "low002") {
        groundMesh = child;
        groundMesh.userData = groundMesh.userData || {};
      }
      // Make wall mesh invisible
      if (child.isMesh && child.name === "wall") {
        child.visible = false;
      }
      // Setup swinging for the Avatar-style hanging mesh
      if (!avatarHangingMesh && child.isMesh && child.name === "NurbsPath003") {
        avatarHangingMesh = child;
        try {
          // Compute bottom/top points of the mesh in world space (assuming Y-up)
          avatarHangingMesh.updateWorldMatrix(true, false);
          const box = new THREE.Box3().setFromObject(avatarHangingMesh);
          const anchorWorld = new THREE.Vector3(
            (box.min.x + box.max.x) * 0.5,
            box.max.y,
            (box.min.z + box.max.z) * 0.5
          );

          if (USE_SHADER_SWAY_FOR_HANGING) {
            // GPU sway: add lightweight vertex modification shader
            setupHangingSway(avatarHangingMesh);
          } else {
            // Create pivot at the top (anchored) point in the parent's local space
            const parentObject = avatarHangingMesh.parent;
            const anchorLocal = parentObject.worldToLocal(anchorWorld.clone());
            avatarHangingMeshPivot = new THREE.Group();
            avatarHangingMeshPivot.name = "AvatarHangingMeshPivot";
            avatarHangingMeshPivot.position.copy(anchorLocal);

            // Insert pivot into the same parent, then reparent mesh to pivot while preserving world transform
            parentObject.add(avatarHangingMeshPivot);

            // Preserve world transform while moving the mesh under the pivot
            parentObject.updateWorldMatrix(true, false);
            avatarHangingMesh.updateWorldMatrix(true, false);
            avatarHangingMeshPivot.updateWorldMatrix(true, false);
            const meshWorldMatrix = avatarHangingMesh.matrixWorld.clone();
            avatarHangingMeshPivot.add(avatarHangingMesh);
            const invPivotWorld = new THREE.Matrix4().copy(avatarHangingMeshPivot.matrixWorld).invert();
            const newLocalMatrix = invPivotWorld.multiply(meshWorldMatrix);
            newLocalMatrix.decompose(
              avatarHangingMesh.position,
              avatarHangingMesh.quaternion,
              avatarHangingMesh.scale
            );
          }
        } catch (e) {
          console.warn("Failed to set up swing for NurbsPath003:", e);
        }
      }
    });
    
    if (groundMesh) {
      let grassMesh = null;
      let wheatMesh = null;
      
      if (allAssets.models.gltf.grass) {
        allAssets.models.gltf.grass.traverse((child) => {
          if (child.isMesh && !grassMesh) {
            grassMesh = child;
            grassMesh.material.transparent = true;
            grassMesh.material.alphaTest = 0.1;
            grassMesh.material.depthWrite = true;
            grassMesh.material.side = THREE.DoubleSide;
            
            // Add subtle emissive glow to grass
            if (!grassMesh.material.emissive) {
              grassMesh.material.emissive = new THREE.Color(0x00ff00);
            }
            grassMesh.material.emissiveIntensity = 0.3;
            grassMesh.material.emissiveEnabled = true;
            grassMesh.material.needsUpdate = true;
          }
        });
      }
      
      if (allAssets.models.gltf.wheat) {
        allAssets.models.gltf.wheat.traverse((child) => {
          if (child.isMesh && !wheatMesh) {
            wheatMesh = child;
            
            // Add subtle emissive glow to wheat
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach(material => {
                if (!material.emissive) {
                  material.emissive = new THREE.Color(0xffff00);
                }
                material.emissiveIntensity = 1;
                material.emissiveEnabled = true;
                material.needsUpdate = true;
              });
            }
          }
        });
      }
      
      const groundBlueTexture = allAssets.textures.groundBlue?.image?.currentSrc || 
                               allAssets.textures.groundBlue?.image?.src || 
                               allAssets.textures.groundBlue?.image || 
                               allAssets.textures.groundBlue?.src || 
                               "/scene1/groundBlue.png";
      
      if (grassMesh && wheatMesh) {
        spreadInstancedRandomOnUVArea(
          scene,
          allAssets.models.gltf.garden,
          "low002",
          groundBlueTexture,
          "#0000ff",
          grassMesh,
          2500,
          wheatMesh,
          undefined,            // baseScale (optional)
          { wind: true }       // disable wind here
        );
      }
    } else {
      console.error("Ground mesh 'low002' not found in garden model");
    }
  } else {
    console.log("garden model not found in allAssets");
  }

  // Initialize electro components
  electroComponents = initializeElectro(scene, allAssets, sceneInitialization.playerFunction.player, camera, controls, renderer);
  setDependencies(
    camera,
    sceneInitialization.playerFunction.player,
    scene,
    controls,
    renderer
  );

  // Initialize UFO
  initializeUFO();

  // Setup plants
  setupPlants(scene, allAssets);

  // Create vignette effect
  createVignetteEffect();

  // Create life bar
  createLifeBar();

  // Create inventory button
  createInventoryButton();

  // Show initial objective after loading screen is hidden (moved from timeout)

  // Start electro sequence after loading screen is hidden
  window.addEventListener("loadingScreenHidden-scene1", () => {
    if (isSceneTransitioning) {
      console.log("Scene transition in progress - skipping electro sequence");
      return;
    }
    if (!electroComponents) {
      console.log("Electro sequence cancelled - components not initialized");
      return;
    }
    console.log("Loading screen hidden - Scene1 is ready! Starting electro sequence.");
    // Show objectives after loading is complete
    backgroundAudio = allAssets.audios.background;
    backgroundAudio.play();
    // Prepare attack sound (non-looping by default; we will loop only during active attacks)
    try {
      attackAudio = allAssets.audios.attacksound || null;
      if (attackAudio) {
        attackAudio.setLoop ? attackAudio.setLoop(false) : (attackAudio.loop = false);
        attackAudio.setVolume ? attackAudio.setVolume(1) : (attackAudio.volume = 1);
        // Pause to ensure clean state
        if (attackAudio.isPlaying) attackAudio.stop?.();
      }
    } catch (_) {}
    showObjective(1, objectives);
    startElectroSequence();
  });



  // Add a trigger point at position (-20, 9.8, -11)
  triggerPoint = TriggerPoint(
    allAssets.vfxs.entryvfx,
    { x: -20, y: 9, z: -11 },
    scene,
    null,
    () => {
      hideObjective();
      // Move player to a fixed safe position and rotation before auto-move
      movePlayerToSafePosition(
        sceneInitialization.playerFunction.player,
        { x: -21, y: 10.3, z: -11 },
        { x: 0, y: -Math.PI/2, z: 0 }
      );
      // Start camera transition to electro focus
      startElectroFocusCameraTransition();
      // Disable controls, reset actions, and auto-move player, then start electro sequence
      triggerAutoMoveAndDisableControls(
        sceneInitialization.playerFunction.player,
        () => {
          // Start the electro sequence and pass a callback to return camera after it's done
          startElectroAppearanceSequence(() => {
            startMainCameraTransition();
          }, triggerPoint);
          console.log("Player entered the trigger zone at (-20, 9.8, -11) and auto-move completed");
        }
      );
    }
  );

  // VR Setup Block (new: mirrors scene5 - place after triggerPoint setup, before animate())
  if (isVRMode) {
    // Create clickable objects array for VR interaction
    const clickableObjects = [];

    // Add portal as clickable
    if (portal && portal.mesh) {
      portal.mesh.userData = {
        ...portal.mesh.userData,
        isPortal: true,
        onClick: () => {
          console.log('VR Controller clicked on portal');
          if (window.isElectroSequencePlaying) { // Gate with sequence flag (add this global if missing)
            console.log('Electro sequence playing, ignoring VR portal click');
            return;
          }
          // Trigger portal switch (use existing handlePortalSceneSwitch logic)
          handlePortalSceneSwitch({
            renderer,
            nextEntry,
            initializeNextScene: initializeScene2,
            cleanupCurrentScene: cleanupScene1,
            sceneInitialization,
            isSceneTransitioningRef: { value: isSceneTransitioning },
            handleKeyPress,
          });
        }
      };
      clickableObjects.push(portal.mesh);
    }

    // Add triggerPoint (if it has a 3D mesh/VFX; assume triggerPoint.mesh exists - adjust if not)
    if (triggerPoint && triggerPoint.mesh) {
      triggerPoint.mesh.userData = {
        ...triggerPoint.mesh.userData,
        isTriggerPoint: true,
        onClick: () => {
          console.log('VR Controller clicked on trigger point');
          if (window.isElectroSequencePlaying) {
            console.log('Electro sequence playing, ignoring VR trigger click');
            return;
          }
          // Invoke trigger callback (hideObjective, move player, start transition/sequence)
          hideObjective();
          movePlayerToSafePosition(sceneInitialization.playerFunction.player, { x: -21, y: 10.3, z: -11 }, { x: 0, y: -Math.PI/2, z: 0 });
          startElectroFocusCameraTransition();
          triggerAutoMoveAndDisableControls(sceneInitialization.playerFunction.player, () => {
            startElectroAppearanceSequence(() => startMainCameraTransition(), triggerPoint);
          });
        }
      };
      clickableObjects.push(triggerPoint.mesh);
    }

    // Add electro model and meshes (traverse for granular interaction, gate with sequence)
    if (electroComponents && electroComponents.electro) {
      electroComponents.electro.userData = {
        ...electroComponents.electro.userData,
        isElectro: true,
        onClick: () => {
          console.log('VR Controller clicked on Electro model');
          if (window.isElectroSequencePlaying) {
            console.log('Electro sequence playing, ignoring VR click');
            return;
          }
          // Trigger electro interaction (e.g., start sequence if not active)
          if (typeof startElectroSequence === 'function') startElectroSequence();
        }
      };
      clickableObjects.push(electroComponents.electro);

      // Add individual meshes for details
      electroComponents.electro.traverse((child) => {
        if (child.isMesh) {
          child.userData = {
            ...child.userData,
            isElectroMesh: true,
            parentModel: electroComponents.electro,
            onClick: () => {
              console.log(`VR Controller clicked on Electro mesh: ${child.name}`);
              if (window.isElectroSequencePlaying) return;
              // e.g., Show details or trigger sub-interaction (adapt from scene5's meshUIPanel)
              // For now, log; add showMeshUIPanel if implemented
            }
          };
          clickableObjects.push(child);
        }
      });
    }

    // Add plants (cactus, carnivorous) for attack interaction
    if (cactus) {
      cactus.userData = {
        ...cactus.userData,
        isCactus: true,
        onClick: () => {
          console.log('VR Controller clicked on cactus');
          if (window.isElectroSequencePlaying) return;
          // Trigger attack animation/life loss
          if (cactusAction && !isCactusAnimating) {
            isCactusAnimating = true;
            cactusAction.reset().play();
            // ... (rest of attack logic: audio, vignette, life--)
            const duration = cactusAction.getClip().duration * 1000;
            setTimeout(() => { isCactusAnimating = false; /* ... reset */ }, duration);
          }
        }
      };
      clickableObjects.push(cactus);
    }

    if (carnivorous) {
      carnivorous.userData = {
        ...carnivorous.userData,
        isCarnivorous: true,
        onClick: () => {
          console.log('VR Controller clicked on carnivorous plant');
          if (window.isElectroSequencePlaying) return;
          // Trigger attack (similar to cactus)
          if (carnivorousAction && !isCarnivorousAnimating) {
            isCarnivorousAnimating = true;
            carnivorousAction.reset().play();
            // ... (attack logic)
            const duration = carnivorousAction.getClip().duration * 1000;
            setTimeout(() => { isCarnivorousAnimating = false; /* ... */ }, duration);
          }
        }
      };
      clickableObjects.push(carnivorous);
    }

    // Add UFO
    if (ufo) {
      ufo.userData = {
        ...ufo.userData,
        isUFO: true,
        onClick: () => {
          console.log('VR Controller clicked on UFO');
          if (window.isElectroSequencePlaying) return;
          // Trigger UFO interaction (e.g., visibility toggle or sequence)
          ufo.visible = !ufo.visible;
        }
      };
      clickableObjects.push(ufo);
    }

    // Store clickable objects globally for VR updates
    window.vrClickableObjects = clickableObjects;

    // Get collision mesh from garden model (assume it exists; adjust path if needed)
    collisionMesh = allAssets.models.gltf.garden?.collisionMesh || null;
    if (collisionMesh) {
      setCollisionMesh(collisionMesh);
    }

    // Enable player movement for VR
    if (sceneInitialization?.playerFunction?.player) {
      enablePlayerMovement(sceneInitialization.playerFunction.player);
    }

    // Initialize VR session
    initializeVR(
      renderer,
      scene,
      camera,
      sceneInitialization.playerFunction.player,
      // backgroundMusic (commented like scene5),
      sceneInitialization.playerFunction.actions, // Assume actions exist from physics init
      clickableObjects,
      (clickedObject) => {
        // Handle VR click (invoke onClick if present)
        if (clickedObject && clickedObject.userData?.onClick) {
          clickedObject.userData.onClick();
        }
      }
    );

    // Debug logging (like scene5)
    console.log('VR Controller raycasting setup completed for Scene1');
    console.log('Clickable objects:', clickableObjects.length);
    console.log('Portal/Trigger/Electro/Plants/UFO added:', !!portal?.mesh || !!triggerPoint?.mesh || !!electroComponents?.electro || !!cactus || !!ufo);

    // Global debug function
    window.debugVRClickableObjects = () => {
      console.log('Current VR clickable objects:', window.vrClickableObjects);
      if (window.vrClickableObjects) {
        window.vrClickableObjects.forEach((obj, index) => {
          console.log(`Object ${index}:`, obj.name || obj.type, obj.userData);
        });
      }
    };
  }

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
    if (!scene || !camera || !renderer || !camera.isCamera) return;
    // stats.begin();
    const delta = clock.getDelta();
    
    if (userInfo.modeSelected === "vr") {
      updateVR(); // New: Update VR controllers, raycasting, session
    } else {
        if (controls) {
            controls.update();
        }
    }
  
    // Update portal
    if (portal) {
      portal.update(clock.getElapsedTime());
    }
  
    // Gentle, slow swinging motion for the Avatar-style hanging mesh (CPU path)
    if (avatarHangingMeshPivot && !USE_SHADER_SWAY_FOR_HANGING) {
      const t = clock.getElapsedTime();
      const swayZ = 0.09 * Math.sin(t * 0.25);
      const swayX = 0.06 * Math.sin(t * 0.18 + 1.3);
      avatarHangingMeshPivot.rotation.z = swayZ;
      avatarHangingMeshPivot.rotation.x = swayX;
    }
  
    // Update GPU sway uniforms (GPU path)
    if (USE_SHADER_SWAY_FOR_HANGING && avatarHangingSwayUniforms.length) {
      const t = clock.getElapsedTime();
      for (const uniforms of avatarHangingSwayUniforms) {
        if (uniforms.uTime) uniforms.uTime.value = t;
      }
    }
  
    // Update minimap
    updateMinimap();
  
    // Update the trigger point logic
    if (triggerPoint && triggerPoint.updateQuarksScene && sceneInitialization?.playerFunction?.player) {
      triggerPoint.updateQuarksScene(delta, sceneInitialization.playerFunction.player);
    }
  
    // Update electro components
    if (electroComponents?.electroMixer) {
      electroComponents.electroMixer.update(delta);
    }
  
    // Update plant mixers
    if (cactusMixer) {
      cactusMixer.update(delta);
    }
    if (carnivorousMixer) {
      carnivorousMixer.update(delta);
    }
  
    // Ensure updateElectro is called to process auto-move and electro logic
    updateElectro(delta);
  
    // Only update hologram if it exists and is not being cleaned up
    const electroState = getElectroState();
    if (hologramEffect && typeof hologramEffect.update === 'function' && !electroState?.isCleanupInProgress) {
      hologramEffect.update(delta);
    }
  
    // Camera transition logic
    let currentCamera = camera;
    if (isCameraTransitioning) {
      const elapsed = (performance.now() - transitionStartTime) / 1000;
      const t = Math.min(elapsed / transitionDuration, 1);
      // Smoothstep for smooth transition
      const smoothT = t * t * (3 - 2 * t);
      const pos = new THREE.Vector3().lerpVectors(
        transitionStartPosition,
        transitionTargetPosition,
        smoothT
      );
      const quat = new THREE.Quaternion().slerpQuaternions(
        transitionStartQuaternion,
        transitionTargetQuaternion,
        smoothT
      );
      if (isElectroFocusActive) {
        electroFocusCamera.position.copy(pos);
        electroFocusCamera.quaternion.copy(quat);
        currentCamera = electroFocusCamera;
      } else {
        camera.position.copy(pos);
        camera.quaternion.copy(quat);
        currentCamera = camera;
      }
      if (t >= 1) {
        isCameraTransitioning = false;
      }
    } else if (isElectroFocusActive) {
      currentCamera = electroFocusCamera;
    } else {
      currentCamera = camera;
    }
  
    // Check plant interactions
    if (sceneInitialization?.playerFunction?.player) {
      const playerPosition = sceneInitialization.playerFunction.player.position;
  
      // Check cactus interaction
      if (cactus && cactusAction) {
        const distance = getDistance(playerPosition, cactus.position);
        if (distance <= ATTACK_DISTANCE && !isCactusAnimating) {
          isCactusAnimating = true;
          cactusAction.reset().play();
          // Start attack audio loop while any attack animation is active
          try {
            if (attackAudio) {
              attackAudio.setLoop ? attackAudio.setLoop(true) : (attackAudio.loop = true);
              if (!attackAudio.isPlaying) attackAudio.play?.();
            }
          } catch (_) {}
          toggleVignette(true);
          playerLife = Math.max(0, playerLife - 10);
          updateLifeDisplay();
  
          const duration = cactusAction.getClip().duration * 1000;
          setTimeout(() => {
            isCactusAnimating = false;
            toggleVignette(false);
            // If neither plant is animating, stop attack audio
            try {
              if (!isCactusAnimating && !isCarnivorousAnimating && attackAudio) {
                attackAudio.setLoop ? attackAudio.setLoop(false) : (attackAudio.loop = false);
                attackAudio.stop ? attackAudio.stop() : attackAudio.pause?.();
              }
            } catch (_) {}
          }, duration);
        }
      }
  
      // Check carnivorous plant interaction
      if (carnivorous && carnivorousAction) {
        const distance = getDistance(playerPosition, carnivorous.position);
        if (distance <= ATTACK_DISTANCE && !isCarnivorousAnimating) {
          isCarnivorousAnimating = true;
          carnivorousAction.reset().play();
          // Start attack audio loop while any attack animation is active
          try {
            if (attackAudio) {
              attackAudio.setLoop ? attackAudio.setLoop(true) : (attackAudio.loop = true);
              if (!attackAudio.isPlaying) attackAudio.play?.();
            }
          } catch (_) {}
          toggleVignette(true);
          playerLife = Math.max(0, playerLife - 15);
          updateLifeDisplay();
  
          const duration = carnivorousAction.getClip().duration * 1000;
          setTimeout(() => {
            isCarnivorousAnimating = false;
            toggleVignette(false);
            // If neither plant is animating, stop attack audio
            try {
              if (!isCactusAnimating && !isCarnivorousAnimating && attackAudio) {
                attackAudio.setLoop ? attackAudio.setLoop(false) : (attackAudio.loop = false);
                attackAudio.stop ? attackAudio.stop() : attackAudio.pause?.();
              }
            } catch (_) {}
          }, duration);
        }
      }
    }
  
    // Check for portal interaction
    if (sceneInitialization?.playerFunction?.player && portal && portal.mesh) {
      const playerPosition = sceneInitialization.playerFunction.player.position;
      const distance = getDistance(playerPosition, portal.mesh.position);
      if (distance <= 2 && !isSceneTransitioning) {
              markSceneCompleted("scene1");
        // Use handlePortalSceneSwitch from portal.js
        handlePortalSceneSwitch({
          renderer,
          nextEntry,
          initializeNextScene: initializeScene2,
          cleanupCurrentScene: cleanupScene1,
          sceneInitialization,
          isSceneTransitioningRef: { value: isSceneTransitioning },
          handleKeyPress,
        });
      }
    }
  
    // New: VR collision handling (gated by sequence, like scene5)
    if (userInfo.modeSelected === "vr" && sceneInitialization?.playerFunction?.player && !window.isElectroSequencePlaying) {
      const player = sceneInitialization.playerFunction.player;
      if (collisionMesh) {
        handleCollisions(player, collisionMesh, playerState.velocity, delta);
      }
      // Apply velocity
      if (playerState.velocity.length() > 0) {
        player.position.x += playerState.velocity.x * delta;
        player.position.z += playerState.velocity.z * delta;
        if (!playerState.onGround) {
          player.position.y += playerState.velocity.y * delta;
        }
      }
    }
  
    // Only render if we have valid references at this moment (guard against async cleanup)
    if (renderer && scene && currentCamera && currentCamera.isCamera) {
      renderer.render(scene, currentCamera);
    }
    // stats.end();
  }

  animate();

  resizeHandler = () => {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };
  window.addEventListener("resize", resizeHandler);

  return {
    scene,
    camera,
    renderer,
    controls,
    sceneInitialization,
    electroComponents,
  };
}

export function cleanupScene1() {
  // Stop and clean up background music
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
    backgroundAudio = null;
  }
  // Stop and clear attackAudio
  try {
    if (attackAudio) {
      attackAudio.setLoop ? attackAudio.setLoop(false) : (attackAudio.loop = false);
      attackAudio.stop ? attackAudio.stop() : attackAudio.pause?.();
      attackAudio = null;
    }
  } catch (_) {}

  // const stats = document.querySelector(".stats");
  // if (stats) {
  //   stats.remove();
  // }

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clean up portal
  if (portal) {
    portal.dispose();
    portal = null;
  }

  // Clean up minimap
  cleanupMinimap();

  // Clean up objectives
  cleanupObjectives();

  // Clean up trigger point
  if (triggerPoint && typeof triggerPoint.removeParticleEffects === 'function') {
    triggerPoint.removeParticleEffects();
    triggerPoint = null;
  }

  // Clean up electro components
  if (electroComponents) {
    if (electroComponents.electroMixer) {
      electroComponents.electroMixer.stopAllAction();
    }
    if (electroComponents.electro) {
      scene.remove(electroComponents.electro);
      if (electroComponents.electro.geometry) {
        electroComponents.electro.geometry.dispose();
      }
      if (electroComponents.electro.material) {
        if (Array.isArray(electroComponents.electro.material)) {
          electroComponents.electro.material.forEach(mat => mat.dispose());
        } else {
          electroComponents.electro.material.dispose();
        }
      }
    }
    electroComponents = null;
  }

  // Clean up electro system
  cleanupElectro();

  // New: VR Cleanup (mirrors scene5 - place after electro cleanup)
  cleanupVR(); // Ends session, disposes controllers
  if (sceneInitialization?.playerFunction?.player) {
    disablePlayerMovement(sceneInitialization.playerFunction.player);
  }
  if (window.vrClickableObjects) {
    window.vrClickableObjects.length = 0;
    delete window.vrClickableObjects;
  }

  // Clean up grass groups
  if (scene?.userData?.grassGroup) {
    scene.userData.grassGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    scene.remove(scene.userData.grassGroup);
    scene.userData.grassGroup = null;
  }

  // Clean up UFO
  if (ufo) {
    ufo.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(ufo);
    ufo = null;
  }

  // Remove life bar
  if (lifeBarContainer) {
    document.body.removeChild(lifeBarContainer);
    lifeBarContainer = null;
  }

  // Remove death screen
  if (deathScreenContainer) {
    document.body.removeChild(deathScreenContainer);
    deathScreenContainer = null;
  }

  // Remove vignette overlay
  if (vignetteOverlay) {
    document.body.removeChild(vignetteOverlay);
    vignetteOverlay = null;
  }

  // Clean up inventory
  cleanupInventory();

  // Clean up plants
  if (cactus) {
    cactus.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(cactus);
    cactus = null;
  }
  if (carnivorous) {
    carnivorous.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(carnivorous);
    carnivorous = null;
  }

  // Clean up avatar hanging mesh pivot and references
  if (avatarHangingMeshPivot && !USE_SHADER_SWAY_FOR_HANGING) {
    try {
      if (avatarHangingMesh && avatarHangingMeshPivot.parent) {
        // Reparent mesh back to the original parent to avoid dangling refs
        const parentObject = avatarHangingMeshPivot.parent;
        parentObject.add(avatarHangingMesh);
        parentObject.remove(avatarHangingMeshPivot);
      }
    } catch (e) {
      // noop
    }
    avatarHangingMeshPivot = null;
  }
  avatarHangingMesh = null;
  avatarHangingSwayUniforms = [];

  if (sceneInitialization?.playerFunction?.player) {
    // Disable player movement if needed
  }

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  if (controls) {
    controls.dispose();
  }
  
  scene = null;
  camera = null;
  controls = null;
  sceneInitialization = null;
  
  // Reset plant-related variables
  isCactusAnimating = false;
  isCarnivorousAnimating = false;
  isPlayerDead = false;
  playerLife = 100;
  isVignetteActive = false;
  
  // New: Reset VR globals
  collisionMesh = null;
  if (window.debugVRClickableObjects) delete window.debugVRClickableObjects;
}