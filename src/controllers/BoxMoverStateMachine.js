import { StateMachine } from "../utils/StateMachine.js";

export class BoxMoverStateMachine {
    constructor(boxMover) {
        this.boxMover = boxMover;
        this.fsm = new StateMachine();          // Self-contained FSM engine
        this.currentState = null;               // Set manually after setup
        this._scanDelay = 0;                    // Used in IDLE
    
        this._setupStates();                    // Define all states before using FSM
    
        // FSM must be booted AFTER states are wired in
        const initialState = "IDLE";
        this.fsm.setState(initialState);        // FSM's internal state gets set
        this.currentState = initialState;       // Mirror on wrapper
        this.fsm.setState(initialState);
        this.currentState = initialState;
    }

    setState(newState) {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this.fsm.setState(newState);
            this._onStateEnter(newState);
        }
    }

    _onStateEnter(state) {
        const animController = this.boxMover.animationController;
        if (!animController || !this.boxMover.animationsReady) return;

        switch (state) {
            case "IDLE":
                console.log("[FSM] IDLE");
                animController.playAnim("idle");
                break;
            case "SEEK":
                console.log("[FSM] SEEK");
                animController.playAnim("walkforward");
                break;            
            case "RETURN":
                console.log("[FSM] RETURN");
                animController.playAnim("walkforward");
                break;
            case "CARRY":
                console.log("[FSM] CARRY");
                animController.playAnim("carrywalk");
                break;
            case "PICKUP":
                console.log("[FSM] PICKUP");
                animController.playOneShot("pickup", 1.2);
                break;
            case "DROP":
                console.log("[FSM] DROP");
                animController.playOneShot("drop", 1.2);
                break;
            default:
                console.warn(`[BoxMoverFSM] Unknown state: ${state}`);
                break;
        }
    }

    _setupStates() {
        this.fsm.addState("IDLE", {
            onEnter: () => {
                this.boxMover.target = null;
                this._scanDelay = 0.5;
            },
            onUpdate: (dt) => {
                if (this.boxMover.target) {
                    this.setState("SEEK");
                }
            }
        });

        this.fsm.addState("SEEK", {
          onEnter: () => {
            // Give navmesh a moment to register cube
            setTimeout(() => {
              this.boxMover._findNearestCube();
            }, 50); // ← Tune if needed (30–100ms range)
          },
          onUpdate: () => {
            const dist = BABYLON.Vector3.Distance(
              this.boxMover.agentTransform.position,
              this.boxMover.target?.position ?? BABYLON.Vector3.Zero()
            );
            if (dist < 1.5) {
              this.setState("PICKUP");
            }
          }
        });

        this.fsm.addState("PICKUP", {
            onEnter: () => {
                this.boxMover._pickupCube(this.boxMover.target);
                this.setState("CARRY");
            }
        });

        this.fsm.addState("CARRY", {
            onEnter: () => {
                this.boxMover.crowd.agentGoto(
                    this.boxMover.agentIdx,
                    this.boxMover.navPlugin.getClosestPoint(this.boxMover.startPosition)
                );
            },
            onUpdate: () => {
                const dist = BABYLON.Vector3.Distance(
                    this.boxMover.agentTransform.position,
                    this.boxMover.startPosition
                );
                if (dist < 1.5) {
                    this.setState("DROP");
                }
            }
        });

        this.fsm.addState("DROP", {
            onEnter: () => {
                this.boxMover._dropCube();
                this.setState("RETURN");
            }
        });

        this.fsm.addState("RETURN", {
            onEnter: () => {
                this.boxMover.crowd.agentGoto(
                    this.boxMover.agentIdx,
                    this.boxMover.navPlugin.getClosestPoint(this.boxMover.startPosition)
                );
            },
            onUpdate: () => {
                const dist = BABYLON.Vector3.Distance(
                    this.boxMover.agentTransform.position,
                    this.boxMover.startPosition
                );
                if (dist < 1.0) {
                    this.setState("IDLE");
                }
            }
        });
    }

    update(deltaTime) {
        this.fsm.update(deltaTime);
    
        // Global cube polling every second (regardless of current FSM state)
        this._pollTimer = (this._pollTimer ?? 0) - deltaTime;
        if (this._pollTimer <= 0) {
            this._pollTimer = 1.0; // Check once per second
    
            const hasTarget = this.boxMover.target;
            const isIdle = this.currentState === "IDLE";
            const notCarrying = !this.boxMover.heldCube;
    
            if (!hasTarget && notCarrying && this.currentState !== "SEEK") {
                const best = this.boxMover._findNearestCube(true); // onlyScan mode
                if (best) {
                    console.log("[FSM] Global poll: reacquired", best.name);
                    this.setState("SEEK");
                }
            }
        }
    
        // Runtime animation logic (SEEK/RETURN motion)
        if (!this.boxMover.animationsReady || !this.boxMover.animationController) return;
    
        const state = this.currentState;
        const animController = this.boxMover.animationController;
    
        if (state === "SEEK" || state === "RETURN") {
            if (this.boxMover.isMoving()) {
                if (animController.currentAnim?.name !== "walkforward") {
                    animController.playAnim("walkforward");
                }
            } else {
                if (animController.currentAnim?.name !== "idle") {
                    animController.playAnim("idle");
                }
            }
        }
    }

}
