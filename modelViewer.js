import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let characterScene, characterCamera, characterRenderer, characterModel;
let characterControls;
const characterClock = new THREE.Clock();
let isLoadingModel = false;
let resizeObserver = null;

export function initCharacterScene(container) {
  characterScene = new THREE.Scene();
  characterCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  characterCamera.position.set(0, 0, 2);
  characterCamera.lookAt(0, 0, 0);

  characterRenderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    preserveDrawingBuffer: false 
  });
  characterRenderer.setSize(container.clientWidth, container.clientHeight);
  characterRenderer.setClearColor(0x000000, 0);
  container.appendChild(characterRenderer.domElement);

  // Add resize handler for the container
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Update camera
    characterCamera.aspect = width / height;
    characterCamera.updateProjectionMatrix();
    
    // Update renderer
    characterRenderer.setSize(width, height);
    
    // Update pixel ratio for high DPI displays
    characterRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // If there's a model loaded, adjust its position based on the new size
    if (characterModel) {
      const box = new THREE.Box3().setFromObject(characterModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = characterCamera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      characterCamera.position.set(0, -0.4, cameraZ * 1.2);
      characterCamera.lookAt(0, -0.4, 0);
    }
  });
  resizeObserver.observe(container);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  characterScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(2, 2, 5);
  characterScene.add(directionalLight);

  characterControls = new OrbitControls(characterCamera, characterRenderer.domElement);
  characterControls.enableRotate = true;
  characterControls.enablePan = false;
  characterControls.enableZoom = false;
  characterControls.minPolarAngle = Math.PI / 2;
  characterControls.maxPolarAngle = Math.PI / 2;
  characterControls.autoRotate = true;
  characterControls.autoRotateSpeed = 5;

  animateCharacter();
}

export function cleanupCharacterScene() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (characterRenderer) {
    characterRenderer.dispose();
  }
  if (characterControls) {
    characterControls.dispose();
  }
  characterScene = null;
  characterCamera = null;
  characterRenderer = null;
  characterModel = null;
  characterControls = null;
}

export function loadCharacterModel(characterPath) {
    if (isLoadingModel) return;
    isLoadingModel = true;

    if (characterModel) {
        characterScene.remove(characterModel);
    }

    const loader = new GLTFLoader();
    loader.load(`/${characterPath}`, (gltf) => {
        characterModel = gltf.scene;
        characterModel.scale.set(0.9, 0.9, 0.9);
        characterModel.position.set(0, 0, 0);
        characterScene.add(characterModel);

        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(characterModel);
        const center = box.getCenter(new THREE.Vector3());
        characterModel.position.sub(center);
        characterModel.position.y -= 0.1;

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = characterCamera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        characterCamera.position.set(0, -0.4, cameraZ * 1.2);
        characterCamera.lookAt(0, -0.4, 0);
        characterCamera.updateProjectionMatrix();

        const mixer = new THREE.AnimationMixer(characterModel);
        const idleAction = mixer.clipAction(gltf.animations[0]);
        idleAction.play();
        characterModel.mixer = mixer;
        isLoadingModel = false;
    }, undefined, (error) => {
        console.error('An error occurred while loading the model:', error);
        isLoadingModel = false;
    });
}

function animateCharacter() {
  requestAnimationFrame(animateCharacter);
  const delta = characterClock.getDelta();

  if (characterModel && characterModel.mixer) {
    characterModel.mixer.update(delta);
  }

  if (characterControls) {
    characterControls.update();
  }

  characterRenderer.render(characterScene, characterCamera);
}
