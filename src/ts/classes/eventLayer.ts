import { isObject, isArray } from "lodash"
import { NumberEvent, ColorEvent, TextEvent, IEvent } from "./event"
import { RGBcolor } from "../typeDefinitions"
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
    constructor(eventLayer: unknown) {
        if (isObject(eventLayer)) {
            if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                for (const event of eventLayer.moveXEvents)
                    this.moveXEvents.push(new NumberEvent(event));
            if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                for (const event of eventLayer.moveYEvents)
                    this.moveYEvents.push(new NumberEvent(event));
            if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                for (const event of eventLayer.rotateEvents)
                    this.rotateEvents.push(new NumberEvent(event));
            if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                for (const event of eventLayer.alphaEvents)
                    this.alphaEvents.push(new NumberEvent(event));
            if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                for (const event of eventLayer.speedEvents)
                    this.speedEvents.push(new NumberEvent(event));
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
    constructor(eventLayer: unknown) {
        if (isObject(eventLayer)) {
            if ("scaleXEvents" in eventLayer && isArray(eventLayer.scaleXEvents))
                for (const event of eventLayer.scaleXEvents)
                    this.scaleXEvents.push(new NumberEvent(event));
            if ("scaleYEvents" in eventLayer && isArray(eventLayer.scaleYEvents))
                for (const event of eventLayer.scaleYEvents)
                    this.scaleYEvents.push(new NumberEvent(event));
            if ("colorEvents" in eventLayer && isArray(eventLayer.colorEvents))
                for (const event of eventLayer.colorEvents)
                    this.colorEvents.push(new ColorEvent(event));
            if ("paintEvents" in eventLayer && isArray(eventLayer.paintEvents))
                for (const event of eventLayer.paintEvents)
                    this.paintEvents.push(new NumberEvent(event));
            if ("textEvents" in eventLayer && isArray(eventLayer.textEvents))
                for (const event of eventLayer.textEvents)
                    this.textEvents.push(new TextEvent(event));
        }
    }
}