// /src/core/SkyboxManager.js

import { pathname } from "../config/paths.js";

export class SkyboxManager {
    constructor(scene) {
        this.scene = scene;
        this.pathname = pathname;
    }

    loadSkybox(callback) {
        BABYLON.SceneLoader.ImportMeshAsync("", this.pathname + "/models/skybox/", "skybox_003.glb", this.scene).then((result) => {
            const skybox = result.meshes[0];

            const skyboxMaterial = new BABYLON.PBRMaterial('skyBoxPBR', this.scene);
            skyboxMaterial.backFaceCulling = false;
            skyboxMaterial.disableLighting = false;
            skyboxMaterial.metallic = 0;
            skyboxMaterial.roughness = 1;

            const childMat = skybox.getChildMeshes()[0]?.material;
            if (childMat?.albedoTexture) {
                skyboxMaterial.emissiveTexture = childMat.albedoTexture;
            }

            skybox.material = skyboxMaterial;
            skybox.material.freeze();
            skybox.freezeWorldMatrix();
            skybox.position = new BABYLON.Vector3(0, 90, 0);

            this.skybox = skybox;

            if (callback) callback(skybox);
        });
    }

    loadGroundPlane(texturePath = "/textures/lawn_g.jpg") {
        const earth = BABYLON.MeshBuilder.CreatePlane("groundPlane", { height: 2000, width: 2000 }, this.scene);
    
        const groundMat = new BABYLON.PBRMaterial("groundMatPBR", this.scene);
        groundMat.albedoTexture = new BABYLON.Texture(this.pathname + texturePath, this.scene);
        groundMat.albedoTexture.uScale = 8;
        groundMat.albedoTexture.vScale = 8;
    
        groundMat.metallic = 0; // most ground types are non-metal
        groundMat.roughness = 1; // very rough = matte/soft grass/dirt
    
        // Optional: disable environment lighting if not using `.env`
        groundMat.environmentIntensity = 1;
    
        earth.material = groundMat;
        earth.material.freeze();
        earth.freezeWorldMatrix();
    
        earth.rotation.x = BABYLON.Tools.ToRadians(90);
        earth.position = new BABYLON.Vector3(0, -10, 0);
    
        this.ground = earth;
    }

}
