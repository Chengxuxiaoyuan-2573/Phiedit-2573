import { isObject, isArray } from "lodash"
import { NumberEvent, ColorEvent, TextEvent, IEvent } from "./event"
import { RGBcolor } from "../tools/color"
import { BPM } from "./beats"
interface EventLayerOptions {
    BPMList: BPM[]
    judgeLineNumber: number
    eventLayerId: string
}
export interface IBaseEventLayer {
    moveXEvents: IEvent<number>[]
    moveYEvents: IEvent<number>[]
    rotateEvents: IEvent<number>[]
    alphaEvents: IEvent<number>[]
    speedEvents: IEvent<number>[]
}
abstract class AbstractEventLayer {
    abstract getEventsByType(type: string): IEvent<unknown>[];
    abstract addEvent(event: unknown, type: string, id?: string): IEvent<unknown>;
}
export class BaseEventLayer extends AbstractEventLayer implements IBaseEventLayer {
    moveXEvents: NumberEvent[] = []
    moveYEvents: NumberEvent[] = []
    rotateEvents: NumberEvent[] = []
    alphaEvents: NumberEvent[] = []
    speedEvents: NumberEvent[] = []
    eventNumbers = {
        moveX: 0,
        moveY: 0,
        rotate: 0,
        alpha: 0,
        speed: 0
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
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'moveX', id, eventNumber: this.eventNumbers.moveX++ });
                this.moveXEvents.push(newEvent);
                return newEvent;
            }
            case "moveY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'moveY', id, eventNumber: this.eventNumbers.moveY++ });
                this.moveYEvents.push(newEvent);
                return newEvent;
            }
            case "rotate": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'rotate', id, eventNumber: this.eventNumbers.rotate++ });
                this.rotateEvents.push(newEvent);
                return newEvent;
            }
            case "alpha": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'alpha', id, eventNumber: this.eventNumbers.alpha++ });
                this.alphaEvents.push(newEvent);
                return newEvent;
            }
            case "speed": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'speed', id, eventNumber: this.eventNumbers.speed++ });
                this.speedEvents.push(newEvent);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        super();
        if (isObject(eventLayer)) {
            if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                for (const event of eventLayer.moveXEvents)
                    this.addEvent(event, "moveX");
            if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                for (const event of eventLayer.moveYEvents)
                    this.addEvent(event, "moveY");
            if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                for (const event of eventLayer.rotateEvents)
                    this.addEvent(event, "rotate");
            if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                for (const event of eventLayer.alphaEvents)
                    this.addEvent(event, "alpha");
            if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                for (const event of eventLayer.speedEvents)
                    this.addEvent(event, "speed");
        }
    }
}
export interface IExtendedEventLayer {
    scaleXEvents: IEvent<number>[]
    scaleYEvents: IEvent<number>[]
    colorEvents: IEvent<RGBcolor>[]
    paintEvents: IEvent<number>[]
    textEvents: IEvent<string>[]
    inclineEvents: IEvent<number>[]// unsupported 

}
export class ExtendedEventLayer extends AbstractEventLayer implements IExtendedEventLayer {
    scaleXEvents: NumberEvent[] = []
    scaleYEvents: NumberEvent[] = []
    colorEvents: ColorEvent[] = []
    paintEvents: NumberEvent[] = []// unsupported
    textEvents: TextEvent[] = []
    inclineEvents: NumberEvent[] = []// unsupported
    eventNumbers = {
        scaleX: 0,
        scaleY: 0,
        color: 0,
        paint: 0,
        text: 0,
        incline: 0 // unsupported
    }
    getEventsByType(type: string) {
        switch (type) {
            case "scaleX": return this.scaleXEvents;
            case "scaleY": return this.scaleYEvents;
            case "color": return this.colorEvents;
            case "paint": return this.paintEvents;
            case "text": return this.textEvents;
            case "incline": return this.inclineEvents; // unsupported
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
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'scaleX', id, eventNumber: this.eventNumbers.scaleX++ });
                this.scaleXEvents.push(newEvent);
                return newEvent;
            }
            case "scaleY": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'scaleY', id, eventNumber: this.eventNumbers.scaleY++ });
                this.scaleYEvents.push(newEvent);
                return newEvent;
            }
            case "color": {
                const newEvent = new ColorEvent(event, { ...baseConfig, type: 'color', id, eventNumber: this.eventNumbers.color++ });
                this.colorEvents.push(newEvent);
                return newEvent;
            }
            case "paint": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'paint', id, eventNumber: this.eventNumbers.paint++ });
                this.paintEvents.push(newEvent);
                return newEvent;
            }
            case "text": {
                const newEvent = new TextEvent(event, { ...baseConfig, type: 'text', id, eventNumber: this.eventNumbers.text++ });
                this.textEvents.push(newEvent);
                return newEvent;
            }
            case "incline": {
                const newEvent = new NumberEvent(event, { ...baseConfig, type: 'incline', id, eventNumber: this.eventNumbers.incline++ });
                this.inclineEvents.push(newEvent);
                return newEvent;
            }
            default:
                throw new Error(`传入的type参数有误: ${type}`);
        }
    }
    constructor(eventLayer: unknown, readonly options: EventLayerOptions) {
        super();
        if (options.eventLayerId != 'X') {
            throw new Error("特殊事件层级的id只能为X")
        }
        if (isObject(eventLayer)) {
            if ("scaleXEvents" in eventLayer && isArray(eventLayer.scaleXEvents))
                for (const event of eventLayer.scaleXEvents)
                    this.addEvent(event, "scaleX");
            if ("scaleYEvents" in eventLayer && isArray(eventLayer.scaleYEvents))
                for (const event of eventLayer.scaleYEvents)
                    this.addEvent(event, "scaleY");
            if ("colorEvents" in eventLayer && isArray(eventLayer.colorEvents))
                for (const event of eventLayer.colorEvents)
                    this.addEvent(event, "color");
            if ("paintEvents" in eventLayer && isArray(eventLayer.paintEvents))
                for (const event of eventLayer.paintEvents)
                    this.addEvent(event, "paint");
            if ("textEvents" in eventLayer && isArray(eventLayer.textEvents))
                for (const event of eventLayer.textEvents)
                    this.addEvent(event, "text");
            if ("inclineEvents" in eventLayer && isArray(eventLayer.inclineEvents))
                for (const event of eventLayer.inclineEvents)
                    this.addEvent(event, "incline");
        }
    }
}