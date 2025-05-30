// src/core/GamepadInputHelper.js

export class GamepadInputHelper {
    constructor(scene, inputManager, cameraManager, debug = true) {
        this.scene = scene;
        this.inputManager = inputManager;
        this.cameraManager = cameraManager;

        this._previousGamepadState = {};
        this.rightStickX = 0;
        this.rightStickY = 0;
        this.deadzone = 0.2;
        
        this.bindings = this.inputManager.gamepadBindings;
        this.debounceKeys = this.inputManager.debounceKeys;
        this.keys = this.inputManager.keys;        

        this._startGamepadLoop();

    }

    _startGamepadLoop() {
        const loop = () => {
            this._pollGamepad();
            requestAnimationFrame(loop);
        };
        loop();
    }

    _pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (!gp) return;

        const keys = this.inputManager.keys;
        const bindings = this.inputManager.gamepadBindings;
        const debounceKeys = this.inputManager.debounceKeys;

        for (let i = 0; i < gp.buttons.length; i++) {
            const action = bindings[i];
            if (!action) continue;

            const pressed = gp.buttons[i].pressed;
            const wasPressed = this._previousGamepadState[i] || false;

            if (debounceKeys.has(action)) {
                if (pressed && !wasPressed) {
                    if (action === 'pickup') {
                        keys.pickupPressed = true;
                    } else {
                        keys[`${action}Pressed`] = true;
                    }
                }
            } else {
                keys[action] = pressed ? 1 : 0;
            }

            this._previousGamepadState[i] = pressed;
        }

        const [lx, ly, rx, ry] = gp.axes;

        // Movement: left stick → keys.left/right/forward/back
        keys.left = (lx < -this.deadzone) ? 1 : 0;
        keys.right = (lx > this.deadzone) ? 1 : 0;
        keys.forward = (ly < -this.deadzone) ? 1 : 0;
        keys.back = (ly > this.deadzone) ? 1 : 0;

        // Right stick input
        this.rightStickX = Math.abs(rx) > 0.05 ? rx : 0;
        this.rightStickY = Math.abs(ry) > 0.05 ? ry : 0;

        // Apply tilt to camera
        this._applyCameraTilt();

        // Update debug overlay
        if (this.debugEnabled) {
            this._updateDebugOverlay();
        }
    }

    _applyCameraTilt() {
        if (!this.cameraManager || !this.cameraManager.getCamera) return;

        const camera = this.cameraManager.getCamera();
        if (!camera) return;

        const y = this.rightStickY;
        const DEADZONE = 0.5;

        if (Math.abs(y) > DEADZONE) {
            const tiltSpeed = 0.1;
            const minHeight = 0;
            const maxHeight = 5.0;

            camera.heightOffset += y * tiltSpeed;
            camera.heightOffset = BABYLON.Scalar.Clamp(camera.heightOffset, minHeight, maxHeight);
        }
    }
}
