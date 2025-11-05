import { loadCharacterModel, initCharacterScene, cleanupCharacterScene } from "./modelViewer.js";
import { initializeRenderer, disposeRenderer, startGame } from "./main.js";
import { updateUserInfo, getUserInfo, setStartScene } from "./data.js";

function showModeSelection() {
  const elements = {
    modeSelection: document.getElementById("mode-selection"),
    characterSelection: document.getElementById("character-selection"),
    vrModeButton: document.getElementById("vr-mode-button"),
    nonVRModeButton: document.getElementById("non-vr-mode-button"),
  };

  elements.modeSelection.style.display = "flex";
  elements.characterSelection.style.display = "none";

  let selectedMode = null;

  const selectMode = (button, isVR) => {
    if (selectedMode) selectedMode.classList.remove("selected");
    button.classList.add("selected");
    selectedMode = button;
    updateUserInfo(null, isVR ? "vr" : "non-vr");
    
    // Directly navigate to character selection after a short delay
    setTimeout(() => {
      showCharacterSelection();
    }, 300);
  };

  elements.vrModeButton.addEventListener("click", () =>
    selectMode(elements.vrModeButton, true)
  );
  elements.nonVRModeButton.addEventListener("click", () =>
    selectMode(elements.nonVRModeButton, false)
  );
}

function showCharacterSelection() {
  const elements = {
    modeSelection: document.getElementById("mode-selection"),
    characterSelection: document.getElementById("character-selection"),
    cards: document.querySelectorAll(".character-card"),
    startButton: document.getElementById("start-experience-btn"),
  };

  elements.modeSelection.style.display = "none";
  elements.characterSelection.style.display = "flex";

  // Character data mapping
  const characterData = {
    "characters/emily_v14 3.glb": {
      name: "EMILY",
      role: "EXPLORER"
    },
    "characters/gopuv5-opt.glb": {
      name: "JOHN",
      role: "TECHNICIAN"
    }
  };

  // Automatically select the first character
  const defaultCharacterCard = elements.cards[0];
  defaultCharacterCard.classList.add("active");
  const defaultCharacter = defaultCharacterCard.getAttribute("data-character");
  const { modeSelected } = getUserInfo();
  updateUserInfo(defaultCharacter, modeSelected);

  // Enable start button
  elements.startButton.classList.add("active");

  elements.cards.forEach((card) => {
    card.addEventListener("click", () => {
      elements.cards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      const character = card.getAttribute("data-character");
      const { modeSelected } = getUserInfo();
      updateUserInfo(character, modeSelected);
    });
  });

  // Start button functionality
  elements.startButton.addEventListener("click", () => {
    if (elements.startButton.classList.contains("active")) {
      startExperience();
    }
  });

  // Add keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      startExperience();
    } else if (e.key === "Escape") {
      showModeSelection();
    }
  });
}

function startExperience() {
  const characterSelection = document.getElementById("character-selection");
  const loadingScreen = document.getElementById('new-loading-screen');
  
  characterSelection.style.display = "none";
  loadingScreen.style.display = "flex";
  
  // Check if there's a specific scene to load from localStorage
  const loadScene = localStorage.getItem('loadScene');
  if (loadScene) {
    console.log(`Loading specific scene: ${loadScene}`);
    setStartScene(loadScene);

  }
  // Set initial loading image based on selected scene
const loadingImage = document.getElementById("new-loading-image");
if (loadingImage && loadScene) {
  const sceneNumber = loadScene.replace("scene", "");
  loadingImage.src = `/loadingimages/scene${sceneNumber}.png`;
}
  // Simulate loading progress
  let progress = 0;
  const progressElement = document.querySelector(".new-loading-progress");
  
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      setTimeout(() => {
        startGame();
      }, 500);
    }
    if (progressElement) {
      progressElement.textContent = Math.floor(progress) + "%";
    }
  }, 200);
}

export function startCharacterSelection() {
  showModeSelection();
}

export function cleanup() {
  cleanupCharacterScene();
  disposeRenderer();
}