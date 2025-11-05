import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setCurrentScene, getUserInfo } from "../data.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createGUI, destroyGUI } from "../commonFiles/guiManager.js";
import { initializeVR, updateVR, cleanupVR } from "../commonFiles/vrManager.js";
import {
  initializeAudioManager,
  cleanupAudioManager,
  playAudio,
} from "../commonFiles/audiomanager.js";

import {
  allAssets,
  checkExistingAssets,
  loadAllAsset,
} from "../commonFiles/assetsLoader.js";
import { assetsEntry as currentEntry } from "./assetsEntry.js";
import { initializePhysicsAndPlayer } from "../commonFiles/initializePhysicsAndPlayer.js";
import {
  handleCollisions,
  player,
  playerState,
  setCameraAndControls,
 
} from "../commonFiles/playerController.js";
import { JstXhFemalePin } from "./JstXhFemalePin.js";
import { RaycasterSetup1, RaycasterSetup2 } from "./raycasterSetup.js";
import {
  nextStep,
  prevStep,
  getCurrentStepText,
  getCurrentStep,
  getTotalSteps,
  resetSteps,
  codePlane,
  forwardArrow,
  updateCodePlaneWithInstruction,
  beginBlinkButton,
  setCodePlaneToInstructions,
  setForwardArrowEnabled,
  setLesson,
  showNextLessonButton,
  hideNextLessonButton,
  setOnNextLesson,
  instructionsLabel,
  showInstructionsLabel,
  hideInstructionsLabel,
  isCurrentStepTitle,
  isStepTitle,
  updateNextButtonState,
  removeAllLesson2Models,
  removeAllLesson3Models,
  runCodeButton,
  isLastStep,
  showBlinkingButton,
  nextLessonButton,
  disableCameraAnimation,  // Add this line
  enableCameraAnimation,   // Add this line
} from "./ui.js";
import {
  togglePlayerControls,
  enableCameraControls,
} from "../commonFiles/playerController.js";
import ThreeMeshUI from "three-mesh-ui";
import { gsap } from "gsap";
// Camera animation import removed - all lessons now have consistent camera behavior
// Lesson step camera targets import removed - all lessons now have consistent camera behavior
import { modelTransforms } from "./modelTransforms.js";
import { makeSomeNoiseButton } from "./ui.js";
import { KpMotorLesson, updateFunction } from "./kpMotorLesson.js";
import { KpIRLesson, updateFunction as irUpdate } from "./kpIRLesson.js"
import { createLearningPanel, showLearningPanel, hideLearningPanel, toggleLearningPanel, updateLearningPanelContent } from "./learning.js";
import { setLearningLesson, nextLearningItem, prevLearningItem, learningPanel } from "./learning.js";

import LessonCleaner from "./utils/lessonCleaner.js"

import { auth, db } from "../src/firebase.js";
import { doc, updateDoc } from "firebase/firestore";
import { markSceneVisited } from "../data.js";
async function markSceneCompleted(sceneKey) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { [`scenesCompleted.${sceneKey}`]: true });
  } catch (e) {
    console.error("Failed to mark scene completed", e);
  }
}
// Import the new shader manager
import { 
  applyStepShader, 
  handleDragStart, 
  handleDragEnd, 
  handleSnap, 
  updateShader, 
  cleanupShader,
  testShaderManager
} from "./shaderManager.js";
import FakeGlowMaterial from "./FakeGlowMaterial.js";
import { cleanupKpRgbLesson } from "./kpRgbLesson.js";
//import { createLearningPanel, showLearningPanel, hideLearningPanel, toggleLearningPanel, updateLearningPanelContent } from "./learning.js";
export let scene = null;
let  camera, renderer, controls;
let animationFrameId = null;
let stats;

let isOrbitMode = false;

let snapCameraAdjusted = false;

// Track lesson4 run code button and animation completion
let lesson4RunCodeClicked = false;
let lesson4CodeAnimationCompleted = false;
let lesson4S7Played = false;

// Ensure only one audio plays at a time within scene6 (local-only control)
let _scene6CurrentAudio = null;
function playScene6Audio(audioName, position = null, radius = null) {
  try {
    if (_scene6CurrentAudio) {
      try {
        if (typeof _scene6CurrentAudio.stop === "function") {
          _scene6CurrentAudio.stop();
        } else if (typeof _scene6CurrentAudio.pause === "function") {
          _scene6CurrentAudio.pause();
          if ("currentTime" in _scene6CurrentAudio) {
            _scene6CurrentAudio.currentTime = 0;
          }
        }
      } catch (e) {}
    }
    const instance = playAudio(audioName, position, radius);
    _scene6CurrentAudio = instance || null;
    // Clear tracking when this instance ends
    if (instance) {
      try {
        if (typeof instance.addEventListener === "function") {
          instance.addEventListener(
            "ended",
            () => {
              if (_scene6CurrentAudio === instance) _scene6CurrentAudio = null;
            },
            { once: true }
          );
        } else if ("onEnded" in instance) {
          const prevOnEnded = instance.onEnded;
          instance.onEnded = (...args) => {
            try { if (typeof prevOnEnded === "function") prevOnEnded.apply(instance, args); } catch (e) {}
            if (_scene6CurrentAudio === instance) _scene6CurrentAudio = null;
          };
        }
      } catch (e) {}
    }
    return instance;
  } catch (e) {
    return playAudio(audioName, position, radius);
  }
}

function isAllowedLesson() {
  if (typeof window.getCurrentLesson === "function") {
    const lesson = window.getCurrentLesson();
    return (
      lesson === "lesson1" ||
      lesson === "lesson2" ||
      lesson === "lesson3" ||
      lesson === "lesson4" ||
      lesson === "lesson5"
    );
  }
  return false;
}

export async function initializeScene6(existingRenderer, isVRMode) {
  setCurrentScene("scene6");
  await markSceneVisited("scene6");
  const userInfo = getUserInfo();
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  const gui = createGUI();
  gui.close();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  window.camera = camera;
  renderer = existingRenderer;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  if (!renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }
  await loadAllAsset(currentEntry, camera, renderer);
  console.log("[Scene6] Loaded model keys:", Object.keys(allAssets.models.gltf));
  console.log("[Scene6] Battery present:", !!allAssets.models.gltf.battery);
  scene = new THREE.Scene();
  if (allAssets.hdris.sky6) {
    scene.environment = allAssets.hdris.sky6;
    scene.background = allAssets.hdris.sky6;
  }
  scene.add(camera);

  // Camera GUI removed - lesson1 now behaves like lesson2 catch (e) { console.warn("Lesson1 Camera GUI failed:", e); }

  // (Removed) Code editor panels for all lessons

  window.currentScene = scene;
  // Make showBlinkingButton globally available
  window.showBlinkingButton = showBlinkingButton;

  initializeAudioManager(camera, scene);
  let sceneInitialization = null;
  const mainModel = allAssets.models.gltf.mainModel;
  if (mainModel) {
    mainModel.traverse((child) => {
      if (child.isMesh) {
        console.log("Mesh found in mainModel:", child.name);
      }
    });
    let screenMesh = null;
    mainModel.traverse((child) => {
      if (child.isMesh && child.name === "screen") {
        screenMesh = child;
      }
    });
    console.log("Reference to screen mesh:", screenMesh);
    // Removed canvas creation and texture assignment for screen mesh
    sceneInitialization = initializePhysicsAndPlayer(
      mainModel,
      {
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      [],
      scene,
      camera,
      controls,
      renderer
    );
    if (sceneInitialization?.playerFunction?.model) {
      sceneInitialization.playerFunction.model.visible = false;
    }
  }
  window.addEventListener("loadingScreenHidden-scene6", () => {
    console.log("Loading screen hidden - Scene6 is ready!");
   // camera.position.set(0, 2.5, -2);
    // Play narrator intro once the scene is fully ready
    try {
      playScene6Audio("narrator_intro");
    } catch (e) {
      console.warn("Failed to start narrator_intro:", e);
    }
  });
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
// KpMotorLesson(scene,camera)
  if (isAllowedLesson()) {
    const nanoModel = allAssets.models.gltf.nano1;
    if (nanoModel) {
      nanoModel.position.copy(modelTransforms.nano1.position);
      nanoModel.scale.copy(modelTransforms.nano1.scale);
      nanoModel.rotation.copy(modelTransforms.nano1.rotation);
      scene.add(nanoModel);
      window.nanoModel = nanoModel; // Expose globally for RaycasterSetup
    }
    const expansionBoardModel = allAssets.models.gltf.expansionBoard;
    if (expansionBoardModel) {
      expansionBoardModel.position.copy(
        modelTransforms.expansionBoard.position
      );
      expansionBoardModel.scale.copy(modelTransforms.expansionBoard.scale);
      expansionBoardModel.rotation.copy(
        modelTransforms.expansionBoard.rotation
      );
      scene.add(expansionBoardModel);
      window.expansionBoardModel = expansionBoardModel;
    }
    const rgbLEDModel = allAssets.models.gltf.rgbLEDModule;
    if (rgbLEDModel) {
      rgbLEDModel.position.copy(modelTransforms.rgbLED.position); // Adjust position as needed
      rgbLEDModel.scale.copy(modelTransforms.rgbLED.scale); // Adjust scale as needed
      rgbLEDModel.rotation.copy(modelTransforms.rgbLED.rotation);
      scene.add(rgbLEDModel);
      window.rgbLEDModel = rgbLEDModel; // Optional: expose globally if needed
     
      // Store RGB LED model reference for later blink shader application
      window.rgbLEDModel = rgbLEDModel;
      
      // Create function to apply blink shader (will be called from code editor)
      window.applyRGBLEDBlinkShader = function() {
        try {
          let blinkShaderApplied = false;
          const childNames = [];
          rgbLEDModel.traverse((child) => {
            if (child.isMesh) {
              console.log("RGB LED child name:", child.name);
              childNames.push(child.name || "<no-name>");
              if (blinkShaderApplied) return; // already applied once, skip others
              
              // Apply to the "rgbled" child specifically
              const targetName = "rgbled";
              const nameMatchesExact = typeof child.name === "string" && child.name === targetName;
              if (nameMatchesExact) {
                // Create a blinking red material
                const blinkMaterial = new THREE.MeshStandardMaterial({
                  color: 0xff0000, // Red color
                  emissive: 0xff0000, // Red emissive for glow effect
                  emissiveIntensity: 0.5,
                  transparent: true,
                  opacity: 1.0,
                  metalness: 0.1,
                  roughness: 0.3,
                });
                
                // Store original material for restoration
                child.userData.originalMaterial = child.material;
                child.material = blinkMaterial;
                
                // Create blink animation
                let blinkTime = 0;
                const blinkSpeed = 2.0; // Blinks per second
                
                // Add blink update function to the child
                child.userData.blinkUpdate = (deltaTime) => {
                  // Check if blinking is active
                  if (child.userData.blinkActive === false) {
                    return; // Don't update if blinking is stopped
                  }
                  
                  const currentSpeed = child.userData.blinkSpeed || blinkSpeed;
                  blinkTime += deltaTime * currentSpeed;
                  const blinkValue = Math.sin(blinkTime * Math.PI * 2) * 0.5 + 0.5; // 0 to 1
                  
                  // Update emissive intensity for blinking effect
                  blinkMaterial.emissiveIntensity = blinkValue * 0.8;
                  
                  // Update opacity for fade effect
                  blinkMaterial.opacity = 0.3 + blinkValue * 0.7;
                  
                  // Update color intensity
                  const intensity = 0.3 + blinkValue * 0.7;
                  blinkMaterial.color.setRGB(intensity, 0, 0);
                  blinkMaterial.emissive.setRGB(intensity * 0.5, 0, 0);
                };
                
                // Initialize blink state
                child.userData.blinkActive = true;
                child.userData.blinkSpeed = blinkSpeed;
                
                // Store reference for animation updates
                window.rgbLEDBlinkMaterial = blinkMaterial;
                window.rgbLEDBlinkMesh = child;
                
                blinkShaderApplied = true;
                console.log("Blink shader applied to RGB LED child:", child.name);
              }
            }
          });
          
          if (!blinkShaderApplied) {
            console.warn("RGB LED child 'rgbled' not found. Available child names:", childNames);
          } else {
            console.log("RGB LED blink shader successfully applied");
          }
        } catch (e) {
          console.error("Failed to apply blink shader to RGB LED:", e);
        }
      };
      
      console.log("RGB LED blink shader function created. Call window.applyRGBLEDBlinkShader() to apply it.");
      
    }

    const names = [];
    window.rgbLEDModel?.traverse(c => { if (c.isMesh) names.push(c.name); });
    console.log(names);
    // Load and add the buzzer model
    const buzzerModel = allAssets.models.gltf.buzzer;
    if (buzzerModel) {
      buzzerModel.position.copy(modelTransforms.buzzer.position);
      buzzerModel.scale.copy(modelTransforms.buzzer.scale);
      buzzerModel.rotation.copy(modelTransforms.buzzer.rotation);
      scene.add(buzzerModel);
      window.buzzerModel = buzzerModel;
      buzzerModel.visible = false; // Hide buzzer by default
    }

    // Load and add the temperature sensor model (lesson3)
    const tempSensorModel = allAssets.models.gltf.tempSensor;
    if (tempSensorModel) {
      tempSensorModel.position.copy(modelTransforms.tempSensor.position);
      tempSensorModel.scale.copy(modelTransforms.tempSensor.scale);
      tempSensorModel.rotation.copy(modelTransforms.tempSensor.rotation);
      scene.add(tempSensorModel);
      window.tempSensorModel = tempSensorModel;
      tempSensorModel.visible = false; // Hide temperature sensor by default
    }

    const batteryModel = allAssets.models.gltf.battery;
    console.log("[Scene6] batteryModel fetched:", !!batteryModel);
    if (batteryModel) {
      try {
        batteryModel.position.set(0.8, 1.7, -3.4);
        batteryModel.scale.copy(modelTransforms.battery.scale);
       
        scene.add(batteryModel);
        window.batteryModel = batteryModel;
        batteryModel.visible = true;
        console.log("[Scene6] batteryModel added to scene.");
      } catch (e) {
        console.error("[Scene6] Error adding batteryModel:", e);
      }
    } else {
      console.warn("[Scene6] batteryModel not found in allAssets.models.gltf");
    }

    const jstPinBattery = new JstXhFemalePin(
      {
        pinCount: 2,
        twoSide: false,
        position: new THREE.Vector3(0.8, 1.7, -3.2),
        wireConfigs: [
          {
            startPosition: new THREE.Vector3(0.8, 1.7, -3.3), // Pin 1 (2.54mm pitch)
            color: 0xff0000, // Red
          },
          {
            startPosition: new THREE.Vector3(0.76, 1.7, -3.3), // Pin 2
            color: 0x00ff00, // Green
          }
        ],
        
      },
      scene
    );
    jstPinBattery.group.visible = true;
    window.jstPinBattery = jstPinBattery;
    window.jstPinBatterySide1 = jstPinBattery.pinGLTF1;
   if(jstPinBattery.pinGLTF1){
    jstPinBattery.pinGLTF1.rotation.y = -Math.PI / 2;
    jstPinBattery.updatePosition(new THREE.Vector3(0.8, 1.7, -3.2), jstPinBattery.pinGLTF1);
   }
    
    // Create lesson3 JST pin (for temperature sensor)
    const jstPin3 = new JstXhFemalePin(
      {
        pinCount: 3,
        twoSide: true,
        jstPinConfig: [
          {
            startPosition: new THREE.Vector3(-0.5, 1.8, -3),
          },
          {
            startPosition: new THREE.Vector3(0, 1.7, -3.05),
          },
        ],
        colors: ["black", "brown", "red"],
      },
      scene
    );
    jstPin3.group.visible = false; // Hide by default
    window.jstPin3 = jstPin3;
    window.jstPin3Side1 = jstPin3.pinGLTF1;
    window.jstPin3Side2 = jstPin3.pinGLTF2;

    if (jstPin3.pinGLTF1 && jstPin3.pinGLTF2) {
      jstPin3.pinGLTF1.rotation.z = Math.PI * 3;
      jstPin3.pinGLTF1.rotation.y = -Math.PI * 3;
      jstPin3.updatePosition(
        new THREE.Vector3(-0.5, 1.8, -3),
        jstPin3.pinGLTF1
      );
      jstPin3.pinGLTF2.rotation.y = -Math.PI * 3;
      jstPin3.pinGLTF2.rotation.z = Math.PI * 3;
      jstPin3.updatePosition(
        new THREE.Vector3(0, 1.8, -3.05),
        jstPin3.pinGLTF2
      );
    }
    const jstPin2 = new JstXhFemalePin(
      {
        pinCount: 3,
        twoSide: true,
        jstPinConfig: [
          {
            startPosition: new THREE.Vector3(-0.5, 1.8, -3),
          },
          {
            startPosition: new THREE.Vector3(0, 1.7, -3.05),
          },
        ],
        colors: ["black", "brown", "red"],
      },
      scene
    );
    jstPin2.group.visible = false; // Hide by default
    window.jstPin2 = jstPin2;
    window.jstPin2Side1 = jstPin2.pinGLTF1;
    window.jstPin2Side2 = jstPin2.pinGLTF2;

    if (jstPin2.pinGLTF1 && jstPin2.pinGLTF2) {
      window.secondPin4Female = jstPin2.pinGLTF1;
      jstPin2.pinGLTF1.rotation.z = Math.PI * 3;
      jstPin2.pinGLTF1.rotation.y = -Math.PI * 3;
      jstPin2.updatePosition(
        new THREE.Vector3(-0.5, 1.8, -3),
        jstPin2.pinGLTF1
      );
      window.secondPin4Female = jstPin2.pinGLTF2;
      jstPin2.pinGLTF2.rotation.y = -Math.PI * 3;
      jstPin2.pinGLTF2.rotation.z = Math.PI * 3;
      jstPin2.updatePosition(
        new THREE.Vector3(0, 1.8, -3.05),
        jstPin2.pinGLTF2
      );
    }
    
    // Refresh the raycaster pin models reference to include the newly created lesson2 JST pins
    if (window.raycasterSetup && typeof window.raycasterSetup.refreshPinModelsRef === 'function') {
      window.raycasterSetup.refreshPinModelsRef();
      console.log("[Scene6] Refreshed raycaster pin models reference after creating lesson2 JST pins");
    }
    
    const jstPin = new JstXhFemalePin(
      {
        pinCount: 4,
        twoSide: true,
        jstPinConfig: [
          {
            startPosition: new THREE.Vector3(0.5, 1.8, -3),
          },
          {
            startPosition: new THREE.Vector3(0, 1.8, -3),
          },
        ],
      },
      scene
    );
    window.jstPin = jstPin;
    
    // Ensure the JST pin starts at the correct position for shader application
    if (jstPin.pinGLTF1) {
      jstPin.updatePosition(new THREE.Vector3(0.5, 1.8, -3), jstPin.pinGLTF1);
    }
    
    // Expose the second pin4Female globally for snapping
    if (jstPin.pinGLTF2) {
      window.secondPin4Female = jstPin.pinGLTF2;
      jstPin.pinGLTF2.rotation.z = -Math.PI * 2;
      jstPin.updatePosition(new THREE.Vector3(0, 1.8, -3), jstPin.pinGLTF2);
    }
  }

  // Fallback: ensure battery is added even if lesson gate prevented the above block
  if (!window.batteryModel && allAssets.models.gltf.battery) {
    try {
      const batteryModelFallback = allAssets.models.gltf.battery;
      batteryModelFallback.position.set(-0.5, 1.8, -3.1);
      scene.add(batteryModelFallback);
      window.batteryModel = batteryModelFallback;
      batteryModelFallback.visible = true;
      console.log("[Scene6] batteryModel added via fallback.");
    } catch (e) {
      console.error("[Scene6] Error adding batteryModel (fallback):", e);
    }
  }

  // Create the instruction UI group
  let codeEditorGroup = null;
  codeEditorGroup = new THREE.Group();
  scene.add(codeEditorGroup);
  scene.add(codePlane);
  codePlane.position.set(0.2, 2.5, -4.01);
  codeEditorGroup.add(codePlane);

  // Add instructions label to scene and group
  scene.add(instructionsLabel);
  codeEditorGroup.add(instructionsLabel);

  window.codeEditorGroup = codeEditorGroup;

  // Set initial instruction text
  if (typeof setCodePlaneToInstructions === "function") {
    setCodePlaneToInstructions();
  }

  scene.add(forwardArrow);
  codeEditorGroup.add(forwardArrow);

  scene.add(runCodeButton);
  scene.add(showBlinkingButton);
  // Ensure the Next Lesson button is part of the scene/UI group so it can be shown when requested
  scene.add(nextLessonButton);
  codeEditorGroup.add(nextLessonButton);
  // Expose next lesson controls globally so other modules can trigger them
  window.showNextLessonButton = showNextLessonButton;
  window.hideNextLessonButton = hideNextLessonButton;
  // const { emptyPanel, rgbPinContainer, buttons, buttonGroup, handleButtonClick, continueButton } = createCodeEditorPanel(scene, gui, camera);
  // Add raycast handler for Run Code button to animate camera and trigger blink effect
  if (!window._runCodeRaycastHandler) {
    window._runCodeRaycastHandler = (event) => {
      if (!runCodeButton || !runCodeButton.visible) return;
      if (!camera) return;
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([runCodeButton], true);
      if (intersects.length > 0) {
        // Show code editor only when Start Coding is clicked
        try {
          if (typeof window.showCodeEditorPanels === 'function') window.showCodeEditorPanels();
          else {
            if (emptyPanel) emptyPanel.visible = true;
            if (rgbPinContainer) rgbPinContainer.visible = true;
            
          }
        } catch (e) {}
        // Handle lesson3 Start Coding button click
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson1') {
          console.log('[Lesson1] Start Coding button clicked!');
          
          // Hide the Start Coding button after click
          try {
            runCodeButton.userData.clickable = false;
            runCodeButton.visible = false;
            if (runCodeButton.parent) {
              runCodeButton.parent.remove(runCodeButton);
            }
            console.log('[Lesson1] Start Coding button hidden');
          } catch (e) {
            console.warn('[Lesson1] Error hiding Start Coding button:', e);
          }
          
          createLearningPanel(scene);
          showLearningPanel();
          // Ensure we set the correct lesson after transition
          setTimeout(() => {
            try { setLearningLesson(typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson1'); } catch (e) {}
          }, 100);
          // Hide instruction panel when learning panel opens
          try {
            if (window.codePlane) window.codePlane.visible = false;
            if (typeof hideInstructionsLabel === 'function') hideInstructionsLabel();
          } catch (e) {}
          try {
            if (typeof setForwardArrowEnabled === 'function') setForwardArrowEnabled(true);
            if (typeof forwardArrow !== 'undefined' && forwardArrow) forwardArrow.visible = false;
          } catch (e) {}
          
          // Desired camera move and look target for lesson1
          const targetPos  = new THREE.Vector3(
            window.lesson1CameraGUI?.targetPos?.x ?? 6,
            window.lesson1CameraGUI?.targetPos?.y ?? 2.0,
            window.lesson1CameraGUI?.targetPos?.z ?? 4
          );
          const targetLook = new THREE.Vector3(
            window.lesson1CameraGUI?.targetLook?.x ?? 6,
            window.lesson1CameraGUI?.targetLook?.y ?? 2.25,
            window.lesson1CameraGUI?.targetLook?.z ?? 4
          );

          // Animate camera position while looking at targetLook
          // gsap.to(camera.position, {
          //   x: targetPos.x,
          //   y: targetPos.y,
          //   z: targetPos.z,
          //   duration: window.lesson1CameraGUI?.duration ?? 2,
          //   ease: "power2.inOut",
          //   onUpdate: () => {
          //     camera.lookAt(targetLook);
          //   },
          //   onComplete: () => {
          //     camera.lookAt(targetLook);

          //     // Hide the Start Coding button after click
          //     try {
          //       runCodeButton.userData.clickable = false;
          //       runCodeButton.visible = false;
          //       if (runCodeButton.parent) {
          //         runCodeButton.parent.remove(runCodeButton);
          //       }
          //     } catch (e) {}

          //     // Show the Next button to proceed to the final step
          //     if (window.setForwardArrowEnabled) { 
          //       window.setForwardArrowEnabled(true);
          //     }
          //     if (window.forwardArrow) {
          //       window.forwardArrow.visible = true;
          //     }

          //     console.log('[Lesson1] Camera move complete');
          //   }
          // });

          return; // Exit early for lesson1
        }
        
        // Handle lesson3 Start Coding button click WITHOUT camera animation
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3') {
          console.log('[Lesson3] Start Coding button clicked! (no camera animation)');

          // Show learning panel for lesson3
          try {
            createLearningPanel(scene);
            showLearningPanel();
            try { setLearningLesson(typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson3'); } catch (e) {}
            // Hide instruction panel when learning panel opens
            try {
              if (window.codePlane) window.codePlane.visible = false;
              if (typeof hideInstructionsLabel === 'function') hideInstructionsLabel();
            } catch (e) {}
          } catch (e) { console.warn('[Lesson3] Error preparing learning panel:', e); }

          // Hide the Start Coding button after click
          try {
            runCodeButton.userData.clickable = false;
            runCodeButton.visible = false;
            if (runCodeButton.parent) {
              runCodeButton.parent.remove(runCodeButton);
            }
          } catch (e) {}

          // Hide the instruction steps panel (code editor group and forward arrow)
          try { if (window.codeEditorGroup) window.codeEditorGroup.visible = false; } catch (e) {}
          if (window.setForwardArrowEnabled) {
            window.setForwardArrowEnabled(false);
          }
          if (window.forwardArrow) {
            window.forwardArrow.visible = false;
          }

          return; // Exit early for lesson3 (skip camera animation)
        }
        
        // Handle lesson2 Start Coding button click WITHOUT camera animation
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson2') {
          console.log('[Lesson2] Start Coding button clicked! (no camera animation)');

          // Show learning panel for lesson2
          try {
            createLearningPanel(scene);
            showLearningPanel();
            try { setLearningLesson(typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson2'); } catch (e) {}
            // Hide instruction panel when learning panel opens
            try {
              if (window.codePlane) window.codePlane.visible = false;
              if (typeof hideInstructionsLabel === 'function') hideInstructionsLabel();
            } catch (e) {}
          } catch (e) { console.warn('[Lesson2] Error preparing learning panel:', e); }

          // Hide the Start Coding button after click
          try {
            runCodeButton.userData.clickable = false;
            runCodeButton.visible = false;
            if (runCodeButton.parent) {
              runCodeButton.parent.remove(runCodeButton);
            }
          } catch (e) {}

          // Hide the instruction steps panel (code editor group and forward arrow)
          try { if (window.codeEditorGroup) window.codeEditorGroup.visible = false; } catch (e) {}
          if (window.setForwardArrowEnabled) {
            window.setForwardArrowEnabled(false);
          }
          if (window.forwardArrow) {
            window.forwardArrow.visible = false;
          }

          return; // Exit early for lesson2 (skip camera animation)
        }
        
        // Handle lesson4 Start Coding button click WITHOUT camera animation
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson4') {
          console.log('[Lesson4] Start Coding button clicked! (no camera animation)');
          
          // Set flag to track that lesson4 run code button was clicked
          lesson4RunCodeClicked = true;
          // Also set the global flag for learning system
          if (typeof window !== 'undefined') {
            window.lesson4RunCodeClicked = true;
            console.log('[Lesson4] Run code button clicked, lesson4RunCodeClicked set to:', window.lesson4RunCodeClicked);
          }

          // Show learning panel for lesson4
          try {
            createLearningPanel(scene);
            showLearningPanel();
            const lessonToSet = typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson4';
            console.log('[Lesson4] Setting learning lesson to:', lessonToSet);
            try { setLearningLesson(lessonToSet); } catch (e) { console.error('[Lesson4] Error setting learning lesson:', e); }
            // Hide instruction panel when learning panel opens
            try {
              if (window.codePlane) window.codePlane.visible = false;
              if (typeof hideInstructionsLabel === 'function') hideInstructionsLabel();
            } catch (e) {}
          } catch (e) { console.warn('[Lesson4] Error preparing learning panel:', e); }

          // Hide the Start Coding button after click
          try {
            runCodeButton.userData.clickable = false;
            runCodeButton.visible = false;
            if (runCodeButton.parent) {
              runCodeButton.parent.remove(runCodeButton);
            }
          } catch (e) {}

          // Hide the instruction steps panel (code editor group and forward arrow)
          try { if (window.codeEditorGroup) window.codeEditorGroup.visible = false; } catch (e) {}
          if (window.setForwardArrowEnabled) {
            window.setForwardArrowEnabled(false);
          }
          if (window.forwardArrow) {
            window.forwardArrow.visible = false;
          }

          // Ensure OrbitControls are enabled for interaction in lesson4
          try { if (togglePlayerControls) togglePlayerControls(false); } catch (e) {}
          try { if (enableCameraControls) enableCameraControls(); } catch (e) {}
          try { isOrbitMode = true; } catch (e) {}

          return; // Exit early for lesson4 (skip camera animation)
        }
        
        // Handle lesson5 Start Coding button click WITHOUT camera animation (like lessons 2/3)
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson5') {
          console.log('[Lesson5] Start Coding button clicked! (no camera animation)');

          // Show learning panel for lesson5
          try {
            createLearningPanel(scene);
            showLearningPanel();
            try { setLearningLesson(typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson5'); } catch (e) {}
            // Hide instruction panel when learning panel opens
            try {
              if (window.codePlane) window.codePlane.visible = false;
              if (typeof hideInstructionsLabel === 'function') hideInstructionsLabel();
            } catch (e) {}
          } catch (e) { console.warn('[Lesson5] Error preparing learning panel:', e); }

          // Hide the Start Coding button after click
          try {
            runCodeButton.userData.clickable = false;
            runCodeButton.visible = false;
            if (runCodeButton.parent) {
              runCodeButton.parent.remove(runCodeButton);
            }
          } catch (e) {}

          // Hide the instruction steps panel (code editor group and forward arrow)
          try { if (window.codeEditorGroup) window.codeEditorGroup.visible = false; } catch (e) {}
          if (window.setForwardArrowEnabled) {
            window.setForwardArrowEnabled(false);
          }
          if (window.forwardArrow) {
            window.forwardArrow.visible = false;
          }

          return; // Exit early for lesson5 (skip camera animation)
        }
        
        // Original logic for other lessons - also disable controls and animate camera position + look
        if (controls) {
          controls.enabled = false;
          // Remove all OrbitControls limits for post-animation use
          controls.minDistance = 0;
          controls.maxDistance = Infinity;
          controls.minAzimuthAngle = -Infinity;
          controls.maxAzimuthAngle = Infinity;
          controls.minPolarAngle = 0;
          controls.maxPolarAngle = Math.PI;
          controls.enablePan = true;
          controls.enableZoom = true;
          console.log('[StartCoding] Orbit controls disabled and limits cleared');
        }

        (function(){
          const targetLook = new THREE.Vector3(-2.5, 2.25, -2.3);
          const targetPos = new THREE.Vector3(-1.2, 2.0, -1.0);
          gsap.to(camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
              // Camera lookAt removed - all lessons now have consistent camera behavior
            },
            onComplete: () => {
              // Camera lookAt removed - all lessons now have consistent camera behavior
            }
          });
        })();
        
        // Remove/hide the Start Coding button after click
        try {
          runCodeButton.userData.clickable = false;
          runCodeButton.visible = false;
          if (runCodeButton.parent) {
            runCodeButton.parent.remove(runCodeButton);
          }
        } catch (e) {}
        
        // Note: Shader effects are now handled by the shader manager
        // The shader manager will automatically handle any special effects needed
      }
    };
    window.addEventListener("pointerdown", window._runCodeRaycastHandler);
  }
  // Expose forwardArrow globally for snap logic
  window.forwardArrow = forwardArrow;
  window.setForwardArrowEnabled = setForwardArrowEnabled;
  window.getCurrentStep = getCurrentStep;
  //window.continueButton = continueButton;
  // Update Next button state based on current step (instead of always enabling)
  updateNextButtonState();

  // Position the MeshUI Next/Prev buttons below the instruction MeshUI
  const buttonY = 2.1;
  const buttonZ = -4.01;
  const buttonOffsetX = 0.7;
  forwardArrow.position.set(0.2 + buttonOffsetX, buttonY, buttonZ); // Right side below
  // backwardArrow.position.set(0.2 - buttonOffsetX, buttonY, buttonZ); // Removed backwardArrow

  // Add click handlers for codePlane (Begin the Blink button)
  if (!window._codeEditorRaycastHandler) {
    let blinkStarted = false;
    window._codeEditorRaycastHandler = (event) => {
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Get all objects in the codeEditorGroup
      const codeEditorObjects = [];
      codeEditorGroup.traverse((child) => {
        // Accept MeshUI blocks and meshes for raycasting
        if (child.isMesh || child.isUI) {
          codeEditorObjects.push(child);
        }
      });
      // Add codePlane itself if not already in the group
      if (!codeEditorObjects.includes(codePlane)) {
        codeEditorObjects.push(codePlane);
      }
      // Add arrows if not already in the group
      if (!codeEditorObjects.includes(forwardArrow)) {
        codeEditorObjects.push(forwardArrow);
      }
      // Add instructions label if not already in the group
      if (!codeEditorObjects.includes(instructionsLabel)) {
        codeEditorObjects.push(instructionsLabel);
      }

      const intersects = raycaster.intersectObjects(codeEditorObjects, true);
      if (intersects.length > 0) {
        let clicked = null;
        for (const intersect of intersects) {
          // Always resolve to the parentButton for MeshUI blocks
          const button =
            intersect.object.userData && intersect.object.userData.parentButton
              ? intersect.object.userData.parentButton
              : intersect.object;
          if (button === forwardArrow) {
            clicked = forwardArrow;
            break;
          }

          if (button === codePlane) {
            clicked = codePlane;
            // Don't break; keep looking for arrows first!
          }
        }
        if (clicked === forwardArrow && event.type === "pointerdown") {
          // Prevent Next button click if not enabled
          if (!forwardArrow.userData.clickable) return;
          // Prevent camera animation if code editor is open
          if (window.cameraAnimationDisabled) return;

          // Advance learning panel content if visible and consume the click
          try {
            if (learningPanel && learningPanel.visible && typeof nextLearningItem === 'function') {
              nextLearningItem();
              return;
            }
          } catch (e) {}

          // Handle forward arrow click specifically
          if (
            typeof setForwardArrowEnabled === "function" &&
            getCurrentStep() < getTotalSteps() - 1
          ) {
            setForwardArrowEnabled(false);
          }

          // Handle first click (initial setup)
          if (getCurrentStep() === 0 && !blinkStarted) {
            blinkStarted = true;
            if (togglePlayerControls) {
              togglePlayerControls(false);
            }
            if (enableCameraControls) {
              enableCameraControls();
            }
            isOrbitMode = true;
            
            // DON'T enable orbit controls yet - wait for text reveal to complete
            // if (window.orbitControls) {
            //   window.orbitControls.enabled = true;
            // }

            // Skip camera positioning/aiming – OrbitControls will manage view

            // 4. Typewriter effect for first step text
            const fullText = getCurrentStepText();
            const words = fullText.split(" ");
            let currentWord = 0;
            const revealSpeed = 450; // ms per word
            // Play lesson1 step 1 narration when reveal starts
            try {
              const isLesson1 = typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson1';
              if (isLesson1 && getCurrentStep() === 0) {
                playScene6Audio("lesson1_s1");
              }
            } catch (e) {
              console.warn("Failed to play lesson1 step 1 audio:", e);
            }
            // Clear the codePlane text before starting the typewriter effect
            updateCodePlaneWithInstruction("");
            // Disable Next button during typewriter effect for first step
            if (
              typeof setForwardArrowEnabled === "function" &&
              getCurrentStep() === 0
            ) {
              setForwardArrowEnabled(false);
            }
            function revealText() {
              currentWord++;
              const partial = words.slice(0, currentWord).join(" ");
              updateCodePlaneWithInstruction(partial);
              if (currentWord < words.length) {
                setTimeout(revealText, revealSpeed);
              } else {
                // DON'T enable orbit controls after step 0 text reveal - wait until step 1
                // if (window.orbitControls) {
                //   window.orbitControls.enabled = true;
                //   console.log('OrbitControls enabled after text reveal completes');
                // }
                
                // Show the Begin the Blink button below the instruction
                codeEditorGroup.add(beginBlinkButton);
                beginBlinkButton.visible = true;
                // Animate the button to blink (pulse opacity)
                if (beginBlinkButton.material) {
                  // For MeshUI, the material is on the children
                  beginBlinkButton.traverse((child) => {
                    if (child.material) {
                      gsap.to(child.material, {
                        opacity: 0.4,
                        duration: 0.6,
                        yoyo: true,
                        repeat: -1,
                        ease: "power1.inOut",
                        repeatRefresh: true,
                        onRepeat: function () {
                          // Optionally, you can randomize or alternate color here
                        },
                      });
                    }
                  });
                }
                // Set up a handler for clicking the button
                window._beginBlinkRaycastHandler = (event) => {
                  const mouse = new THREE.Vector2(
                    (event.clientX / window.innerWidth) * 2 - 1,
                    -(event.clientY / window.innerHeight) * 2 + 1
                  );
                  const raycaster = new THREE.Raycaster();
                  raycaster.setFromCamera(mouse, camera);
                  const intersects = raycaster.intersectObjects(
                    [beginBlinkButton],
                    true
                  );
                  if (intersects.length > 0) {
                    console.log('Begin Blink button clicked! Applying shader...');
                    
                    // Apply shader to JST pin using the new shader manager
                    const currentLesson = typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "lesson1";
                    const currentStep = typeof getCurrentStep === "function" ? getCurrentStep() : 0;
                    console.log('Applying shader for lesson:', currentLesson, 'step:', currentStep);
                    applyStepShader(currentLesson, currentStep);
                    
                    // Skip camera animation – OrbitControls will manage view
                    // Hide the button and remove the handler
                    beginBlinkButton.visible = false;
                    codeEditorGroup.remove(beginBlinkButton);
                    window.removeEventListener(
                      "pointerdown",
                      window._beginBlinkRaycastHandler
                    );
                    window._beginBlinkRaycastHandler = null;
                    // When the button is clicked and hidden, stop the animation and restore opacity
                    beginBlinkButton.traverse((child) => {
                      if (child.material) {
                        gsap.killTweensOf(child.material);
                        child.material.opacity = 0.85; // Restore default opacity
                      }
                    });
                  }
                };
                window.addEventListener(
                  "pointerdown",
                  window._beginBlinkRaycastHandler
                );
              }
            }
            revealText();
            return; // Exit early for first click
          }

          // If on last step, show Next Lesson button instead of opening code editor
          if (
            getCurrentStep() === getTotalSteps() - 1 &&
            getCurrentStepText &&
            getCurrentStepText().length > 0
          ) {
            if (typeof showNextLessonButton === "function") {
              showNextLessonButton();
            }
            // Optionally hide forward arrow when Next Lesson is visible
            if (forwardArrow) {
              forwardArrow.visible = false;
            }
            return;
          }
          // In lesson4, ensure lesson3 JST pin stays hidden when advancing steps
          try {
            if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson4') {
              if (window.jstPin3 && window.jstPin3.group) window.jstPin3.group.visible = false;
            }
          } catch (e) {}
          // Remove manual visibility setting - updateCodePlaneWithInstruction handles this now
          nextStep();
          // Prepare button visibility will be handled after reveal completes
          
          // Ensure Make Some Noise stays hidden at the start of lesson2 step 1 reveal
          try {
            const isLesson2 = typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson2';
            const stepNow = typeof getCurrentStep === 'function' ? getCurrentStep() : -1;
            if (isLesson2 && stepNow === 1) {
              if (scene && !scene.children.includes(makeSomeNoiseButton)) {
                scene.add(makeSomeNoiseButton);
              }
              makeSomeNoiseButton.visible = false;
            }
          } catch (e) {}
          
          // Start typewriter effect for the new step immediately
          const fullText = getCurrentStepText();
          const words = fullText.split(" ");
          let currentWord = 0;
          const revealSpeed = 250;
          // Play lesson1 step narration when reveal starts (steps 2-4)
          try {
            const isLesson1 = typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson1';
            if (isLesson1 && getCurrentStep() === 1) {
              playScene6Audio("lesson1_s2");
            } else if (isLesson1 && getCurrentStep() === 2) {
              playScene6Audio("lesson1_s3");
            } else if (isLesson1 && getCurrentStep() === 3) {
              playScene6Audio("lesson1_s4");
            }
          } catch (e) {
            console.warn("Failed to play lesson1 step 2 audio:", e);
          }
          function revealTextStep() {
            currentWord++;
            const partial = words.slice(0, currentWord).join(" ");
            updateCodePlaneWithInstruction(partial);
            if (currentWord < words.length) {
              setTimeout(revealTextStep, revealSpeed);
            } else {
              // Handle lesson4 specially - allow camera animation but skip shader application
              try {
                const currentLessonName = typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'lesson1';
                if (currentLessonName === 'lesson4') {
                  // For lesson4, allow camera animation but skip shader application
                  // Camera animation removed - all lessons now have consistent camera behavior
                  const stepIndex = getCurrentStep();
                  // Show content immediately without camera animation
                  setTimeout(() => {
                    showContentAfterCameraAnimation(currentLessonName, stepIndex);
                  }, 1000);
                  return; // Skip the rest of the camera animation logic for lesson4
                }
              } catch (e) {}
              // Animate camera for this step, except for lesson2, step 1 and last step
              const stepIndex = getCurrentStep();
              const isLesson2Step1 =
                typeof window.getCurrentLesson === "function" &&
                window.getCurrentLesson() === "lesson2" &&
                stepIndex === 1;
              const isLastStepOfLesson = isLastStep();
              
              // After the reveal completes, show the Make Some Noise button only for lesson2 step 1
              if (isLesson2Step1) {
                if (!scene.children.includes(makeSomeNoiseButton)) {
                  scene.add(makeSomeNoiseButton);
                }
                makeSomeNoiseButton.visible = false;
              }

              const currentLesson = typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "lesson1";
              // If not step 0, apply shader after reveal (no camera animation)
              const shouldApplyShader = stepIndex !== 0;

              // Apply shader immediately without camera animation
              if (shouldApplyShader) {
                applyStepShader(currentLesson, stepIndex);
              }
              
              // Skip camera lookAt for steps – OrbitControls will manage view
              
              // Enable orbit controls after step reveal (only for step 1 and onwards)
              if (window.orbitControls && stepIndex >= 1) {
                window.orbitControls.enabled = true;
                console.log('OrbitControls enabled after step', stepIndex, 'reveal');
              }
              
              // Show content after a delay to ensure typewriter effect completes
              setTimeout(() => {
                showContentAfterCameraAnimation(currentLesson, stepIndex);
              }, 1000);
            }
          }
          revealTextStep();
        }
        // REMOVED: No more codePlane click handler
        // All interactions now go through the forward arrow button
      }
    };
    window.addEventListener("pointerdown", window._codeEditorRaycastHandler);
  }

  // Instantiate RaycasterSetup1 for lesson1, lesson2, lesson3, and lesson4
  if (
    typeof window.getCurrentLesson === "function" &&
    (window.getCurrentLesson() === "lesson1" ||
      window.getCurrentLesson() === "lesson2" ||
      window.getCurrentLesson() === "lesson3" ||
      window.getCurrentLesson() === "lesson4")
  ) {
    // Replace RaycasterSetup instantiation with callback for snap events
    const raycasterSetup = new RaycasterSetup1(
      scene,
      camera,
      controls,
      (snapType) => {
        if (snapType === "secondPin4Female") {
          // Enable orbit controls and Next button immediately
          if (window.orbitControls && getCurrentStep() >= 1) {
            window.orbitControls.enabled = false;
            setTimeout(() => {
              window.orbitControls.enabled = true;
              console.log('OrbitControls enabled after 1s delay for secondPin4Female snap');
            }, 1000);
          }
          if (window.setForwardArrowEnabled) {
            window.setForwardArrowEnabled(true);
          }
          
          // Handle RGB LED rotation after JST pin snap
          if (window.rgbLEDModel) {
            console.log("RGB LED rotation triggered by JST pin snap");
          }
        }
        
        if (snapType === "jstPinBattery") {
          // Enable orbit controls immediately
          if (window.orbitControls && getCurrentStep() >= 1) {
            window.orbitControls.enabled = false;
            setTimeout(() => {
              window.orbitControls.enabled = true;
              console.log('OrbitControls enabled after 1s delay for jstPinBattery snap');
            }, 1000);
          }
          
          // Handle lesson-specific logic without camera animation
          if (window.getCurrentLesson && window.getCurrentLesson() === 'lesson2') {
            if (window.setForwardArrowEnabled) window.setForwardArrowEnabled(false);
            if (window.forwardArrow) window.forwardArrow.visible = false;
            
            // Show Start Coding button
            if (runCodeButton) {
              if (scene && !scene.children.includes(runCodeButton)) scene.add(runCodeButton);
              runCodeButton.userData.clickable = true;
              runCodeButton.traverse((child) => { if (child.isMesh) child.userData.clickable = true; });
              runCodeButton.visible = true;
              if (typeof runCodeButton.update === 'function') runCodeButton.update();
            }
          } else if (window.getCurrentLesson && window.getCurrentLesson() === 'lesson3') {
            // Similar logic for lesson3 without camera animation
            if (runCodeButton) {
              if (scene && !scene.children.includes(runCodeButton)) scene.add(runCodeButton);
              runCodeButton.userData.clickable = true;
              runCodeButton.traverse((child) => { if (child.isMesh) child.userData.clickable = true; });
              runCodeButton.visible = true;
              if (typeof runCodeButton.update === 'function') runCodeButton.update();
            }
            if (window.setForwardArrowEnabled) window.setForwardArrowEnabled(false);
            if (window.forwardArrow) window.forwardArrow.visible = false;
          } else {
            if (window.setForwardArrowEnabled) window.setForwardArrowEnabled(true);
          }
        }
        if (snapType === "nanoModelStep2") {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          const isLesson1 = typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson1';
          if (isLesson1) {
            setTimeout(runAnim, 2000);
          } else {
            runAnim();
          }
        }
        // Camera animation removed - all lessons now have consistent camera behavior
        // Camera animation removed - all lessons now have consistent camera behavior
        // Camera animation removed - all lessons now have consistent camera behavior
        // Camera animation removed - all lessons now have consistent camera behavior
        // Camera animation removed - all lessons now have consistent camera behavior
        if (snapType === "jstPin3Side1" && !window.cameraAnimationDisabled) {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          setTimeout(() => {
            // Enable Next button after jstPin3Side1 connection (step 2)
            if (window.setForwardArrowEnabled && typeof getCurrentStep === 'function' && getCurrentStep() === 2) {
              window.setForwardArrowEnabled(true);
              console.log("[Lesson3] Enabled Next button after jstPin3Side1 connection");
            }
          });
        }
        if (snapType === "jstPin3Side2" && !window.cameraAnimationDisabled) {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          setTimeout(() => {
            // Enable Next button after jstPin3Side2 connection (step 3)
            if (window.setForwardArrowEnabled && typeof getCurrentStep === 'function' && getCurrentStep() === 3) {
              window.setForwardArrowEnabled(true);
              console.log("[Lesson3] Enabled Next button after jstPin3Side2 connection");
            }
          });
        }
        
        // Add handlers for LED module connections in lesson3
        if (snapType === "ledExpansionBoard" && !window.cameraAnimationDisabled) {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          setTimeout(() => {
            // Enable Next button after LED expansion board connection (step 4)
            if (window.setForwardArrowEnabled && typeof getCurrentStep === 'function' && getCurrentStep() === 4) {
              window.setForwardArrowEnabled(true);
              console.log("[Lesson3] Enabled Next button after LED expansion board connection");
            }
          });
        }
        
        if (snapType === "ledModule" && !window.cameraAnimationDisabled) {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          setTimeout(() => {
            // Enable Next button after LED module connection (step 5)
            if (window.setForwardArrowEnabled && typeof getCurrentStep === 'function' && getCurrentStep() === 5) {
              window.setForwardArrowEnabled(true);
              console.log("[Lesson3] Enabled Next button after LED module connection");
            }
          });
        }
        
        // Add handler for battery connection in lesson3 (step 6)
        if (snapType === "jstPinBattery" && !window.cameraAnimationDisabled) {
          const straightAhead = new THREE.Vector3(
            camera.position.x,
            camera.position.y,
            camera.position.z - 2
          );
          // Camera animation removed - all lessons now have consistent camera behavior
          setTimeout(() => {
            // Enable Next button after battery connection in lesson3 (step 6)
            if (window.setForwardArrowEnabled && typeof getCurrentStep === 'function' && getCurrentStep() === 6 && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3') {
              window.setForwardArrowEnabled(true);
              console.log("[Lesson3] Enabled Next button after battery connection");
            }
            
            // Show Start Coding button for lesson3 after battery connection
            if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && typeof getCurrentStep === 'function' && getCurrentStep() === 6) {
              try {
                if (runCodeButton) {
                  if (scene && !scene.children.includes(runCodeButton)) scene.add(runCodeButton);
                  runCodeButton.userData.clickable = true;
                  runCodeButton.traverse((child) => { if (child.isMesh) child.userData.clickable = true; });
                  runCodeButton.visible = true;
                  if (typeof runCodeButton.update === 'function') runCodeButton.update();
                  console.log("[Lesson3] Showed Start Coding button after battery connection");
                }
                // Hide Next button when Start Coding is shown in lesson3
                if (window.setForwardArrowEnabled) window.setForwardArrowEnabled(false);
                if (window.forwardArrow) window.forwardArrow.visible = false;
              } catch (e) {
                console.warn("[Lesson3] Error showing Start Coding button:", e);
              }
            }
          });
        }
      }
    );
    
    // Expose raycasterSetup globally for animation updates
    window.raycasterSetup = raycasterSetup;
  }
  renderer.render(scene, camera);
  const clock = new THREE.Clock();
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
    if (!camera) return;
    stats.begin();
    const delta = clock.getDelta();
    
    // Update OrbitControls unless a camera lock is active
    if (controls && window.orbitControls) {
      window.orbitControls.update();
    }
    
    if (userInfo.modeSelected === "vr") {
      updateVR();
    }
         // Camera auto-follow and lookAt — follow player when not in orbit mode and no camera lock is active
     if (!isOrbitMode && sceneInitialization?.playerFunction?.player) {
       const player = sceneInitialization.playerFunction.player;
       player.updateMatrixWorld();
       if (mainModel.collisionMesh) {
         handleCollisions(
           player,
           mainModel.collisionMesh,
           playerState.velocity,
           delta
         );
       }
       if (playerState.velocity.length() > 0) {
         player.position.x += playerState.velocity.x * delta;
         player.position.z += playerState.velocity.z * delta;
         if (!playerState.onGround) {
           player.position.y += playerState.velocity.y * delta;
         }
       }
       const headHeight = 0.05;
       camera.position.set(
         player.position.x,
         player.position.y + headHeight,
         player.position.z
       );
       const lookDistance = 10;
       const lookDirection = new THREE.Vector3(0, 0, -1);
       lookDirection.applyAxisAngle(
         new THREE.Vector3(0, 1, 0),
         player.rotation.y
       );
       const lookTarget = new THREE.Vector3()
         .copy(camera.position)
         .add(lookDirection.multiplyScalar(lookDistance));
       // Camera lookAt removed - all lessons now have consistent camera behavior
     }
    // Camera look lock logic removed - all lessons now have consistent camera behavior
    // --- SNAP CAMERA POLLING FIX ---
    if (
      getCurrentStep &&
      getCurrentStep() === 0 &&
      typeof jstPin !== "undefined" &&
      jstPin &&
      jstPin.pinGLTF1
    ) {
      const EXPANSION_BOARD_SNAP_POINT = new THREE.Vector3(-0.03, 1.77, -3.26);
      const SNAP_THRESHOLD = 0.01;
      const pinPos = jstPin.pinGLTF1.position;
      const distance = pinPos.distanceTo(EXPANSION_BOARD_SNAP_POINT);
      if (distance < SNAP_THRESHOLD && !snapCameraAdjusted) {
        isOrbitMode = true;
        snapCameraAdjusted = true;
        // Skip camera orientation animation – OrbitControls will manage view
      }
      if (distance >= SNAP_THRESHOLD) {
        snapCameraAdjusted = false;
      }
    }
    //For Kp lessons - only run updateFunction for lesson4 when run code button clicked and animation completed
    const currentLesson = typeof window.getCurrentLesson === 'function' ? window.getCurrentLesson() : 'unknown';
    if (currentLesson === "lesson4") {
      // Check if both conditions are met: run code button clicked AND code animation completed
      const runCodeClicked = lesson4RunCodeClicked || (typeof window !== 'undefined' && window.lesson4RunCodeClicked);
      const animationCompleted = lesson4CodeAnimationCompleted || (typeof window !== 'undefined' && window.lesson4CodeAnimationCompleted);
      
      // Debug logging
      if (runCodeClicked || animationCompleted) {
        console.log('[Lesson4] Debug - currentLesson:', currentLesson, 'runCodeClicked:', runCodeClicked, 'animationCompleted:', animationCompleted);
      }
      
      if (runCodeClicked && animationCompleted) {
        // Note: audio for lesson4 should play as s8 after code animation; handled in learning.js
        console.log('[Lesson4] Both conditions met, running updateFunction');
        updateFunction(delta);
      }
    }
    if (window.getCurrentLesson() === "lesson5") {
      irUpdate(delta)
    }
    // --- END SNAP CAMERA POLLING FIX ---
    
    // Update shader manager
    updateShader(delta);
    
    // Update RGB LED blink animation
    if (window.rgbLEDBlinkMesh && window.rgbLEDBlinkMesh.userData.blinkUpdate) {
      try {
        window.rgbLEDBlinkMesh.userData.blinkUpdate(delta);
      } catch (e) {
        console.warn('Error updating RGB LED blink animation:', e);
      }
    }
    
    // Update raycaster setup (for drag indicator shader)
    if (window.raycasterSetup && typeof window.raycasterSetup.update === 'function') {
      window.raycasterSetup.update(delta);
    }
    
    // Safety check: ensure ThreeMeshUI is available before calling update
    try {
      if (typeof ThreeMeshUI !== 'undefined' && typeof ThreeMeshUI.update === 'function') {
        ThreeMeshUI.update();
      } else {
        console.warn('ThreeMeshUI.update is not available');
      }
    } catch (error) {
      console.warn('Error during ThreeMeshUI.update:', error);
    }
    
    renderer.render(scene, camera);
    stats.end();
  }
  animate();
  const resizeHandler = () => {
    const aspect = window.innerWidth / window.innerHeight;
    if (camera && renderer) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };
  window.addEventListener("resize", resizeHandler);
  if (isVRMode) {
    initializeVR(renderer, scene, camera, null, null, [], () => {});
  }
  // After initializing the scene, set the lesson for the UI
  setLesson("lesson1"); // Always start with lesson1

  // Global function to log all lesson3 models (can be called from console)
  window.logLesson3Models = function() {
    console.log("=== LESSON3 MODELS OVERVIEW (Called from console) ===");
    console.log("Current lesson:", typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "unknown");
    console.log("All available GLTF models:", Object.keys(allAssets.models.gltf));
    
    // Log lesson3 specific models
    console.log("--- LESSON3 SPECIFIC MODELS ---");
    console.log("tempSensorModel:", {
      exists: !!window.tempSensorModel,
      name: window.tempSensorModel ? window.tempSensorModel.name : "N/A",
      inScene: window.tempSensorModel && scene ? scene.children.includes(window.tempSensorModel) : false,
      visible: window.tempSensorModel ? window.tempSensorModel.visible : false,
      position: window.tempSensorModel ? window.tempSensorModel.position : "N/A",
      scale: window.tempSensorModel ? window.tempSensorModel.scale : "N/A"
    });
    
    console.log("jstPin3 (lesson3 JST pin):", {
      exists: !!window.jstPin3,
      inScene: window.jstPin3 && window.jstPin3.group && scene ? scene.children.includes(window.jstPin3.group) : false,
      visible: window.jstPin3 && window.jstPin3.group ? window.jstPin3.group.visible : false,
      pin1Exists: !!window.jstPin3Side1,
      pin2Exists: !!window.jstPin3Side2
    });
    
    // Log common models that are also used in lesson3
    console.log("--- COMMON MODELS USED IN LESSON3 ---");
    console.log("nanoModel (Arduino):", {
      exists: !!window.nanoModel,
      name: window.nanoModel ? window.nanoModel.name : "N/A",
      inScene: window.nanoModel && scene ? scene.children.includes(window.nanoModel) : false,
      visible: window.nanoModel ? window.nanoModel.visible : false,
      position: window.nanoModel ? window.nanoModel.position : "N/A"
    });
    
    console.log("expansionBoardModel:", {
      exists: !!window.expansionBoardModel,
      name: window.expansionBoardModel ? window.expansionBoardModel.name : "N/A",
      inScene: window.expansionBoardModel && scene ? scene.children.includes(window.expansionBoardModel) : false,
      visible: window.expansionBoardModel ? window.expansionBoardModel.visible : false,
      position: window.expansionBoardModel ? window.expansionBoardModel.position : "N/A"
    });
    
    console.log("batteryModel:", {
      exists: !!window.batteryModel,
      name: window.batteryModel ? window.batteryModel.name : "N/A",
      inScene: window.batteryModel && scene ? scene.children.includes(window.batteryModel) : false,
      visible: window.batteryModel ? window.batteryModel.visible : false,
      position: window.batteryModel ? window.batteryModel.position : "N/A"
    });
    
    console.log("jstPinBattery:", {
      exists: !!window.jstPinBattery,
      inScene: window.jstPinBattery && window.jstPinBattery.group && scene ? scene.children.includes(window.jstPinBattery.group) : false,
      visible: window.jstPinBattery && window.jstPinBattery.group ? window.jstPinBattery.group.visible : false
    });
    
    // Log lesson2 models that should be hidden in lesson3
    console.log("--- LESSON2 MODELS (SHOULD BE HIDDEN IN LESSON3) ---");
    console.log("buzzerModel:", {
      exists: !!window.buzzerModel,
      name: window.buzzerModel ? window.buzzerModel.name : "N/A",
      inScene: window.buzzerModel && scene ? scene.children.includes(window.buzzerModel) : false,
      visible: window.buzzerModel ? window.buzzerModel.visible : false
    });
    
    console.log("jstPin2 (lesson2 JST pin):", {
      exists: !!window.jstPin2,
      inScene: window.jstPin2 && window.jstPin2.group && scene ? scene.children.includes(window.jstPin2.group) : false,
      visible: window.jstPin2 && window.jstPin2.group ? window.jstPin2.group.visible : false
    });
    
    // Log lesson1 models that should be hidden in lesson3
    console.log("--- LESSON1 MODELS (SHOULD BE HIDDEN IN LESSON3) ---");
    console.log("rgbLEDModel:", {
      exists: !!window.rgbLEDModel,
      name: window.rgbLEDModel ? window.rgbLEDModel.name : "N/A",
      inScene: window.rgbLEDModel && scene ? scene.children.includes(window.rgbLEDModel) : false,
      visible: window.rgbLEDModel ? window.rgbLEDModel.visible : false
    });
    
    console.log("jstPin (lesson1 JST pin):", {
      exists: !!window.jstPin,
      inScene: window.jstPin && window.jstPin.group && scene ? scene.children.includes(window.jstPin.group) : false,
      visible: window.jstPin && window.jstPin.group ? window.jstPin.group.visible : false
    });
    
    // Log all scene children to see what's actually in the scene
    console.log("--- ALL SCENE CHILDREN ---");
    if (scene && scene.children) {
      scene.children.forEach((child, index) => {
        console.log(`Scene child ${index}:`, {
          name: child.name || "unnamed",
          type: child.type,
          visible: child.visible,
          isGroup: child.isGroup,
          childrenCount: child.children ? child.children.length : 0
        });
      });
    }
    
    console.log("=== END LESSON3 MODELS OVERVIEW ===");
  };
  
  console.log("Global function 'logLesson3Models()' is now available. Call it from the console to see all lesson3 models!");
  
  // Add global function to manually fix model visibility
  window.fixModelVisibility = function(lessonName) {
    console.log(`[DEBUG] Manually fixing model visibility for: ${lessonName}`);
    if (lessonName) {
      cleanupLessonModels('unknown', lessonName);
      updateLessonVisibility(lessonName);
    } else {
      const currentLesson = typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "lesson1";
      console.log(`[DEBUG] No lesson specified, using current lesson: ${currentLesson}`);
      cleanupLessonModels('unknown', currentLesson);
      updateLessonVisibility(currentLesson);
    }
    console.log(`[DEBUG] Model visibility fix completed for: ${lessonName || 'current lesson'}`);
  };
  
  console.log("Global function 'fixModelVisibility(lessonName)' is now available. Call it from the console to fix model visibility!");
  
  // Add global function to check current model visibility state
  window.checkModelVisibility = function() {
    console.log("=== CURRENT MODEL VISIBILITY STATE ===");
    console.log("rgbLEDModel (lesson1):", {
      exists: !!window.rgbLEDModel,
      visible: window.rgbLEDModel ? window.rgbLEDModel.visible : 'N/A',
      inScene: window.rgbLEDModel && scene ? scene.children.includes(window.rgbLEDModel) : false
    });
    console.log("jstPin (lesson1):", {
      exists: !!window.jstPin,
      visible: window.jstPin && window.jstPin.group ? window.jstPin.group.visible : 'N/A',
      inScene: window.jstPin && window.jstPin.group && scene ? scene.children.includes(window.jstPin.group) : false
    });
    console.log("buzzerModel (lesson2):", {
      exists: !!window.buzzerModel,
      visible: window.buzzerModel ? window.buzzerModel.visible : 'N/A',
      inScene: window.buzzerModel && scene ? scene.children.includes(window.buzzerModel) : false
    });
    console.log("jstPin2 (lesson2):", {
      exists: !!window.jstPin2,
      visible: window.jstPin2 && window.jstPin2.group ? window.jstPin2.group.visible : 'N/A',
      inScene: window.jstPin2 && window.jstPin2.group && scene ? scene.children.includes(window.jstPin2.group) : false
    });
    console.log("tempSensorModel (lesson3):", {
      exists: !!window.tempSensorModel,
      visible: window.tempSensorModel ? window.tempSensorModel.visible : 'N/A',
      inScene: window.tempSensorModel && scene ? scene.children.includes(window.tempSensorModel) : false
    });
    console.log("jstPin3 (lesson3):", {
      exists: !!window.jstPin3,
      visible: window.jstPin3 && window.jstPin3.group ? window.jstPin3.group.visible : 'N/A',
      inScene: window.jstPin3 && window.jstPin3.group && scene ? scene.children.includes(window.jstPin3.group) : false
    });
    console.log("makeSomeNoiseButton (lesson2):", {
      exists: !!window.makeSomeNoiseButton,
      visible: window.makeSomeNoiseButton ? window.makeSomeNoiseButton.visible : 'N/A',
      inScene: window.makeSomeNoiseButton && scene ? scene.children.includes(window.makeSomeNoiseButton) : false
    });
    console.log("showBlinkingButton (lesson1):", {
      exists: !!window.showBlinkingButton,
      visible: window.showBlinkingButton ? window.showBlinkingButton.visible : 'N/A',
      inScene: window.showBlinkingButton && scene ? scene.children.includes(window.showBlinkingButton) : false
    });
    console.log("Current lesson:", typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "unknown");
    console.log("=====================================");
  };
  
  console.log("Global function 'checkModelVisibility()' is now available. Call it from the console to check current model visibility!");
  
  // Add global function to manually refresh raycaster pin models reference
  window.refreshRaycasterPinModels = function() {
    if (window.raycasterSetup && typeof window.raycasterSetup.refreshPinModelsRef === 'function') {
      window.raycasterSetup.refreshPinModelsRef();
      console.log("[DEBUG] Manually refreshed raycaster pin models reference");
    } else {
      console.warn("[DEBUG] RaycasterSetup not available or refreshPinModelsRef method not found");
    }
  };
  
  console.log("Global function 'refreshRaycasterPinModels()' is now available. Call it from the console to refresh pin models!");
  
  // Add global function to manually enable Next button for debugging
  window.enableNextButton = function() {
    if (window.setForwardArrowEnabled) {
      window.setForwardArrowEnabled(true);
      console.log("[DEBUG] Manually enabled Next button");
    }
    if (window.forwardArrow) {
      window.forwardArrow.visible = true;
      console.log("[DEBUG] Made forward arrow visible");
    }
  };
  
  console.log("Global function 'enableNextButton()' is now available. Call it from the console to enable the Next button!");
  
  // Add global function to manually show Start Coding button for debugging
  window.showStartCodingButton = function() {
    if (window.runCodeButton) {
      if (scene && !scene.children.includes(runCodeButton)) scene.add(runCodeButton);
      runCodeButton.userData.clickable = true;
      runCodeButton.traverse((child) => { if (child.isMesh) child.userData.clickable = true; });
      runCodeButton.visible = true;
      if (typeof runCodeButton.update === 'function') runCodeButton.update();
      console.log("[DEBUG] Manually showed Start Coding button");
    } else {
      console.warn("[DEBUG] Start Coding button not available");
    }
  };
  
  console.log("Global function 'showStartCodingButton()' is now available. Call it from the console to show the Start Coding button!");
  
  // Global function to control RGB LED blink effect
  window.controlRGBLEDBlink = function(action, speed = 2.0) {
    if (window.rgbLEDBlinkMesh && window.rgbLEDBlinkMesh.userData.blinkUpdate) {
      switch (action) {
        case 'start':
          window.rgbLEDBlinkMesh.userData.blinkSpeed = speed;
          window.rgbLEDBlinkMesh.userData.blinkActive = true;
          console.log('RGB LED blink started with speed:', speed);
          break;
        case 'stop':
          window.rgbLEDBlinkMesh.userData.blinkActive = false;
          // Reset to solid red
          if (window.rgbLEDBlinkMaterial) {
            window.rgbLEDBlinkMaterial.emissiveIntensity = 0.5;
            window.rgbLEDBlinkMaterial.opacity = 1.0;
            window.rgbLEDBlinkMaterial.color.setRGB(1, 0, 0);
            window.rgbLEDBlinkMaterial.emissive.setRGB(0.5, 0, 0);
          }
          console.log('RGB LED blink stopped');
          break;
        case 'speed':
          window.rgbLEDBlinkMesh.userData.blinkSpeed = speed;
          console.log('RGB LED blink speed changed to:', speed);
          break;
        default:
          console.log('Available actions: start, stop, speed');
      }
    } else {
      console.warn('RGB LED blink mesh not found');
    }
  };
  
  console.log("Global function 'controlRGBLEDBlink(action, speed)' is now available. Actions: 'start', 'stop', 'speed'");
  
  // Note: Initial shader is now applied only when "Begin the Blink" button is clicked
  // applyStepShader("lesson1", 0); // Removed - shader will be applied on button click
  
  // Test the shader manager to verify it's working (removed to prevent automatic shader application)
  // setTimeout(() => {
  //   console.log('Testing shader manager after scene initialization...');
  //   testShaderManager();
  // }, 2000);



  // --- Reset nano model on Next Lesson ---
  window.setOnNextLesson = setOnNextLesson;
  window.setOnNextLesson(() => {
    // Clean up shader manager when moving to next lesson
    cleanupShader();
    
    window.disableNanoSnap = true;
    if (window.nanoModel) {
      window.nanoModel.position.copy(modelTransforms.nano1.position);
      window.nanoModel.rotation.copy(modelTransforms.nano1.lesson2rotation);
      window.nanoModel.scale.copy(modelTransforms.nano1.scale);
    }
    if (window.expansionBoardModel) {
      window.expansionBoardModel.position.copy(modelTransforms.expansionBoard.position);
      window.expansionBoardModel.rotation.copy(modelTransforms.expansionBoard.lesson2rotation);
      window.expansionBoardModel.scale.copy(modelTransforms.expansionBoard.scale);
    }

    // Switch to next lesson based on current lesson
    const currentLesson = typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "lesson1";
    let nextLesson;
    
    switch (currentLesson) {
      case "lesson1":
        nextLesson = "lesson2";
        break;
      case "lesson2":
        nextLesson = "lesson3";
        break;
      case "lesson3":
        nextLesson = "lesson4";
        break;
      case "lesson4":
        nextLesson = "lesson5";
        break;
      case "lesson5":
        // Transition to scene7 when "Lets Build" button is clicked
        console.log("Lesson5 completed - transitioning to scene7");
        
        // Handle scene7 transition directly
        setTimeout(async () => {
          try {
            console.log("Starting scene7 transition...");
            const scene7Module = await import("../scene7/scene7.js");
            const assetsModule = await import("../scene7/assetsEntry.js");
            console.log("Scene7 modules loaded successfully");
            
            // Clean up current scene
            cleanupScene6();
            console.log("Scene6 cleaned up");
            markSceneCompleted("scene6")
            
            // Load scene7 assets and initialize
            checkExistingAssets(assetsModule.assetsEntry);
            console.log("Scene7 assets loaded");
            
            const userInfo = getUserInfo();
            const isVR = userInfo && userInfo.modeSelected === 'vr';
            console.log("Initializing scene7 with VR mode:", isVR);
            
            await scene7Module.initializeScene7(renderer, isVR);
            console.log("Scene7 initialized successfully");
          } catch (error) {
            console.error("Error transitioning to scene7:", error);
          }
        }, 100);
        
        return; // Exit early to prevent further lesson switching
        break;
      default:
        nextLesson = "lesson2"; // fallback
    }
    
    console.log(`Moving from ${currentLesson} to ${nextLesson}`);
    

    
    // Helper function to log current JST pin states
    const logJstPinStates = () => {
      console.log("=== Current JST Pin States ===");
      console.log("jstPin (lesson1):", {
        exists: !!window.jstPin,
        inScene: window.jstPin && window.currentScene ? window.currentScene.children.includes(window.jstPin.group) : false,
        visible: window.jstPin && window.jstPin.group ? window.jstPin.group.visible : false
      });
      console.log("jstPin2 (lesson2):", {
        exists: !!window.jstPin2,
        inScene: window.jstPin2 && window.currentScene ? window.currentScene.children.includes(window.jstPin2.group) : false,
        visible: window.jstPin2 && window.jstPin2.group ? window.jstPin2.group.visible : false
      });
      console.log("jstPin3 (lesson3):", {
        exists: !!window.jstPin3,
        inScene: window.jstPin3 && window.currentScene ? window.currentScene.children.includes(window.jstPin3.group) : false,
        visible: window.jstPin3 && window.jstPin3.group ? window.jstPin3.group.visible : false
      });
      console.log("jstPinBattery:", {
        exists: !!window.jstPinBattery,
        inScene: window.jstPinBattery && window.currentScene ? window.currentScene.children.includes(window.jstPinBattery.group) : false,
        visible: window.jstPinBattery && window.jstPinBattery.group ? window.jstPinBattery.group.visible : false
      });
      console.log("================================");
    };
    
    // Log current state before cleanup
    logJstPinStates();
    
    // Perform lesson-specific cleanup based on what we're leaving behind
    if (currentLesson === "lesson1" && nextLesson === "lesson2") {
      // Moving from lesson1 to lesson2 - remove lesson1 specific components
      console.log("Cleaning up lesson1 components for lesson2 transition");
      try {
        if (window.currentScene && window.rgbLEDModel) {
          window.currentScene.remove(window.rgbLEDModel);
          console.log("Removed rgbLEDModel from scene");
        }
        // Remove full jstPin group and dispose wires (lesson1 specific)
        if (window.jstPin) {
          if (window.jstPin.group && window.currentScene) {
            window.currentScene.remove(window.jstPin.group);
            console.log("Removed jstPin group from scene");
          }
          if (window.jstPin.wires && Array.isArray(window.jstPin.wires)) {
            window.jstPin.wires.forEach((wireObj) => {
              try { if (typeof wireObj.dispose === 'function') wireObj.dispose(); } catch (e) {}
            });
            console.log("Disposed jstPin wires");
          }
          // Clear references to avoid accidental reuse
          window.jstPin = null;
          window.secondPin4Female = null;
          console.log("Cleared jstPin references");
        }
      } catch (e) {
        console.warn("Error cleaning up lesson1 components:", e);
      }
    } else if (currentLesson === "lesson2" && nextLesson === "lesson3") {
      // Moving from lesson2 to lesson3 - remove lesson2 specific components
      console.log("Cleaning up lesson2 components for lesson3 transition");
      try {
        // Remove buzzer and lesson2 JST pins
        if (window.buzzerModel && window.currentScene) {
          window.currentScene.remove(window.buzzerModel);
          console.log("Removed buzzerModel from scene");
        }
        if (window.jstPin2 && window.jstPin2.group && window.currentScene) {
          window.currentScene.remove(window.jstPin2.group);
          console.log("Removed jstPin2 group from scene");
        }
        
        // Also remove lesson1 JST pin if it's still visible (should have been removed in lesson1->lesson2 transition)
        if (window.jstPin && window.jstPin.group && window.currentScene) {
          window.currentScene.remove(window.jstPin.group);
          console.log("Removed lesson1 jstPin group from scene (cleanup)");
          // Dispose wires if they exist
          if (window.jstPin.wires && Array.isArray(window.jstPin.wires)) {
            window.jstPin.wires.forEach((wireObj) => {
              try { if (typeof wireObj.dispose === 'function') wireObj.dispose(); } catch (e) {}
            });
            console.log("Disposed lesson1 jstPin wires");
          }
          // Clear references
          window.jstPin = null;
          window.secondPin4Female = null;
        }
        
        // Additional cleanup: ensure all lesson1 and lesson2 models are hidden
        if (window.rgbLEDModel) {
          window.rgbLEDModel.visible = false;
          console.log("Hidden rgbLEDModel (lesson1) for lesson3 transition");
        }
        if (window.makeSomeNoiseButton) {
          window.makeSomeNoiseButton.visible = false;
          console.log("Hidden makeSomeNoiseButton (lesson2) for lesson3 transition");
        }
        if (window.showBlinkingButton) {
          window.showBlinkingButton.visible = false;
          console.log("Hidden showBlinkingButton (lesson1) for lesson3 transition");
        }
        
        // Clear references
        window.buzzerModel = null;
        window.jstPin2 = null;
        console.log("Cleared lesson2 component references");
      } catch (e) {
        console.warn("Error cleaning up lesson2 components:", e);
      }
    } else if (currentLesson === "lesson3" && nextLesson === "lesson4") {
      console.log("Transitioning from lesson3 to lesson4, scene state:", !!scene, "scene type:", typeof scene);
      // Ensure RGB/LDR lesson artifacts (like ldrTestingCube) are removed BEFORE changing lesson
      try { 
        console.log("About to call cleanupKpRgbLesson with scene:", !!scene);
        cleanupKpRgbLesson(scene); 
      } catch (e) { 
        console.warn("Error in cleanupKpRgbLesson during lesson3→lesson4:", e);
        console.error("Full error details:", e);
      }
      setLesson("lesson4");
      // Moving from lesson3 to lesson4 - clean via LessonCleaner
      console.log("Cleaning up lesson3 components for lesson4 transition (via LessonCleaner)");
      try {
        const cleaner = new LessonCleaner(scene);
        // Keep only core base models before motor lesson sets up
        cleaner.nonRemovableObjects = [
          "nano",
          "expansionBoard",
          "battery"
        ];
        cleaner.removeObjects();

        // Clear any stale globals that LessonCleaner won't nullify
        window.jstPin = null;
        window.jstPin2 = null;
        window.jstPin3 = null;
        window.tempSensorModel = null;
        console.log("Lesson3 components cleaned via LessonCleaner");
      } catch (e) {
        console.warn("Error cleaning via LessonCleaner:", e);
      }
    } else if (currentLesson === "lesson4" && nextLesson === "lesson5") {
      setLesson("lesson5");
      // Reset lesson4 flags when transitioning away
      lesson4RunCodeClicked = false;
      lesson4CodeAnimationCompleted = false;
      if (typeof window !== 'undefined') {
        window.lesson4RunCodeClicked = false;
        window.lesson4CodeAnimationCompleted = false;
      }
      // Moving from lesson4 to lesson5 - clean via LessonCleaner
      console.log("Cleaning up lesson4 components for lesson5 transition (via LessonCleaner)");
      try {
        const cleaner = new LessonCleaner(scene);
        // Keep only core base models before IR lesson sets up
        cleaner.nonRemovableObjects = [
          "nano",
          "expansionBoard",
          "battery"
        ];
        cleaner.removeObjects();

        // Clear any stale globals that LessonCleaner won't nullify
        window.jstPin = null;
        window.jstPin2 = null;
        window.jstPin3 = null;
        window.tempSensorModel = null;
        console.log("Lesson4 components cleaned via LessonCleaner");
        
        // Ensure original battery and JST pin are hidden for lesson5
        if (window.batteryModel) {
          window.batteryModel.visible = false;
          console.log("[DEBUG] Hidden original batteryModel for lesson5 transition");
        }
        if (window.jstPinBattery && window.jstPinBattery.group) {
          window.jstPinBattery.group.visible = false;
          console.log("[DEBUG] Hidden original jstPinBattery for lesson5 transition");
        }
      } catch (e) {
        console.warn("Error cleaning via LessonCleaner:", e);
      }
    }
    
    // Log state after cleanup
    console.log("=== JST Pin States After Cleanup ===");
    logJstPinStates();
    
    // Reset battery JST pin to original position (common for all transitions)
    if (window.jstPinBattery && window.jstPinBattery.pinGLTF1) {
      window.jstPinBattery.pinGLTF1.rotation.y = -Math.PI / 2;
      if (typeof window.jstPinBattery.updatePosition === 'function') {
        window.jstPinBattery.updatePosition(new THREE.Vector3(0.8, 1.7, -3.2), window.jstPinBattery.pinGLTF1);
      } else if (window.jstPinBattery.pinGLTF1.position) {
        window.jstPinBattery.pinGLTF1.position.set(0.8, 1.7, -3.2);
      }
    }

    setTimeout(() => {
      window.disableNanoSnap = false;
    }, 500);

    // Log the current state before switching
    console.log('Current lesson state before switch:', {
      currentLesson,
      nextLesson,
      getCurrentLesson: typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "not available",
      scene: !!scene,
      runCodeButton: !!runCodeButton
    });
    
    // Switch to the determined next lesson and update UI/components visibility
    setLesson(nextLesson);
    
    // Call comprehensive cleanup function to ensure all models are properly managed
    cleanupLessonModels(currentLesson, nextLesson);
    
    // Also call the existing updateLessonVisibility for additional safety
    updateLessonVisibility(nextLesson);
    
    // Update learning panel with correct lesson data after transition
    setTimeout(() => {
      try {
        if (learningPanel && learningPanel.visible) {
          setLearningLesson(nextLesson);
          console.log(`[Lesson Transition] Updated learning panel to show ${nextLesson} content`);
        }
      } catch (e) {
        console.warn('Failed to update learning panel after lesson transition:', e);
      }
    }, 200);
    
    // Log the state after switching
    console.log('Lesson state after switch:', {
      newCurrentLesson: typeof window.getCurrentLesson === "function" ? window.getCurrentLesson() : "not available",
      nextLesson
    });

    // Update the code editor to show the new lesson content
    try {
      if (typeof window.setCodeEditorLesson === 'function') {
        window.setCodeEditorLesson(nextLesson);
        console.log(`Code editor updated to show ${nextLesson}`);
      }
    } catch (e) {
      console.warn('Failed to update code editor lesson:', e);
    }

    // Make sure Start Coding button exists in the scene for the next lesson flow
    try {
      if (runCodeButton && scene && !scene.children.includes(runCodeButton)) {
        scene.add(runCodeButton);
      }
      if (runCodeButton) {
        runCodeButton.userData.clickable = true;
        runCodeButton.traverse((child) => { if (child.isMesh) child.userData.clickable = true; });
        runCodeButton.visible = false; // will show after power connection
        if (typeof runCodeButton.update === 'function') runCodeButton.update();
      }
    } catch (e) {}

    // Update instruction panel to the next lesson step 0 content
    try {
      if (typeof updateCodePlaneWithInstruction === 'function' && typeof getCurrentStepText === 'function') {
        const text = getCurrentStepText();
        updateCodePlaneWithInstruction(text || "");
      }
    } catch (e) {}

    // Handle lesson-specific setup based on the next lesson
    if (nextLesson === "lesson1") {
      // Handle lesson1 specific setup
      console.log("Setting up lesson1 specific components");
      
      try {
        // Double-check: ensure all lesson2 and lesson3 models are hidden
        if (window.buzzerModel) {
          window.buzzerModel.visible = false;
          console.log("Double-check: Hidden buzzerModel for lesson1");
        }
        if (window.jstPin2 && window.jstPin2.group) {
          window.jstPin2.group.visible = false;
          console.log("Double-check: Hidden jstPin2 (lesson2) for lesson1");
        }
        if (window.tempSensorModel) {
          window.tempSensorModel.visible = false;
          console.log("Double-check: Hidden tempSensorModel for lesson1");
        }
        if (window.jstPin3 && window.jstPin3.group) {
          window.jstPin3.group.visible = false;
          console.log("Double-check: Hidden jstPin3 group for lesson1");
        }
        if (window.makeSomeNoiseButton) {
          window.makeSomeNoiseButton.visible = false;
          console.log("Double-check: Hidden makeSomeNoiseButton for lesson1");
        }
        
        // Ensure lesson1 components are visible
        if (window.rgbLEDModel) {
          window.rgbLEDModel.visible = true;
          console.log("Made rgbLEDModel visible for lesson1");
        }
        if (window.jstPin && window.jstPin.group) {
          if (!scene.children.includes(window.jstPin.group)) {
            scene.add(window.jstPin.group);
          }
          window.jstPin.group.visible = true;
          console.log("Made jstPin (lesson1) visible for lesson1");
        }
        if (window.showBlinkingButton) {
          window.showBlinkingButton.visible = true;
          console.log("Made showBlinkingButton visible for lesson1");
        }
        
        console.log("Lesson1 components setup completed with comprehensive cleanup");
      } catch (e) {
        console.warn("Error setting up lesson1 components:", e);
      }
    } else if (nextLesson === "lesson2") {
      // Reposition battery and its JST pin for lesson2
      try {
        const lesson2BatteryPos = new THREE.Vector3(-0.5, 1.8, -3.14);
        const lesson2BatteryJstPos = new THREE.Vector3(-0.5, 1.8, -3.4);
        if (window.batteryModel) {
          window.batteryModel.position.copy(lesson2BatteryPos);
          window.batteryModel.visible = true;
        }
        if (window.jstPinBattery && window.jstPinBattery.pinGLTF1) {
          window.jstPinBattery.pinGLTF1.rotation.y = -Math.PI / 2;
          // Update wire start positions for lesson2
          if (window.jstPinBattery.config && Array.isArray(window.jstPinBattery.config.wireConfigs)) {
            // Red wire (index 0)
            window.jstPinBattery.config.wireConfigs[0].startPosition =
              lesson2BatteryJstPos.clone().add(new THREE.Vector3(0.04, 0, 0.2));

            // Green wire (index 1) — your current value
            window.jstPinBattery.config.wireConfigs[1].startPosition =
              lesson2BatteryJstPos.clone().add(new THREE.Vector3(0, 0, 0.2));

          }
          // Move the JST body and recompute wires
          if (typeof window.jstPinBattery.updatePosition === 'function') {
            window.jstPinBattery.updatePosition(lesson2BatteryJstPos, window.jstPinBattery.pinGLTF1);
          } else if (window.jstPinBattery.pinGLTF1.position) {
            window.jstPinBattery.pinGLTF1.position.copy(lesson2BatteryJstPos);
          }
          // Ensure existing wires adopt the updated start positions
          if (Array.isArray(window.jstPinBattery.wires)) {
            window.jstPinBattery.wires.forEach((wire, i) => {
              try {
                if (window.jstPinBattery.config.wireConfigs[i]?.startPosition) {
                  wire.wireConfig.startPosition.copy(window.jstPinBattery.config.wireConfigs[i].startPosition);
                }
                // keep current end position; geometry will be rebuilt
                wire.updateWire(wire.wireConfig.endPosition);
              } catch (e) {}
            });
          }
        }
      } catch (e) {}

      // Ensure lesson2 visuals are shown/hidden properly
      try {
        // Double-check: ensure all lesson1 and lesson3 models are hidden
        if (window.rgbLEDModel) {
          window.rgbLEDModel.visible = false;
          console.log("Double-check: Hidden rgbLEDModel for lesson2");
        }
        if (window.jstPin && window.jstPin.group) {
          window.jstPin.group.visible = false;
          console.log("Double-check: Hidden jstPin (lesson1) for lesson2");
        }
        if (window.tempSensorModel) {
          window.tempSensorModel.visible = false;
          console.log("Double-check: Hidden tempSensorModel for lesson2");
        }
        if (window.jstPin3 && window.jstPin3.group) {
          window.jstPin3.group.visible = false;
          console.log("Double-check: Hidden jstPin3 group for lesson2");
        }
        
        if (window.buzzerModel) {
          window.buzzerModel.visible = true;
          console.log("Made buzzerModel visible for lesson2");
        }
        if (window.jstPin2 && window.jstPin2.group && scene) {
          if (!scene.children.includes(window.jstPin2.group)) {
            scene.add(window.jstPin2.group);
          }
          window.jstPin2.group.visible = true;
          console.log("Made jstPin2 group visible for lesson2");
        }
        if (window.showBlinkingButton) {
          window.showBlinkingButton.visible = false;
          console.log("Hidden showBlinkingButton for lesson2");
        }
        if (typeof updateNextButtonState === 'function') {
          updateNextButtonState();
          console.log("Updated next button state for lesson2");
        }
        
        // Refresh raycaster pin models reference to ensure lesson2 JST pins are draggable
        if (window.raycasterSetup && typeof window.raycasterSetup.refreshPinModelsRef === 'function') {
          window.raycasterSetup.refreshPinModelsRef();
          console.log("[Scene6] Refreshed raycaster pin models reference for lesson2");
        }
      } catch (e) {
        console.warn("Error setting up lesson2 visuals:", e);
      }
    } else if (nextLesson === "lesson3") {
      // Handle lesson3 specific setup
      console.log("Setting up lesson3 specific components");
      
      // Comprehensive logging of all lesson3 models
      console.log("=== LESSON3 MODELS OVERVIEW ===");
      console.log("All available GLTF models:", Object.keys(allAssets.models.gltf));
      
      // Log lesson3 specific models
      console.log("--- LESSON3 SPECIFIC MODELS ---");
      console.log("tempSensorModel:", {
        exists: !!window.tempSensorModel,
        name: window.tempSensorModel ? window.tempSensorModel.name : "N/A",
        inScene: window.tempSensorModel && scene ? scene.children.includes(window.tempSensorModel) : false,
        visible: window.tempSensorModel ? window.tempSensorModel.visible : false,
        position: window.tempSensorModel ? window.tempSensorModel.position : "N/A",
        scale: window.tempSensorModel ? window.tempSensorModel.scale : "N/A"
      });
      
      console.log("jstPin3 (lesson3 JST pin):", {
        exists: !!window.jstPin3,
        inScene: window.jstPin3 && window.jstPin3.group && scene ? scene.children.includes(window.jstPin3.group) : false,
        visible: window.jstPin3 && window.jstPin3.group ? window.jstPin3.group.visible : false,
        pin1Exists: !!window.jstPin3Side1,
        pin2Exists: !!window.jstPin3Side2
      });
      
      // Log common models that are also used in lesson3
      console.log("--- COMMON MODELS USED IN LESSON3 ---");
      console.log("nanoModel (Arduino):", {
        exists: !!window.nanoModel,
        name: window.nanoModel ? window.nanoModel.name : "N/A",
        inScene: window.nanoModel && scene ? scene.children.includes(window.nanoModel) : false,
        visible: window.nanoModel ? window.nanoModel.visible : false,
        position: window.nanoModel ? window.nanoModel.position : "N/A"
      });
      
      console.log("expansionBoardModel:", {
        exists: !!window.expansionBoardModel,
        name: window.expansionBoardModel ? window.expansionBoardModel.name : "N/A",
        inScene: window.expansionBoardModel && scene ? scene.children.includes(window.expansionBoardModel) : false,
        visible: window.expansionBoardModel ? window.expansionBoardModel.visible : false,
        position: window.expansionBoardModel ? window.expansionBoardModel.position : "N/A"
      });
      
      console.log("batteryModel:", {
        exists: !!window.batteryModel,
        name: window.batteryModel ? window.batteryModel.name : "N/A",
        inScene: window.batteryModel && scene ? scene.children.includes(window.batteryModel) : false,
        visible: window.batteryModel ? window.batteryModel.visible : false,
        position: window.batteryModel ? window.batteryModel.position : "N/A"
      });
      
      console.log("jstPinBattery:", {
        exists: !!window.jstPinBattery,
        inScene: window.jstPinBattery && window.jstPinBattery.group && scene ? scene.children.includes(window.jstPinBattery.group) : false,
        visible: window.jstPinBattery && window.jstPinBattery.group ? window.jstPinBattery.group.visible : false
      });
      
      // Log lesson2 models that should be hidden in lesson3
      console.log("--- LESSON2 MODELS (SHOULD BE HIDDEN IN LESSON3) ---");
      console.log("buzzerModel:", {
        exists: !!window.buzzerModel,
        name: window.buzzerModel ? window.buzzerModel.name : "N/A",
        inScene: window.buzzerModel && scene ? scene.children.includes(window.buzzerModel) : false,
        visible: window.buzzerModel ? window.buzzerModel.visible : false
      });
      
      console.log("jstPin2 (lesson2 JST pin):", {
        exists: !!window.jstPin2,
        inScene: window.jstPin2 && window.jstPin2.group && scene ? scene.children.includes(window.jstPin2.group) : false,
        visible: window.jstPin2 && window.jstPin2.group ? window.jstPin2.group.visible : false
      });
      
      // Log lesson1 models that should be hidden in lesson3
      console.log("--- LESSON1 MODELS (SHOULD BE HIDDEN IN LESSON3) ---");
      console.log("rgbLEDModel:", {
        exists: !!window.rgbLEDModel,
        name: window.rgbLEDModel ? window.rgbLEDModel.name : "N/A",
        inScene: window.rgbLEDModel && scene ? scene.children.includes(window.rgbLEDModel) : false,
        visible: window.rgbLEDModel ? window.rgbLEDModel.visible : false
      });
      
      console.log("jstPin (lesson1 JST pin):", {
        exists: !!window.jstPin,
        inScene: window.jstPin && window.jstPin.group && scene ? scene.children.includes(window.jstPin.group) : false,
        visible: window.jstPin && window.jstPin.group ? window.jstPin.group.visible : false
      });
      
      // Log all scene children to see what's actually in the scene
      console.log("--- ALL SCENE CHILDREN ---");
      if (scene && scene.children) {
        scene.children.forEach((child, index) => {
          console.log(`Scene child ${index}:`, {
            name: child.name || "unnamed",
            type: child.type,
            visible: child.visible,
            isGroup: child.isGroup,
            childrenCount: child.children ? child.children.length : 0
          });
        });
      }
      
      console.log("=== END LESSON3 MODELS OVERVIEW ===");
      
      try {
        // Ensure lesson3 components are visible and in the scene
        if (window.tempSensorModel) {
          if (!scene.children.includes(window.tempSensorModel)) {
            scene.add(window.tempSensorModel);
          }
          window.tempSensorModel.visible = true;
          console.log("Made tempSensorModel visible for lesson3");
        }
        if (window.jstPin3 && window.jstPin3.group) {
          if (!scene.children.includes(window.jstPin3.group)) {
            scene.add(window.jstPin3.group);
          }
          window.jstPin3.group.visible = false;
          console.log(`[DEBUG] jstPin3 (lesson3) added to scene but kept hidden`);
        }
        
        // Double-check: ensure all lesson1 and lesson2 models are hidden
        if (window.rgbLEDModel) {
          window.rgbLEDModel.visible = false;
          console.log("Double-check: Hidden rgbLEDModel for lesson3");
        }
        if (window.jstPin && window.jstPin.group) {
          window.jstPin.group.visible = false;
          console.log("Double-check: Hidden jstPin (lesson1) for lesson3");
        }
        if (window.buzzerModel) {
          window.buzzerModel.visible = false;
          console.log("Double-check: Hidden buzzerModel for lesson3");
        }
        if (window.jstPin2 && window.jstPin2.group) {
          window.jstPin2.group.visible = false;
          console.log("Double-check: Hidden jstPin2 (lesson2) for lesson3");
        }
        if (window.makeSomeNoiseButton) {
          window.makeSomeNoiseButton.visible = false;
          console.log("Double-check: Hidden makeSomeNoiseButton for lesson3");
        }
        if (window.showBlinkingButton) {
          window.showBlinkingButton.visible = false;
          console.log("Double-check: Hidden showBlinkingButton for lesson3");
        }
        
        // Hide battery and its JST pin in lesson3
        if (window.batteryModel) {
          window.batteryModel.visible = false;
          console.log("Battery hidden for lesson3");
        }
        if (window.jstPinBattery && window.jstPinBattery.group) {
          window.jstPinBattery.group.visible = false;
          console.log("jstPinBattery hidden for lesson3");
        }
        
        console.log("Lesson3 components setup completed with comprehensive cleanup");
      } catch (e) {
        console.warn("Error setting up lesson3 components:", e);
      }
    } else if (nextLesson === "lesson4") {
      // Handle lesson4 specific setup
      console.log("Setting up lesson4 specific components");
      
      // Reset lesson4 flags when entering lesson4
      lesson4RunCodeClicked = false;
      lesson4CodeAnimationCompleted = false;
      try { if (typeof window !== 'undefined') { window._lesson4_s7Played = false; window._lesson4_s7Attempted = false; window._lesson4_s8Played = false; } } catch (e) {}
      if (typeof window !== 'undefined') {
        window.lesson4RunCodeClicked = false;
        window.lesson4CodeAnimationCompleted = false;
      }
      
      KpMotorLesson(scene, camera);
    } else if (nextLesson === "lesson5") {
      // Handle lesson5 specific setup
      console.log("Setting up lesson5 specific components");
      
      // Ensure original battery and JST pin are hidden for lesson5
      if (window.batteryModel) {
        window.batteryModel.visible = false;
        console.log("[DEBUG] Hidden original batteryModel for lesson5");
      }
      if (window.jstPinBattery && window.jstPinBattery.group) {
        window.jstPinBattery.group.visible = false;
        console.log("[DEBUG] Hidden original jstPinBattery for lesson5");
      }
      
      KpIRLesson(scene, camera);
    }

    // Log final state after lesson setup
    console.log("=== Final JST Pin States After Lesson Setup ===");
    logJstPinStates();

    // Hide the Next Lesson button after transition
    if (typeof hideNextLessonButton === 'function') hideNextLessonButton();

    updateMakeSomeNoiseButtonVisibility();
  });

  // Initialize OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 0.5;
  controls.maxDistance = 1.15;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minAzimuthAngle = -Math.PI / 6; // Left limit (60 degrees)
  controls.maxAzimuthAngle = Math.PI / 6;  // Right limit (60 degrees)
  controls.target.set(0, 2, -3);
  controls.update();
  
  // Make controls globally available
  window.orbitControls = controls;
  
  // Lesson1 camera targets removed - now behaves like lesson2
  
  // Set camera and controls for player controller
  setCameraAndControls(camera, controls, scene);

  return {
    scene,
    camera,
    renderer,
    controls,
  };
}
export function cleanupScene6() {
  if (stats) {
    stats.dom.remove();
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clean up event listeners
  if (window._codeEditorRaycastHandler) {
    window.removeEventListener("pointerdown", window._codeEditorRaycastHandler);
    window.removeEventListener("pointermove", window._codeEditorRaycastHandler);
    window._codeEditorRaycastHandler = null;
  }
  if (window._scene6RaycastHandler) {
    window.removeEventListener("pointerdown", window._scene6RaycastHandler);
    window._scene6RaycastHandler = null;
  }
  if (typeof handleKeyNavigation !== 'undefined' && handleKeyNavigation) {
    window.removeEventListener("keydown", handleKeyNavigation);
  }

  destroyGUI();
  cleanupAudioManager();
  cleanupVR();
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
    // controls.dispose();
  }
  scene = null;
  camera = null;
  controls = null;
  if (typeof skybox !== 'undefined') {
    skybox = null;
  }

  // Clean up global variables
  if (window.nanoModel) {
    window.nanoModel = null;
  }
  if (window.expansionBoardModel) {
    window.expansionBoardModel = null;
  }
  if (window.rgbLEDModel) {
    window.rgbLEDModel = null;
  }
  if (window.secondPin4Female) {
    window.secondPin4Female = null;
  }
  if (window.currentScene) {
    window.currentScene = null;
  }
  // Clean up the Begin the Blink button and its handler
  if (typeof beginBlinkButton !== 'undefined' && beginBlinkButton) {
    beginBlinkButton.visible = false;
    if (beginBlinkButton.parent) beginBlinkButton.parent.remove(beginBlinkButton);
  }
  if (window._beginBlinkRaycastHandler) {
    window.removeEventListener("pointerdown", window._beginBlinkRaycastHandler);
    window._beginBlinkRaycastHandler = null;
  }
  
  // Clean up shader manager
  cleanupShader();
}

/**
 * Shows additional content in the instruction panel after camera animation completes
 * @param {string} lesson - The current lesson name
 * @param {number} stepIndex - The current step index
 */
function showContentAfterCameraAnimation(lesson, stepIndex) {
  return;
}

function updateLessonVisibility(lessonName) {
  console.log(`[DEBUG] updateLessonVisibility called for lesson: ${lessonName}`);
  
  // Lesson1 models visibility control
  if (window.rgbLEDModel) {
    window.rgbLEDModel.visible = lessonName === "lesson1";
    console.log(`[DEBUG] rgbLEDModel visibility set to: ${lessonName === "lesson1"}`);
  }
  if (window.jstPin && window.jstPin.group) {
    if (lessonName === "lesson1") {
      if (scene && !scene.children.includes(window.jstPin.group)) {
        scene.add(window.jstPin.group);
      }
      window.jstPin.group.visible = true;
      console.log(`[DEBUG] jstPin (lesson1) made visible and added to scene`);
    } else {
      window.jstPin.group.visible = false;
      console.log(`[DEBUG] jstPin (lesson1) hidden`);
    }
  }

  // Lesson2 models visibility control
  if (window.buzzerModel) {
    window.buzzerModel.visible = lessonName === "lesson2";
    console.log(`[DEBUG] buzzerModel visibility set to: ${lessonName === "lesson2"}`);
  }
  if (window.jstPin2 && window.jstPin2.group) {
    if (lessonName === "lesson2") {
      if (scene && !scene.children.includes(window.jstPin2.group)) {
        scene.add(window.jstPin2.group);
      }
      window.jstPin2.group.visible = true;
      console.log(`[DEBUG] jstPin2 (lesson2) made visible and added to scene`);
    } else {
      window.jstPin2.group.visible = false;
      console.log(`[DEBUG] jstPin2 (lesson2) hidden`);
    }
  }
  if (window.makeSomeNoiseButton) {
    if (lessonName === "lesson2") {
      if (scene && !scene.children.includes(makeSomeNoiseButton)) {
        scene.add(makeSomeNoiseButton);
      }
      makeSomeNoiseButton.visible = false; // will be shown after step 1 reveal completes
      console.log(`[DEBUG] makeSomeNoiseButton prepared (hidden) for lesson2; will show after reveal`);
    } else {
      makeSomeNoiseButton.visible = false;
      console.log(`[DEBUG] makeSomeNoiseButton hidden for non-lesson2`);
    }
  }

  // Lesson3 models visibility control
  if (window.tempSensorModel) {
    window.tempSensorModel.visible = lessonName === "lesson3";
    console.log(`[DEBUG] tempSensorModel visibility set to: ${lessonName === "lesson3"}`);
  }
  if (window.jstPin3 && window.jstPin3.group) {
    if (lessonName === "lesson3") {
      if (scene && !scene.children.includes(window.jstPin3.group)) {
        scene.add(window.jstPin3.group);
      }
      window.jstPin3.group.visible = true;
      console.log(`[DEBUG] jstPin3 (lesson3) made visible and added to scene`);
    } else {
      window.jstPin3.group.visible = false;
      console.log(`[DEBUG] jstPin3 (lesson3) hidden`);
    }
  }
  
  // Start Coding button visibility control for lesson3
  if (window.runCodeButton) {
    if (lessonName === "lesson3") {
      // For lesson3, the Start Coding button will be shown after battery connection
      // Don't show it initially, it will appear when needed
      window.runCodeButton.visible = false;
      console.log(`[DEBUG] Start Coding button hidden initially for lesson3 (will show after battery connection)`);
    } else if (lessonName === "lesson2") {
      // For lesson2, show Start Coding button after power connection
      window.runCodeButton.visible = false;
      console.log(`[DEBUG] Start Coding button hidden initially for lesson2 (will show after power connection)`);
    } else {
      // For other lessons, hide the Start Coding button
      window.runCodeButton.visible = false;
      console.log(`[DEBUG] Start Coding button hidden for lesson: ${lessonName}`);
    }
  }

  // Common models visibility rules
  // Battery should NOT carry over into lesson3 and lesson5
  if (window.batteryModel) {
    const batteryVisible = lessonName !== "lesson3" && lessonName !== "lesson5";
    window.batteryModel.visible = batteryVisible;
    console.log(`[DEBUG] batteryModel visibility set to: ${batteryVisible} (hidden in lesson3/lesson5)`);
  }
  if (window.jstPinBattery && window.jstPinBattery.group) {
    // Hide battery JST in lesson3, lesson4, and lesson5
    const keepVisible = lessonName !== "lesson3" && lessonName !== "lesson4" && lessonName !== "lesson5";
    window.jstPinBattery.group.visible = keepVisible;
    console.log(
      `[DEBUG] jstPinBattery visibility set to: ${keepVisible} (hidden in lesson3/lesson4/lesson5)`
    );
  }
  if (window.nanoModel) {
    window.nanoModel.visible = true;
    console.log(`[DEBUG] nanoModel kept visible for all lessons`);
  }
  if (window.expansionBoardModel) {
    window.expansionBoardModel.visible = true;
    console.log(`[DEBUG] expansionBoardModel kept visible for all lessons`);
  }

  // Special case: hide showBlinkingButton for non-lesson1 lessons
  if (window.showBlinkingButton) {
    window.showBlinkingButton.visible = lessonName === "lesson1";
    console.log(`[DEBUG] showBlinkingButton visibility set to: ${lessonName === "lesson1"}`);
  }

  // Log final visibility state for debugging
  console.log(`[DEBUG] === Final Model Visibility State for ${lessonName} ===`);
  console.log(`[DEBUG] rgbLEDModel (lesson1): ${window.rgbLEDModel ? window.rgbLEDModel.visible : 'N/A'}`);
  console.log(`[DEBUG] jstPin (lesson1): ${window.jstPin && window.jstPin.group ? window.jstPin.group.visible : 'N/A'}`);
  console.log(`[DEBUG] buzzerModel (lesson2): ${window.buzzerModel ? window.buzzerModel.visible : 'N/A'}`);
  console.log(`[DEBUG] jstPin2 (lesson2): ${window.jstPin2 && window.jstPin2.group ? window.jstPin2.group.visible : 'N/A'}`);
  console.log(`[DEBUG] tempSensorModel (lesson3): ${window.tempSensorModel ? window.tempSensorModel.visible : 'N/A'}`);
  console.log(`[DEBUG] jstPin3 (lesson3): ${window.jstPin3 && window.jstPin3.group ? window.jstPin3.group.visible : 'N/A'}`);
  console.log(`[DEBUG] ==========================================`);
}
// --- HOOK INTO LESSON CHANGES FOR FUTURE EXTENSION ---
if (typeof window.setLesson === "function") {
  const originalSetLesson = window.setLesson;
  window.setLesson = function (lessonName) {
    originalSetLesson(lessonName);
    updateLessonVisibility(lessonName); // Use new extensible function
    // Call setupLessonModels if needed for new lessons
    setupLessonModels(scene, lessonName);
  };
}
// --- INITIAL LESSON SETUP (EXTEND FOR MORE LESSONS) ---
setLesson("lesson1"); // Always start with lesson1
updateLessonVisibility("lesson1");

function updateMakeSomeNoiseButtonVisibility() {
  // Prepare the button in the scene but keep it hidden by default.
  if (!scene.children.includes(makeSomeNoiseButton)) {
    scene.add(makeSomeNoiseButton);
  }
  makeSomeNoiseButton.visible = false;
}

// Add raycast handler for makeSomeNoiseButton
if (!window._makeSomeNoiseRaycastHandler) {
  window._makeSomeNoiseRaycastHandler = (event) => {
    if (!makeSomeNoiseButton.visible) return;
    if (!camera) return; // Prevent error if camera is undefined
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([makeSomeNoiseButton], true);
    if (intersects.length > 0) {
      try {
        // Start blinking jstPin2.pinGLTF1 for lesson2 when button is clicked
        if (typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson2') {
          applyStepShader('lesson2', 1);
        }
      } catch (e) {
        console.warn('[Lesson2] Failed to apply shader on Make Some Noise click:', e);
      }
      // Animate the camera to a target (customize as needed)
      const lookTarget = new THREE.Vector3(0, 2, -3); // Change this to your desired target
      const startQuat = camera.quaternion.clone();
      // Camera lookAt removed - all lessons now have consistent camera behavior
      const endQuat = camera.quaternion.clone();
      camera.quaternion.copy(startQuat);
      const dummy = { t: 0 };
      gsap.to(dummy, {
        t: 1,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
          camera.quaternion.copy(startQuat).slerp(endQuat, dummy.t);
        },
        onComplete: () => {
          camera.quaternion.copy(endQuat);
          // Camera lookAt removed - all lessons now have consistent camera behavior
        },
      });
      // Optionally, hide the button after click
      makeSomeNoiseButton.visible = false;
    }
  };
  window.addEventListener("pointerdown", window._makeSomeNoiseRaycastHandler);
}

/**
 * Comprehensive cleanup function to ensure all lesson models are properly managed
 * @param {string} currentLesson - The lesson we're leaving
 * @param {string} nextLesson - The lesson we're entering
 */
function cleanupLessonModels(currentLesson, nextLesson) {
  console.log(`[DEBUG] cleanupLessonModels called: ${currentLesson} -> ${nextLesson}`);
  
  // Always hide all lesson-specific models first
  const allLessonModels = [
    { model: window.rgbLEDModel, name: 'rgbLEDModel', lesson: 'lesson1' },
    { model: window.jstPin?.group, name: 'jstPin (lesson1)', lesson: 'lesson1' },
    { model: window.buzzerModel, name: 'buzzerModel', lesson: 'lesson2' },
    { model: window.jstPin2?.group, name: 'jstPin2 (lesson2)', lesson: 'lesson2' },
    { model: window.tempSensorModel, name: 'tempSensorModel', lesson: 'lesson3' },
    { model: window.jstPin3?.group, name: 'jstPin3 (lesson3)', lesson: 'lesson3' },
    { model: window.makeSomeNoiseButton, name: 'makeSomeNoiseButton', lesson: 'lesson2' },
    { model: window.showBlinkingButton, name: 'showBlinkingButton', lesson: 'lesson1' }
  ];
  
  // Hide all lesson models first
  allLessonModels.forEach(({ model, name, lesson }) => {
    if (model) {
      model.visible = false;
      console.log(`[DEBUG] Hidden ${name} (${lesson}) during transition`);
    }
  });
  
  // Now show only the models for the next lesson
  if (nextLesson === 'lesson1') {
    if (window.rgbLEDModel) window.rgbLEDModel.visible = true;
    if (window.jstPin?.group) window.jstPin.group.visible = true;
    if (window.showBlinkingButton) window.showBlinkingButton.visible = true;
    console.log('[DEBUG] Made lesson1 models visible');
  } else if (nextLesson === 'lesson2') {
    if (window.buzzerModel) window.buzzerModel.visible = true;
    if (window.jstPin2?.group) window.jstPin2.group.visible = true;
    if (window.makeSomeNoiseButton) window.makeSomeNoiseButton.visible = false; // show only after reveal completes
    console.log('[DEBUG] Made lesson2 models visible (Make Some Noise button stays hidden until reveal ends)');
  } else if (nextLesson === 'lesson3') {
    if (window.tempSensorModel) window.tempSensorModel.visible = true;
    // Note: jstPin3 group is kept hidden for lesson3 as requested
    console.log('[DEBUG] Made lesson3 models visible (jstPin3 kept hidden)');
  } else if (nextLesson === 'lesson4') {
    // Lesson4 uses the original battery model, so don't hide it
    console.log('[DEBUG] Lesson4 will use the original battery model (handled by KpMotorLesson)');
  } else if (nextLesson === 'lesson5') {
    // Ensure original battery and JST pin are hidden for lesson5
    if (window.batteryModel) window.batteryModel.visible = false;
    if (window.jstPinBattery?.group) window.jstPinBattery.group.visible = false;
    console.log('[DEBUG] Hidden original battery and JST pin for lesson5 (lesson5 uses its own battery setup)');
  }
  
  console.log(`[DEBUG] cleanupLessonModels completed for ${nextLesson}`);
}
