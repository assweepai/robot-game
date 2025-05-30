// src/config/DefaultPlayerConfig.js

export const DefaultPlayerConfig = {
    // Movement
    walkSpeed: 5.0,          // Walking speed
    runSpeed: 6.5,           // Running speed
    jumpForce: 7.5,          // Upward jump velocity
    
    //️ Capsule Physics Body
    capsuleHeight: 0.6,      // Player body height
    capsuleRadius: 0.2,      // Player body radius

    //️ Hitbox
    hitboxHeight: 0.4,        // Hitbox height
    hitboxWidth: 0.4,         // Hitbox width
    hitboxDepth: 0.4,         // Hitbox depth
    hitboxForwardOffset: 0.2, // How much hitbox is pushed forward

    //️ Character Scaling
    modelScale: 0.25,          // 3D Model scaling
    modelVerticalOffset: -0.3, // Adjust model up/down
    
    // Character Physics
    physicsLinearDamping: 0.9,   // Controls how quickly player slows down in air/motion
    physicsAngularDamping: 1.0,   // Controls how much the player resists spinning

    //️ Grounded Detection
    groundedRayLength: 0.6,          // Length of raycast to detect ground
    groundedThreshold: 0.2,          // Minimum distance to be considered grounded
    groundedVelocityThreshold: 0.05, // Vertical speed below which considered grounded

    //️ Physics
    bodyMass: 1,             // Main body mass
    bodyFriction: 1,         // Friction against surfaces
    bodyRestitution: 0,      // Bounciness
    linearDamping: 0.9,      // Stop sliding forever
    angularDamping: 1.0,     // Stop spinning forever
    
    // Climb Settings
    climbStickForce: 0.4,         // Grip force against walls
    climbSpeed: 2.0,              // Speed of movement on wall
    climbJumpBackLateral: 5.0,    // Pushback strength when jumping off wall
    climbJumpBackVertical: 6.0,   // Upward force when jumping off wall
    climbSpinDurationFrames: 20,  // Frames for 180° spin
    
    // --- Ledge Hanging ---
    ledgeHangDetectionRange: 0.75,     // Forward detection range for ledge
    ledgeHangMinYDiff: 0.4,            // Min Y distance from top of ledge
    ledgeHangMaxYDiff: 0.5,            // Max Y distance from top of ledge
    ledgeHangShimmySpeed: 0.02,        // Shimmy left/right speed
    ledgeHangForwardRayLength: 0.5,    // Forward raycast length while hanging
    ledgeHangDropImpulseY: -2,         // Vertical impulse when dropping
    ledgeHangLerpDropDistance: 1.0     // Distance to lerp backward when dropping    
    
};
