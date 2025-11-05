import * as THREE from "three";
import { allAssets } from "../commonFiles/assetsLoader.js";
import { gsap } from "gsap";
import { JstXhFemalePin } from "./JstXhFemalePin.js";
import { getSnapHandler } from "./snapping.js";
import { modelTransforms } from "./modelTransforms.js";
import { JstXhFemalePin as Jst2 } from "./JstXhFemalePin2.js";
// Import the new shader manager
import { handleDragStart, handleDragEnd, handleSnap } from "./shaderManager.js";

const snapIfClose = getSnapHandler();
let nanoSnapCameraAdjusted = false;

export class RaycasterSetup1 {
  
  constructor(scene, camera, controls, onSnap) {
    
    if (!RaycasterSetup1.instance) {
      this.scene = scene;
      this.camera = camera;
      this.controls = controls;
      this.mouseCoord = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.raycaster.near = 0;
      this.raycaster.far = Infinity;

      this.isDragging = false;
      this.draggedComponent = null;
      this.draggedPinModel = null;
      this.lastPosition = null; // Track last position for drag direction
      this.mouseDownPosition = null; // Track mouse down position for drag threshold

      this.referencePlaneGeometry = new THREE.PlaneGeometry(10, 10, 64, 64);
      this.referencePlaneGeometry.rotateX(-Math.PI * 0.5)

      this.referencePlaneMaterial = new THREE.MeshBasicMaterial({
        color: "red",
        transparent: true,
        visible: false,
        opacity: 0.5,
      });
      this.referencePlane = new THREE.Mesh(
        this.referencePlaneGeometry,
        this.referencePlaneMaterial
      );
      this.referencePlane.position.y = 1.8
      this.scene.add(this.referencePlane);

      this.pinModelsRef = JstXhFemalePin.getAllModels();

      // Add nanoModel reference
      this.nanoModel = window.nanoModel || null;

      this.onSnap = onSnap; // callback for snap events

      window.addEventListener("mousedown", (event) => this.onMouseDown(event));
      window.addEventListener("mousemove", (event) => this.onMouseMove(event));
      window.addEventListener("mouseup", (event) => this.onMouseUp(event));

      RaycasterSetup1.instance = this;
    }
    return RaycasterSetup1.instance;
  }

  // Add method to refresh pin models reference
  refreshPinModelsRef() {
    this.pinModelsRef = JstXhFemalePin.getAllModels();
    console.log("[RaycasterSetup1] Refreshed pin models reference:", this.pinModelsRef);
  }

  update(deltaTime) {
    // Shader updates are now handled by the shader manager
    // This method is kept for compatibility but no longer needed
  }

  updateReferencePlane() {
    // Align the reference plane to face the camera
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    this.referencePlane.lookAt(this.camera.position.clone().add(cameraDirection));

    // Position the plane at the dragged pin's position or a reasonable distance
    if (this.draggedPinModel) {
      this.referencePlane.position.copy(this.draggedPinModel.position);
    } else {
      // Fallback position (e.g., scene origin)
      this.referencePlane.position.set(0, 0, 0);
    }
  }

  onMouseDown(event) {
    this.mouseCoord.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseCoord.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoord, this.camera);
    const allModels = this.pinModelsRef.flatMap((obj) => obj.models);
    // Add nanoModel to the list of draggable objects if available
    if (window.nanoModel) {
      allModels.push(window.nanoModel);
    }
    // Add battery JST female pin to draggable objects if available
    if (window.jstPinBatterySide1) {
      allModels.push(window.jstPinBatterySide1);
    }
    // Do NOT add rgbLEDModel to the draggable list
    const intersects = this.raycaster.intersectObjects(allModels, true); // recursive search
    if (intersects.length > 0) {
      this.isDragging = true;

      const mesh = intersects[0].object;
      let parentGroup = mesh;

      // Traverse up to find the pin model (pinGLTF1 or pinGLTF2) or nanoModel
      while (
        parentGroup.parent &&
        !allModels.includes(parentGroup)
      ) {
        parentGroup = parentGroup.parent;
      }

      // Find the corresponding JstXhFemalePin instance
      const componentData = this.pinModelsRef.find((entry) =>
        entry.models.includes(parentGroup)
      );
      if (componentData) {
        this.draggedComponent = componentData.instance;
        this.draggedPinModel = parentGroup; // Store the specific pin model being dragged
        this.lastPosition = parentGroup.position.clone(); // Initialize last position
        if (this.controls) this.controls.enabled = false;
        
        // Use new shader manager for drag start
        handleDragStart(this.draggedPinModel);
        
        // this.updateReferencePlane(); // Update plane orientation and position
      } else if (window.jstPinBatterySide1 && parentGroup === window.jstPinBatterySide1) {
        this.draggedComponent = null;
        this.draggedPinModel = window.jstPinBatterySide1;
        this.lastPosition = window.jstPinBatterySide1.position.clone();
        if (this.controls) this.controls.enabled = false;
        handleDragStart(this.draggedPinModel);
      } else if (window.nanoModel && parentGroup === window.nanoModel) {
        // Dragging the nanoModel
        this.draggedComponent = null;
        this.draggedPinModel = window.nanoModel;
        this.lastPosition = window.nanoModel.position.clone();
        if (this.controls) this.controls.enabled = false;
        
        // Use new shader manager for drag start
        handleDragStart(this.draggedPinModel);
        
        // this.updateReferencePlane();
      } else if (window.rgbLEDModel && parentGroup === window.rgbLEDModel) {
        // Dragging the rgbLEDModel
        this.draggedComponent = null;
        this.draggedPinModel = window.rgbLEDModel;
        this.lastPosition = window.rgbLEDModel.position.clone();
        if (this.controls) this.controls.enabled = false;
        
        // Use new shader manager for drag start
        handleDragStart(this.draggedPinModel);
        
        // this.updateReferencePlane();
      } else if (window.tempSensorModel && parentGroup === window.tempSensorModel) {
        // Dragging the tempSensorModel (lesson3)
        this.draggedComponent = null;
        this.draggedPinModel = window.tempSensorModel;
        this.lastPosition = window.tempSensorModel.position.clone();
        if (this.controls) this.controls.enabled = false;
        
        // Use new shader manager for drag start
        handleDragStart(this.draggedPinModel);
        
        // this.updateReferencePlane();
      }
    }
  }

  onMouseMove(event) {
    this.mouseCoord.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseCoord.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoord, this.camera);

    if (this.isDragging && this.draggedPinModel) {
      // Update reference plane orientation and position
      // this.updateReferencePlane();

      // --- SNAPPING LOGIC ---
      // Try to snap the dragged pin or nano to the expansion board
      if (snapIfClose(this.draggedPinModel)) {
        if (this.draggedComponent && this.draggedComponent.updatePosition) {
          this.draggedComponent.updatePosition(this.draggedPinModel.position, this.draggedPinModel);
        } else {
          // For nanoModel, just set its position
          this.draggedPinModel.position.copy(this.draggedPinModel.position);
        }
        // --- REMOVED: No more auto-move of the other female pin ---
        // Enable the Next button after JST pin snap (only for first step)
        if (window.setForwardArrowEnabled && typeof window.getCurrentStep === 'function' && window.getCurrentStep() === 0) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next after battery JST pin snap
        if (window.setForwardArrowEnabled && window.jstPinBatterySide1 && this.draggedPinModel === window.jstPinBatterySide1) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next button after nanoModel snap on step 2
        if (window.setForwardArrowEnabled && typeof window.getCurrentStep === 'function' && window.nanoModel && this.draggedPinModel === window.nanoModel && window.getCurrentStep() === 2) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next button after nanoModel snap for lesson2, step 3 (last step)
        if (window.setForwardArrowEnabled && typeof window.getCurrentStep === 'function' && window.nanoModel && this.draggedPinModel === window.nanoModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson2' && window.getCurrentStep() === 3) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next button after nanoModel snap for lesson3, step 3 (last step)
        if (window.setForwardArrowEnabled && typeof window.getCurrentStep === 'function' && window.nanoModel && this.draggedPinModel === window.nanoModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 3) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next button after jstPin2Side1 or jstPin2Side2 snap (any step)
        if (window.setForwardArrowEnabled && window.jstPin2Side1 && this.draggedPinModel === window.jstPin2Side1) {
          window.setForwardArrowEnabled(true);
        }
        if (window.setForwardArrowEnabled && window.jstPin2Side2 && this.draggedPinModel === window.jstPin2Side2) {
          window.setForwardArrowEnabled(true);
        }
        // Enable Next button after lesson3 components snap
        if (window.setForwardArrowEnabled && window.tempSensorModel && this.draggedPinModel === window.tempSensorModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 1) {
          window.setForwardArrowEnabled(true);
        }
        if (window.setForwardArrowEnabled && window.jstPin3Side1 && this.draggedPinModel === window.jstPin3Side1 && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 2) {
          window.setForwardArrowEnabled(true);
        }
        if (window.setForwardArrowEnabled && window.jstPin3Side2 && this.draggedPinModel === window.jstPin3Side2 && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 2) {
          window.setForwardArrowEnabled(true);
        }
        
        // Add missing lesson3 LED module connection handlers
        if (window.setForwardArrowEnabled && window.rgbLEDModel && this.draggedPinModel === window.rgbLEDModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 4) {
          window.setForwardArrowEnabled(true);
          console.log("[Lesson3] Enabled Next button after LED expansion board connection (step 4)");
        }
        if (window.setForwardArrowEnabled && window.rgbLEDModel && this.draggedPinModel === window.rgbLEDModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3' && window.getCurrentStep() === 5) {
          window.setForwardArrowEnabled(true);
          console.log("[Lesson3] Enabled Next button after LED module connection (step 5)");
        }
        // Notify main scene of snap events
        if (this.onSnap) {
          if (window.secondPin4Female && this.draggedPinModel === window.secondPin4Female) {
            this.onSnap('secondPin4Female');
            // Use new shader manager for snap
            handleSnap('secondPin4Female');
          }
          if (window.jstPinBatterySide1 && this.draggedPinModel === window.jstPinBatterySide1) {
            this.onSnap('jstPinBattery');
            handleSnap('jstPinBattery');
          }
          // Fix: Only emit 'nanoModel' snapType for lesson1, lesson2, or lesson3, step 2
          if (
            window.nanoModel &&
            this.draggedPinModel === window.nanoModel &&
            typeof window.getCurrentLesson === 'function' &&
            (window.getCurrentLesson() === 'lesson1' || window.getCurrentLesson() === 'lesson2' || window.getCurrentLesson() === 'lesson3')
          ) {
            this.onSnap('nanoModel');
            // Use new shader manager for snap
            handleSnap('nanoModel');
          }
          if (window.jstPin2Side1 && this.draggedPinModel === window.jstPin2Side1) {
            this.onSnap('jstPin2Side1');
            // Use new shader manager for snap
            handleSnap('jstPin2Side1');
          }
          if (window.jstPin2Side2 && this.draggedPinModel === window.jstPin2Side2) {
            this.onSnap('jstPin2Side2');
            // Use new shader manager for snap
            handleSnap('jstPin2Side2');
          }
          // Lesson3 snap event notifications
          if (window.tempSensorModel && this.draggedPinModel === window.tempSensorModel) {
            this.onSnap('tempSensorModel');
            // Use new shader manager for snap
            handleSnap('tempSensorModel');
          }
          if (window.jstPin3Side1 && this.draggedPinModel === window.jstPin3Side1) {
            this.onSnap('jstPin3Side1');
            handleSnap('jstPin3Side1');
          }
          if (window.jstPin3Side2 && this.draggedPinModel === window.jstPin3Side2) {
            this.onSnap('jstPin3Side2');
            handleSnap('jstPin3Side2');
          }
          
          // Add LED module snap event notifications for lesson3
          if (window.rgbLEDModel && this.draggedPinModel === window.rgbLEDModel && typeof window.getCurrentLesson === 'function' && window.getCurrentLesson() === 'lesson3') {
            const currentStep = typeof window.getCurrentStep === 'function' ? window.getCurrentStep() : 0;
            if (currentStep === 4) {
              this.onSnap('ledExpansionBoard');
              handleSnap('ledExpansionBoard');
            } else if (currentStep === 5) {
              this.onSnap('ledModule');
              handleSnap('ledModule');
            }
          }
        }
        return;
      }
      // --- END SNAPPING LOGIC ---

      const intersects = this.raycaster.intersectObject(this.referencePlane);
      if (intersects.length > 0) {
        const newPosition = intersects[0].point;
        // Calculate drag direction
        let dragDirection = null;
        if (this.lastPosition) {
          dragDirection = newPosition.clone().sub(this.lastPosition).normalize();
        }
        if (this.draggedComponent && this.draggedComponent.updatePosition) {
          this.draggedComponent.updatePosition(newPosition, this.draggedPinModel);
        } else {
          // For nanoModel, just set its position
          this.draggedPinModel.position.copy(newPosition);
        }
        this.lastPosition = newPosition.clone(); // Update last position
      }
    }
  }

  onMouseUp(event) {
    this.isDragging = false;
    if (this.controls) this.controls.enabled = true;
    
    // Use new shader manager for drag end
    if (this.draggedPinModel) {
      handleDragEnd(this.draggedPinModel);
    }
    try { const mgr = getShaderManager && getShaderManager(); if (mgr && mgr.getDropLabel) { const l = mgr.getDropLabel(); l.visible = false; } } catch (e) {}
    
    this.draggedComponent = null;
    this.draggedPinModel = null;
    this.lastPosition = null; // Reset last position
    // --- NEW LOGIC: Reset wasAutoMoved for all pins on mouse up ---
    for (const entry of this.pinModelsRef) {
      if (entry.instance) {
        entry.instance.wasAutoMoved = false;
      }
    }
  }
};

export class RaycasterSetup2 {
  constructor(
    scene,
    camera,
    stepCounterCallback,
    adjustLedBrightness
  ) {
    if (!RaycasterSetup2.instance) {
      this.scene = scene;
      this.camera = camera;
      // this.controls = controls;
      this.stepCounterCallback = stepCounterCallback;
      this.adjustLedBrightness = adjustLedBrightness;
      this.mouseCoord = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.raycaster.near = 0;
      this.raycaster.far = Infinity;

      this.draggedPinModel = null;
      this.lastPosition = null;
      this.pinModelsRef = Jst2.getAllModels();
      console.log("pinModelsRef initialized:", this.pinModelsRef);

      this.kpLessons = true;
      this.interactiveObjects = [];
      this.isDragging = false;
      this.draggedComponent = null;
      this.originalPosition = null;

      this.referencePlaneGeometry = new THREE.PlaneGeometry(10, 10, 8, 8);
      this.referencePlaneGeometry.rotateX(-Math.PI * 0.5);
      this.referencePlaneMaterial = new THREE.MeshBasicMaterial({
        color: "red",
        transparent: true,
        side: THREE.DoubleSide,
        visible: false,
        opacity: 0.5,
      });
      this.referencePlane = new THREE.Mesh(
        this.referencePlaneGeometry,
        this.referencePlaneMaterial
      );
      this.referencePlane.position.set(0, 2, 0);
      this.scene.add(this.referencePlane);

      window.addEventListener("mousedown", (event) => this.onMouseDown(event));
      window.addEventListener("mousemove", (event) => this.onMouseMove(event));
      window.addEventListener("mouseup", (event) => this.onMouseUp(event));

      RaycasterSetup2.instance = this;
    }
    return RaycasterSetup2.instance;
  }

  refreshPinModelsRef() {
    this.pinModelsRef = Jst2.getAllModels();
    console.log("Refreshed pinModelsRef:", this.pinModelsRef);
  }

  onMouseDown(event) {
    this.mouseCoord.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseCoord.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoord, this.camera);

    const allModels = this.pinModelsRef.flatMap((obj) =>
      obj.models.filter((m) => m.draggable).map((m) => m.model)
    );
    console.log("All draggable models:", allModels);

    const jstIntersects = this.raycaster.intersectObjects(allModels, true);
    console.log("JST intersects:", jstIntersects);

    if (jstIntersects.length > 0) {
      const mesh = jstIntersects[0].object;
      let parentGroup = mesh;
      while (parentGroup.parent && !allModels.includes(parentGroup)) {
        parentGroup = parentGroup.parent;
      }
      console.log("Parent group (pin model):", parentGroup);
      const componentData = this.pinModelsRef.find((entry) =>
        entry.models.some((m) => m.model === parentGroup && m.draggable)
      );
      if (componentData) {
        this.isDragging = true;
        this.draggedComponent = componentData.instance;
        this.draggedPinModel = parentGroup;
        this.originalPosition = parentGroup.position.clone();
        this.lastPosition = parentGroup.position.clone();
        // this.controls.enabled = false;
        console.log(
          "Dragging JST pin:",
          parentGroup,
          "Instance:",
          componentData.instance
        );
      } else {
        console.warn(
          "No component data found for intersected JST pin model:",
          parentGroup
        );
      }
      return;
    }

    const intersects = this.raycaster.intersectObjects(
      this.interactiveObjects,
      true
    );
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      let targetObject = intersectedObject;
      while (
        targetObject.parent &&
        !this.interactiveObjects.includes(targetObject)
      ) {
        targetObject = targetObject.parent;
      }

      if (this.interactiveObjects.includes(targetObject)) {
        this.isDragging = true;
        this.draggedComponent = targetObject;
        this.originalPosition = targetObject.position.clone();
        this.draggedPinModel = null;
        // this.controls.enabled = false;
        console.log(
          "Dragging interactive object:",
          targetObject.name || "Unnamed"
        );
      }
    }
  }

  onMouseMove(event) {
    if (!this.isDragging || !this.draggedComponent) {
      return;
    }

    this.mouseCoord.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseCoord.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoord, this.camera);

    const intersects = this.raycaster.intersectObject(this.referencePlane);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      if (this.draggedComponent instanceof Jst2) {
        if (!this.draggedPinModel) {
          console.warn(
            "onMouseMove: Dragging aborted - missing draggedPinModel for JST pin"
          );
          return;
        }
        // Move in the coordinate space of the immediate parent of the dragged model
        const parent = this.draggedPinModel.parent;
        if (!parent) {
          console.error(
            "draggedPinModel has no parent:",
            this.draggedPinModel
          );
          this.isDragging = false;
          return;
        }
        const localPoint = parent.worldToLocal(point.clone());
        this.draggedPinModel.position.copy(localPoint);
        this.draggedComponent.updatePosition(localPoint, this.draggedPinModel);
      } else if (this.draggedComponent.name === "ldrTestingCube") {
        this.referencePlane.rotation.x = Math.PI * 0.5;
        this.referencePlane.position.set(0, 0, -3.3);
        const parent = this.draggedComponent.parent;
        if (!parent) {
          console.error(
            "draggedComponent has no parent:",
            this.draggedComponent
          );
          this.isDragging = false;
          return;
        }
        const localPoint = parent.position;
        let newY = Math.max(2, Math.min(2.4, intersects[0].point.y));
        this.draggedComponent.position.set(
          this.draggedComponent.position.x,
          newY,
          -3.3
        );
        if (this.stepCounterCallback() === 6) {
          this.adjustLedBrightness(newY);
        }
      } else {
        const parent = this.draggedComponent.parent;
        if (!parent) {
          console.error(
            "draggedComponent has no parent:",
            this.draggedComponent
          );
          this.isDragging = false;
          return;
        }
        const localPoint = parent.worldToLocal(point.clone());
        this.draggedComponent.position.copy(localPoint);
      }
    }
  }

  onMouseUp(event) {
    if (this.isDragging && this.draggedComponent) {
      // console.log("Mouse up, ending drag for:", this.draggedComponent);
    }
    this.isDragging = false;
    this.draggedComponent = null;
    this.originalPosition = null;
    this.draggedPinModel = null;
    this.lastPosition = null;
    // this.controls.enabled = true;
  }

  snapObject(object, targetPosition, component, pinModel, callback) {
    gsap.to(object.position, {
      x: targetPosition.x,
      y: targetPosition.y - 0.01,
      z: targetPosition.z,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        if (component instanceof Jst2 && pinModel) {
          component.updatePosition(object.position, pinModel);
        }
      },
      onComplete: () => {
        if (component instanceof Jst2 && pinModel) {
          component.updatePosition(targetPosition, pinModel);
          const entryIndex = this.pinModelsRef.findIndex((entry) =>
            entry.models.some((m) => m.model === pinModel)
          );
          if (entryIndex !== -1) {
            const entry = this.pinModelsRef[entryIndex];
            const modelEntry = entry.models.find((m) => m.model === pinModel);
            if (modelEntry) {
              modelEntry.draggable = false;
              console.log(`Set ${modelEntry.pinType} draggability to false`);
            }
            console.log("Updated pinModelsRef:", this.pinModelsRef);
          } else {
            console.warn("Pin model not found in pinModelsRef:", pinModel);
          }
        }
        const index = this.interactiveObjects.indexOf(object);
        if (index !== -1) {
          this.interactiveObjects.splice(index, 1);
          console.log("Removed object from interactiveObjects:", object);
        }
        if (callback) callback();
      },
    });
  }

  addInteractiveObjects(...objects) {
    this.interactiveObjects.push(...objects);
    // console.log("Interactive objects updated:", this.interactiveObjects);
  }

  static getInstance() {
    return RaycasterSetup2.instance;
  }
}
