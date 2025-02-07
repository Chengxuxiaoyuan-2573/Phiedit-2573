type PositionX = number;
type PositionY = number;
type Options = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
}
interface EventMap {
    MOUSE_LEFT_CLICK: [PositionX, PositionY, Options]
    MOUSE_RIGHT_CLICK: [PositionX, PositionY]
    MOUSE_MOVE: [PositionX, PositionY, Options]
    MOUSE_UP: []
}

class EventEmitter {
    listeners: { [K in keyof EventMap]?: ((...args: EventMap[K]) => void)[] };
    constructor() {
        this.listeners = {};
    }
    on<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]) {
        if (this.listeners[event]) {
            if (this.listeners[event].length == 0)
                console.warn(`No listeners for ${event} event`);
            else
                this.listeners[event].forEach((listener) => listener(...args));
        }
    }
}
export default new EventEmitter();