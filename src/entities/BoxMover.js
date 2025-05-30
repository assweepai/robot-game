// src/entities/BoxMover.js

import { BoxMoverStateMachine } from "../controllers/BoxMoverStateMachine.js";
import { BoxMoverAnimationController } from "../controllers/BoxMoverAnimationController.js";
import { BoxMoverDefaultConfig } from "../config/BoxMoverDefaultConfig.js";
import { pathname } from "../config/paths.js";

export class BoxMover {
    constructor(scene, navPlugin, startPosition = new BABYLON.Vector3(15, 0, -3), dropZone = null) {
        this.scene = scene;
        
        // Create highlight layer once per scene if not already present
        if (!scene.highlightLayer) {
            scene.highlightLayer = new BABYLON.HighlightLayer("hl", scene);
        }
        this.highlightLayer = scene.highlightLayer;
        this._highlightedCubes = new Set(); // track currently glowing        
        
        this.navPlugin = navPlugin;
        this.startPosition = startPosition.clone();
        this.dropZone = dropZone;
        this.agentIdx = null;
        this.crowd = null;

        this.movableCubes = [];
        this.target = null;
        this.heldCube = null;
        this.agentTransform = new BABYLON.TransformNode("agentTransform", scene);

        this._createCapsule();
        this._createCrowdAgent();
        //this._showDropZoneVisual();
        this._loadModel();
        
        this._lastNavPos = null;
        this._pollCooldown = 0;

        this.stateMachine = new BoxMoverStateMachine(this);
    }

    _loadModel() {
        BABYLON.SceneLoader.ImportMeshAsync("", pathname + "/models/actors/", "prototype2_anim_002.glb", this.scene)
            .then((result) => {
                const root = result.meshes[0];
                const model = result.meshes.find(m => m instanceof BABYLON.Mesh && m.name !== "__root__");
                this.model = model;

                root.parent = this.mesh;
                root.scaling.scaleInPlace(BoxMoverDefaultConfig.modelScale);
                root.position = new BABYLON.Vector3(0, BoxMoverDefaultConfig.modelVerticalOffset, 0);
                root.isPickable = false;
                root.receiveShadows = true;

                this.animationGroups = result.animationGroups;
                this.animationController = new BoxMoverAnimationController(this);
                this.animationsReady = true;

                this.holdPoint = new BABYLON.TransformNode("boxMoverHoldPoint", this.scene);
                this.holdPoint.parent = root;
                this.holdPoint.position = new BABYLON.Vector3(
                    BoxMoverDefaultConfig.holdPointPosition.x,
                    BoxMoverDefaultConfig.holdPointPosition.y,
                    BoxMoverDefaultConfig.holdPointPosition.z
                );

                if (this.stateMachine?.currentState) {
                    this.stateMachine._onStateEnter(this.stateMachine.currentState);
                }

                this.mesh.isVisible = false;
            });
    }

    _createCapsule() {
        this.mesh = BABYLON.MeshBuilder.CreateCapsule("boxMoverCapsule", {
            height: BoxMoverDefaultConfig.capsuleHeight,
            radius: BoxMoverDefaultConfig.capsuleRadius
        }, this.scene);

        this.mesh.isPickable = false;
        this.mesh.checkCollisions = false;
        this.mesh.receiveShadows = true;
        this.mesh.position.copyFrom(this.startPosition).addInPlace(new BABYLON.Vector3(0, 0.35, 0));

        this.mesh.material = new BABYLON.StandardMaterial("boxMoverMat", this.scene);
        this.mesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0);

        this.physicsDummy = BABYLON.MeshBuilder.CreateBox("boxMoverPhysics", {
            width: BoxMoverDefaultConfig.physicsBoxWidth,
            height: BoxMoverDefaultConfig.physicsBoxHeight,
            depth: BoxMoverDefaultConfig.physicsBoxDepth
        }, this.scene);

        this.physicsDummy.isVisible = false;
        this.physicsDummy.isPickable = false;
        this.physicsDummy.checkCollisions = false;
        this.physicsDummy.position.copyFrom(this.startPosition);

        this.physicsDummy.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.physicsDummy,
            BABYLON.PhysicsImpostor.BoxImpostor,
            {
                mass: BoxMoverDefaultConfig.physicsMass,
                friction: BoxMoverDefaultConfig.physicsFriction,
                restitution: BoxMoverDefaultConfig.physicsRestitution
            },
            this.scene
        );

        setTimeout(() => {
            const body = this.physicsDummy.physicsImpostor?.physicsBody;
            if (body) {
                body.linearDamping = BoxMoverDefaultConfig.linearDamping;
                body.angularDamping = BoxMoverDefaultConfig.angularDamping;
            }
        }, 50);
    }

    _createCrowdAgent() {
        if (!this.navPlugin) {
            console.error("[BoxMover] navPlugin not set");
            return;
        }

        this.crowd = this.navPlugin.createCrowd(10, 0.1, this.scene);

        const agentParams = {
            radius: BoxMoverDefaultConfig.agentRadius,
            height: BoxMoverDefaultConfig.agentHeight,
            maxAcceleration: BoxMoverDefaultConfig.agentMaxAcceleration,
            maxSpeed: BoxMoverDefaultConfig.agentMaxSpeed,
            collisionQueryRange: BoxMoverDefaultConfig.agentCollisionQueryRange,
            pathOptimizationRange: BoxMoverDefaultConfig.agentPathOptimizationRange,
            separationWeight: BoxMoverDefaultConfig.agentSeparationWeight
        };

        this.agentIdx = this.crowd.addAgent(this.startPosition, agentParams, this.agentTransform);
        console.log("[BoxMover] Agent created:", this.agentIdx);
    }

    setMovableCubes(cubes) {
        this.movableCubes = cubes;
    }

    _hasCubesToFind() {
        return this.movableCubes.some(cube =>
            cube?.isEnabled?.() &&
            cube.metadata?.isMovable &&
            !this._isInDropZone(cube.position)
        );
    }

    _isInDropZone(position) {
        if (!this.dropZone) return false;
        const { min, max } = this.dropZone;
        return (
            position.x >= min.x && position.x <= max.x &&
            position.y >= min.y && position.y <= max.y &&
            position.z >= min.z && position.z <= max.z
        );
    }

    _showDropZoneVisual() {
        if (!this.dropZone) return;

        const { min, max } = this.dropZone;
        const size = max.subtract(min);
        const center = min.add(size.scale(0.5));

        const box = BABYLON.MeshBuilder.CreateBox("dropZoneDebug", {
            width: size.x,
            height: size.y,
            depth: size.z
        }, this.scene);

        box.position = center;
        box.isPickable = false;
        box.isVisible = true;

        const mat = new BABYLON.StandardMaterial("dropZoneMat", this.scene);
        mat.wireframe = true;
        mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
        mat.alpha = 0.3;
        box.material = mat;

        box.freezeWorldMatrix();
    }
    
    _runCubeScan() {
        const pos = this.agentTransform.position;
        let best = null;
        let bestDist = Infinity;
    
        for (const cube of this.movableCubes) {
            if (!cube?.isEnabled?.()) continue;
            if (!cube.metadata?.isMovable) continue;
            if (cube.metadata?.heldByPlayer) continue;
            if (this._isInDropZone(cube.position)) continue;
    
            const navPos = this.navPlugin.getClosestPoint(cube.position);
            if (!navPos) continue;
    
            const path = this.navPlugin.computePath(pos, navPos);
            if (!path || path.length < 2) continue;
    
            const dist = BABYLON.Vector3.Distance(pos, cube.position);
            if (dist < bestDist) {
                best = cube;
                bestDist = dist;
            }
        }
    
        if (best) {
            console.log("[SCAN] New target:", best.name);
            this.target = best;
            const navPos = this.navPlugin.getClosestPoint(best.position);
            if (navPos) {
                const success = this.crowd.agentGoto(this.agentIdx, navPos);
                if (!success) {
                    console.warn("[SCAN] agentGoto failed");
                }
            }
        } else {
            this.target = null;
        }
    }

    _findNearestCube() {
        const pos = this.agentTransform.position;
        let best = null;
        let bestDist = Infinity;
    
        const validTargets = new Set(); // For highlight tracking
    
        for (const cube of this.movableCubes) {
            if (!cube?.isEnabled?.()) continue;
            if (!cube.metadata?.isMovable) continue;
            if (cube.metadata?.heldByPlayer) continue;
            if (this._isInDropZone(cube.position)) continue;
    
            const cubeNavPos = this.navPlugin.getClosestPoint(cube.position);
            if (!cubeNavPos) continue;
    
            const path = this.navPlugin.computePath(pos, cubeNavPos);
            if (!path || path.length < 1) continue;
    
            const eyeHeight = 0.5;
            const from = new BABYLON.Vector3(pos.x, pos.y + eyeHeight, pos.z);
            const to = new BABYLON.Vector3(cube.position.x, cube.position.y + eyeHeight, cube.position.z);
            const direction = to.subtract(from).normalize();
            const distance = BABYLON.Vector3.Distance(from, to);
            const ray = new BABYLON.Ray(from, direction, distance);
    
            const hit = this.scene.pickWithRay(ray, m => m === cube);
            if (!hit.hit || hit.pickedMesh !== cube) continue;
    
            validTargets.add(cube); // Add for highlighting
    
            // Add rimlight if not already glowing
            if (!this._highlightedCubes.has(cube)) {
                this.highlightLayer.addMesh(cube, BABYLON.Color3.FromHexString("#00FFFF"));
                this._highlightedCubes.add(cube);
            }
    
            const dist = BABYLON.Vector3.Distance(pos, cube.position);
            if (dist < bestDist) {
                best = cube;
                bestDist = dist;
            }
        }
    
        // Remove rimlight from cubes no longer valid
        for (const mesh of this._highlightedCubes) {
            if (!validTargets.has(mesh)) {
                this.highlightLayer.removeMesh(mesh);
                this._highlightedCubes.delete(mesh);
            }
        }
    
        if (best) {
            console.log("[FindCube] Target acquired:", best.name);
    
            const navPos = this.navPlugin.getClosestPoint(best.position);
            if (!navPos) {
                console.warn("[FindCube] navPos is null for target:", best.name);
                return;
            }
    
            const success = this.crowd.agentGoto(this.agentIdx, navPos);
            if (!success) {
                console.warn("[FindCube] agentGoto failed for agent:", this.agentIdx);
            } else {
                console.log("[FindCube] agentGoto dispatched to", navPos);
            }
    
            this.target = best;
        }
    }

    _pickupCube(cube) {
        if (!cube) return;
        cube.setParent(this.holdPoint);
        cube.position = BABYLON.Vector3.Zero();
        cube.physicsImpostor?.setMass(0);
        cube.physicsImpostor?.sleep();
        this.heldCube = cube;
    }

    _dropCube() {
        if (!this.heldCube) return;
    
        const cube = this.heldCube;
    
        // Step 1: Unparent safely
        cube.setParent(null);
    
        // Step 2: Compute a "safe" drop position slightly in front of robot
        const forward = this.mesh.forward.normalize();
        const dropOffset = forward.scale(0.3); // place ~0.3m in front
        const dropPos = this.agentTransform.position.clone().add(new BABYLON.Vector3(0, 0.2, 0)).add(dropOffset);
    
        cube.position.copyFrom(dropPos);
    
        // Step 3: Temporarily disable collisions with robot
        const originalCollision = cube.checkCollisions;
        cube.checkCollisions = false;
    
        // Step 4: Wake up physics gently (with delay)
        cube.physicsImpostor?.setMass(2);
        cube.physicsImpostor?.wakeUp();
    
        // Optional: force light downward velocity
        cube.physicsImpostor?.setLinearVelocity(new BABYLON.Vector3(0, -0.1, 0));
    
        // Step 5: Restore collision after short delay
        setTimeout(() => {
            cube.checkCollisions = originalCollision;
        }, 250); // robot walks off by now
    
        this.heldCube = null;
    }

    getCarryOffset(cube) {
        const bb = cube.getBoundingInfo().boundingBox;
        const height = bb.maximum.y - bb.minimum.y;

        const offsetDistance = height * 0.6;
        const verticalOffset = height * 0.5 + 0.2;

        const angleY = this.model?.rotation?.y ?? 0;
        const forward = new BABYLON.Vector3(
            Math.sin(angleY),
            0,
            Math.cos(angleY)
        );

        const up = new BABYLON.Vector3(0, verticalOffset, 0);
        return up.add(forward.scale(offsetDistance));
    }
    
    isMoving() {
        if (!this._currentNavDelta) return false;
        const distSq = this._currentNavDelta.lengthSquared();
        return distSq > 0.00001;
    }

    update(deltaTime) {
        if (!this._lastAgentPosition) {
            this._lastAgentPosition = this.agentTransform.position.clone();
        }
    
        // 🛰️ Poll every 1s
        if (!this.heldCube) {
            this._pollCooldown -= deltaTime;
            if (this._pollCooldown <= 0) {
                this._pollCooldown = 1.0;
                this._runCubeScan();
            }
        }
    
        if (this.crowd && this.agentIdx !== null) {
            const currentPos = this.crowd.getAgentPosition(this.agentIdx);
            if (currentPos) {
                if (!this._lastNavPos) {
                    this._lastNavPos = currentPos.clone();
                }
                this._currentNavDelta = currentPos.subtract(this._lastNavPos);
                this._lastNavPos.copyFrom(currentPos);
    
                this.agentTransform.position.copyFrom(currentPos);
                this.physicsDummy.position.copyFrom(currentPos);
                this.mesh.position.copyFrom(currentPos).addInPlace(new BABYLON.Vector3(0, 0.35, 0));
    
                const movement = this._currentNavDelta;
                if (movement.length() > 0.01) {
                    const forward = movement.normalize();
                    const yaw = Math.atan2(forward.x, forward.z);
                    if (this.mesh) {
                        this.mesh.rotationQuaternion = null;
                        this.mesh.rotation = new BABYLON.Vector3(0, yaw, 0);
                    }
                }
            }
        }
    
        this.stateMachine.update(deltaTime);
    }

    getMesh() {
        return this.mesh;
    }
}
