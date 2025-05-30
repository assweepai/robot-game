// src/utils/MaterialCache.js
import { createPBRMaterial } from '../utils/createPBRMaterial.js';

export class MaterialCache {
    constructor() {
        this.cache = new Map();
    }

    getOrCreate(scene, name, baseTextureFile, options = {}) {
        const key = `${name}:${baseTextureFile}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const material = createPBRMaterial(scene, name, baseTextureFile, options);
        this.cache.set(key, material);
        return material;
    }
}

// Export a singleton instance
export const materialCache = new MaterialCache();

