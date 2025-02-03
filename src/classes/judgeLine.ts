import { isObject, isNumber, isString, isArray } from "lodash"
import { EasingType } from "./easing"
import { BaseEventLayer, ExtendedEventLayer, IBaseEventLayer, IExtendedEventLayer } from "./eventLayer"
import { INote, Note } from "./note"
import { BaseEvent } from "./event"
import { BPM } from "./beats"
export interface IJudgeLine {
    /** 没用属性，可以不用 */
    Group: number
    /** 没用属性，可以不用 */
    Name: string
    /** 判定线贴图，如果有贴图会为贴图的文件名 */
    Texture: string
    /** 基本事件，是分层的，每一层在某个时间点都能通过算法得到一个值，把所有层的值加起来就是最终值 */
    eventLayers: IBaseEventLayer[]
    /** 特殊事件，只有一层，每一层在某个时间点都能通过算法得到一个值，把所有层的值加起来就是最终值 */
    extended: IExtendedEventLayer
    /** 父线线号，会从父线继承X、Y坐标并以父线方向为坐标轴方向叠加上自己的坐标 */
    father: number
    /** 是否显示在判定线下面的note，0表示显示，1表示不显示 */
    isCover: 0 | 1
    /** 该判定线的所有note */
    notes: INote[]
    /** 显示的层号，越大越靠前 */
    zOrder: number,
    /** bpm的倍率 */
    bpmfactor: number,
    /** 不支持此属性，也不知道啥意思 */
    alphaControl: {
        alpha: number,
        easing: EasingType,
        x: number
    }[]
    /** 不支持此属性，也不知道啥意思 */
    posControl: {
        easing: EasingType,
        pos: number,
        x: number
    }[]
    /** 不支持此属性，也不知道啥意思 */
    sizeControl: {
        easing: EasingType,
        size: number,
        x: number
    }[]
    /** 不支持此属性，也不知道啥意思 */
    skewControl: {
        easing: EasingType,
        skew: number,
        x: number
    }[]
    /** 不支持此属性，也不知道啥意思 */
    yControl: {
        easing: EasingType,
        x: number,
        y: number
    }[]
}
export class JudgeLine implements IJudgeLine {
    Group: number = 0
    Name: string = "Unnamed"
    Texture: string = "line.png"
    bpmfactor = 1
    eventLayers: BaseEventLayer[] = []
    extended: ExtendedEventLayer = {
        scaleXEvents: [],
        scaleYEvents: [],
        colorEvents: [],
        paintEvents: [],
        textEvents: []
    }
    father: number = -1
    isCover: 0 | 1 = 1
    notes: Note[] = []
    alphaControl = [{
        easing: EasingType.Linear,
        alpha: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        alpha: 1,
        x: 0
    }]
    posControl = [{
        easing: EasingType.Linear,
        pos: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        pos: 1,
        x: 0
    }]
    sizeControl = [{
        easing: EasingType.Linear,
        size: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        size: 1,
        x: 0
    }]
    skewControl = [{
        easing: EasingType.Linear,
        skew: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        skew: 1,
        x: 0
    }]
    yControl = [{
        easing: EasingType.Linear,
        y: 1,
        x: 999999,
    }, {
        easing: EasingType.Linear,
        y: 1,
        x: 0
    }]
    zOrder: number = 0
    readonly num: number
    getAllEvents() {
        const events: BaseEvent[] = [];
        this.eventLayers.forEach(eventLayer => {
            events.push(
                ...eventLayer.moveXEvents,
                ...eventLayer.moveYEvents,
                ...eventLayer.rotateEvents,
                ...eventLayer.alphaEvents,
                ...eventLayer.speedEvents
            )
        })
        events.push(
            ...this.extended.scaleXEvents,
            ...this.extended.scaleYEvents,
            ...this.extended.colorEvents,
            ...this.extended.paintEvents,
            ...this.extended.textEvents
        )
        return events;
    }

    toObject(): IJudgeLine {
        return {
            Group: this.Group,
            Name: this.Name,
            Texture: this.Texture,
            father: this.father,
            isCover: this.isCover,
            zOrder: this.zOrder,
            alphaControl: this.alphaControl,
            posControl: this.posControl,
            sizeControl: this.sizeControl,
            skewControl: this.skewControl,
            yControl: this.yControl,
            bpmfactor: this.bpmfactor,
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
    constructor(judgeLine: unknown, num: number, BPMList: BPM[]) {
        if (isObject(judgeLine)) {
            if ("Group" in judgeLine && isNumber(judgeLine.Group))
                this.Group = judgeLine.Group;
            if ("Name" in judgeLine && isString(judgeLine.Name))
                this.Name = judgeLine.Name;
            if ("Texture" in judgeLine && isString(judgeLine.Texture))
                this.Texture = judgeLine.Texture;
            if ("isCover" in judgeLine)
                this.isCover = judgeLine.isCover ? 1 : 0;
            if ("father" in judgeLine && isNumber(judgeLine.father))
                this.father = judgeLine.father;
            if ("zOrder" in judgeLine && isNumber(judgeLine.zOrder))
                this.zOrder = judgeLine.zOrder;
            if ("eventLayers" in judgeLine && isArray(judgeLine.eventLayers)){
                for (const eventLayer of judgeLine.eventLayers){
                    this.eventLayers.push(new BaseEventLayer(eventLayer, BPMList));
                }
            }
            if ("extended" in judgeLine)
                this.extended = new ExtendedEventLayer(judgeLine.extended, BPMList);
            if ("notes" in judgeLine && isArray(judgeLine.notes)){
                for (const note of judgeLine.notes){
                    this.notes.push(new Note(note, BPMList));
                }
            }
        }
        this.num = num;
    }
}