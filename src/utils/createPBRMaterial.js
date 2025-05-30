// src/utils/createPBRMaterial.js

export function createPBRMaterial(scene, name, baseTextureFile, options = {}) {
    const basePath = options.basePath ?? "";
    const tiling = options.tiling ?? 1;
    const normalLevel = options.normalLevel ?? 0.1;
    const metallic = options.metallic ?? 0.0;
    const roughness = options.roughness ?? 1;
    const uScale = options.uScale ?? options.tiling ?? 1;
    const vScale = options.vScale ?? options.tiling ?? 1;    

    const baseName = baseTextureFile.replace(/\.(jpg|png)$/, "");
    const extension = baseTextureFile.split('.').pop();

    const albedoPath = `${basePath}/${baseTextureFile}`;
    const normalPath = `${basePath}/${baseName}_normal.${extension}`;
    const roughnessPath = `${basePath}/${baseName}_roughness.${extension}`;
    const aoPath = `${basePath}/${baseName}_ao.${extension}`;

    const material = new BABYLON.PBRMaterial(name, scene);

    material.albedoTexture = new BABYLON.Texture(albedoPath, scene);
    material.albedoTexture.uScale = tiling;
    material.albedoTexture.vScale = tiling;

    // Try loading optional maps
    const tryLoadTexture = (path) => {
        try {
            const tex = new BABYLON.Texture(path, scene, false, false, undefined,
                undefined,
                () => console.warn(`[PBRMaterial] Optional texture not found: ${path}`)
            );
            return tex;
        } catch (err) {
            console.warn(`[PBRMaterial] Failed to load: ${path}`, err);
            return null;
        }
    };

    const normalTex = tryLoadTexture(normalPath);
    if (normalTex) {
        material.bumpTexture = normalTex;
        material.bumpTexture.level = normalLevel;
        material.bumpTexture.uScale = tiling;
        material.bumpTexture.vScale = tiling;
    }

    const roughnessTex = tryLoadTexture(roughnessPath);
    if (roughnessTex) {
        material.roughnessTexture = roughnessTex;
        material.roughnessTexture.uScale = tiling;
        material.roughnessTexture.vScale = tiling;
    }

    const aoTex = tryLoadTexture(aoPath);
    if (aoTex) {
        material.ambientTexture = aoTex;
        material.ambientTexture.uScale = tiling;
        material.ambientTexture.vScale = tiling;
    }

    material.metallic = metallic;
    material.roughness = roughness;
    material.useAmbientOcclusionFromMetallicTextureRed = false;

    return material;
}
