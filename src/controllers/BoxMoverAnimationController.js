export class BoxMoverAnimationController {
    constructor(boxMover) {
        this.boxMover = boxMover;
        this.animations = boxMover.animationGroups;
        this.currentAnim = null;
        this.forcedState = null;
    }

    /**
     * Play a looping animation by name
     * @param {string} name - Animation group name
     * @param {number} speed - Optional speed ratio (default 1.0)
     */
    playAnim(name, speed = 1.0) {
        const anim = this._getAnim(name);
        if (!anim) {
            console.warn(`[BoxMoverAnim] Animation not found: ${name}`);
            return;
        }

        this._stopAll();
        anim.reset();
        anim.speedRatio = speed;
        anim.play(true); // looping
        this.currentAnim = anim;
    }

    /**
     * Play a one-shot animation (non-looping)
     * @param {string} name - Animation group name
     * @param {number} speed - Optional speed ratio
     * @param {function} onComplete - Optional callback on animation complete
     */
    playOneShot(name, speed = 1.0, onComplete = null) {
        const anim = this._getAnim(name);
        if (!anim) {
            console.warn(`[BoxMoverAnim] One-shot animation not found: ${name}`);
            return;
        }

        this._stopAll();
        anim.reset();
        anim.speedRatio = speed;
        anim.play(false); // one-shot

        anim.onAnimationGroupEndObservable.addOnce(() => {
            if (onComplete) onComplete();
        });

        this.currentAnim = anim;
    }

    /**
     * Stop all animation groups
     */
    _stopAll() {
        this.animations.forEach(group => group.stop());
    }

    /**
     * Find animation group by name
     */
    _getAnim(name) {
        return this.animations.find(group => group.name === name);
    }
}
