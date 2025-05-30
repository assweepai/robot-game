// src/config/BoxMoverDefaultConfig.js

export const BoxMoverDefaultConfig = {
    // Model Visuals
    modelScale: 1.5,
    modelVerticalOffset: -0.55,
    holdPointPosition: { x: 0, y: 0.85, z: 0.4 },

    // Capsule Mesh
    capsuleHeight: 1.0,
    capsuleRadius: 0.3,

    // Physics Dummy Box
    physicsBoxWidth: 0.6,
    physicsBoxHeight: 1.0,
    physicsBoxDepth: 0.6,

    // Physics Properties
    physicsMass: 1,
    physicsFriction: 2,
    physicsRestitution: 0,
    linearDamping: 0.9,
    angularDamping: 1.0,

    // Crowd Agent Settings
    agentRadius: 0.3,
    agentHeight: 1.0,
    agentMaxAcceleration: 3.0,
    agentMaxSpeed: 2.0,
    agentCollisionQueryRange: 1,
    agentPathOptimizationRange: 1.0,
    agentSeparationWeight: 1
};
