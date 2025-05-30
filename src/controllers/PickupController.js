import { removeMass, resetMass } from '../utils/PhysicsUtils.js';
import { LEVEL_BOUNDS } from "../config/bounds.js";

export class PickupController {
    constructor(player, scene, inputManager) {
        this.player = player;
        this.scene = scene;
        this.inputManager = inputManager;
        this.removeMass = removeMass;
        this.resetMass = resetMass;

        this.heldCube = null;
        this.animationSpeed = 5; // interpolation multiplier
        this.throwScheduled = false;
    }

    update(deltaTime) {
        if (!this.player.cubes || !this.player.canMove) return;

        const blocked = ['punch', 'kick', 'climbup'].includes(this.player.animationController.forcedState);
        if (blocked) return;

        // THROW if holding and combat input is pressed
        if (this.heldCube && !this.throwScheduled && (this.inputManager.keys.punchPressed || this.inputManager.keys.kickPressed)) {

            this._scheduleThrow();
            this.inputManager.keys.punchPressed = false;
            this.inputManager.keys.kickPressed = false;
        }

        // Pickup/drop toggle
        if (this.inputManager.keys.pickupPressed) {
            this.inputManager.keys.pickupPressed = false;

            if (!this.heldCube) {
                this._attemptPickup();
            } else {
                this._dropCurrent();
            }
        }

        this._animatePickup(deltaTime);
    }

    _attemptPickup() {
        for (const mesh of this.player.cubes) {
            if (!mesh.metadata?.isMovable || mesh.metadata?.isClimbable) continue;
    
            const intersects = this.player.hitbox.intersectsMesh(mesh, true);
            if (!intersects) continue;
    
            this.heldCube = mesh;
    
            mesh._originalPhysics = {
                mass: mesh.physicsImpostor?.getParam("mass") || 2,
                friction: mesh.physicsImpostor?.getParam("friction") || 1,
                restitution: mesh.physicsImpostor?.getParam("restitution") || 0.0
            };
    
            if (mesh.physicsImpostor) {
                mesh.physicsImpostor.dispose();
                mesh.physicsImpostor = null;
            }
    
            const worldPos = mesh.getAbsolutePosition().clone();
            mesh.setParent(this.player.mesh);
    
            mesh.metadata = mesh.metadata || {};
            mesh.metadata.pickupAnimationProgress = 0;
            mesh.metadata.pickupStartPos = worldPos;
            mesh.metadata.pickupTargetPos = this.player.carryOffset.clone();
            
            mesh.metadata.heldByPlayer = true;
    
            break;
        }
    }

    _dropCurrent() {
        if (!this.heldCube) return;

        this.heldCube.setParent(null);

        this.heldCube.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.heldCube,
            BABYLON.PhysicsImpostor.BoxImpostor,
            {
                mass: this.heldCube._originalPhysics?.mass || 2,
                friction: this.heldCube._originalPhysics?.friction || 1,
                restitution: this.heldCube._originalPhysics?.restitution || 0.0
            },
            this.scene
        );
        
        this.heldCube.metadata.heldByPlayer = false;

        delete this.heldCube._originalPhysics;
        this.heldCube = null;
    }

    _animatePickup(deltaTime) {
        if (!this.heldCube || !this.heldCube.metadata) return;

        const meta = this.heldCube.metadata;
        if (meta.pickupAnimationProgress === undefined) return;

        meta.pickupAnimationProgress += deltaTime * this.animationSpeed;
        if (meta.pickupAnimationProgress >= 1) meta.pickupAnimationProgress = 1;

        const interpolated = BABYLON.Vector3.Lerp(
            meta.pickupStartPos,
            meta.pickupTargetPos,
            meta.pickupAnimationProgress
        );

        this.heldCube.position.copyFrom(interpolated);

        if (meta.pickupAnimationProgress === 1) {
            delete meta.pickupAnimationProgress;
            delete meta.pickupStartPos;
            delete meta.pickupTargetPos;
        }
    }

    _scheduleThrow() {
        const cube = this.heldCube;
        if (!cube) return;
    
        this.throwScheduled = true;
    
        // Play punch animation (non-FSM, local animation group only)
        const punchAnim = this.scene.getAnimationGroupByName("punch");
        if (punchAnim) {
            punchAnim.reset();
            punchAnim.start(false, 1.5);
        }
    
        // Delay until animation finishes
        setTimeout(() => {
            this._doThrow(cube);
            this.throwScheduled = false;
        }, 400); // match delay to punch wind-up timing
    }

    _doThrow(cube) {
        this.heldCube = null;
        cube.setParent(null);

        cube.physicsImpostor = new BABYLON.PhysicsImpostor(
            cube,
            BABYLON.PhysicsImpostor.BoxImpostor,
            {
                mass: cube._originalPhysics?.mass || 2,
                friction: cube._originalPhysics?.friction || 0.5,
                restitution: cube._originalPhysics?.restitution || 0.3
            },
            this.scene
        );

        const forward = this.player.mesh.getDirection(BABYLON.Axis.Z).normalize();
        const arc = new BABYLON.Vector3(forward.x, 0.35, forward.z).normalize();
        const force = 8;

        cube.physicsImpostor.setLinearVelocity(arc.scale(force));

        delete cube._originalPhysics;
    }
    
    getAdjustedCarryOffset(cube) {
        const boundingBox = cube.getBoundingInfo().boundingBox;
        const cubeHeight = boundingBox.maximum.y - boundingBox.minimum.y;
    
        const raiseBias = 0.5;
        const forwardBias = 0.675;
        const easingFactor = Math.min(cubeHeight, 1.5);
    
        const localOffset = new BABYLON.Vector3(
            0,
            cubeHeight * raiseBias,
            cubeHeight * forwardBias * (1.1 - 0.1 * easingFactor)
        );
    
        const worldOffset = BABYLON.Vector3.TransformCoordinates(localOffset, this.player.mesh.getWorldMatrix());
    
        const halfW = LEVEL_BOUNDS.width / 2;
        const halfD = LEVEL_BOUNDS.depth / 2;
        const center = LEVEL_BOUNDS.center;
        const margin = 0.3;
    
        // First define clamped values
        const clampedX = BABYLON.Scalar.Clamp(worldOffset.x, center.x - halfW + margin, center.x + halfW - margin);
        const clampedZ = BABYLON.Scalar.Clamp(worldOffset.z, center.z - halfD + margin, center.z + halfD - margin);
    
        // Then compare to see if they were clamped
        const clamped = (clampedX !== worldOffset.x || clampedZ !== worldOffset.z);
        this.isClamped = clamped;
    
        worldOffset.x = clampedX;
        worldOffset.z = clampedZ;
    
        const invWorld = this.player.mesh.getWorldMatrix().clone().invert();
        const clampedLocal = BABYLON.Vector3.TransformCoordinates(worldOffset, invWorld);
    
        return clampedLocal;
    }
   
}
