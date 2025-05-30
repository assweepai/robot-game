import { pathname } from "../config/paths.js";
import { DefaultPlayerConfig } from "../config/DefaultPlayerConfig.js";
import { LEVEL_BOUNDS } from "../config/bounds.js";

import { InputManager } from '../core/InputManager.js';
import { CameraManager } from '../core/CameraManager.js';

import { PlayerAnimationController } from '../controllers/PlayerAnimationController.js';
import { LedgeHangController } from '../controllers/LedgeHangController.js';
import { ClimbController } from '../controllers/ClimbController.js';
import { PlayerStateMachine } from '../controllers/PlayerStateMachine.js';
import { PickupController } from '../controllers/PickupController.js';
import { MovementController } from '../controllers/MovementController.js';

import { removeMass, resetMass } from '../utils/PhysicsUtils.js';

export class Player {
    constructor(scene, camera, shadowGenerator, config = DefaultPlayerConfig, LEVEL_BOUNDS) {
        this.scene = scene;
        this.camera = camera;
        this.shadowGenerator = shadowGenerator;
        this.config = config;
        this.LEVEL_BOUNDS = LEVEL_BOUNDS;
        this.removeMass = removeMass;
        this.resetMass = resetMass;

        this.inputManager = new InputManager(scene);
        this.cameraManager = new CameraManager(scene);
        this.ledgeHangController = new LedgeHangController(this, scene, this.inputManager);
        this.climbController = new ClimbController(this, scene, this.inputManager);
        this.stateMachine = new PlayerStateMachine(this);
        this.pickupController = new PickupController(this, scene, this.inputManager);
        this.movementController = new MovementController(this, this.inputManager);

        this.animationsReady = false;
        this.gameReady = false;

        this.canMove = true;
        this.canClimb = true;
        this.carryOffset = new BABYLON.Vector3(0, 0.35, 0.55);

        this.isClimbing = false;
        this.isClimbingUp = false;
        this.isHanging = false;
        this.isOnTopFace = false;

        this.isGrounded = false;
        this.canJump = false;

        this.carrying = false;
        this.carriedMesh = null;

        this.jumpForce = this.config.jumpForce;
        this.walkSpeed = this.config.walkSpeed;
        this.runSpeed = this.config.runSpeed;
        this.lastGroundedTime = performance.now();
        this.verticalTiltVelocity = 0;

        this.linearDamping = this.config.physicsLinearDamping;
        this.angularDamping = this.config.physicsAngularDamping;

        this._createMesh();
        this._createHitBox();
        this._loadModel();

        this.animationController = new PlayerAnimationController(this);
        
        
    }

    update() {
        const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
        if (!this.canMove || !this.mesh?.physicsImpostor) return;

        this._updateControllers(deltaTime);
        this.movementController.updateMovement(deltaTime);
        this.movementController.updateJump();
        this.movementController.updateRotation();
        this._updateCarrySync();
        this._updateCubeIntersections();
        this._applyPlatformMotion()
        this._updateStateMachine();
        this._syncWithMovingPlatforms();
        this._updateBoundaryClamp();
        this._updatePlatformSync();

        this.inputManager.resetPressedKeys();
    }
    
    _updatePlatformSync() {
        if (!this.platforms || !this.lastPlatformPos) return;
    
        this.isStandingOnPlatform = false;
    
        for (let i = 0; i < this.platforms.length; i++) {
            const platform = this.platforms[i];
            const platMesh = platform.getMesh();
            const lastPos = this.lastPlatformPos[i];
    
            const playerBB = this.mesh.getBoundingInfo().boundingBox;
            const platformBB = platMesh.getBoundingInfo().boundingBox;
    
            const playerBottomY = playerBB.minimumWorld.y;
            const platformTopY = platformBB.maximumWorld.y;
            const yDistance = Math.abs(playerBottomY - platformTopY);
    
            const xzDistance = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(this.mesh.position.x, 0, this.mesh.position.z),
                new BABYLON.Vector3(platMesh.position.x, 0, platMesh.position.z)
            );
    
            const isOnTop = yDistance < 0.1 && xzDistance < 1.5;
    
            if (isOnTop && !this.isClimbing) {
                this.isStandingOnPlatform = true;
    
                const delta = platMesh.position.subtract(lastPos);
                if (delta.length() < 1) {
                    this.mesh.position.addInPlace(delta);
                }
            }
    
            this.lastPlatformPos[i].copyFrom(platMesh.position); // sync for next frame
        }
    }
    
    setPlatformReferences(platformList) {
        this.platforms = platformList;
        this.lastPlatformPos = platformList.map(p => p.getMesh().position.clone());
    }   

    _updateControllers(deltaTime) {
        this.climbController.update();
        this.ledgeHangController.update();
        this.pickupController.update(deltaTime);
        this._updateGroundedState();
    }
    
    _updateBoundaryClamp() {
        const bounds = LEVEL_BOUNDS;
        if (!bounds || !this.mesh) return;
    
        const halfWidth = bounds.width / 2;
        const halfDepth = bounds.depth / 2;
        const margin = 0.3; // Small buffer
    
        this.mesh.position.x = BABYLON.Scalar.Clamp(
            this.mesh.position.x,
            bounds.center.x - halfWidth + margin,
            bounds.center.x + halfWidth - margin
        );
    
        this.mesh.position.z = BABYLON.Scalar.Clamp(
            this.mesh.position.z,
            bounds.center.z - halfDepth + margin,
            bounds.center.z + halfDepth - margin
        );
    }    

    _updateCarrySync() {
        this.carrying = !!this.pickupController.heldCube;
        this.carriedMesh = this.pickupController.heldCube || null;
        this.isCarrying = this.carrying;

        if (this.isCarrying) {
            this.carriedMesh.position = this.pickupController.getAdjustedCarryOffset(this.carriedMesh);
        }
    }

    _updateGroundedState() {
        const rayOrigin = this.mesh.position.clone();
        const rayDirection = BABYLON.Axis.Y.scale(-1);
        const rayLength = this.config.groundedRayLength;
    
        const ray = new BABYLON.Ray(rayOrigin, rayDirection, rayLength);
        const hit = this.scene.pickWithRay(ray, mesh => mesh?.isPickable);
    
        const velocityY = this.mesh.physicsImpostor.getLinearVelocity().y;
    
        this.isGrounded = false;
        this.canJump = false;
        this.isOnPlatform = false;
        this.platformUnderFoot = null;
    
        if (hit?.hit) {
            const distance = hit.distance;
    
            const meetsDistance = distance <= this.config.groundedThreshold;
            const meetsVelocity = Math.abs(velocityY) < this.config.groundedVelocityThreshold;
    
            if (meetsDistance && meetsVelocity) {
                this.isGrounded = true;
                this.canJump = true;
                this.lastGroundedTime = performance.now(); // store time for coyote
                if (hit.pickedMesh?.name === "movingPlatform") {
                    this.isOnPlatform = true;
                    this.platformUnderFoot = hit.pickedMesh;
                }
            }
        }
    }
    
    _isWithinCoyoteTime() {
        const now = performance.now();
        return now - this.lastGroundedTime <= this.config.coyoteTimeMs;
    }    

    _updateCubeIntersections() {
        if (!this.cubes) return;
    
        for (let cube of this.cubes) {
            cube = cube.getMesh?.() ?? cube; // unwrap if wrapped
    
            if (!cube?.isEnabled()) continue;
    
            const intersects = this.mesh.intersectsMesh(cube, true) || this.hitbox.intersectsMesh(cube, true);
            const isStandingOnThisCube = this.isOnTopFace && this.standingOnCube === cube;
    
            const shouldRemoveMass = intersects || isStandingOnThisCube;
    
            if (shouldRemoveMass && !cube.__isPlayerIntersecting) {
                this.removeMass(cube);
                cube.__isPlayerIntersecting = true;
            }
    
            if (!shouldRemoveMass && cube.__isPlayerIntersecting) {
                this.resetMass(cube);
                cube.__isPlayerIntersecting = false;
            }
        }
    }
    
    _applyPlatformMotion() {
        if (!this.isGrounded || !this.isOnPlatform || !this.platformUnderFoot) return;
    
        const platformRef = this.platformUnderFoot._platformRef;
        if (!platformRef || !platformRef.velocity) return;
    
        const currentVel = this.mesh.physicsImpostor.getLinearVelocity();
        const adjustedVel = currentVel.add(platformRef.velocity);
        this.mesh.physicsImpostor.setLinearVelocity(adjustedVel);
    }
    
    _syncWithMovingPlatforms() {
        if (!this.platforms || !this.platforms.length) return;
    
        this.isStandingOnPlatform = false;
    
        for (let i = 0; i < this.platforms.length; i++) {
            const platform = this.platforms[i];
            const platMesh = platform.getMesh(); // ✅ retrieve mesh
            const lastPos = this.lastPlatformPos[i];
    
            const playerBB = this.mesh.getBoundingInfo().boundingBox;
            const platformBB = platMesh.getBoundingInfo().boundingBox;
    
            const playerBottomY = playerBB.minimumWorld.y;
            const platformTopY = platformBB.maximumWorld.y;
            const yDistance = Math.abs(playerBottomY - platformTopY);
    
            const xzDistance = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(this.mesh.position.x, 0, this.mesh.position.z),
                new BABYLON.Vector3(platMesh.position.x, 0, platMesh.position.z) // ✅ FIXED
            );
    
            const onPlatform = yDistance < 0.1 && xzDistance < 2.0;
    
            if (onPlatform && !this.isClimbing) {
                this.isStandingOnPlatform = true;
    
                const delta = platMesh.position.subtract(lastPos); // ✅ FIXED
                if (delta.length() < 1) {
                    this.mesh.position.addInPlace(delta);
                }
            }
    
            this.lastPlatformPos[i].copyFrom(platMesh.position); // ✅ FIXED
        }
    }

    _updateStateMachine() {
        this.stateMachine.update(
            this.inputManager,
            this.isGrounded,
            this.mesh.physicsImpostor.getLinearVelocity()
        );
    }

    _isLockedByForcedState() {
        const s = this.animationController.forcedState;
        return s === 'punch' || s === 'kick' || s === 'climbup';
    }

    _createMesh() {
        this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCapsule", {
            height: this.config.capsuleHeight,
            radius: this.config.capsuleRadius
        }, this.scene);

        this.mesh.position = new BABYLON.Vector3(0, this.config.capsuleHeight / 2, 0);
        this.mesh.checkCollisions = true;
        this.mesh.isPickable = true;

        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.SphereImpostor,
            {
                mass: this.config.bodyMass,
                friction: this.config.bodyFriction,
                restitution: this.config.bodyRestitution
            },
            this.scene
        );

        setTimeout(() => {
            if (this.mesh.physicsImpostor.physicsBody) {
                this.mesh.physicsImpostor.physicsBody.linearDamping = this.linearDamping;
                this.mesh.physicsImpostor.physicsBody.angularDamping = this.angularDamping;
            }
        }, 50);
    }

    _createHitBox() {
        this.hitbox = BABYLON.MeshBuilder.CreateBox("playerHitBox", {
            height: this.config.hitboxHeight,
            width: this.config.hitboxWidth,
            depth: this.config.hitboxDepth
        }, this.scene);

        this.hitbox.isVisible = false;
        this.hitbox.checkCollisions = true;
        this.hitbox.showBoundingBox = false;
        this.hitbox.parent = this.mesh;

        const hitMat = new BABYLON.StandardMaterial('hitBoxMat', this.scene);
        hitMat.alpha = 0.0;
        this.hitbox.material = hitMat;

        this.hitbox.position.z += this.config.hitboxForwardOffset;
    }

    _loadModel() {
        BABYLON.SceneLoader.ImportMeshAsync("", pathname + "/models/actors/", "peewee_anim_014.glb", this.scene)
            .then((result) => {
                const model = result.meshes[0];
                model.parent = this.mesh;
                model.scaling.scaleInPlace(this.config.modelScale);
                model.isPickable = false;
                model.receiveShadows = true;
                model.position = new BABYLON.Vector3(0, this.config.modelVerticalOffset, 0);
                
                this.shadowGenerator.addShadowCaster(model);
                this.animationGroups = result.animationGroups;
                
                this.animationController.loadAnimations();
                this.animationsReady = true;
                this.mesh.isVisible = false;
            });
    }

    setCubeReferences(cubeInstances) {
        if (!Array.isArray(cubeInstances)) {
            console.warn("[Player] setCubeReferences called with non-array input.");
            this.cubes = [];
            return;
        }
          
        this.cubes = cubeInstances.map(cube => cube.getMesh?.() ?? cube);
    }
}
