export class PhysicsClamper {
	constructor(levelBounds, boundaryInset = 0.5) {
		this.levelBounds = levelBounds;
		this.boundaryInset = boundaryInset;
		this.trackedObjects = new Set();
	}

	add(object) {
		this.trackedObjects.add(object);
	}

	remove(object) {
		this.trackedObjects.delete(object);
	}

	update() {
		for (const object of this.trackedObjects) {
			const impostor = object.physicsImpostor;
			if (!impostor || impostor.getParam("mass") === 0) continue;

			const pos = object.getAbsolutePosition();
			const body = impostor.physicsBody;
			if (!body) continue;

			const clamp = this.levelBounds;
			const i = this.boundaryInset;

			const clampedX = BABYLON.Scalar.Clamp(pos.x, clamp.minX + i, clamp.maxX - i);
			const clampedY = BABYLON.Scalar.Clamp(pos.y, clamp.minY + i, clamp.maxY - i);
			const clampedZ = BABYLON.Scalar.Clamp(pos.z, clamp.minZ + i, clamp.maxZ - i);

			const velocity = body.velocity;
			let bounced = false;

			if (pos.x !== clampedX) {
				velocity.x *= -0.5;
				bounced = true;
			}
			if (pos.y !== clampedY) {
				velocity.y *= -0.5;
				bounced = true;
			}
			if (pos.z !== clampedZ) {
				velocity.z *= -0.5;
				bounced = true;
			}

			if (bounced) {
				body.velocity = velocity;
				body.position.set(clampedX, clampedY, clampedZ);
			}
		}
	}
}

export function convertLevelBounds(bounds) {
	const halfWidth = bounds.width / 2;
	const halfDepth = bounds.depth / 2;

	return {
		minX: bounds.center.x - halfWidth,
		maxX: bounds.center.x + halfWidth,
		minY: -100,
		maxY: 100,
		minZ: bounds.center.z - halfDepth,
		maxZ: bounds.center.z + halfDepth
	};
}
