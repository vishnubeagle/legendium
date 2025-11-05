import {
    Mesh,
    MeshStandardMaterial,
    TubeGeometry,
    Vector3,
    CatmullRomCurve3,
  } from "three";
  
  export class Wire {
    constructor(wireConfig, scene = null) {
      this.wireConfig = wireConfig;
      this.scene = scene;
      this.wire = null;
      this.curve = null; // Ensure curve is initialized
      this.createGeometry();
    }
  
    createCurve(start, end) {
      const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y += 0.1;
      this.curve = new CatmullRomCurve3([start, mid, end]);
    }
  
    createGeometry() {
      const { startPosition, endPosition, color } = this.wireConfig;
      this.createCurve(startPosition, endPosition);
  
      const geometry = new TubeGeometry(this.curve, 20, 0.002, 8, false);
      const material = new MeshStandardMaterial({ color });
      this.wire = new Mesh(geometry, material);
      // Only add to scene if scene is provided
      if (this.scene) {
        this.scene.add(this.wire);
      }
    }
  
    updateWire(newEnd) {
      this.wireConfig.endPosition.copy(newEnd);
      this.createCurve(this.wireConfig.startPosition, this.wireConfig.endPosition);
  
      const newGeometry = new TubeGeometry(this.curve, 20, 0.002, 8, false);
      if (!this.wire) {
        this.wire = new Mesh(newGeometry, new MeshStandardMaterial({ color: this.wireConfig.color }));
        if (this.scene) {
          this.scene.add(this.wire);
        }
        return;
      }
      if (this.wire.geometry) {
        this.wire.geometry.dispose();
      }
      this.wire.geometry = newGeometry;
    }
  
    dispose() {
      if (this.wire) {
        if (this.scene) {
          this.scene.remove(this.wire);
        }
        this.wire.geometry.dispose();
        this.wire.material.dispose();
        this.wire = null;
      }
    }
  }