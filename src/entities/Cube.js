// src/entities/Cube.js

import { pathname } from "../config/paths.js";
import { materialCache } from "../core/MaterialCache.js";

export class Cube {
    constructor(scene, shadowGenerator, options = {}) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;

        const {
            position = new BABYLON.Vector3(0, 1, 0),
            size = 0.5,
            mass = 1,
            friction = 1,
            restitution = 0.0,
            material = "brick", // brick | wood | stone
            isClimbable = false,
            isMovable = false
        } = options;

        const name = isClimbable ? "climbableCube" : "cube";

        this.mesh = BABYLON.MeshBuilder.CreateBox(name, { size }, scene);
        this.mesh.position.copyFrom(position);
        this.mesh.checkCollisions = true;
        this.mesh.isPickable = true;
        this.mesh.receiveShadows = true;

        this.mesh.metadata = {
            isCube: true,
            isClimbable,      // ✅ must be passed correctly from options
            isMovable,
            originalMass: mass
        };

        this._applyMaterial(material);
        this._rotateUVs(this.mesh);

        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass, friction, restitution },
            scene
        );

        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.mesh);
        }
    }

    _applyMaterial(materialName) {
        let baseFile = "";
        let options = {};

        switch (materialName) {
            case "wood":
                baseFile = "woodbox.jpg";
                options = {
                    basePath: `${pathname}/textures`,
                    metallic: 0,
                    roughness: 1,
                    tiling: 1,
                };
                break;

            case "stone":
                baseFile = "concrete_floor_007.jpg";
                options = {
                    basePath: `${pathname}/textures`,
                    metallic: 0,
                    roughness: 1,
                    normalLevel: 0.25,
                    tiling: 1,
                };
                break;

            case "brick":
            default:
                baseFile = "brick_200.jpg";
                options = {
                    basePath: `${pathname}/textures`,
                    metallic: 0,
                    roughness: 1,
                    tiling: 8,
                    normalLevel: 1
                };
                break;
        }

        const mat = materialCache.getOrCreate(this.scene, materialName, baseFile, options);
        this.mesh.material = mat;
    }

    _rotateUVs(mesh) {
        const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);

        const rotateUV90 = (u, v) => [v, 1 - u];

        [2, 3].forEach(face => {
            for (let i = 0; i < 4; i++) {
                const index = (face * 4 + i) * 2;
                const u = uvs[index];
                const v = uvs[index + 1];
                const [ru, rv] = rotateUV90(u, v);
                uvs[index] = ru;
                uvs[index + 1] = rv;
            }
        });

        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, false);
    }

    getMesh() {
        return this.mesh;
    }
}
