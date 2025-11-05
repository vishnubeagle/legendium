import * as THREE from "three";
import getChildrenMesh from "./getChildrenMesh";
import { allAssets } from "../../commonFiles/assetsLoader";
import { Text } from "troika-three-text";

export default function Sidepanel(initialMesh, initialText) {
  let screen = getChildrenMesh(allAssets.models.gltf.roboticsLab, "screen");
  const elements = [];
  const elementSize = 1;
  let myText = null;
  let elementGeometry = null;
  let elementMaterial = null;

  function createText(textContent) {
    if (myText) {
      console.log("Removing previous text:", myText.text);
      screen.remove(myText);
      myText.dispose();
      myText.sync();
      myText = null;
    }
    myText = new Text();
    myText.materialType = THREE.MeshBasicMaterial;
    myText.material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // bright white
      side: THREE.DoubleSide,
      transparent: true,
    });

    myText.text = textContent || "";
    myText.fontSize = 0.2;
    myText.anchorX = "left";
    myText.position.set(-2.3, 0.2, 0.1);
    myText.maxWidth = 5.0;
    myText.textAlign = "left";
    myText.whiteSpace = "normal";
    myText.overflowWrap = "break-word";
    myText.lineHeight = 1.2;
    myText.visible = true;
    myText.fontWeight = "bold";
    myText.fontSize = 0.15;
    screen.add(myText);
    myText.sync(() => {
      // console.log(
      //   "Created new text:",
      //   myText.text,
      //   "Visible:",
      //   myText.visible,
      //   "Position:",
      //   myText.position
      // );
      // console.log("Screen children:", screen.children);
    });
  }

  // Function to add a single mesh to the side panel
  function addElement(mesh, name, textContent) {
    elementGeometry = new THREE.PlaneGeometry(
      elementSize,
      elementSize,
      1,
      1
    );
    elementMaterial = new THREE.MeshBasicMaterial({
      color: "white",
      side: THREE.DoubleSide,
    });
    const element = new THREE.Mesh(elementGeometry, elementMaterial);
    element.name = name;
    screen.add(element);

    // Clone the mesh and ensure it has a unique material
    const clonedMesh = mesh.clone();
    if (clonedMesh.name === "buzzerSensor") {
      clonedMesh.scale.set(0.0025, 0.0025, 0.0025);
    } else {
      clonedMesh.scale.set(0.05, 0.05, 0.05);
    }

    clonedMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.transparent = false;
        child.material.opacity = 1.0;
      }
    });
    element.add(clonedMesh);

    // Position element
    element.position.set(0, 0.7, 0.1);
    element.visible = true;
    elements.push(element);

    // Create and add text
    createText(textContent);
  }

  // Function to update the side panel with a new mesh and text
  function updateElement(newMesh, name, newText) {
    // Remove previous element if it exists
    removePreviousElement();

    // Add new element with updated text
    addElement(newMesh, name, newText);
  }

  function updateTextOnly(newText) {
    // Remove previous element if it exists
    removePreviousElement();

    // Update existing text if possible, otherwise create new
    if (myText) {
      myText.text = newText || "";
      myText.visible = true; // Ensure visibility
      myText.sync(() => {
        console.log(
          "Updated text to:",
          myText.text,
          "Visible:",
          myText.visible
        );
      });
    } else {
      createText(newText);
    }
  }

  // Helper function to remove previous element
  function removePreviousElement() {
    if (elements.length > 0) {
      const prevElement = elements.pop();
      if (prevElement.parent) {
        prevElement.parent.remove(prevElement);
        // Dispose of geometry and material of the element
        if (prevElement.geometry) {
          prevElement.geometry.dispose();
        }
        if (prevElement.material) {
          prevElement.material.dispose();
        }
        // Dispose of materials in cloned meshes
        prevElement.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.dispose();
          }
        });
      }
    }
  }

  // Dispose function to clean up all resources
  function dispose() {
    // Remove and dispose of all elements
    while (elements.length > 0) {
      const element = elements.pop();
      if (element.parent) {
        element.parent.remove(element);
      }
      // Dispose of geometry and material
      if (element.geometry) {
        element.geometry.dispose();
      }
      if (element.material) {
        element.material.dispose();
      }
      // Dispose of materials in cloned meshes
      element.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.dispose();
        }
      });
    }

    // Dispose of shared geometry and material
    if (elementGeometry) {
      elementGeometry.dispose();
      elementGeometry = null;
    }
    if (elementMaterial) {
      elementMaterial.dispose();
      elementMaterial = null;
    }

    // Dispose of text
    if (myText) {
      screen.remove(myText);
      myText.dispose();
      myText.sync();
      myText = null;
    }

    // Nullify references
    screen = null;
  }

  // Initialize with the first mesh and text
  if (initialMesh) {
    addElement(initialMesh, initialMesh.name, initialText);
  }

  return {
    elements,
    addElement,
    updateElement,
    updateTextOnly,
    dispose,
  };
}