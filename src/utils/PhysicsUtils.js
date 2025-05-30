export function removeMass(mesh) {
    if (!mesh?.physicsImpostor?.physicsBody) return;

    const body = mesh.physicsImpostor.physicsBody;

    if (mesh.originalMass === undefined) {
        mesh.originalMass = body.mass;
    }

    body.mass = mesh.name === 'playerCapsule' ? 1e-18 : 0;
    body.updateMassProperties();
}

export function resetMass(mesh, defaultMass = 1) {
    if (!mesh?.physicsImpostor?.physicsBody) return;

    const body = mesh.physicsImpostor.physicsBody;
    const restoredMass = mesh.originalMass ?? defaultMass;

    body.mass = restoredMass;
    body.updateMassProperties();

    delete mesh.originalMass;
}
