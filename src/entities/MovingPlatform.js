// /src/entities/MovingPlatform.js

export class MovingPlatform {
    constructor(scene, shadowGenerator, options = {}) {
        const {
            name = "movingPlatform",
            width = 2,
            height = 0.125,
            depth = 2,
            start = new BABYLON.Vector3(0, 1, 0),
            end = new BABYLON.Vector3(0, 1, 8),
            duration = 360,
            texturePath = null
        } = options;

        this.scene = scene;
        this.mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
        this.mesh.position = start.clone();
        this.mesh.name = name;

        if (texturePath) {
            const mat = new BABYLON.PBRMaterial(`${name}_mat`, scene);
            mat.roughness = 1;
            mat.albedoTexture = new BABYLON.Texture(texturePath, scene);
            this.mesh.material = mat;
        }

        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(this.mesh);
        }

        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0 },
            scene
        );

        this.lastPosition = this.mesh.position.clone();
        this.velocity = BABYLON.Vector3.Zero(); // updated every frame

        this._createAnimation(start, end, duration);
    }

    _createAnimation(start, end, duration) {
        const anim = new BABYLON.Animation("movePlatform", "position", 60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

        anim.setKeys([
            { frame: 0, value: start },
            { frame: duration, value: end },
            { frame: duration * 2, value: start }
        ]);

        this.mesh.animations = [anim];
        this.scene.beginAnimation(this.mesh, 0, duration * 2, true);
    }

    update() {
        const currentPos = this.mesh.position.clone();
        this.velocity = currentPos.subtract(this.lastPosition);
        this.lastPosition.copyFrom(currentPos);
    }

    getMesh() {
        return this.mesh;
    }
}
