/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isObject, isArray } from "lodash";
import { NumberEvent, ColorEvent, TextEvent, IEvent } from "./event";
import { RGBcolor } from "../tools/color";
import { BPM } from "./beats";
import ChartError from "./error";
import { IObjectizable } from "./objectizable";
interface EventLayerOptions {
    BPMList: BPM[]
    judgeLineNumber: number
    eventLayerId: string
}
export interface IBaseEventLayer {
    moveXEvents?: IEvent<number>[]
    moveYEvents?: IEvent<number>[]
    rotateEvents?: IEvent<number>[]
    alphaEvents?: IEvent<number>[]
    speedEvents?: IEvent<number>[]
}
abstract class AbstractEventLayer implements IObjectizable {
    readonly errors: ChartError[] = [];
    abstract getEventsByType(type: string): IEvent<unknown>[];
    abstract addEvent(event: unknown, type: string, id?: string): IEvent<unknown>;
    abstract toObject(): object;
}
export const baseEventTypes = [
    "moveX",
    "moveY",
    "rotate",
    "alpha",
    "speed"
] as const;
export const extendedEventTypes = [
    "scaleX",
    "scaleY",
    "color",
    "paint",
    "text",

    // "incline",
    // "gif",
] as const;

export interface IBaseEventLayerIdentifier {
    readonly isBaseEventLayer: true;
}

export interface IExtendedEventLayerIdentifier {
    readonly isExtendedEventLayer: true;
}

export function isBaseEventLayer(value: unknown): value is IBaseEventLayer {
    if (!isObject(value)) {
        return false;
    }
    return "isBaseEventLayer" in value;
}

export function isExtendedEventLayer(value: unknown): value is IExtendedEventLayer {
    if (!isObject(value)) {
        return false;
    }
    return "isExtendedEventLayer" in value;
}

export class BaseEventLayer extends AbstractEventLayer implements IBaseEventLayer, IBaseEventLayerIdentifier {
    moveXEvents: NumberEvent[] = [];
    moveYEvents: NumberEvent[] = [];
    rotateEvents: NumberEvent[] = [];
    alphaEvents: NumberEvent[] = [];
    speedEvents: NumberEvent[] = [];
    readonly isBaseEventLayer = true;
    eventNumbers = {
        moveX: 0,
        moveY: 0,
        rotate: 0,
        alpha: 0,
        speed: 0
    };
    toObject() {
        const obj: IBaseEventLayer = {};
        if (this.moveXEvents.length > 0) obj.moveXEvents = this.moveXEvents.map(event => event.toObject());
        if (this.moveYEvents.length > 0) obj.moveYEvents = this.moveYEvents.map(event => event.toObject());
        if (this.rotateEvents.length > 0) obj.rotateEvents = this.rotateEvents.map(event => event.toObject());
        if (this.alphaEvents.length > 0) obj.alphaEvents = this.alphaEvents.map(event => event.toObject());
        if (this.speedEvents.length > 0) obj.speedEvents = this.speedEvents.map(event => event.toObject());
        return obj;
    }
    getEventsByType(type: string) {
        switch (type) {
            case "moveX": return this.moveXEvents;
            case "moveY": return this.moveYEvents;
            case "rotate": return this.rotateEvents;
            case "alpha": return this.alphaEvents;
            case "speed": return this.speedEvents;
            default: throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    addEvent(event: unknown, type: string, id?: string) {
        const baseConfig = {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            eventLayerId: this.options.eventLayerId
        };

        switch (type) {
            case "moveX": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "moveX", id, eventNumber: this.eventNumbers.moveX++ });
                this.moveXEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "moveY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "moveY", id, eventNumber: this.eventNumbers.moveY++ });
                this.moveYEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "rotate": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "rotate", id, eventNumber: this.eventNumbers.rotate++ });
                this.rotateEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "alpha": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "alpha", id, eventNumber: this.eventNumbers.alpha++ });
                this.alphaEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "speed": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "speed", id, eventNumber: this.eventNumbers.speed++ });
                this.speedEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        super();
        if (isNaN(+options.eventLayerId)) {
            throw new Error(`传入的 eventLayerId 参数必须是数字，但接收到了：${options.eventLayerId}`);
        }

        if (isObject(eventLayer)) {
            if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents)) {
                for (const event of eventLayer.moveXEvents) {
                    this.addEvent(event, "moveX");
                }
            }

            if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents)) {
                for (const event of eventLayer.moveYEvents) {
                    this.addEvent(event, "moveY");
                }
            }

            if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents)) {
                for (const event of eventLayer.rotateEvents) {
                    this.addEvent(event, "rotate");
                }
            }

            if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents)) {
                for (const event of eventLayer.alphaEvents) {
                    this.addEvent(event, "alpha");
                }
            }

            if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents)) {
                for (const event of eventLayer.speedEvents) {
                    this.addEvent(event, "speed");
                }
            }
        }

        // 普通事件层级，要求至少每个种类要有一个垫底的事件
        for (const type of baseEventTypes) {
            const events = this.getEventsByType(type);
            if (events.length === 0) {
                this.addEvent({
                    start: 0,
                    end: 0,
                    startTime: [0, 0, 1],
                    endTime: [1, 0, 1],
                }, type);
            }
        }
    }
}
export interface IExtendedEventLayer {
    scaleXEvents?: IEvent<number>[]
    scaleYEvents?: IEvent<number>[]
    colorEvents?: IEvent<RGBcolor>[]
    paintEvents?: IEvent<number>[]
    textEvents?: IEvent<string>[]
    inclineEvents?: IEvent<number>[]
}

/** 暂不支持 paint 和 incline 事件 */
export class ExtendedEventLayer extends AbstractEventLayer implements IExtendedEventLayer, IExtendedEventLayerIdentifier {
    scaleXEvents: NumberEvent[] = [];
    scaleYEvents: NumberEvent[] = [];
    colorEvents: ColorEvent[] = [];
    paintEvents: NumberEvent[] = [];
    textEvents: TextEvent[] = [];
    inclineEvents: NumberEvent[] = [];
    readonly isExtendedEventLayer = true;
    eventNumbers = {
        scaleX: 0,
        scaleY: 0,
        color: 0,
        paint: 0,
        text: 0,
        incline: 0
    };
    toObject() {
        const obj: IExtendedEventLayer = {};
        if (this.scaleXEvents.length > 0) obj.scaleXEvents = this.scaleXEvents.map(event => event.toObject());
        if (this.scaleYEvents.length > 0) obj.scaleYEvents = this.scaleYEvents.map(event => event.toObject());
        if (this.colorEvents.length > 0) obj.colorEvents = this.colorEvents.map(event => event.toObject());
        if (this.paintEvents.length > 0) obj.paintEvents = this.paintEvents.map(event => event.toObject());
        if (this.textEvents.length > 0) obj.textEvents = this.textEvents.map(event => event.toObject());
        if (this.inclineEvents.length > 0) obj.inclineEvents = this.inclineEvents.map(event => event.toObject());
        return obj;
    }
    getEventsByType(type: string) {
        switch (type) {
            case "scaleX": return this.scaleXEvents;
            case "scaleY": return this.scaleYEvents;
            case "color": return this.colorEvents;
            case "paint": return this.paintEvents;
            case "text": return this.textEvents;
            case "incline": return this.inclineEvents;
            default: throw new Error("传入的type参数有误");
        }
    }
    addEvent(event: unknown, type: string, id?: string) {
        const baseConfig = {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            eventLayerId: "X"
        };
        switch (type) {
            case "scaleX": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "scaleX", id, eventNumber: this.eventNumbers.scaleX++ });
                this.scaleXEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "scaleY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "scaleY", id, eventNumber: this.eventNumbers.scaleY++ });
                this.scaleYEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "color": {
                const newEvent = new ColorEvent(event, { ...baseConfig, type: "color", id, eventNumber: this.eventNumbers.color++ });
                this.colorEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "paint": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "paint", id, eventNumber: this.eventNumbers.paint++ });
                this.paintEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }

            case "text": {
                const newEvent = new TextEvent(event, { ...baseConfig, type: "text", id, eventNumber: this.eventNumbers.text++ });
                this.textEvents.push(newEvent);
                return newEvent;
            }

            case "incline": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: "incline", id, eventNumber: this.eventNumbers.incline++ });
                this.inclineEvents.push(newEvent);
                this.errors.push(...newEvent.errors);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        super();
        if (options.eventLayerId !== "X") {
            throw new Error("特殊事件层级的id只能为X");
        }

        if (isObject(eventLayer)) {
            if ("scaleXEvents" in eventLayer && isArray(eventLayer.scaleXEvents)) {
                for (const event of eventLayer.scaleXEvents) {
                    this.addEvent(event, "scaleX");
                }
            }

            if ("scaleYEvents" in eventLayer && isArray(eventLayer.scaleYEvents)) {
                for (const event of eventLayer.scaleYEvents) {
                    this.addEvent(event, "scaleY");
                }
            }

            if ("colorEvents" in eventLayer && isArray(eventLayer.colorEvents)) {
                for (const event of eventLayer.colorEvents) {
                    this.addEvent(event, "color");
                }
            }

            if ("paintEvents" in eventLayer && isArray(eventLayer.paintEvents)) {
                for (const event of eventLayer.paintEvents) {
                    this.addEvent(event, "paint");
                }
            }

            if ("textEvents" in eventLayer && isArray(eventLayer.textEvents)) {
                for (const event of eventLayer.textEvents) {
                    this.addEvent(event, "text");
                }
            }

            if ("inclineEvents" in eventLayer && isArray(eventLayer.inclineEvents)) {
                for (const event of eventLayer.inclineEvents) {
                    this.addEvent(event, "incline");
                }
            }
        }
    }
}