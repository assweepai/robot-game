import { removeMass, resetMass } from '../utils/PhysicsUtils.js';

export class LedgeHangController {
    constructor(player, scene, inputManager) {
        this.player = player;
        this.scene = scene;
        this.inputManager = inputManager;
        this.removeMass = removeMass;
        this.resetMass = resetMass;

        // Bind config values individually
        this.detectionRange = this.player.config.ledgeHangDetectionRange;
        this.minYDiff = this.player.config.ledgeHangMinYDiff;
        this.maxYDiff = this.player.config.ledgeHangMaxYDiff;
        this.shimmySpeed = this.player.config.ledgeHangShimmySpeed;
        this.forwardRayLength = this.player.config.ledgeHangForwardRayLength;
        this.dropImpulseY = this.player.config.ledgeHangDropImpulseY;
        this.lerpDropDistance = this.player.config.ledgeHangLerpDropDistance;

        this.climbable = null;
        this.isHanging = false;
        this.hangingLedge = null;
        this.climbTriggered = false;
        this.hangYLock = null;
        this.hangForwardLock = null;
    }

    update() {
        if (this.isHanging) {
            this._handleHangingLogic();
        } else {
            this._detectAndStartHanging();
        }
    }

    _detectAndStartHanging() {
        const rayOrigin = this.player.mesh.position.clone();
        const forward = this.player.mesh.getDirection(BABYLON.Axis.Z);
        const ray = new BABYLON.Ray(rayOrigin, forward, this.detectionRange);

        const hit = this.scene.pickWithRay(ray, mesh => mesh?.metadata?.isClimbable);

        if (hit?.pickedMesh) {
            this.climbable = hit.pickedMesh;
            const topY = this.climbable.getBoundingInfo().boundingBox.maximumWorld.y;

            if (this.isBetween(this.player.mesh.position.y, (topY - this.maxYDiff), (topY - this.minYDiff))) {
                this.startHanging(this.climbable);
                this.player.canMove = false;
                setTimeout(() => {
                    this.player.canMove = true;
                }, 500);
            }
        }
    }

    isBetween(number, min, max) {
        return number >= min && number <= max;
    }

    startHanging(ledge) {
        this.isHanging = true;
        this.hangingLedge = ledge;

        this.player.isHanging = true;
        this.player.isClimbing = true;

        const body = this.player.mesh.physicsImpostor.physicsBody;
        body.mass = 0;
        body.updateMassProperties();

        this.player.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        
        if (this.player.isClimbingUp) return;

        const anim = BABYLON.Animation.CreateAndStartAnimation(
            "climbForwardLerp",
            this.player.mesh,
            "position",
            60,
            10,
            this.player.mesh.position.clone(),
            this.player.mesh.position.add(this.player.mesh.forward.scale(0.2)),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Set hang locks AFTER lerp completes
        anim.onAnimationEndObservable.addOnce(() => {
            this.hangYLock = this.player.mesh.position.y;
            const anchorPoint = this.player.mesh.position.clone();
            const direction = this.player.mesh.getDirection(BABYLON.Axis.Z).normalize();
            const playerToAnchor = this.player.mesh.position.subtract(anchorPoint);
            const distance = BABYLON.Vector3.Dot(playerToAnchor, direction);
        
            this.hangForwardLock = {
                surfaceNormal: direction.negate(),     // opposite of forward vector
                anchorPoint: this.player.mesh.position.clone()
            };
        });        
    }

    stopHanging() {
        this.isHanging = false;
        this.hangingLedge = null;
        this.hangYLock = null;
        this.hangForwardLock = null;

        this.player.isHanging = false;
        this.player.isClimbing = false;

        if (this.player.animationController.forcedState === 'shimmyleft' || this.player.animationController.forcedState === 'shimmyright') {
            this.player.animationController.forcedState = null;
        }

        this.resetMass(this.player.mesh);
    }

    _handleHangingLogic() {
        if (this.inputManager.keys.left) {
            const left = this.player.mesh.getDirection(BABYLON.Axis.X).negate();
            let moveVec = left.normalize().scale(this.shimmySpeed);
            this.player.mesh.position.addInPlace(moveVec);
        } else if (this.inputManager.keys.right) {
            const right = this.player.mesh.getDirection(BABYLON.Axis.X);
            let moveVec = right.normalize().scale(this.shimmySpeed);
            this.player.mesh.position.addInPlace(moveVec);
        }

        if (this.hangYLock !== null) {
            this.player.mesh.position.y = this.hangYLock;
        }

        if (this.hangForwardLock) {
            const { surfaceNormal, anchorPoint } = this.hangForwardLock;
        
            // Vector from anchor to player
            const playerToAnchor = this.player.mesh.position.subtract(anchorPoint);
        
            // Project playerToAnchor onto the normal
            const distFromSurface = BABYLON.Vector3.Dot(playerToAnchor, surfaceNormal);
            const correction = surfaceNormal.scale(distFromSurface);
        
            // Subtract that component → pushes player back onto the ledge plane
            this.player.mesh.position.subtractInPlace(correction);
        }      

        const forward = this.player.mesh.getDirection(BABYLON.Axis.Z);
        const rayOrigin = this.player.mesh.position.clone();
        const ray = new BABYLON.Ray(rayOrigin, forward, this.forwardRayLength);
        const hit = this.scene.pickWithRay(ray, mesh => mesh?.metadata?.isClimbable);

        if (!hit || !hit.pickedMesh) {
            this.stopHanging();
            if (this.player.mesh.physicsImpostor) {
                this.player.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, this.dropImpulseY, 0));
            }
            return;
        }

        if (this.inputManager.keys.forward && this.player.isHanging && !this.player.isClimbingUp && !this.climbTriggered) {
            this.climbTriggered = true;
            this.player.climbController.startClimbUpTransition(this.climbable);
            this.stopHanging();
            return;
        }

        if (this.inputManager.keys.back) {
            this._lerpBackAndDrop();
            return;
        }

        if (this.player.mesh.physicsImpostor) {
            this.player.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        }
    }

    _lerpBackAndDrop() {
        this.player.isClimbing = false;

        const backward = this.player.mesh.getDirection(BABYLON.Axis.Z).negate().normalize();
        const stepBack = backward.scale(this.lerpDropDistance);

        BABYLON.Animation.CreateAndStartAnimation(
            "dropOffLedge",
            this.player.mesh,
            "position",
            60,
            5,
            this.player.mesh.position.clone(),
            this.player.mesh.position.add(stepBack),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        setTimeout(() => {
            this.stopHanging();
        }, 100);
    }
}
