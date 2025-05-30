// src/core/CameraManager.js

import { LEVEL_BOUNDS } from "../config/bounds.js";

export class CameraManager {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.player = null;

        this.createFollowCamera();
    }

    createFollowCamera() {
        this.camera = new BABYLON.FollowCamera("followCam", new BABYLON.Vector3(0, 2, -10), this.scene);

        this.camera.radius = 3;
        this.camera.heightOffset = 2;
        this.camera.rotationOffset = 180;
        this.camera.cameraAcceleration = 0.05;  // Speed of camera adjusting to target
        this.camera.maxCameraSpeed = 20;         // Max speed camera can move

        this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType("FollowCameraPointersInput");

        this.scene.collisionsEnabled = true;
        this.camera.checkCollisions = true;
        this.camera.collisionRadius = new BABYLON.Vector3(0.5, 0.5, 0.5);
        this.camera.moveWithCollisions = true;
    }

    setPlayer(player) {
        this.player = player;
        if (this.camera) {
            this.camera.lockedTarget = this.player.mesh; // Follow the player!
            this._applySmoothingTweaks();           //️ Smooth settings
            
			var target = BABYLON.Matrix.Translation(0,-0.5,0);
			this.camera.getProjectionMatrix().multiplyToRef(target, this.camera.getProjectionMatrix());
        }
    }

    _applySmoothingTweaks() {
        if (!this.camera) return;
        // Fine-tuned smoothness
        this.camera.cameraAcceleration = 0.1;   // Increase acceleration for a more responsive camera
        this.camera.maxCameraSpeed = 5;          // Limit speed for smoothness
        this.camera.radius = 5;                  // Slightly farther back for wider view
        //this.camera.heightOffset = 1.5;          // Small height for a better angle
    }

    resetBehindPlayer() {
        if (!this.player) return;

        const forward = this.player.getDirection(BABYLON.Axis.Z);
        const angle = Math.atan2(forward.x, forward.z) * BABYLON.Angle.RadiansToDegrees(1);

        this.camera.rotationOffset = angle + 180;
    }

    getCamera() {
        return this.camera;
    }
    
    clampCameraPosition() {
        if (!this.camera) return;
    
        const bounds = LEVEL_BOUNDS;
        const halfW = bounds.width / 2;
        const halfD = bounds.depth / 2;
        const margin = 0.3;
    
        const clamp = (val, min, max) => BABYLON.Scalar.Clamp(val, min, max);
    
        this.camera.position.x = clamp(
            this.camera.position.x,
            bounds.center.x - halfW + margin,
            bounds.center.x + halfW - margin
        );
    
        this.camera.position.z = clamp(
            this.camera.position.z,
            bounds.center.z - halfD + margin,
            bounds.center.z + halfD - margin
        );
    
        // Optional: prevent camera from falling below terrain
        this.camera.position.y = Math.max(this.camera.position.y, 0.1);
    }
}
