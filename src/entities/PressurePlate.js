// src/entities/PressurePlate.js
import { pathname } from '../config/paths.js';

export class PressurePlate {
    constructor(scene, position, size, options = {}) {
        this.scene = scene;
        this.position = position.clone();
        this.size = size.clone();

        this.onActivate = options.onActivate || (() => {});
        this.onDeactivate = options.onDeactivate || (() => {});
        this.triggeredBy = options.triggeredBy || ['player', 'cube'];

        this.isPressed = false;
        this.mesh = null;
        this.baseMesh = null;
        this.triggerZone = null;

        this._createMesh();
    }

    _createMesh() {
        const baseHeight = this.size.y * 0.6;

        // Base mesh (metal frame)
        this.baseMesh = BABYLON.MeshBuilder.CreateBox("pressurePlateBase", {
            width: this.size.x * 1.35,
            height: baseHeight,
            depth: this.size.z * 1.35
        }, this.scene);

        this.baseMesh.position.copyFrom(this.position);
        this.baseMesh.receiveShadows = true;
        this.baseMesh.isPickable = false;

        const baseMat = new BABYLON.PBRMaterial("pressurePlateBaseMat", this.scene);
        baseMat.albedoTexture = new BABYLON.Texture(pathname + "/textures/pressureplatebase.jpg", this.scene);
        baseMat.roughness = 1;
        baseMat.metallic = 1;
        this.baseMesh.material = baseMat;

        this.baseMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.baseMesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, friction: 1, restitution: 0 },
            this.scene
        );

        // Top interactive plate
        this.mesh = BABYLON.MeshBuilder.CreateBox("pressurePlate", {
            width: this.size.x,
            height: this.size.y,
            depth: this.size.z
        }, this.scene);

        this.mesh.position.set(this.position.x, this.position.y + 0.06, this.position.z);
        this.mesh.receiveShadows = true;
        this.mesh.isPickable = false;

        const plateMat = new BABYLON.PBRMaterial("pressurePlateMat", this.scene);
        plateMat.albedoTexture = new BABYLON.Texture(pathname + "/textures/pressureplate.jpg", this.scene);
        plateMat.roughness = 1;
        plateMat.metallic = 0;
        this.mesh.material = plateMat;

        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, friction: 1, restitution: 0 },
            this.scene
        );

        // Invisible trigger volume
        this.triggerZone = BABYLON.MeshBuilder.CreateBox("pressurePlateTrigger", {
            width: this.size.x,
            height: this.size.y,
            depth: this.size.z
        }, this.scene);

        this.triggerZone.position = this.mesh.position.clone();
        this.triggerZone.position.y += 0.1;
        this.triggerZone.isVisible = false;
        this.triggerZone.isPickable = true;
        this.triggerZone.checkCollisions = false;
        this.triggerZone.doNotSyncBoundingInfo = true;
    }

    checkActivation(targetMeshes) {
        let activated = false;

        for (const mesh of targetMeshes) {
            if (!mesh) continue;
            if (this.triggerZone.intersectsMesh(mesh, true)) {
                activated = true;
                break;
            }
        }

        if (activated !== this.isPressed) {
            if (activated) {
                this._activate();
            } else {
                this._deactivate();
            }
        }
    }

    _activate() {
        this.isPressed = true;
        this.mesh.position.y -= 0.05;
        this.onActivate();
    }

    _deactivate() {
        this.isPressed = false;
        this.mesh.position.y += 0.05;
        this.onDeactivate();
    }

    dispose() {
        this.mesh?.dispose();
        this.baseMesh?.dispose();
        this.triggerZone?.dispose();
    }
}
