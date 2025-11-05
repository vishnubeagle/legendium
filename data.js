// data.js - Game data management with Firebase integration and generalized scene handling

import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./src/firebase.js";  // Adjust path if needed

const gameData = {
  userInfo: {
    selectedCharacter: "emily_v14 3.glb", // Default character
    modeSelected: "non-vr", // Default mode
  },
  scene1: {
    startPosition: {
      position: { x: -58, y: 10.5, z: 5},
      rotation: { y: -2.2},
      cameraPosition: { x: 0, y: 5, z: -3 },
    },
    checkpoints: {
      garden: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 0, z: 2 },
      },
      // Add more checkpoints as needed
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene2: {
    startPosition: {
      position: { x: -0.16, y: 4.3, z: -256 },
      rotation: { y: Math.PI },
      cameraPosition: { x: 0, y: 0, z: 3 },
    },
    checkpoints: {
      university: {
        position: { x: 0, y: 38, z: 2490 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 43, z: 2500 },
      },
      // Add more checkpoints as needed
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene3: {
    startPosition: {
      position: { x: 5, y: 8, z: 90},
      rotation: { y: 0 },
      cameraPosition: { x: 0, y: 1, z: 0 },
    },
    checkpoints: {
      university: {
        position: { x: 0, y: 38, z: 2490 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 43, z: 2500 },
      },
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene4: {
    startPosition: {
      position: { x: -15, y: 0, z: 0 },
      rotation: { y: Math.PI/2 },
      cameraPosition: { x: 0, y: 1, z: 0 },
    },
    checkpoints: {
      university: {
        position: { x: 0, y: 38, z: 2490 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 43, z: 2500 },
      },
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene5: {
    startPosition: {
      position: { x: -31, y: 5, z: -0.5},
      rotation: { y: Math.PI/2 },
      cameraPosition: { x: 0, y: 1, z: 0 },
    },
    checkpoints: {
      university: {
        position: { x: 0, y: 8, z: -2 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 3, z: -5 },
      },
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene6: {
    startPosition: {
      position: { x: 0, y: 2, z: -2 },
      rotation: { y: 0 },
      cameraPosition: { x: 0, y: 2, z: 0 },
    },
    checkpoints: {
      university: {
        position: { x: 0, y: 0, z: -2 },
        rotation: { y: 0 },
        cameraPosition: { x: 0, y: 3, z: -5 },
      },
    },
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  scene7: {
    startPosition: {
      position: { x: 0, y: 2, z: -2 },
      rotation: { y: 0 },
      cameraPosition: { x: 0.4, y: 2, z: 0 },
    },
    checkpoints: {},  // No checkpoints defined yet
    savedPosition: {
      position: null,
      rotation: null,
      cameraPosition: null,
    },
  },
  gameState: {
    startScene: "scene1",
    currentScene: "scene1",
    completedScenes: {},  // Local fallback
  },
};

export function updateUserInfo(character, mode) {
  if (character !== null) {
    gameData.userInfo.selectedCharacter = character;
  }
  if (mode !== null) {
    gameData.userInfo.modeSelected = mode;
  }
  console.log("Updated user info:", gameData.userInfo);
}

export function getUserInfo() {
  return gameData.userInfo;
}

// Generalized functions for any scene
export function getSceneData(sceneName) {
  if (gameData[sceneName]) {
    return gameData[sceneName];
  }
  console.warn(`No data found for scene: ${sceneName}`);
  return null;
}

export function updateCheckpoint(sceneName, checkpointName, position, rotation, cameraPosition = null, controlsTarget = null) {
  const sceneData = gameData[sceneName];
  if (sceneData && sceneData.checkpoints[checkpointName]) {
    sceneData.checkpoints[checkpointName] = {
      position: { ...position },
      rotation: { ...rotation },
      cameraPosition: cameraPosition ? { ...cameraPosition } : null,
      controlsTarget: controlsTarget ? { ...controlsTarget } : null,
    };

  } else {
    console.warn(`Checkpoint '${checkpointName}' not found in ${sceneName}`);
  }
}

export function updateSavedPosition(sceneName, position, rotation, cameraPosition = null, controlsTarget = null) {
  const sceneData = gameData[sceneName];
  if (sceneData) {
    sceneData.savedPosition = {
      position: { ...position },
      rotation: { ...rotation },
      cameraPosition: cameraPosition ? { ...cameraPosition } : null,
      controlsTarget: controlsTarget ? { ...controlsTarget } : null,
    };
    // Update start position to match saved position
    sceneData.startPosition = {
      ...sceneData.startPosition,
      position: { ...position },
      rotation: { ...rotation },
      cameraPosition: cameraPosition ? { ...cameraPosition } : null,
      controlsTarget: controlsTarget ? { ...controlsTarget } : null,
    };

  } else {
    console.warn(`Scene data not found: ${sceneName}`);
  }
}

export function getStartPosition(sceneName) {
  const sceneData = getSceneData(sceneName);
  return sceneData ? sceneData.startPosition : null;
}

export function getCheckpoint(sceneName, checkpointName) {
  const sceneData = getSceneData(sceneName);
  return sceneData && sceneData.checkpoints[checkpointName] ? sceneData.checkpoints[checkpointName] : null;
}

export function getSavedPosition(sceneName) {
  const sceneData = getSceneData(sceneName);
  return sceneData ? sceneData.savedPosition : null;
}

export function setStartPosition(sceneName, position, rotation, cameraPosition = null, controlsTarget = null) {
  const sceneData = gameData[sceneName];
  if (sceneData) {
    sceneData.startPosition = {
      position: { ...position },
      rotation: { ...rotation },
      cameraPosition: cameraPosition ? { ...cameraPosition } : null,
      controlsTarget: controlsTarget ? { ...controlsTarget } : null,
    };
   
  } else {
    console.warn(`Scene data not found: ${sceneName}`);
  }
}

// Helper function to check if all required info is set
export function isUserInfoComplete() {
  return (
    gameData.userInfo.selectedCharacter !== "" &&
    gameData.userInfo.modeSelected !== ""
  );
}

export function setStartScene(sceneName) {

  gameData.gameState.startScene = sceneName;
  // Also store in localStorage for persistence across refreshes
  if (typeof window !== 'undefined') {
    localStorage.setItem('loadScene', sceneName);

  }
}

export function getStartScene() {
  // First try to get from localStorage (user's last selection)
  if (typeof window !== 'undefined') {
    const savedScene = localStorage.getItem('loadScene');
    if (savedScene) {
 
      return savedScene;
    }
  }
  // Fallback to the default from gameData
  console.log(`getStartScene: Using default scene: ${gameData.gameState.startScene}`);
  return gameData.gameState.startScene;
}

export function setCurrentScene(sceneName) {
  gameData.gameState.currentScene = sceneName;
  
  // Also store in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentScene', sceneName);
  }
  console.log(`setCurrentScene: Set to ${sceneName}`);
}

export function getCurrentScene() {
  // First try to get from localStorage
  if (typeof window !== 'undefined') {
    const currentScene = localStorage.getItem('currentScene');
    if (currentScene) {
      gameData.gameState.currentScene = currentScene;
    }
  }
  
  const current = gameData.gameState.currentScene;
  return {
    currentScene: current,
    currentSceneData: getSceneData(current),
  };
}

/**
 * Marks the current scene as completed in Firebase and localStorage.
 * Enhanced to trigger falling effect and return Promise for transitions.
 * @param {string} sceneName - The scene to mark (e.g., "scene3")
 * @param {Object} [context] - Optional: { scene, camera, allAssets, player, fallingEffectFn } for falling effect
 * @returns {Promise<void>} Resolves after marking and effect trigger
 */
export async function markSceneCompleted(sceneName, context = {}) {
  if (!auth.currentUser) {
    console.warn("No user authenticated; skipping scene completion mark.");
    // Fallback to local only
    _markLocalOnly(sceneName);
    return;
  }

  try {
    // 1. Update Firebase
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      [`scenesCompleted.${sceneName}`]: true,
      lastCompletedScene: sceneName,
      updatedAt: new Date().toISOString()
    });

    // 2. Update localStorage (for offline/resilience)
    _markLocalOnly(sceneName);



    // 3. Trigger falling effect if context provided
    if (context && (typeof window.initializeFallingEffect === 'function' || context.fallingEffectFn)) {

      const fallingFn = window.initializeFallingEffect || context.fallingEffectFn;
      await fallingFn(
        context.scene || null,
        context.camera || null,
        context.allAssets || null,
        context.player || null
      );
    }

    // Optional: Scene-specific hook
    if (typeof window.onSceneCompleted === 'function') {
      window.onSceneCompleted(sceneName, context);
    }

  } catch (error) {
    console.error(`Error marking ${sceneName} as completed:`, error);
    // Fallback to localStorage only
    _markLocalOnly(sceneName);
  }
}

// Internal helper for local-only marking
function _markLocalOnly(sceneName) {
  if (!gameData.gameState.completedScenes) {
    gameData.gameState.completedScenes = {};
  }
  gameData.gameState.completedScenes[sceneName] = true;
  
  if (typeof window !== 'undefined') {
    const completedScenes = JSON.parse(localStorage.getItem('completedScenes') || '{}');
    completedScenes[sceneName] = true;
    localStorage.setItem('completedScenes', JSON.stringify(completedScenes));
  }
  

}

export async function getCompletedScenes() {
  // Sync from Firebase first if authenticated
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      const firebaseScenes = data.scenesCompleted || {};
      
      // Merge with local (prioritize Firebase)
      if (typeof window !== 'undefined') {
        const localScenes = JSON.parse(localStorage.getItem('completedScenes') || '{}');
        const merged = { ...localScenes, ...firebaseScenes };
        localStorage.setItem('completedScenes', JSON.stringify(merged));
        gameData.gameState.completedScenes = merged;
        return merged;
      }
      gameData.gameState.completedScenes = firebaseScenes;
      return firebaseScenes;
    } catch (error) {
      console.error("Error fetching completed scenes from Firebase:", error);
    }
  }
  
  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const completedScenes = JSON.parse(localStorage.getItem('completedScenes') || '{}');
    gameData.gameState.completedScenes = completedScenes;
    return completedScenes;
  }
  
  // Ultimate fallback
  return gameData.gameState.completedScenes || {};
}

/**
 * Marks the scene as visited (unlocked for entry) in Firebase/localStorage.
 * Called on scene entry, not completion.
 * @param {string} sceneName - The scene to mark as visited.
 * @returns {Promise<void>}
 */
export async function markSceneVisited(sceneName) {
  if (!auth.currentUser) {
    console.warn("No user authenticated; skipping scene visit mark.");
    _markLocalOnlyVisited(sceneName);
    return;
  }

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      [`scenesVisited.${sceneName}`]: true,
      lastVisitedScene: sceneName,
      updatedAt: new Date().toISOString()
    });

    _markLocalOnlyVisited(sceneName);

 
  } catch (error) {
    console.error(`Error marking ${sceneName} as visited:`, error);
    _markLocalOnlyVisited(sceneName);
  }
}

// Internal helper for local-only visited marking
function _markLocalOnlyVisited(sceneName) {
  if (!gameData.gameState.visitedScenes) {
    gameData.gameState.visitedScenes = {};
  }
  gameData.gameState.visitedScenes[sceneName] = true;
  
  if (typeof window !== 'undefined') {
    const visitedScenes = JSON.parse(localStorage.getItem('visitedScenes') || '{}');
    visitedScenes[sceneName] = true;
    localStorage.setItem('visitedScenes', JSON.stringify(visitedScenes));
  }

}

// Update getCompletedScenes to also handle visited (rename or add getVisitedScenes if needed)
export async function getVisitedScenes() {
  // Similar to getCompletedScenes, but for scenesVisited
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      const firebaseVisited = data.scenesVisited || {};
      
      if (typeof window !== 'undefined') {
        const localVisited = JSON.parse(localStorage.getItem('visitedScenes') || '{}');
        const merged = { ...localVisited, ...firebaseVisited };
        localStorage.setItem('visitedScenes', JSON.stringify(merged));
        gameData.gameState.visitedScenes = merged;
        return merged;
      }
      gameData.gameState.visitedScenes = firebaseVisited;
      return firebaseVisited;
    } catch (error) {
      console.error("Error fetching visited scenes from Firebase:", error);
    }
  }
  
  if (typeof window !== 'undefined') {
    const visitedScenes = JSON.parse(localStorage.getItem('visitedScenes') || '{}');
    gameData.gameState.visitedScenes = visitedScenes;
    return visitedScenes;
  }
  
  return gameData.gameState.visitedScenes || {};
}