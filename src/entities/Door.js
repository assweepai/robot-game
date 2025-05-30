// src/entities/Door.js
import { pathname } from '../config/paths.js';

export class Door {
    constructor(scene, shadowGenerator, position, options = {}) {
        this.scene = scene;
        this.position = position.clone();
        this.shadowGenerator = shadowGenerator;

        this.width = options.width || 3.25;
        this.height = options.height || 3;
        this.thickness = options.thickness || 0.3;
        this.isOpen = false;

        this._createDoor();
    }

    _createDoor() {
        this.door = BABYLON.MeshBuilder.CreateBox("door", {
            width: this.width,
            height: this.height,
            depth: this.thickness
        }, this.scene);

        this.closedY = this.position.y + this.height / 2;
        this.openY = this.position.y + this.height * 1.45;

        this.door.position.set(this.position.x, this.closedY, this.position.z);
        this.door.checkCollisions = true;
        this.door.receiveShadows = true;

        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.door);
        }

        const mat = new BABYLON.PBRMaterial("doorMat", this.scene);
        mat.albedoTexture = new BABYLON.Texture(pathname + "/textures/corrugated.jpg", this.scene);
        mat.metallic = 0.1;
        mat.roughness = 0.9;
        mat.albedoColor = new BABYLON.Color3(1, 1, 1);

        this.door.material = mat;

        this._enablePhysics();
    }

    _enablePhysics() {
        this.door.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.door,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.1, friction: 0.8 },
            this.scene
        );
    }

    open() {
        if (this.isOpen) return;
        this._animateDoor(this.closedY, this.openY, false);
        this.isOpen = true;
    }

    close() {
        if (!this.isOpen) return;
        this._animateDoor(this.openY, this.closedY, true);
        this.isOpen = false;
    }

    _animateDoor(fromY, toY, restorePhysics) {
        if (this.door.physicsImpostor) {
            this.door.physicsImpostor.dispose();
            this.door.physicsImpostor = null;
        }

        const animation = new BABYLON.Animation("doorSlide", "position.y", 60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        animation.setKeys([
            { frame: 0, value: fromY },
            { frame: 20, value: toY }
        ]);

        this.door.animations = [animation];

        this.scene.beginAnimation(this.door, 0, 20, false, 1, () => {
            if (restorePhysics) {
                this._enablePhysics();
            }
        });
    }

    dispose() {
        this.door?.dispose();
    }
}
