// src/controllers/MovementController.js

export class MovementController {
    constructor(player, inputManager) {
        this.player = player;
        this.inputManager = inputManager;
        this.scene = player.scene;

        this.jumpForce = player.config.jumpForce;
        this.runSpeed = player.config.runSpeed;
        this.walkSpeed = player.config.walkSpeed;
    }

    updateMovement(deltaTime) {
        if (this.player.isClimbing || this._isLockedByForcedState()) return;

        const moveDirection = new BABYLON.Vector3.Zero();
        const keys = this.inputManager.keys;

        if (keys.forward) moveDirection.z += 1;
        if (keys.back) moveDirection.z -= 1;
        if (keys.left) moveDirection.x -= 1;
        if (keys.right) moveDirection.x += 1;

        if (moveDirection.lengthSquared() > 0.01) {
            moveDirection.normalize();

            let speed = keys.run ? this.runSpeed : this.walkSpeed;
            if (!this.player.isGrounded) speed *= 0.4;
            if (this.player.isCarrying) speed *= 0.75;

            const forward = this.player.mesh.forward.normalize();
            const right = this.player.mesh.right.normalize();

            const worldMove = new BABYLON.Vector3(
                right.x * moveDirection.x + forward.x * moveDirection.z,
                0,
                right.z * moveDirection.x + forward.z * moveDirection.z
            );

            const currentVel = this.player.mesh.physicsImpostor.getLinearVelocity();
            const desiredVel = worldMove.normalize().scale(speed);

            this.player.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(
                desiredVel.x,
                currentVel.y,
                desiredVel.z
            ));
        } else if (this.player.isGrounded) {
            const vel = this.player.mesh.physicsImpostor.getLinearVelocity();
            this.player.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(
                vel.x * 0.9,
                vel.y,
                vel.z * 0.9
            ));
        }
    }

    updateRotation() {
        let x = 0, y = 0;
        if (this.inputManager.isMouseDown) {
            x = this.inputManager.mouseX * 0.1;
            y = this.inputManager.mouseY * 0.1;
        }

        if (Math.abs(x) > 0.1) {
            const turnAmount = x * 0.03;
            if (!this.player.mesh.rotationQuaternion) {
                this.player.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
            }
            const deltaQuat = BABYLON.Quaternion.FromEulerAngles(0, turnAmount, 0);
            this.player.mesh.rotationQuaternion = this.player.mesh.rotationQuaternion.multiply(deltaQuat);
        }

        if (this.player.camera?.heightOffset !== undefined) {
            const tiltSensitivity = 0.05;
            const damping = 0.9;
            const minHeight = 0;
            const maxHeight = 12.0;

            if (Math.abs(y) > 0.1) {
                this.player.verticalTiltVelocity += y * tiltSensitivity;
            }

            this.player.camera.heightOffset += this.player.verticalTiltVelocity;
            this.player.camera.heightOffset = BABYLON.Scalar.Clamp(
                this.player.camera.heightOffset,
                minHeight,
                maxHeight
            );

            this.player.verticalTiltVelocity *= damping;
        }

        this.inputManager.mouseX = 0;
        this.inputManager.mouseY = 0;
    }

    updateJump() {
        const keys = this.inputManager.keys;

        if (!keys.jumpPressed) return;
        this.inputManager.keys.jumpPressed = false;

        if (this._isLockedByForcedState()) return;

        if (this.player.isCarrying && this.player.pickupController.heldCube) {
            this.player.pickupController._dropCurrent();
        }

        if (this.player.isGrounded && this.player.canJump) {
            const vel = this.player.mesh.physicsImpostor.getLinearVelocity();
            this.player.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vel.x, this.jumpForce, vel.z));
            this.player.canJump = false;
            this.player.isGrounded = false;
            
            this.player.animationController.forcedState = 'jump';
            this.player.stateMachine.setState('jump');            
        }
    }

    _isLockedByForcedState() {
        const s = this.player.animationController.forcedState;
        return s === 'punch' || s === 'kick' || s === 'climbup';
    }
}
