export default class EventEmitter<T extends Record<keyof T, unknown[]>> {
    listeners: { [K in keyof T]?: ((...args: T[K]) => void)[] };
    constructor() {
        this.listeners = {};
    }
    on<K extends keyof T>(event: K, listener: (...args: T[K]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off<K extends keyof T>(event: K, listener: (...args: T[K]) => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }
    emit<K extends keyof T>(event: K, ...args: T[K]) {
        if (this.listeners[event]) {
            if (this.listeners[event].length == 0)
                console.error(`No listeners for ${String(event)} event`);
            else
                this.listeners[event].forEach((listener) => listener(...args));
        }
    }
    destroy() {
        this.listeners = {};
    }
}