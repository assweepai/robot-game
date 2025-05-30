// /src/systems/PlatformCubeSync.js

export class PlatformCubeSync {
    constructor(platforms = [], cubes = []) {
        this.platforms = platforms;
        this.cubes = cubes;
    }

    setPlatforms(platforms) {
        this.platforms = platforms;
    }

    setCubes(cubeInstances) {
        this.cubes = cubeInstances.map(c => c.getMesh?.() ?? c);
    }

    update() {
        for (const platform of this.platforms) {
            const platMesh = platform.getMesh();
            const platBB = platMesh.getBoundingInfo().boundingBox;
            const platTop = platBB.maximumWorld.y;

            for (const cube of this.cubes) {
                if (!cube.isEnabled()) continue;

                const cubeBB = cube.getBoundingInfo().boundingBox;
                const cubeBottom = cubeBB.minimumWorld.y;
                const yDistance = Math.abs(cubeBottom - platTop);

                const xzDistance = BABYLON.Vector3.Distance(
                    new BABYLON.Vector3(cube.position.x, 0, cube.position.z),
                    new BABYLON.Vector3(platMesh.position.x, 0, platMesh.position.z)
                );

                if (yDistance < 0.1 && xzDistance < 2.0) {
                    cube.position.addInPlace(platform.velocity);
                }
            }
        }
    }
}
