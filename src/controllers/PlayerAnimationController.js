export class PlayerAnimationController {
    constructor(player) {
        this.player = player;
        this.animations = {};
        this.forcedState = null;
    }

    loadAnimations() {
        if (!this.player.animationGroups) {
            console.error("No animation groups found on player mesh.");
            return;
        }

        for (const group of this.player.animationGroups) {
            if (group.name) {
                this.animations[group.name] = group;
            }
        }
    }

    playAnim(name) {
        if (!this.animations || Object.keys(this.animations).length === 0) {
            console.warn(`Animations not loaded yet! Skipping playAnim(${name})`);
            return;
        }

        const anim = this.animations[name];
        if (!anim) {
            console.warn(`Animation [${name}] not found among loaded animations:`, Object.keys(this.animations));
            return;
        }

        if (anim.isPlaying) return;

        this.stopAllAnimsExcept(name);
        anim.start(true); // Looping
    }

    playOneShot(name, speed = 1.0) {
        const anim = this.animations[name];
        if (!anim) {
            console.warn(`Animation not found: ${name}`);
            return;
        }

        this.stopAllAnimsExcept(name);
        anim.start(false, speed, anim.from, anim.to, true); // Non-looping, with speed adjustment

        anim.onAnimationEndObservable.addOnce(() => {
            this.forcedState = null;
        });
    }

    stopAllAnimsExcept(exceptName) {
        for (const [name, anim] of Object.entries(this.animations)) {
            if (name !== exceptName && anim) {
                anim.stop();
            }
        }
    }

    pauseAnim(name) {
        const anim = this.animations[name];
        if (anim?.isPlaying) {
            anim.speedRatio = 0;
        }
    }

    resumeAnim(name) {
        const anim = this.animations[name];
        if (anim?.isPlaying && anim.speedRatio === 0) {
            anim.speedRatio = 1;
        }
    }
}
