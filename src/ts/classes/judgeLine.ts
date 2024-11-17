import { isObject, isNumber, isString, isArray } from "../typeCheck"
import { BaseEventLayer, ExtendedEventLayer, Bool } from "../typeDefinitions"
import { NumberEvent, ColorEvent, TextEvent } from "./event"
import { Note } from "./note"

export class JudgeLine {
    Group: number = 0
    Name: string = "Unnamed"
    Texture: string = "line.png"
    /*alphaControl: { // unsupported 
        alpha: number,
        easing: EasingType,
        x: number
    }[]*/
    /*bpmfactor: number// unsupported */
    eventLayers: BaseEventLayer[] = []
    extended: ExtendedEventLayer = {
        scaleXEvents: [],
        scaleYEvents: [],
        colorEvents: [],
        paintEvents: [],
        textEvents: []
    }
    father: number = -1
    isCover: Bool = 1
    notes: Note[] = []
    /*posControl: {// unsupported 
        easing: EasingType,
        pos: number,
        x: number
    }[]
    sizeControl: {// unsupported 
        easing: EasingType,
        size: number,
        x: number
    }[]
    skewControl: {// unsupported 
        easing: EasingType,
        skew: number,
        x: number
    }[]
    yControl: {// unsupported 
        easing: EasingType,
        x: number,
        y: number
    }[]*/
    zOrder: number = 0
    constructor(judgeLine: unknown) {
        if (isObject(judgeLine)) {
            if ("Group" in judgeLine && isNumber(judgeLine.Group))
                this.Group = judgeLine.Group;
            if ("Name" in judgeLine && isString(judgeLine.Name))
                this.Name = judgeLine.Name;
            if ("Texture" in judgeLine && isString(judgeLine.Texture))
                this.Texture = judgeLine.Texture;
            if ("isCover" in judgeLine && (judgeLine.isCover === 0 || judgeLine.isCover === 1))
                this.isCover = judgeLine.isCover;
            if ("father" in judgeLine && isNumber(judgeLine.father))
                this.father = judgeLine.father;
            if ("zOrder" in judgeLine && isNumber(judgeLine.zOrder))
                this.zOrder = judgeLine.zOrder;
            if ("eventLayers" in judgeLine && isArray(judgeLine.eventLayers)) {
                for (const eventLayer of judgeLine.eventLayers) {
                    const formatedEventLayer: BaseEventLayer = {
                        moveXEvents: [],
                        moveYEvents: [],
                        rotateEvents: [],
                        alphaEvents: [],
                        speedEvents: []
                    }
                    if (isObject(eventLayer)) {
                        if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                            for (const event of eventLayer.moveXEvents)
                                formatedEventLayer.moveXEvents.push(new NumberEvent(event));
                        if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                            for (const event of eventLayer.moveYEvents)
                                formatedEventLayer.moveYEvents.push(new NumberEvent(event));
                        if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                            for (const event of eventLayer.rotateEvents)
                                formatedEventLayer.rotateEvents.push(new NumberEvent(event));
                        if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                            for (const event of eventLayer.alphaEvents)
                                formatedEventLayer.alphaEvents.push(new NumberEvent(event));
                        if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                            for (const event of eventLayer.speedEvents)
                                formatedEventLayer.speedEvents.push(new NumberEvent(event));
                    }
                    this.eventLayers.push(formatedEventLayer);
                }
            }
            if ("extended" in judgeLine && isObject(judgeLine.extended)) {
                if ("scaleXEvents" in judgeLine.extended && isArray(judgeLine.extended.scaleXEvents))
                    for (const event of judgeLine.extended.scaleXEvents)
                        this.extended.scaleXEvents.push(new NumberEvent(event));
                if ("scaleYEvents" in judgeLine.extended && isArray(judgeLine.extended.scaleYEvents))
                    for (const event of judgeLine.extended.scaleYEvents)
                        this.extended.scaleYEvents.push(new NumberEvent(event));
                if ("colorEvents" in judgeLine.extended && isArray(judgeLine.extended.colorEvents))
                    for (const event of judgeLine.extended.colorEvents)
                        this.extended.colorEvents.push(new ColorEvent(event));
                if ("paintEvents" in judgeLine.extended && isArray(judgeLine.extended.paintEvents))
                    for (const event of judgeLine.extended.paintEvents)
                        this.extended.paintEvents.push(new NumberEvent(event));
                if ("textEvents" in judgeLine.extended && isArray(judgeLine.extended.textEvents))
                    for (const event of judgeLine.extended.textEvents)
                        this.extended.textEvents.push(new TextEvent(event));
            }
            if ("notes" in judgeLine && isArray(judgeLine.notes)) for (const note of judgeLine.notes)
                this.notes.push(new Note(note));
        }
    }
}