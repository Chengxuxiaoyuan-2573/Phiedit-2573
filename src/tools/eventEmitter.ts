export default class EventEmitter<T extends Record<keyof T, unknown[]>> {
    listeners: Listeners<T>;
    constructor() {
        this.listeners = {};
    }
    on<K extends keyof T>(event: K, handler: (...args: T[K]) => void, priority = 0) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push({
            handler,
            priority
        });
    }
    off<K extends keyof T>(event: K, listener: (...args: T[K]) => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l.handler !== listener);
        }
    }
    emit<K extends keyof T>(event: K, ...args: T[K]) {
        if (this.listeners[event]) {
            if (this.listeners[event].length === 0) {
                console.error(`${String(event)} 事件没有被任何监听器监听`);
            }
            else {
                this.listeners[event]
                    .toSorted((a, b) => a.priority - b.priority)
                    .forEach(({ handler }) => {
                        handler(...args);
                    });
            }
        }
    }
    destroy() {
        this.listeners = {};
    }
}

type Listeners<T extends Record<keyof T, unknown[]>> = {
    [K in keyof T]?: {

        /** 监听器函数 */
        handler: (...args: T[K]) => void,

        /** 优先级，数字越小优先级越高 */
        priority: number
    }[]
}