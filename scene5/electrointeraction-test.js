import * as THREE from "three";
import { setupShapeKeyAnimations } from "../commonFiles/electroShapeKey.js";
import {
  togglePlayerControls,
  playerState,
  updatePlayerAnimation,
  switchAction,
  playerControlsEnabled,
  hidePlayerModel,
  switchToFirstPerson,
} from "../commonFiles/playerController.js";
import gsap from "gsap";
import { playAudio } from "../commonFiles/audiomanager.js";
import { showFPPOverlay } from "./scene5.js";


// State variables for Electro interaction
let isElectroSequenceActive = false;
let sceneStartTime = 0;
let electroSoundDuration = 0;
let electroSoundStartTime = 0;
let isElectroSoundPlaying = false;
let shapeKeyControls = null;
let allAssets = null;
let electroComponents = null;

// Global flag to track electro sequence state
window.isElectroSequencePlaying = false;

// Camera movement variables
let cameraTimeline = null;
let currentCameraPosition = new THREE.Vector3();
let currentLookAtPosition = new THREE.Vector3();

// Scene references
let scene = null;
let camera = null;
let player = null;
let controls = null;
let renderer = null;

// Electro animations
let electroActions = null;

// Sequence timing constants
const SEQUENCE_START_DELAY = 7000; // 5 seconds after scene loads
const CAMERA_MOVEMENT_DURATION = 2.5; // 2.5 seconds for camera movement

export function setDependencies(newCamera, newPlayer, newScene, newControls, newRenderer) {
  camera = newCamera;
  player = newPlayer;
  scene = newScene;
  controls = newControls;
  renderer = newRenderer;
}

export function initializeElectro(scene, assets, player, camera, controls, renderer) {
  // Store references
  setDependencies(camera, player, scene, controls, renderer);
  allAssets = assets;

  console.log("Initializing Electro interaction for Scene5");
  console.log("Available characters:", Object.keys(allAssets.characters.models));

  // Setup Electro components
  const electro = allAssets.characters.models.electro;
  if (!electro) {
    console.error("Electro model not found in assets");
    return null;
  }

  scene.add(electro);
  electro.position.set(-32, 0, -5); // Keep original electro position
  electro.rotation.set(0, 0, 0);
  electro.visible = true;

  // Setup shape key animations
  shapeKeyControls = setupShapeKeyAnimations(electro);

  // Store electro animations
  electroActions = {
    jumpAction: assets.characters.animations.electro.actions.JUMB,
    idleAction: assets.characters.animations.electro.actions.idel,
    runAction: assets.characters.animations.electro.actions.run,
    sitAction: assets.characters.animations.electro.actions.sit,
    walkAction: assets.characters.animations.electro.actions.walk,
    landingAction: assets.characters.animations.electro.actions.z_landing,
    heyAction: assets.characters.animations.electro.actions.zhey,
    cuteAction: assets.characters.animations.electro.actions.zcute,
    explainAction: assets.characters.animations.electro.actions.explain,
  };

  // Configure all animations
  Object.values(electroActions).forEach(action => {
    if (action) {
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
    }
  });

  // Store electro components
  electroComponents = {
    electro,
    electroActions,
    electroMixer: allAssets.characters.animations.electro.mixer
  };

  // (Removed: Do not auto-start sequence here)

  return electroComponents;
}

export function startElectroSequence() {
  if (isElectroSequenceActive) {
    console.log("Electro sequence already active, ignoring trigger");
    return;
  }

  console.log("Starting electro sequence");
  isElectroSequenceActive = true;
  window.isElectroSequencePlaying = true;
  sceneStartTime = performance.now();
  
  // Disable player controls and camera controls
  togglePlayerControls(false);
  if (controls) {
    controls.enabled = false;
  }
  
  // Start the electro interaction
  startElectroInteraction();
}

function startElectroInteraction() {
  if (!electroComponents?.electro || !player) return;

  const electro = electroComponents.electro;
  
  console.log("Starting electro interaction at position:", electro.position);
  console.log("Electro visible:", electro.visible);
  console.log("Player position:", player.position);
  
  // Play explain animation
  if (electroActions.explainAction) {
    electroActions.explainAction.reset();
    electroActions.explainAction.setLoop(THREE.LoopRepeat);
    electroActions.explainAction.clampWhenFinished = false;
    electroActions.explainAction.fadeIn(0.5).play();
  }

  // Create cinematic camera movement
  createCinematicCameraMovement(electro);
}

function createCinematicCameraMovement(electro) {
  if (!camera || !electro || !player) return;

  // Store original camera state (current player-relative position)
  const originalPosition = (-32,1,0)
  const originalRotation = camera.rotation.clone();
  const originalTarget = (-32,1,0)

  // Calculate target positions - move camera close to electro from player's current position
  const electroPosition = electro.position.clone();
  const targetPosition = new THREE.Vector3(
    electroPosition.x+0.2,
    electroPosition.y + 0.8,
    electroPosition.z + 1.8
  );
  const targetLookAt = new THREE.Vector3(
    electroPosition.x,
    electroPosition.y + 0.8,
    electroPosition.z
  );

  console.log("Player position:", player.position);
  console.log("Electro position:", electroPosition);
  console.log("Moving camera from player position to electro:", targetPosition);
  console.log("Looking at electro position:", targetLookAt);
  console.log("Current camera position:", camera.position);

  // Create camera animation using GSAP
  gsap.to(camera.position, {
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z,
    duration: 3.5,
    ease: 'power1.inOut',
    onUpdate: () => {
      // Ensure camera is always looking directly at electro
      camera.lookAt(targetLookAt);
      if (controls) {
        controls.target.copy(targetLookAt);
        controls.update();
      }
    },
    onComplete: () => {
      console.log("Camera movement completed, playing electro sound");
      // Play sound after camera movement
      if (allAssets.audios.electrosound) {
        const sound = allAssets.audios.electrosound;
        sound.play();
        isElectroSoundPlaying = true;
        electroSoundStartTime = performance.now();
        electroSoundDuration = sound.buffer?.duration || 0;

        // Stop the animation when sound ends
        sound.onEnded = () => {
          if (electroActions.explainAction) {
            electroActions.explainAction.fadeOut(0.5);
            setTimeout(() => {
              electroActions.explainAction.stop();
              electroActions.explainAction.reset();
            }, 500);
          }
          isElectroSoundPlaying = false;
        };
      }

      // Start shape key animation
      if (shapeKeyControls) {
        shapeKeyControls.startAnimation();
      }

      // Schedule return to player
      setTimeout(() => {
        returnToPlayer(originalPosition, originalRotation, originalTarget);
      }, electroSoundDuration * 1000);
    }
  });
}

function returnToPlayer(originalPosition, originalRotation, originalTarget) {
  if (!camera || !player) return;

  // Remove electro from scene after electrosound finished
  if (electroComponents?.electro && scene) {
    scene.remove(electroComponents.electro);
    console.log('[DEBUG] Electro removed from scene after electrosound');
  }

  // --- HUD VIDEO FOCUS SEQUENCE ---
  // Access HUD video plane and video element from window
  const hudVideoPlane = window.hudVideoPlane;
  const hudVideoElement = window.hudVideoElement;
  if (hudVideoPlane && camera) {
    // Animate camera to HUD video plane directly from current position
    const hudTarget = hudVideoPlane.position.clone();
    const hudCamPos = hudTarget.clone().add(new THREE.Vector3(0, 0, 2));
    // Use player's current position for return
    const playerCamPos = player.position.clone();
    const playerLookAt = player.position.clone();
    // Show HUD video plane and play video ONCE
    hudVideoPlane.visible = true;
    if (hudVideoElement) {
      hudVideoElement.loop = false;
      hudVideoElement.currentTime = 0;
    }
    console.log('[DEBUG] Camera animating to HUD video plane (direct from electro)');
    gsap.to(camera.position, {
      x: hudCamPos.x,
      y: hudCamPos.y,
      z: hudCamPos.z,
      duration: 0.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        camera.lookAt(hudTarget);
        if (controls) {
          controls.target.copy(hudTarget);
          controls.update();
        }
        camera.updateProjectionMatrix();
      },
      onComplete: () => {
        camera.lookAt(hudTarget);
        if (controls) {
          controls.target.copy(hudTarget);
          controls.update();
        }
        camera.updateProjectionMatrix();
        console.log('[DEBUG] Camera focused on HUD video (from electrointeraction.js)');
        // Play HUD video ONCE
        if (hudVideoElement) {
          hudVideoElement.play().then(() => {
            console.log('[DEBUG] hudvideo1 started playing (from electrointeraction.js)');
          }).catch(e => console.warn('[DEBUG] hudvideo1 play error', e));
          // When HUD video ends, continue the sequence
          hudVideoElement.onended = () => {
            console.log('[DEBUG] hudvideo1 ended, moving to Byte panel');
            // --- Move to Byte Assembly Panel ---
            const bytePanelPos = new THREE.Vector3(-39, 1.6, -3.21);
            const bytePanelLookAt = new THREE.Vector3(-39, 1.15, -6.0);
            gsap.to(camera.position, {
              x: bytePanelPos.x,
              y: bytePanelPos.y,
              z: bytePanelPos.z,
              duration: 3.5,
              ease: 'power1.inOut',
              onUpdate: () => {
                camera.lookAt(bytePanelLookAt);
                if (controls) {
                  controls.target.copy(bytePanelLookAt);
                  controls.update();
                }
                camera.updateProjectionMatrix();
              },
              onComplete: () => {
                camera.lookAt(bytePanelLookAt);
                if (controls) {
                  controls.target.copy(bytePanelLookAt);
                  controls.update();
                }
                camera.updateProjectionMatrix();
                // Play bytepanelsound
                console.log('[DEBUG] Playing bytepanelsound via playAudio');
                playAudio('bytepanelsound');
                // Listen for audioComplete-bytepanelsound event
                const onBytePanelSoundComplete = () => {
                  window.removeEventListener('audioComplete-bytepanelsound', onBytePanelSoundComplete);
                  console.log('[DEBUG] audioComplete-bytepanelsound event received, moving to Component Intro Panel');
                  // --- Move to Component Intro Panel ---
                  const compPanelPos = new THREE.Vector3(-33, 1.0, 3.5);
                  const compPanelLookAt = new THREE.Vector3(-33, 1.9, 7.5);
                  gsap.to(camera.position, {
                    x: compPanelPos.x,
                    y: compPanelPos.y,
                    z: compPanelPos.z,
                    duration: 3.5,
                    ease: 'power1.inOut',
                    onUpdate: () => {
                      camera.lookAt(compPanelLookAt);
                      if (controls) {
                        controls.target.copy(compPanelLookAt);
                        controls.update();
                      }
                      camera.updateProjectionMatrix();
                    },
                    onComplete: () => {
                      camera.lookAt(compPanelLookAt);
                      if (controls) {
                        controls.target.copy(compPanelLookAt);
                        controls.update();
                      }
                      camera.updateProjectionMatrix();
                      // Play componentsound
                      console.log('[DEBUG] Playing componentsound via playAudio');
                      playAudio('componentsound');
                      // Listen for audioComplete-componentsound event
                      const onComponentSoundComplete = () => {
                        window.removeEventListener('audioComplete-componentsound', onComponentSoundComplete);
                        showFPPOverlay();
                        // --- Return to player ---
                        gsap.to(camera.position, {
                          x: playerCamPos.x,
                          y: playerCamPos.y+0.2,
                          z: playerCamPos.z+0.5,
                          duration: 3.5,
                          ease: 'power1.inOut',
                          onUpdate: () => {
                            camera.lookAt(playerLookAt);
                            if (controls) {
                              controls.target.copy(playerLookAt);
                              controls.update();
                            }
                            camera.updateProjectionMatrix();
                          },
                          onComplete: () => {
                            camera.lookAt(playerLookAt);
                            if (controls) {
                              controls.target.copy(playerLookAt);
                              controls.update();
                            }
                            camera.updateProjectionMatrix();
                            // Switch to FPP using the new function
                            if (typeof switchToFirstPerson === 'function') {
                              switchToFirstPerson(camera, controls);
                            }
                            // Re-enable controls and player controls
                            if (controls) {
                              controls.enabled = true;
                            }
                            if (electroComponents.electroMixer) {
                              electroComponents.electroMixer.stopAllAction();
                            }
                            togglePlayerControls(true);
                            console.log('[DEBUG] Camera returned to player in FPP and controls re-enabled (from electrointeraction.js)');
                            // Hide HUD video plane
                            hudVideoPlane.visible = false;
                          }
                        });
                      };
                      window.addEventListener('audioComplete-componentsound', onComponentSoundComplete);
                    }
                  });
                };
                window.addEventListener('audioComplete-bytepanelsound', onBytePanelSoundComplete);
              }
            });
          };
        }
      }
    });
  } else {
    // If no HUD video, just re-enable controls
    if (controls) {
      controls.enabled = true;
    }
    if (electroComponents.electroMixer) {
      electroComponents.electroMixer.stopAllAction();
    }
    togglePlayerControls(true);
    console.log("Electro sequence completed, controls re-enabled");
  }
  // --- END HUD VIDEO FOCUS SEQUENCE ---
  // Reset sequence state
  isElectroSequenceActive = false;
  isElectroSoundPlaying = false;
  window.isElectroSequencePlaying = false;
}

export function updateElectro(delta) {
  if (!isElectroSequenceActive) return;

  // Update electro mixer
  if (electroComponents?.electroMixer) {
    electroComponents.electroMixer.update(delta);
  }

  // Ensure player controls remain disabled during sequence
  if (playerControlsEnabled) {
    togglePlayerControls(false);
  }

  // Shape key controls are self-updating, no need to call update
}

export function getElectroSequenceActive() {
  return isElectroSequenceActive;
}

export function cleanupElectro() {
  // Stop all animations
  if (electroComponents?.electroMixer) {
    electroComponents.electroMixer.stopAllAction();
  }

  // Stop shape key animations
  if (shapeKeyControls) {
    shapeKeyControls.stopAnimation();
  }

  // Remove electro from scene
  if (electroComponents?.electro) {
    scene.remove(electroComponents.electro);
  }

  // Reset state variables
  isElectroSequenceActive = false;
  isElectroSoundPlaying = false;
  window.isElectroSequencePlaying = false;
  electroComponents = null;
  shapeKeyControls = null;
} 