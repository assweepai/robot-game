// src/core/LightingManager.js

export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.shadowGenerator = null;

        this.setupLights();
        this.setupShadows();
    }

    setupLights() {
        this.skylight1 = new BABYLON.HemisphericLight("skylight1", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.skylight1.intensity = 0.25;

        this.skylight2 = new BABYLON.HemisphericLight("skylight2", new BABYLON.Vector3(0, -1, 0), this.scene);
        this.skylight2.intensity = 0.25;

        this.hemilight1 = new BABYLON.HemisphericLight("hemilight1", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.hemilight1.intensity = 0.125;

        this.hemilight2 = new BABYLON.HemisphericLight("hemilight2", new BABYLON.Vector3(0, -1, 0), this.scene);
        this.hemilight2.intensity = 0.125;

        this.mainLight = new BABYLON.DirectionalLight("light1", new BABYLON.Vector3(-20, -20, -20), this.scene);
        this.mainLight.intensity = 1;
    }

    setupShadows() {
        this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.mainLight);
        this.shadowGenerator.useContactHardeningShadow = true;
        this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.001;
        this.shadowGenerator.bias = 0.00002;
        this.shadowGenerator.usePoissonSampling = true;
    }

    getMainLight() {
        return this.mainLight;
    }

    getShadowGenerator() {
        return this.shadowGenerator;
    }
}
