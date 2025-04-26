import { isObject, isArray } from "lodash"
import { NumberEvent, ColorEvent, TextEvent, IEvent } from "./event"
import { RGBcolor } from "../tools/color"
import { BPM } from "./beats"
interface EventLayerOptions {
    BPMList: BPM[]
    judgeLineNumber: number
    eventLayerNumber: number
}
export interface IBaseEventLayer {
    moveXEvents: IEvent<number>[]
    moveYEvents: IEvent<number>[]
    rotateEvents: IEvent<number>[]
    alphaEvents: IEvent<number>[]
    speedEvents: IEvent<number>[]
}
export class BaseEventLayer implements IBaseEventLayer {
    moveXEvents: NumberEvent[] = []
    moveYEvents: NumberEvent[] = []
    rotateEvents: NumberEvent[] = []
    alphaEvents: NumberEvent[] = []
    speedEvents: NumberEvent[] = []
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
            eventLayerId: this.options.eventLayerNumber.toString()
        };

        switch (type) {
            case "moveX": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'moveX', id });
                this.moveXEvents.push(newEvent);
                return newEvent;
            }
            case "moveY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'moveY', id });
                this.moveYEvents.push(newEvent);
                return newEvent;
            }
            case "rotate": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'rotate', id });
                this.rotateEvents.push(newEvent);
                return newEvent;
            }
            case "alpha": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'alpha', id });
                this.alphaEvents.push(newEvent);
                return newEvent;
            }
            case "speed": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'speed', id });
                this.speedEvents.push(newEvent);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        const baseConfig = {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            eventLayerId: this.options.eventLayerNumber.toString()
        };
        if (isObject(eventLayer)) {
            if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                for (const event of eventLayer.moveXEvents)
                    this.moveXEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'moveX'
                    }));
            if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                for (const event of eventLayer.moveYEvents)
                    this.moveYEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'moveY'
                    }));
            if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                for (const event of eventLayer.rotateEvents)
                    this.rotateEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'rotate'
                    }));
            if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                for (const event of eventLayer.alphaEvents)
                    this.alphaEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'alpha'
                    }));
            if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                for (const event of eventLayer.speedEvents)
                    this.speedEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'speed'
                    }));
        }
    }
}
export interface IExtendedEventLayer {
    scaleXEvents: IEvent<number>[]
    scaleYEvents: IEvent<number>[]
    colorEvents: IEvent<RGBcolor>[]
    paintEvents: IEvent<number>[]
    textEvents: IEvent<string>[]
    /*inclineEvents: NumberEvent[]// unsupported */

}
export class ExtendedEventLayer implements IExtendedEventLayer {
    scaleXEvents: NumberEvent[] = []
    scaleYEvents: NumberEvent[] = []
    colorEvents: ColorEvent[] = []
    paintEvents: NumberEvent[] = []// unsupported
    textEvents: TextEvent[] = []
    getEventsByType(type: string) {
        switch (type) {
            case "scaleX": return this.scaleXEvents;
            case "scaleY": return this.scaleYEvents;
            case "color": return this.colorEvents;
            case "paint": return this.paintEvents;
            case "text": return this.textEvents;
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
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'scaleX', id });
                this.scaleXEvents.push(newEvent);
                return newEvent;
            }
            case "scaleY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'scaleY', id });
                this.scaleYEvents.push(newEvent);
                return newEvent;
            }
            case "color": {
                const newEvent = new ColorEvent(event, { ...baseConfig, type: 'color', id });
                this.colorEvents.push(newEvent);
                return newEvent;
            }
            case "paint": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'paint', id });
                this.paintEvents.push(newEvent);
                return newEvent;
            }
            case "text": {
                const newEvent = new TextEvent(event, { ...baseConfig, type: 'text', id });
                this.textEvents.push(newEvent);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        const baseConfig = {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            eventLayerId: "X"
        };
        if (isObject(eventLayer)) {
            if ("scaleXEvents" in eventLayer && isArray(eventLayer.scaleXEvents))
                for (const event of eventLayer.scaleXEvents)
                    this.scaleXEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'scaleX'
                    }));
            if ("scaleYEvents" in eventLayer && isArray(eventLayer.scaleYEvents))
                for (const event of eventLayer.scaleYEvents)
                    this.scaleYEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'scaleY'
                    }));
            if ("colorEvents" in eventLayer && isArray(eventLayer.colorEvents))
                for (const event of eventLayer.colorEvents)
                    this.colorEvents.push(new ColorEvent(event, {
                        ...baseConfig,
                        type: 'color'
                    }));
            if ("paintEvents" in eventLayer && isArray(eventLayer.paintEvents))
                for (const event of eventLayer.paintEvents)
                    this.paintEvents.push(new NumberEvent(event, {
                        ...baseConfig,
                        type: 'paint'
                    }));
            if ("textEvents" in eventLayer && isArray(eventLayer.textEvents))
                for (const event of eventLayer.textEvents)
                    this.textEvents.push(new TextEvent(event, {
                        ...baseConfig,
                        type: 'text'
                    }));
        }
    }
}