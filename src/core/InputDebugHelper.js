export class InputDebugHelper {
    constructor(inputManager, engine, lightingManager, postFX, player, gamepadHelper) {
        this.inputManager = inputManager;
        this.engine = engine;
        this.lightingManager = lightingManager;
        this.postFX = postFX;
        this.player = player;
        this.gamepadHelper = gamepadHelper;

        this.panel = document.createElement('div');
        document.body.appendChild(this.panel);

        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.left = '10px';
        this.panel.style.padding = '10px';
        this.panel.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.panel.style.color = 'white';
        this.panel.style.fontFamily = 'monospace';
        this.panel.style.fontSize = '12px';
        this.panel.style.zIndex = 9999;
        
        this.gamepadHelper.rightStickX = 0;  // ✅ in constructor   
        this.gamepadHelper.rightStickY = 0;  // ✅ in constructor        

        this._startUpdateLoop();
    }

    _startUpdateLoop() {
        const update = () => {
            const scaling = this.engine.getHardwareScalingLevel().toFixed(2);
            const shadowSize = this.lightingManager?.shadowGenerator?.getShadowMap()?.getSize().width || "Unknown";
            const playerState = this.player?.stateMachine?.currentState || "Unknown";
            const isGrounded = this.player?.isGrounded !== undefined ? this.player.isGrounded : "Unknown";
            const velocityY = this.player?.mesh?.physicsImpostor?.getLinearVelocity()?.y.toFixed(2) ?? "Unknown";
            const gravityVec = this.player?.mesh?.physicsImpostor?.gravity || { x: 0, y: 0, z: 0 };
            
            const isClimbing = this.player?.isClimbing !== undefined ? this.player.isClimbing : "Unknown";
            const isClimbingUp = this.player?.isClimbingUp !== undefined ? this.player.isClimbingUp : "Unknown";
            const isHanging = this.player?.isHanging !== undefined ? this.player.isHanging : "Unknown";
            const isOnTopFace = this.player?.isOnTopFace !== undefined ? this.player.isOnTopFace : "Unknown";
            
            const jumpPressed = this.player?.inputManager?.keys.jumpPressed ?? "Unknown";
            const jumpReleased = this.player?.inputManager?.keys.jumpReleased ?? "Unknown";
            const climbTriggered = this.player?.ledgeHangController?.climbTriggered ?? "Unknown";
            
            const forcedState = this.player?.animationController.forcedState ?? "Unknown";
        
            this.panel.innerHTML = `
                <b>Input Debug:</b><br/><br/>
                Mouse Down: ${this.inputManager.isMouseDown}<br/>
                MouseX: ${this.inputManager.mouseX.toFixed(3)}<br/>
                MouseY: ${this.inputManager.mouseY.toFixed(3)}<br/>
                RightStickX: ${this.gamepadHelper.rightStickX.toFixed(3)}<br/>
                RightStickY: ${this.gamepadHelper.rightStickY.toFixed(3)}<br/><br/>
                
                <b>Performance Info:</b><br/><br/>
                Hardware Scaling: ${scaling}<br/>
                Shadow Map Size: ${shadowSize}<br/>
                Gravity: (${gravityVec.x.toFixed(2)}, ${gravityVec.y.toFixed(2)}, ${gravityVec.z.toFixed(2)})<br/><br/>
        
                <b>Player Info:</b><br/><br/>
                State: ${playerState}<br/>
                Grounded: ${isGrounded}<br/>
                Velocity Y: ${velocityY}<br/>
                Player Mass: ${this.player.mesh.physicsImpostor.physicsBody.mass}<br/><br/>
                
                Climbing: ${isClimbing}<br/>
                Climbing Up: ${isClimbingUp}<br/>
                Hanging: ${isHanging}<br/>
                On Top Face: ${isOnTopFace}<br/><br/>
                
                Carrying: ${this.player.carrying ? 'true' : 'false'}<br/>
                HeldCube: ${this.player.pickupController?.heldCube ? this.player.pickupController.heldCube.name : 'none'}<br/><br/>          
                
                Forced State: ${forcedState}<br/>
                
            `;
            requestAnimationFrame(update);
        };
        update();

    }

}
