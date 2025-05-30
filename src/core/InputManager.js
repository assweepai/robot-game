export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.keys = {
            test: 0,
            punch: 0,
            kick: 0,
            jump: 0,
            left: 0,
            right: 0,
            forward: 0,
            back: 0,
            run: 0,
            pickup: 0,
            push: 0,
            climbUpPressed: false,
            climbUpReleased: true,
            jumpPressed: false,
            jumpReleased: true,
            punchPressed: false,
            kickPressed: false,
            pickupPressed: false,
        };

        this.keyBindings = {
            'Space': 'jump',
            'KeyA': 'left',
            'KeyD': 'right',
            'KeyW': 'forward',
            'KeyS': 'back',
            'ShiftLeft': 'run',
            'ShiftRight': 'run',
            'KeyF': 'pickup',
            'KeyT': 'push',
            'KeyR': 'kick',
            'KeyE': 'punch'
        };

        this.debounceKeys = new Set(['jump', 'kick', 'punch', 'pickup', 'test']);

        this.gamepadBindings = {
            0: 'jump',   // A
            1: 'kick',   // B
            2: 'pickup', // X
            3: 'punch',  // Y
            4: 'push',   // LB
            5: 'run',    // RB
            12: 'test',  // Dpad up
            13: 'test',  // Dpad down
            14: 'test',  // Dpad left
            15: 'test'   // Dpad right
        };

        this.rightStickX = 0;
        this.rightStickY = 0;
        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cameraManager = null;

        this._previousGamepadState = {};

        this._setupMouse();
        this._setupKeyboard();
        this._startGamepadLoop();
    }

    clearKeys() {
        for (let key in this.keys) {
            if (!key.includes('Pressed') && !key.includes('Released')) {
                this.keys[key] = 0;
            }
        }
    }

    _setupMouse() {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            console.warn("Canvas not found for InputManager!");
            return;
        }

        canvas.addEventListener('pointermove', (evt) => {
            this.mouseX = evt.movementX || 0;
            this.mouseY = evt.movementY || 0;
        });

        canvas.addEventListener('pointerdown', (evt) => {
            if (evt.button === 0) {
                this.isMouseDown = true;
            }
        });

        canvas.addEventListener('pointerup', (evt) => {
            if (evt.button === 0) {
                this.isMouseDown = false;
            }
        });
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (evt) => this._handleKeyDown(evt), false);
        window.addEventListener('keyup', (evt) => this._handleKeyUp(evt), false);
    }

    _handleKeyDown(evt) {
        if (evt.repeat) return;

        const action = this.keyBindings[evt.code];
        if (!action) return;

        if (this.debounceKeys.has(action)) {
            switch (action) {
                case 'jump':
                    if (this.keys.jumpReleased) {
                        this.keys.jumpPressed = true;
                        this.keys.jumpReleased = false;
                    }
                    break;
                case 'kick':
                case 'punch':
                case 'pickup':
                    this.keys[`${action}Pressed`] = true;
                    break;
                default:
                    this.clearKeys();
                    setTimeout(() => { this.keys[action] = 1; }, 10);
                    break;
            }
        } else {
            this.keys[action] = 1;
        }
    }

    _handleKeyUp(evt) {
        const action = this.keyBindings[evt.code];
        if (action) {
            this.keys[action] = 0;
            if (action === 'jump') {
                this.keys.jumpReleased = true;
            }
        }
    }

    resetPressedKeys() {
        this.keys.kickPressed = false;
        this.keys.punchPressed = false;
        this.keys.pickupPressed = false;
    }

    _startGamepadLoop() {
        const poll = () => {
            this._pollGamepad();
            requestAnimationFrame(poll);
        };
        poll();
    }

    _pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (!gp) return;

        for (let i = 0; i < gp.buttons.length; i++) {
            const action = this.gamepadBindings[i];
            if (!action) continue;

            const pressed = gp.buttons[i].pressed;
            const wasPressed = this._previousGamepadState[i] || false;

            if (this.debounceKeys.has(action)) {
                if (pressed && !wasPressed) {
                    if (action === 'pickup') {
                        this.keys.pickupPressed = true;
                    } else {
                        this.keys[`${action}Pressed`] = true;
                    }
                }
            } else {
                this.keys[action] = pressed ? 1 : 0;
            }

            this._previousGamepadState[i] = pressed;
        }

        const DEADZONE = 0.5;
        const leftX = gp.axes[0];
        const leftY = gp.axes[1];

        this.keys.left = (leftX < -DEADZONE) ? 1 : 0;
        this.keys.right = (leftX > DEADZONE) ? 1 : 0;
        this.keys.forward = (leftY < -DEADZONE) ? 1 : 0;
        this.keys.back = (leftY > DEADZONE) ? 1 : 0;

        this.rightStickX = Math.abs(gp.axes[2]) > 0.05 ? gp.axes[2] : 0;
        this.rightStickY = Math.abs(gp.axes[3]) > 0.05 ? gp.axes[3] : 0;
        
        this._updateCameraTilt();
        this._updatePlayerRotation();
    }

    setPlayer(player) {
        this.player = player;
    }

    setCameraManager(cameraManager) {
        this.cameraManager = cameraManager;
    }

    isRightStickActive(deadzone = 0.5) {
        return Math.abs(this.rightStickX) > deadzone;
    }
    
    _updatePlayerRotation() {
        if (!this.player?.mesh?.rotationQuaternion) return;
    
        const x = this.rightStickX;
        const DEADZONE = 0.2;
    
        if (Math.abs(x) > DEADZONE) {
            const turnSpeed = 0.03; // Adjust for desired turn rate
            const turnAmount = x * turnSpeed;
    
            const deltaQuat = BABYLON.Quaternion.FromEulerAngles(0, turnAmount, 0);
            this.player.mesh.rotationQuaternion = this.player.mesh.rotationQuaternion.multiply(deltaQuat);
        }
    }    
    
    _updateCameraTilt() {
        if (!this.cameraManager?.getCamera) return;
    
        const camera = this.cameraManager.getCamera();
        if (!camera) return;
    
        const DEADZONE = 0.5;
        const y = this.rightStickY;
    
        if (Math.abs(y) > DEADZONE) {
            const tiltSpeed = 0.1;
            const minHeight = 0;
            const maxHeight = 5.0;
    
            camera.heightOffset += y * tiltSpeed;
            camera.heightOffset = BABYLON.Scalar.Clamp(camera.heightOffset, minHeight, maxHeight);
        }
    }  
}
