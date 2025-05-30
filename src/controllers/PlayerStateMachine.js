export class PlayerStateMachine {
    constructor(player) {
        this.player = player;
        this.currentState = 'idle';
        this.isJumping = false;
    }

    setState(newState) {
        if (this.currentState !== newState) {
            //console.log(`FSM: ${this.currentState} -> ${newState}`);
            this.currentState = newState;
            this._onStateEnter(newState);
        }
    }

    _onStateEnter(state) {
        const animController = this.player.animationController;

        if (animController.forcedState && animController.forcedState !== state) {
            console.warn(`FSM: Cannot enter ${state}, forcedState active: ${animController.forcedState}`);
            return;
        }

        switch (state) {
            case 'idle':
                animController.playAnim('idle');
                break;
            case 'walk':
                animController.playAnim('walkforward');
                break;
            case 'run':
                animController.playAnim('run');
                break;
            case 'jump':
                animController.playAnim('jump');
                break;
            case 'fall':
                animController.playAnim('fallingidle');
                break;
            case 'climb':
                animController.playAnim('climbwall');
                break;
            case 'hang':
                animController.playAnim('hangidle');
                break;
            case 'shimmyleft':
                animController.playAnim('hangshimmyleft');
                break;
            case 'shimmyright':
                animController.playAnim('hangshimmyright');
                break;
            case 'climbup':
                animController.forcedState = 'climbup';
                animController.playOneShot('climbup', 1.5);
                break;
            case 'punch':
                animController.forcedState = 'punch';
                animController.playOneShot('punch', 1.5);
                break;
            case 'kick':
                animController.forcedState = 'kick';
                animController.playOneShot('kick', 1.5);
                break;
            case 'carryidle':
                this.player.animationController.playAnim('carryidle');
                break;
            case 'carrywalk':
                this.player.animationController.playAnim('carrywalk');
                break;                
            default:
                console.warn(`FSM: Unknown state: ${state}`);
                break;
        }
    }

    update(inputManager, isGrounded, velocity) {
        const animController = this.player.animationController;

        if (!this.player.animationsReady) return;

        if (!this.player.gameReady) {
            setTimeout(() => { this.player.gameReady = true; }, 50);
            return;
        }

        // Kill infinite jump after grounded
        if (isGrounded && animController.forcedState === "jump") {
            animController.forcedState = null;
            return;
        }
        
        // STEP 0: Jump override (physics-driven)
        if (animController.forcedState === 'jump') {
            const verticalVelocity = velocity.y;
        
            if (verticalVelocity < -0.1) {
                //console.log("[FSM] Jump apex reached — switching to fall");
                animController.forcedState = null;
                this.setState('fall');
            } else {
                this.setState('jump');
            }
            return;
        }        

        // 1. Forced State LOCK
        if (animController.forcedState) {
            this.setState(animController.forcedState);
            return;
        }

        // 2. Combat Inputs
        if (inputManager.keys.punchPressed) {
            this.setState('punch');
            return;
        }
        if (inputManager.keys.kickPressed) {
            this.setState('kick');
            return;
        }

        // 3. Climbing and Hanging
        if (this.player.isHanging) {
            if (inputManager.keys.left) {
                this.setState('shimmyleft');
            } else if (inputManager.keys.right) {
                this.setState('shimmyright');
            } else {
                this.setState('hang');
            }
            return;
        }

        if (this.player.isClimbingUp) {
            this.setState('climbup');
            return;
        }

        if (this.player.isClimbing) {
            if (animController.forcedState === 'jump') {
                //console.log("[FSM] Climb overrides jump forcedState");
                animController.forcedState = null;
            }
            this.setState('climb');
            return;
        }

        // 4. Grounded Movement
        if (isGrounded) {
            const isMoving =
                inputManager.keys.forward || inputManager.keys.back ||
                inputManager.keys.left || inputManager.keys.right;
        
            if (this.player.isCarrying) {
                // Disable run input when carrying
                this.setState(isMoving ? 'carrywalk' : 'carryidle');
            } else {
                this.setState(isMoving
                    ? (inputManager.keys.run ? 'run' : 'walk')
                    : 'idle');
            }
        
            return;
        }

        // 5. Airborne Handling: Fall transition
        
        const verticalVelocity = velocity.y;
        
        if (!isGrounded && verticalVelocity <= -1) {
            if (this.currentState !== 'fall') {
                animController.forcedState = null;
                this.setState('fall');
            }
            return;
        }       
    }
}
