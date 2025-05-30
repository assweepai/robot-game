// src/main.js

import { pathname } from "./config/paths.js";
import { LEVEL_BOUNDS } from "./config/bounds.js";

import { LoadingScreen } from './core/LoadingScreen.js';
import { CameraManager } from './core/CameraManager.js';
import { LightingManager } from './core/LightingManager.js';
import { InputManager } from './core/InputManager.js';
import { PostFX } from './core/PostFX.js';
import { InputDebugHelper } from './core/InputDebugHelper.js';
import { GamepadInputHelper } from './core/GamepadInputHelper.js';
import { SkyboxManager } from "./core/SkyboxManager.js";
import { convertLevelBounds, PhysicsClamper } from "./utils/PhysicsClamper.js";
import { PlatformCubeSync } from "./systems/PlatformCubeSync.js";

import { materialCache } from './core/MaterialCache.js';

import { buildMill } from './entities/buildMill.js';
import { Player } from './entities/Player.js';
import { MovingPlatform } from './entities/MovingPlatform.js';
import { PressurePlate } from './entities/PressurePlate.js';
import { Door } from './entities/Door.js';
import { Cube } from './entities/Cube.js';
import { Wall } from './entities/Wall.js';
import { BoxMover } from "./entities/BoxMover.js";

// Load and initialize Recast plugin
async function initRecast() {
    const recastInstance = await Recast();
    return new BABYLON.RecastJSPlugin(recastInstance);
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    scene.enablePhysics(gravityVector, new BABYLON.CannonJSPlugin());

    const loader = new LoadingScreen(engine, scene);
    loader.start(async () => {
        console.log("Assets loaded. Starting game systems...");

        const boundsBox = convertLevelBounds(LEVEL_BOUNDS);

        const inputManager = new InputManager(scene);
        const cameraManager = new CameraManager(scene, canvas);
        const gamepadHelper = new GamepadInputHelper(scene, inputManager, cameraManager, true);
        const lightingManager = new LightingManager(scene);
        const postFX = new PostFX(scene, cameraManager.getCamera());
        const shadowGenerator = lightingManager.shadowGenerator;

        inputManager.setCameraManager(cameraManager);

        const player = new Player(scene, cameraManager.getCamera(), lightingManager.getShadowGenerator());
        inputManager.setPlayer(player);
        cameraManager.setPlayer(player);

        const debugHelper = new InputDebugHelper(inputManager, engine, lightingManager, postFX, player, gamepadHelper);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
        ground.position.y = -6;
        ground.checkCollisions = true;
        ground.receiveShadows = true;
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(
            ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 1, restitution: 0 }, scene
        );

        const baseTexture = new BABYLON.Texture(pathname + "/textures/concrete_floor_003.jpg", scene);
        const normalTexture = new BABYLON.Texture(pathname + "/textures/concrete_floor_007_normal.jpg", scene);
        const roughnessTexture = new BABYLON.Texture(pathname + "/textures/concrete_floor_007_roughness.jpg", scene);
        const aoTexture = new BABYLON.Texture(pathname + "/textures/concrete_floor_007_ao.jpg", scene);

        const groundMaterial = new BABYLON.PBRMaterial("pbrConcrete", scene);
        groundMaterial.albedoTexture = baseTexture;
        groundMaterial.bumpTexture = normalTexture;
        groundMaterial.metallic = 0.0;
        groundMaterial.roughnessTexture = roughnessTexture;
        groundMaterial.ambientTexture = aoTexture;
        groundMaterial.useAmbientOcclusionFromMetallicTextureRed = false;
        groundMaterial.roughness = 1;
        groundMaterial.bumpTexture.level = 0.1;

        baseTexture.uScale = baseTexture.vScale = 1;
        normalTexture.uScale = normalTexture.vScale = 8;
        roughnessTexture.uScale = roughnessTexture.vScale = 8;
        aoTexture.uScale = aoTexture.vScale = 8;

        ground.material = groundMaterial;
        ground.freezeWorldMatrix();

        const skyboxManager = new SkyboxManager(scene);
        skyboxManager.loadSkybox(() => {
            skyboxManager.loadGroundPlane();
        });

        buildMill(scene, shadowGenerator, pathname).then((mill) => {
            scene.addTransformNode(mill);
        });

        const walls = [
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(15, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: true }),
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(9, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: false }),
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(3, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: false }),
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(-3, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: false }),
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(-9, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: false }),
            new Wall(scene, shadowGenerator, { position: new BABYLON.Vector3(-15, 0, 5.8), height: 6, width: 6, rotationY: 0, hasDoor: true })
        ];

        const door = new Door(scene, lightingManager.shadowGenerator, new BABYLON.Vector3(-15, 0, 5.8));
        const plate = new PressurePlate(scene, new BABYLON.Vector3(-15, 0, 0), new BABYLON.Vector3(2, 0.1, 2), {
            onActivate: () => door.open(),
            onDeactivate: () => door.close()
        });

        const cubePositions = [
            [-15, -3, -21], [-9, -3, -21], [-3, -3, -21], [3, -3, -21], [9, -3, -21], [15, -3, -21],
            [-21, -3, -15], [21, -3, -15],
            [-15, -3, -9], [-9, -3, -9], [-3, -3, -9], [3, -3, -9], [9, -3, -9], [15, -3, -9],
            [-15, -3, -3], [-9, -3, -3], [-3, -3, -3], [3, -3, -3], [9, -3, -3], [15, -3, -3],
            [-15, -3, 3], [-9, -3, 3], [-3, -3, 3], [3, -3, 3], [9, -3, 3], [15, -3, 3],
            [-15, -3, 9], [15, -3, 9],
            [-15, -3, 15], [-9, -3, 15], [-3, -3, 15], [3, -3, 15], [9, -3, 15], [15, -3, 15]
        ];

        const woodPositions = [
            [-4, 1, -4, 2, 2, "wood", true, false],
            //[-12, -5.5, -16, 1, 1, "wood", false, true],
            [-13, 0.5, -4, 1, 1, "wood", false, true],
            [-14, 0.5, -5, 1, 1, "wood", false, true],
            [-12, 0.5, -6, 1, 1, "wood", false, true],
            [-13, 0.5, -7, 1, 1, "wood", false, true],
            [-14, 0.5, -8, 1, 1, "wood", false, true]
        ];

        const cubes = [];

        cubePositions.forEach(([x, y, z]) => {
            cubes.push(new Cube(scene, shadowGenerator, {
                position: new BABYLON.Vector3(x, y, z),
                size: 6,
                mass: 0,
                material: "stone",
                isClimbable: true,
                isMovable: false
            }).mesh);
        });

        woodPositions.forEach(([x, y, z, size, mass, material, isClimbable = false, movable = false]) => {
            cubes.push(new Cube(scene, shadowGenerator, {
                position: new BABYLON.Vector3(x, y, z),
                size,
                mass,
                material,
                isClimbable,
                isMovable: movable
            }).mesh);
        });

        player.setCubeReferences?.(cubes);

        const platforms = [
            new MovingPlatform(scene, shadowGenerator, {
                start: new BABYLON.Vector3(11, 0.0, 9),
                end: new BABYLON.Vector3(-11, 0.0, 9),
                texturePath: pathname + "/textures/lift_floor_001.jpg"
            }),
            new MovingPlatform(scene, shadowGenerator, {
                start: new BABYLON.Vector3(10, 0.25, -10),
                end: new BABYLON.Vector3(10, 10, -10),
                texturePath: pathname + "/textures/lift_floor_001.jpg"
            })
        ];

        player.setPlatformReferences(platforms);

        const cubePlatformSync = new PlatformCubeSync(platforms, cubes);

        const clamper = new PhysicsClamper(boundsBox);
        cubes.forEach(cube => {
            const mesh = cube.getMesh?.() ?? cube;
            clamper.add(mesh);
        });

        // Setup Recast + navmesh
        const recastPlugin = await initRecast();
        const navmeshMeshes = scene.meshes.filter(m => m.checkCollisions && m.isVisible);

        const navmeshParams = {
            cs: 0.2, ch: 0.2, walkableSlopeAngle: 45,
            walkableHeight: 1.0, walkableClimb: 0.2, walkableRadius: 3,
            maxEdgeLen: 12., maxSimplificationError: 1.3,
            minRegionArea: 8, mergeRegionArea: 20,
            maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1
        };

        const navmesh = recastPlugin.createNavMesh(navmeshMeshes, navmeshParams);
        scene.navigationPlugin = recastPlugin;

        //const debugNavMesh = recastPlugin.createDebugNavMesh(scene);
        //debugNavMesh.color = new BABYLON.Color3(0.2, 1, 0.3);

        const movableCubes = cubes.map(c => c.mesh ?? c).filter(cube => cube.metadata?.isMovable === true);
        
        const dropZone = {
            min: new BABYLON.Vector3(13, 0, -5),
            max: new BABYLON.Vector3(17, 5, 2)
        };
        
        const robot = new BoxMover(scene, scene.navigationPlugin, new BABYLON.Vector3(15, 0.5, 0), dropZone);

        robot.setMovableCubes(movableCubes); 

        // ==== GAME LOOP ====
        engine.runRenderLoop(() => {
            scene.render();
            player.update();

            const deltaTime = engine.getDeltaTime() * 0.001;

            const cubeMeshes = cubes.map(c => c.mesh ?? c).filter(Boolean);
            plate.checkActivation([player.mesh, ...cubeMeshes]);

            clamper.update();
            cameraManager.clampCameraPosition();

            for (const p of platforms) p.update();
            cubePlatformSync.update();
            robot.update(deltaTime);
            
        });
    });

    window.addEventListener('resize', () => {
        engine.resize();
    });
});
