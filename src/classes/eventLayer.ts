import { isObject, isArray } from "lodash"
import { NumberEvent, ColorEvent, TextEvent, IEvent } from "./event"
import { RGBcolor } from "./color"
import { BPM } from "./beats"
export interface IBaseEventLayer {
    moveXEvents: IEvent<number>[]
    moveYEvents: IEvent<number>[]
    rotateEvents: IEvent<number>[]
    alphaEvents: IEvent<number>[]
    speedEvents: IEvent<number>[]
}
export class BaseEventLayer implements IBaseEventLayer {
    moveXEvents: NumberEvent<'moveX'>[] = []
    moveYEvents: NumberEvent<'moveY'>[] = []
    rotateEvents: NumberEvent<'rotate'>[] = []
    alphaEvents: NumberEvent<'alpha'>[] = []
    speedEvents: NumberEvent<'speed'>[] = []
    constructor(eventLayer: unknown, BPMList: BPM[]) {
        if (isObject(eventLayer)) {
            if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                for (const event of eventLayer.moveXEvents)
                    this.moveXEvents.push(new NumberEvent(event, BPMList, 'moveX'));
            if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                for (const event of eventLayer.moveYEvents)
                    this.moveYEvents.push(new NumberEvent(event, BPMList, 'moveY'));
            if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                for (const event of eventLayer.rotateEvents)
                    this.rotateEvents.push(new NumberEvent(event, BPMList, 'rotate'));
            if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                for (const event of eventLayer.alphaEvents)
                    this.alphaEvents.push(new NumberEvent(event, BPMList, 'alpha'));
            if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                for (const event of eventLayer.speedEvents)
                    this.speedEvents.push(new NumberEvent(event, BPMList, 'speed'));
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
    scaleXEvents: NumberEvent<'scaleX'>[] = []
    scaleYEvents: NumberEvent<'scaleY'>[] = []
    colorEvents: ColorEvent<'color'>[] = []
    paintEvents: NumberEvent<'paint'>[] = []// unsupported
    textEvents: TextEvent<'text'>[] = []
    constructor(eventLayer: unknown, BPMList: BPM[]) {
        if (isObject(eventLayer)) {
            if ("scaleXEvents" in eventLayer && isArray(eventLayer.scaleXEvents))
                for (const event of eventLayer.scaleXEvents)
                    this.scaleXEvents.push(new NumberEvent(event, BPMList, 'scaleX'));
            if ("scaleYEvents" in eventLayer && isArray(eventLayer.scaleYEvents))
                for (const event of eventLayer.scaleYEvents)
                    this.scaleYEvents.push(new NumberEvent(event, BPMList, 'scaleY'));
            if ("colorEvents" in eventLayer && isArray(eventLayer.colorEvents))
                for (const event of eventLayer.colorEvents)
                    this.colorEvents.push(new ColorEvent(event, BPMList, 'color'));
            if ("paintEvents" in eventLayer && isArray(eventLayer.paintEvents))
                for (const event of eventLayer.paintEvents)
                    this.paintEvents.push(new NumberEvent(event, BPMList, 'paint'));
            if ("textEvents" in eventLayer && isArray(eventLayer.textEvents))
                for (const event of eventLayer.textEvents)
                    this.textEvents.push(new TextEvent(event, BPMList, 'text'));
        }
    }
}