// /src/entities/Wall.js

import { pathname } from "../config/paths.js";

export class Wall {
	constructor(scene, shadowGenerator, {
		position = BABYLON.Vector3.Zero(),
		height = 4,
		width = 10,
		rotationY = 0,
		hasDoor = false
	} = {}) {
		this.scene = scene;
		this.position = position;
		this.shadowGenerator = shadowGenerator;

		const wallDepth = 0.25;
		const doorWidth = 3;
		const doorHeight = 3;
		const groundY = 0.0;

		let wallMesh;

		if (hasDoor) {
			// Create wall with door cutout using CSG
			const fullWall = BABYLON.MeshBuilder.CreateBox("wallFull", {
				width,
				height,
				depth: wallDepth
			}, scene);
			fullWall.position.y = groundY + height / 2;

			const doorway = BABYLON.MeshBuilder.CreateBox("doorway", {
				width: doorWidth,
				height: doorHeight,
				depth: wallDepth + 0.1
			}, scene);
			doorway.position.y = groundY + doorHeight / 2;

			fullWall.rotation.y = rotationY;
			doorway.rotation.y = rotationY;
			fullWall.position.addInPlace(position);
			doorway.position.addInPlace(position);

			const wallCSG = BABYLON.CSG.FromMesh(fullWall);
			const doorCSG = BABYLON.CSG.FromMesh(doorway);
			const wallWithHole = wallCSG.subtract(doorCSG).toMesh("wallWithHole", null, scene);

			fullWall.dispose();
			doorway.dispose();
			wallMesh = wallWithHole;
		} else {
			// Solid wall
			wallMesh = BABYLON.MeshBuilder.CreateBox("solidWall", {
				width,
				height,
				depth: wallDepth
			}, scene);
			wallMesh.position.y = groundY + height / 2;
			wallMesh.rotation.y = rotationY;
			wallMesh.position.addInPlace(position);
		}

		wallMesh.checkCollisions = true;
		wallMesh.material = this._createWallMaterial(scene);
		wallMesh.receiveShadows = true;
		this.shadowGenerator.addShadowCaster(wallMesh);
		this.wallMesh = wallMesh;

		this._setupPhysics(wallMesh, {
			hasDoor,
			wallWidth: width,
			wallHeight: height,
			doorWidth,
			doorHeight,
			wallDepth,
			rotationY,
			position
		});
	}

	_createWallMaterial(scene) {
		const baseTexture = new BABYLON.Texture(pathname + "/textures/brick_200.jpg", scene);
		const normalTexture = new BABYLON.Texture(pathname + "/textures/brick_200_normal.jpg", scene);
		const roughnessTexture = new BABYLON.Texture(pathname + "/textures/brick_200_roughness.jpg", scene);
		const aoTexture = new BABYLON.Texture(pathname + "/textures/brick_200_ao.jpg", scene);

		const mat = new BABYLON.PBRMaterial("brickMaterial", scene);
		mat.albedoTexture = baseTexture;
		mat.bumpTexture = normalTexture;
		mat.roughnessTexture = roughnessTexture;
		mat.ambientTexture = aoTexture;

		mat.metallic = 0.2;
		mat.roughness = 1.0;
		mat.bumpTexture.level = 0.3;
		mat.useAmbientOcclusionFromMetallicTextureRed = false;

		[baseTexture, normalTexture, roughnessTexture, aoTexture].forEach(tex => {
			tex.uScale = tex.vScale = 1.8;
		});

		return mat;
	}

	_setupPhysics(wallMesh, {
		hasDoor,
		wallWidth,
		wallHeight,
		doorWidth,
		doorHeight,
		wallDepth,
		rotationY,
		position
	}) {
		const groundY = 0;

		if (hasDoor) {
			const sideWidth = (wallWidth - doorWidth) / 2;
			const beamHeight = wallHeight - doorHeight;

			const physicsPieces = [
				{
					name: "wallColliderLeft",
					width: sideWidth,
					height: wallHeight,
					pos: new BABYLON.Vector3(-((wallWidth - sideWidth) / 2), groundY + wallHeight / 2, 0)
				},
				{
					name: "wallColliderRight",
					width: sideWidth,
					height: wallHeight,
					pos: new BABYLON.Vector3((wallWidth - sideWidth) / 2, groundY + wallHeight / 2, 0)
				},
				{
					name: "wallColliderTop",
					width: doorWidth,
					height: beamHeight,
					pos: new BABYLON.Vector3(0, groundY + doorHeight + beamHeight / 2, 0)
				}
			];

			for (const { name, width, height, pos } of physicsPieces) {
				const collider = BABYLON.MeshBuilder.CreateBox(name, {
					width,
					height,
					depth: wallDepth
				}, this.scene);
				collider.isVisible = false;
				collider.rotation.y = rotationY;

				const rotated = BABYLON.Vector3.TransformCoordinates(pos, BABYLON.Matrix.RotationY(rotationY));
				collider.position = position.add(rotated);

				collider.physicsImpostor = new BABYLON.PhysicsImpostor(
					collider,
					BABYLON.PhysicsImpostor.BoxImpostor,
					{ mass: 0, restitution: 0.0, friction: 1 },
					this.scene
				);
			}
		} else {
			const solidCollider = BABYLON.MeshBuilder.CreateBox("wallCollider", {
				width: wallWidth,
				height: wallHeight,
				depth: wallDepth
			}, this.scene);

			solidCollider.isVisible = false;
			solidCollider.rotation.y = rotationY;
			solidCollider.position.y = groundY + wallHeight / 2;

			const rotated = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), BABYLON.Matrix.RotationY(rotationY));
			solidCollider.position.addInPlace(position.add(rotated));

			solidCollider.physicsImpostor = new BABYLON.PhysicsImpostor(
				solidCollider,
				BABYLON.PhysicsImpostor.BoxImpostor,
				{ mass: 0, restitution: 0.0, friction: 1 },
				this.scene
			);
		}
	}
}
