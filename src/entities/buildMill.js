// /src/entities/buildMill.js

export function buildMill(scene, shadowGenerator, pathname) {
    return BABYLON.SceneLoader.ImportMeshAsync("", pathname + "/models/props/", "mill_006s.glb", scene).then((result) => {
        const windowHole = scene.getMeshByName("window");
        const windowBricked = scene.getMeshByName("window.bricked");
        const supportBricks = scene.getMeshByName("support");
        const supportBricksCap = scene.getMeshByName("supportcap");
        const windowpanes = scene.getMeshByName("window.panes");
        windowpanes?.dispose();

        // === Wall Part Builder ===
        function prepareWallPart(meshName, scale, position, rotationY = 90) {
            const mesh = scene.getMeshByName(meshName);
            const clone = mesh.clone(meshName + "_clone");

            clone.scaling.copyFrom(scale);
            clone.position.copyFrom(position);

            if (rotationY !== 0) {
                clone.rotate(BABYLON.Axis.Y, BABYLON.Tools.ToRadians(rotationY), BABYLON.Space.LOCAL);
            }

            return clone;
        }

        const wall = prepareWallPart("window.bricked", new BABYLON.Vector3(0.5, 0.6, 0.6), new BABYLON.Vector3(0, -0.1, 0));
        const window = prepareWallPart("window", new BABYLON.Vector3(0.11, 1.5, 1.5), new BABYLON.Vector3(0, -0.1, 0), 90);
        const support = prepareWallPart("support", new BABYLON.Vector3(0.6, 0.5925, 0.6), new BABYLON.Vector3(wall.position.x - 1.8, -0.1, wall.position.z), 270);

        // === Merge Segments ===
        const floor3 = BABYLON.Mesh.MergeMeshes([window, support], false, false, null, false, true);
        floor3.position.y += 6;
        floor3.setEnabled(false);

        const floor2 = BABYLON.Mesh.MergeMeshes([window, support], false, false, null, false, true);
        floor2.position.y += 3;
        floor2.setEnabled(false);

        const floor1 = BABYLON.Mesh.MergeMeshes([wall, support], true, false, null, false, true);
        floor1.setEnabled(false);

        const baseWall = BABYLON.Mesh.MergeMeshes([floor1, floor2, floor3], true, false, null, false, true);
        baseWall.name = "brickwall_master";
        baseWall.setEnabled(false);

        supportBricksCap?.dispose();
        supportBricks?.dispose();
        windowHole?.dispose();
        window?.dispose();
        windowBricked?.dispose();

        // === Build Wall Sides ===
        const segmentCount = 10;
        const spacing = 3.55;
        const wallLength = (segmentCount - 1) * spacing;
        const half = spacing / 2;

        function buildWallSide(name, dir, rotY, offset) {
            const node = new BABYLON.TransformNode(name, scene);
            for (let i = 0; i < segmentCount; i++) {
                const clone = baseWall.clone(`${name}_${i}`);
                clone.setEnabled(true);
                clone.parent = node;
                clone.position = dir.scale(i * spacing);
                clone.receiveShadows = true;
                shadowGenerator.addShadowCaster(clone);
            }
            node.rotation.y = rotY;
            node.position = offset;
            return node;
        }

        const wall1 = buildWallSide("wall1", new BABYLON.Vector3(1, 0, 0), 0, new BABYLON.Vector3(0, 0, 0));
        const wall2 = buildWallSide("wall2", new BABYLON.Vector3(1, 0, 0), Math.PI / 2, new BABYLON.Vector3(wallLength + half, 0, -half));
        const wall3 = buildWallSide("wall3", new BABYLON.Vector3(1, 0, 0), Math.PI, new BABYLON.Vector3(wallLength, 0, -wallLength - spacing));
        const wall4 = buildWallSide("wall4", new BABYLON.Vector3(1, 0, 0), 3 * Math.PI / 2, new BABYLON.Vector3(-half, 0, -wallLength - half));

        // === Center the Square ===
        const square = new BABYLON.TransformNode("mill_square", scene);
        [wall1, wall2, wall3, wall4].forEach(w => w.parent = square);

        let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, 0, Number.POSITIVE_INFINITY);
        let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, 0, Number.NEGATIVE_INFINITY);

        square.getChildMeshes().forEach(mesh => {
            mesh.computeWorldMatrix(true);
            const bb = mesh.getBoundingInfo().boundingBox;
            const minWorld = bb.minimumWorld;
            const maxWorld = bb.maximumWorld;
            min.x = Math.min(min.x, minWorld.x);
            min.z = Math.min(min.z, minWorld.z);
            max.x = Math.max(max.x, maxWorld.x);
            max.z = Math.max(max.z, maxWorld.z);
        });

        const centerX = (min.x + max.x) / 2;
        const centerZ = ((min.z + max.z) / 2) + 5.3;
        square.position = new BABYLON.Vector3(-centerX, 0, -centerZ);

        // Freeze matrices for perf
        [wall1, wall2, wall3, wall4].forEach(wall => wall.freezeWorldMatrix());

        return square;
    });
}
