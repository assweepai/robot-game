// src/utils/StateMachine.js

export class StateMachine {
    constructor(initialState = null) {
        this.states = {};
        this.currentState = initialState;
        this.currentStateName = null;
    }

    addState(name, { onEnter = () => {}, onUpdate = () => {}, onExit = () => {} }) {
        this.states[name] = { onEnter, onUpdate, onExit };
    }

    setState(name) {
        if (this.currentStateName === name || !this.states[name]) return;

        if (this.currentState?.onExit) {
            this.currentState.onExit();
        }

        this.currentStateName = name;
        this.currentState = this.states[name];

        if (this.currentState.onEnter) {
            this.currentState.onEnter();
        }
    }

    update(deltaTime) {
        if (this.currentState?.onUpdate) {
            this.currentState.onUpdate(deltaTime);
        }
    }
}
