// src/controllers/ClimbController.js

import { removeMass, resetMass } from '../utils/PhysicsUtils.js';

export class ClimbController {
    constructor(player, scene, inputManager) {
        this.player = player;
        this.scene = scene;
        this.inputManager = inputManager;
        this.removeMass = removeMass;
        this.resetMass = resetMass;

        // Pull tuning from player.config
        this.stickForce = this.player.config.climbStickForce;
        this.climbSpeed = this.player.config.climbSpeed;
        this.jumpBackLateral = this.player.config.climbJumpBackLateral;
        this.jumpBackVertical = this.player.config.climbJumpBackVertical;
        this.spinDurationFrames = this.player.config.climbSpinDurationFrames;

        this.isClimbing = false;
        this.climbTarget = null;
        this.climbCooldownTimer = 0;

        this._setupClimbDetection();
    }

    update() {
        if (this.climbCooldownTimer > 0) {
            this.climbCooldownTimer -= this.scene.getEngine().getDeltaTime();
            return;
        }
        if (!this.player.mesh || !this.player.mesh.physicsImpostor) return;

        this._updateClimbing();
        this._checkStandingOnCube();
    }

    _updateClimbing() {
        const isClimbable = this.player.climbTarget;
        if (!isClimbable) {
            this.exitClimb();
            return;
        }

        const rayOrigin = this.player.mesh.position.clone();
        rayOrigin.y += 0.4;
        const forward = this.player.mesh.getDirection(BABYLON.Axis.Z);
        const ray = new BABYLON.Ray(rayOrigin, forward, 0.75);

        const hit = this.scene.pickWithRay(ray, mesh => mesh === isClimbable);

        if (!hit?.pickedMesh) {
            this.exitClimb();
            return;
        }

        this.isClimbing = true;
        this.player.isClimbing = true;

        if (this.player.animationController.forcedState === 'jump') {
            this.player.animationController.forcedState = null;
        }

        if (this.inputManager.keys.jumpPressed) {
            this.jumpBackFromWall(forward);
            return;
        }

        if (this.player.isOnTopFace && this.player.standingOnCube === isClimbable) {
            this.exitClimb();
            return;
        }

        if (hit.getNormal) {
            const wallNormal = hit.getNormal(true);
            const climbForward = wallNormal.negate().normalize();
            const up = new BABYLON.Vector3(0, 1, 0);
            const right = BABYLON.Vector3.Cross(up, climbForward).normalize();
            const adjustedUp = BABYLON.Vector3.Cross(climbForward, right).normalize();
            const targetQuat = BABYLON.Quaternion.RotationQuaternionFromAxis(right, adjustedUp, climbForward);

            if (!this.player.mesh.rotationQuaternion) {
                this.player.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
            }

            this.player.mesh.rotationQuaternion = BABYLON.Quaternion.Slerp(
                this.player.mesh.rotationQuaternion,
                targetQuat,
                0.2
            );
        }

        const move = new BABYLON.Vector3(
            (this.inputManager.keys.right ? 1 : 0) - (this.inputManager.keys.left ? 1 : 0),
            (this.inputManager.keys.forward ? 1 : 0) - (this.inputManager.keys.back ? 1 : 0),
            0
        );

        if (move.length() < 0.5) move.set(0, 0, 0);

        const wallNormal = hit.getNormal?.(true)?.normalize?.() ?? BABYLON.Vector3.Zero();
        const stickForce = wallNormal.scale(-this.stickForce);
        
        const body = this.player.mesh.physicsImpostor.physicsBody;        

        const climbMotion = (() => {
            if (move.lengthSquared() > 0) {
                const right = this.player.mesh.getDirection(BABYLON.Axis.X);
                const up = new BABYLON.Vector3(0, 1, 0);

                let worldMove = right.scale(move.x).add(up.scale(move.y));

                if (move.x !== 0 && move.y === 0) worldMove.y = 0.15;

                worldMove = worldMove.normalize().scale(this.climbSpeed);

                const finalVelocity = worldMove.add(stickForce);
                this.player.mesh.physicsImpostor.setLinearVelocity(finalVelocity);
                this.removeMass(this.player.mesh);
                
                return worldMove.add(stickForce);
            }
            return stickForce;
        })();

        this.player.mesh.physicsImpostor.setLinearVelocity(climbMotion);
        this.removeMass(this.player.mesh);

        const isMovingDuringClimb =
            this.inputManager.keys.left ||
            this.inputManager.keys.right ||
            this.inputManager.keys.forward ||
            this.inputManager.keys.back;
            
        if (!isMovingDuringClimb) {
            if (!this._yLockSet) {
                this._yLock = this.player.mesh.position.y;
                this._yLockSet = true;
            }
            this.player.animationController.pauseAnim('climbwall');
            this.player.mesh.position.y = this._yLock;
        } else {
            this._yLockSet = false;
            this.player.animationController.resumeAnim('climbwall');
        }            
    }

    startClimbUpTransition(isClimbable) {
        if (this.player.isOnTopFace || this.player.isClimbingUp) return;

        this.player.isClimbingUp = true;
        this.player.isClimbing = true;
        this.player.isHanging = false;
        this.resetMass(this.player.mesh);

        this.player.inputManager.clearKeys();
        this.player.animationController.forcedState = 'climbup';

        const forward = this.player.mesh.getDirection(BABYLON.Axis.Z).normalize();
        const stepUp = new BABYLON.Vector3(0, 0.8, 0);
        const stepForward = forward.scale(0.6);

        setTimeout(() => {
            const moveVector = stepUp.add(stepForward);
            this.player.mesh.position.addInPlace(moveVector);

            this.player.isClimbingUp = false;
            this.player.isClimbing = false;
            this.player.isHanging = false;
            this.player.ledgeHangController.climbTriggered = false;
            this.player.ledgeHangController.stopHanging();
            this.player.isGrounded = true;
            this.player.canJump = true;
            this.player.animationController.forcedState = null;
        }, 1925);

        this.player.currentClimbTarget = null;
    }

    jumpBackFromWall(forward) {
        this.player.animationController.forcedState = 'jump';
        this.player.stateMachine.setState('jump');
        const jumpBack = forward.negate().normalize();
        const impulse = new BABYLON.Vector3(
            jumpBack.x * this.jumpBackLateral,
            this.jumpBackVertical,
            jumpBack.z * this.jumpBackLateral
        );

        this.player.mesh.physicsImpostor.setLinearVelocity(impulse);

        this.resetMass(this.player.mesh);
        this.isClimbing = false;
        this.player.isClimbing = false;
        this.climbCooldownTimer = 500;

        this._rotatePlayerBackwards(jumpBack);
        this.inputManager.keys.jumpPressed = false;
    }

    _rotatePlayerBackwards(targetDirection) {
        if (!this.player.mesh.rotationQuaternion) {
            this.player.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
        }

        const up = new BABYLON.Vector3(0, 1, 0);
        const right = BABYLON.Vector3.Cross(up, targetDirection).normalize();
        const adjustedUp = BABYLON.Vector3.Cross(targetDirection, right).normalize();

        const targetQuat = BABYLON.Quaternion.RotationQuaternionFromAxis(right, adjustedUp, targetDirection);

        BABYLON.Animation.CreateAndStartAnimation(
            "spinBack",
            this.player.mesh,
            "rotationQuaternion",
            60,
            this.spinDurationFrames,
            this.player.mesh.rotationQuaternion.clone(),
            targetQuat,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    exitClimb() {
        this.resetMass(this.player.mesh);
        this.isClimbing = false;
        this.player.isClimbing = false;
    }

    _setupClimbDetection() {
        this.scene.registerBeforeRender(() => {
            const climbableMeshes = this.scene.meshes.filter(m => m.metadata?.isClimbable);
            for (let mesh of climbableMeshes) {
                if (this.player.hitbox.intersectsMesh(mesh, true)) {
                    this.player.canClimb = true;
                    this.player.climbTarget = mesh;
                    return;
                }
            }
    
            this.player.canClimb = false;
            this.player.climbTarget = null;
        });
    }

    _checkStandingOnCube() {
        const ray = new BABYLON.Ray(this.player.mesh.position, BABYLON.Axis.Y.scale(-1), 0.6);
        const hit = this.scene.pickWithRay(ray, mesh => mesh?.metadata?.isClimbable);

        if (hit && hit.pickedMesh) {
            this.player.isOnTopFace = true;
            this.player.standingOnCube = hit.pickedMesh;
        } else {
            this.player.isOnTopFace = false;
        }
    }
}
