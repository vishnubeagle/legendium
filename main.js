import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { getStartScene, isUserInfoComplete, getUserInfo } from "./data.js";
import { initializeScene2 } from "./scene2/scene2.js";
import { initializeScene1 } from "./scene1/scene1.js";
import { initializeScene3 } from "./scene3/scene3.js";
import { initializeScene4 } from "./scene4/scene4.js";
import { initializeScene5 } from "./scene5/scene5.js";
import { initializeScene6 } from "./scene6/scene6.js";
import { initializeScene7 } from "./scene7/scene7.js";

let renderer;
let isGameInitializing = false;
let resizeTimeout = null;
let currentCamera = null;
let currentScene = null;

function updateCanvasSize(renderer) {
  if (!renderer) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Update renderer size
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Ensure canvas fills the window
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.zIndex = "0";
}

export function initializeRenderer() {
  if (renderer) return renderer;

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  // Set up canvas size and style
  updateCanvasSize(renderer);

  document.body.appendChild(renderer.domElement);

  // Set up resize handler immediately
  window.addEventListener("resize", () => {
    if (currentCamera) {
      currentCamera.aspect = window.innerWidth / window.innerHeight;
      currentCamera.updateProjectionMatrix();
    }
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  return renderer;
}

export function handleResize(camera, renderer) {
  if (!renderer) return;

  // Clear any existing timeout
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  // Debounce the resize handler
  resizeTimeout = setTimeout(() => {
    // Update canvas size first
    updateCanvasSize(renderer);

    // Update camera if available
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
  }, 100);
}

export function enableVR(renderer) {
  console.log("Initializing VR mode...");
  renderer.xr.enabled = true;
  const vrButton = VRButton.createButton(renderer);
  document.body.appendChild(vrButton);
  vrButton.style.display = "none";

  vrButton.addEventListener("click", () => {
    console.log("VR button clicked");
    if (navigator.xr) {
      console.log("Requesting VR session...");
      navigator.xr
        .requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
        })
        .then((session) => {
          console.log("VR session granted:", session);
          renderer.xr.setSession(session);
        })
        .catch((error) => {
          console.error("Failed to start VR session:", error);
        });
    } else {
      console.error("WebXR not supported");
    }
  });

  return vrButton;
}

export function disposeRenderer() {
  if (renderer) {
    renderer.dispose();
    document.body.removeChild(renderer.domElement);
    renderer = null;
  }
}

export function startGame() {
  if (isGameInitializing) return;
  isGameInitializing = true;

  if (!isUserInfoComplete()) {
    console.warn("Cannot start game: User info not complete");
    isGameInitializing = false;
    return;
  }

  const startScene = getStartScene();
  const renderer = initializeRenderer();
  const userInfo = getUserInfo();
  const isVRMode = userInfo.modeSelected === "vr";

  console.log("Starting game:", {
    startScene,
    isVRMode,
    userInfo,
  });

  // Make canvas visible
  const canvas = document.getElementById("scene");
  if (canvas) {
    canvas.style.display = "block";
  }

  // Hide selection screens if they exist
  const modeSelection = document.getElementById("mode-selection");
  const characterSelection = document.getElementById("character-selection");
  if (modeSelection) modeSelection.style.display = "none";
  if (characterSelection) characterSelection.style.display = "none";

  switch (startScene) {
    case "scene1":
      console.log("Initializing scene1 with VR mode:", isVRMode);
      initializeScene1(renderer, isVRMode);
      window.currentScene = "scene1";
      break;
    case "scene2":
      console.log("Initializing scene2 with VR mode:", isVRMode);
      initializeScene2(renderer, isVRMode);
      window.currentScene = "scene2";
      break;
    case "scene3":
      console.log("Initializing scene3 with VR mode:", isVRMode);
      initializeScene3(renderer, isVRMode);
      window.currentScene = "scene3";
      break;
    case "scene4":
      console.log("Initializing scene4 with VR mode:", isVRMode);
      initializeScene4(renderer, isVRMode);
      window.currentScene = "scene4";
      break;
    case "scene5":
      console.log("Initializing scene5 with VR mode:", isVRMode);
      initializeScene5(renderer, isVRMode);
      window.currentScene = "scene5";
      break;
      case "scene6":
        console.log("Initializing scene6 with VR mode:", isVRMode);
        initializeScene6(renderer, isVRMode);
        window.currentScene = "scene6";
        break;
        case "scene7":
          console.log("Initializing scene7 with VR mode:", isVRMode);
          initializeScene7(renderer, isVRMode);
          window.currentScene = "scene7";
          break;
    default:
      console.warn("Invalid scene specified:", startScene);
      console.log("Defaulting to scene1 with VR mode:", isVRMode);
      initializeScene1(renderer, isVRMode);
      window.currentScene = "scene1";
  }

  isGameInitializing = false;
}

// Instead of initializing directly, wait for character selection
document.addEventListener("DOMContentLoaded", () => {
  // Show selection screen first
  const selectionScreen = document.getElementById("mode-selection");
  if (selectionScreen) {
    selectionScreen.style.display = "flex";
  }
});
