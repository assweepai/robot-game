// src/core/LoadingScreen.js
import { pathname } from "../config/paths.js";

export class LoadingScreen {
    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;
        this._createUI();
        this._createManager();
    }

    _createUI() {
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.id = "loadingScreen";
        Object.assign(this.loadingDiv.style, {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            zIndex: 9999,
        });

        const progressBarContainer = document.createElement("div");
        Object.assign(progressBarContainer.style, {
            width: "50%",
            height: "20px",
            background: "#333",
            border: "1px solid #555",
        });

        this.progressBar = document.createElement("div");
        this.progressBar.id = "loadingBar";
        Object.assign(this.progressBar.style, {
            height: "100%",
            width: "0%",
            background: "white",
            transition: "width 0.2s",
        });

        progressBarContainer.appendChild(this.progressBar);
        this.loadingDiv.appendChild(progressBarContainer);
        document.body.appendChild(this.loadingDiv);
    }

    _createManager() {
        this.assetsManager = new BABYLON.AssetsManager(this.scene);

        // Preload assets
        const modelTasks = [
            `${pathname}/models/actors/peewee_anim_013.glb`,
            `${pathname}/models/skybox/skybox_003.glb`,
            `${pathname}/models/props/mill_006s.glb`
        ];

        for (const url of modelTasks) {
            this.assetsManager.addContainerTask("loadModel", "", url, "");
        }

        const textureTasks = [
            `${pathname}/textures/pressureplate.jpg`,
            `${pathname}/textures/pressureplatebase.jpg`,
            `${pathname}/textures/peewee/eyes.png`,
            `${pathname}/textures/lift_floor_001.jpg`,
            `${pathname}/textures/tryme2_c.jpg`,
            `${pathname}/textures/woodbox.jpg`,
            `${pathname}/textures/concrete_floor_002.jpg`,
            `${pathname}/textures/lawn_g.jpg`,
            `${pathname}/textures/corrugated.jpg`,
            `${pathname}/textures/concrete_floor_007.jpg`,
            `${pathname}/textures/concrete_floor_007_normal.jpg`,
            `${pathname}/textures/concrete_floor_007_roughness.jpg`,
            `${pathname}/textures/concrete_floor_007_ao.jpg`,
            `${pathname}/textures/brick_200.jpg`,
            `${pathname}/textures/brick_200_normal.jpg`,
            `${pathname}/textures/brick_200_roughness.jpg`,
            `${pathname}/textures/brick_200_ao.jpg`,
        ];

        for (const url of textureTasks) {
            this.assetsManager.addTextureTask("loadTex", url);
        }

        this.assetsManager.onProgress = (remaining, total) => {
            const percent = Math.floor(((total - remaining) / total) * 100);
            this.updateProgress(percent);
        };

        this.assetsManager.onFinish = () => {
            this.hide();
            if (this.onFinishCallback) {
                this.onFinishCallback();
            }
        };
    }

    start(onFinishCallback) {
        this.onFinishCallback = onFinishCallback;
        this.assetsManager.load();
    }

    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
    }

    hide() {
        this.loadingDiv.style.display = "none";
    }
}
