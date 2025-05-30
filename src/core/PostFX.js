// src/core/PostFX.js

export class PostFX {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.pipeline = new BABYLON.DefaultRenderingPipeline("PostFXPipeline", true, scene, [camera]);

        this._initFX();
    }

    _initFX() {
        // FXAA
        this.pipeline.fxaaEnabled = false;
        // MSAA
        this.pipeline.samples = 1;

        // Tone Mapping and Image Processing
        this.pipeline.imageProcessing.toneMappingEnabled = false;
        this.pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        this.pipeline.imageProcessing.contrast = 1;
        this.pipeline.imageProcessing.exposure = 3;

        // Bloom
        this.pipeline.bloomEnabled = false;
        this.pipeline.bloomThreshold = 0.8;
        this.pipeline.bloomIntensity = 0.6;
        this.pipeline.bloomKernel = 64;
        this.pipeline.bloomScale = 0.5;

        // Color Grading
        this.pipeline.imageProcessing.colorGradingEnabled = false;
        this.pipeline.imageProcessing.colorGradingWithGreenDepth = false;
        this.pipeline.imageProcessing.colorGradingBGR = false;

        // Depth of Field
        this.pipeline.depthOfFieldEnabled = false;
        this.pipeline.depthOfField.focalLength = 150;
        this.pipeline.depthOfField.fStop = 1.4;
        this.pipeline.depthOfField.focusDistance = 2000;

        // Vignette (part of ImageProcessing)
        this.pipeline.imageProcessing.vignetteEnabled = false;
        this.pipeline.imageProcessing.vignetteWeight = 2.0;
        this.pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0);
        this.pipeline.imageProcessing.vignetteStretch = 0.5;
    }
}
