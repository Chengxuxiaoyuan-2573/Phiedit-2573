import { isObject, isNumber, isString, isArray } from "../typeCheck"
import { BaseEventLayer, ExtendedEventLayer, IBaseEventLayer, IExtendedEventLayer } from "./eventLayer"
import { INote, Note } from "./note"
export interface IJudgeLine {
    Group: number
    Name: string
    Texture: string
    eventLayers: IBaseEventLayer[]
    extended: IExtendedEventLayer
    father: number
    isCover: boolean
    notes: INote[]
    zOrder: number
}
export class JudgeLine implements IJudgeLine {
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
    isCover: boolean = true
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
    toObject(): IJudgeLine {
        return {
            Group: this.Group,
            Name: this.Name,
            Texture: this.Texture,
            father: this.father,
            isCover: this.isCover,
            zOrder: this.zOrder,
            eventLayers: this.eventLayers.map(eventLayer => ({
                moveXEvents: eventLayer.moveXEvents.map(event => event.toObject()),
                moveYEvents: eventLayer.moveYEvents.map(event => event.toObject()),
                rotateEvents: eventLayer.rotateEvents.map(event => event.toObject()),
                alphaEvents: eventLayer.alphaEvents.map(event => event.toObject()),
                speedEvents: eventLayer.speedEvents.map(event => event.toObject())
            })),
            extended: {
                scaleXEvents: this.extended.scaleXEvents.map(event => event.toObject()),
                scaleYEvents: this.extended.scaleYEvents.map(event => event.toObject()),
                colorEvents: this.extended.colorEvents.map(event => event.toObject()),
                paintEvents: this.extended.paintEvents.map(event => event.toObject()),
                textEvents: this.extended.textEvents.map(event => event.toObject())
            },
            notes: this.notes.map(note => note.toObject())
        }
    }
    constructor(judgeLine: unknown) {
        if (isObject(judgeLine)) {
            if ("Group" in judgeLine && isNumber(judgeLine.Group))
                this.Group = judgeLine.Group;
            if ("Name" in judgeLine && isString(judgeLine.Name))
                this.Name = judgeLine.Name;
            if ("Texture" in judgeLine && isString(judgeLine.Texture))
                this.Texture = judgeLine.Texture;
            if ("isCover" in judgeLine)
                this.isCover = judgeLine.isCover == 1;
            if ("father" in judgeLine && isNumber(judgeLine.father))
                this.father = judgeLine.father;
            if ("zOrder" in judgeLine && isNumber(judgeLine.zOrder))
                this.zOrder = judgeLine.zOrder;
            if ("eventLayers" in judgeLine && isArray(judgeLine.eventLayers))
                for (const eventLayer of judgeLine.eventLayers)
                    this.eventLayers.push(new BaseEventLayer(eventLayer));
            if ("extended" in judgeLine)
                this.extended = new ExtendedEventLayer(judgeLine.extended);
            if ("notes" in judgeLine && isArray(judgeLine.notes)) for (const note of judgeLine.notes)
                this.notes.push(new Note(note));
        }
    }
}