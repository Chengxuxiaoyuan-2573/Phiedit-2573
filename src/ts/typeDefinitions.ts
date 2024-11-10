import { getBeatsValue } from "./tools"
import { isObject, isArrayOf4Numbers, isNumber, isArrayOf3Numbers, isArray, isString } from "./typeCheck"

export type Beats = [number, number, number]
export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]
export type BezierPoints = [number, number, number, number]
export type Bool = 0 | 1
export type ImageSource = HTMLImageElement | HTMLCanvasElement
export enum EasingType {
    Linear = 1,
    SineOut, SineIn, QuadOut, QuadIn, SineInOut, QuadInOut,
    CubicOut, CubicIn, QuartOut, QuartIn, CubicInOut, QuartInOut,
    QuintOut, QuintIn, ExpoOut, ExpoIn, CircOut, CircIn, BackOut, BackIn,
    CircInOut, BackInOut,
    ElasticOut, ElacticIn, BounceOut, BounceIn, BounceIO, ElasticIO
}
export enum NoteType {
    Tap = 1,
    Hold,
    Flick,
    Drag
}
export enum HitState {
    NotHitted,
    HoldingPerfect,
    HoldingGood,
    Perfect,
    Good,
    Bad,
    Miss,
}
export type BaseEventLayer = {
    moveXEvents: NumberEvent[],
    moveYEvents: NumberEvent[],
    rotateEvents: NumberEvent[],
    alphaEvents: NumberEvent[],
    speedEvents: NumberEvent[]
}
export type ExtendedEventLayer = {
    scaleXEvents: NumberEvent[],
    scaleYEvents: NumberEvent[],
    colorEvents: ColorEvent[],
    paintEvents: NumberEvent[],// unsupported
    textEvents: TextEvent[]
    /*inclineEvents: NumberEvent[]// unsupported */
}
abstract class BaseEvent {
    bezier: Bool = 0; // unsupported 
    bezierPoints: [number, number, number, number] = [0, 0, 1, 1]; // unsupported 
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract end: unknown;
    endTime: Beats = [1, 0, 1];
    abstract start: unknown;
    startTime: Beats = [0, 0, 1];
    get durationBeats() {
        return getBeatsValue(this.endTime) - getBeatsValue(this.startTime);
    }
    constructor(event: unknown) {
        if (isObject(event)) {
            if ("bezier" in event && (event.bezier == 0 || event.bezier == 1))
                this.bezier = event.bezier as Bool;
            if ("bezierPoints" in event && isArrayOf4Numbers(event.bezierPoints) && event.bezierPoints.length == 4)
                this.bezierPoints = event.bezierPoints;
            if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                this.easingLeft = event.easingLeft;
                this.easingRight = event.easingRight;
            }
            if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                this.easingType = event.easingType as EasingType;
            if ("startTime" in event && isArrayOf3Numbers(event.startTime) && event.startTime.length == 3)
                this.startTime = event.startTime;
            if ("endTime" in event && isArrayOf3Numbers(event.endTime) && event.endTime.length == 3)
                this.endTime = event.endTime;
        }
    }
}
export class NumberEvent extends BaseEvent {
    start: number = 0;
    end: number = 0;
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isNumber(event.start))
                this.start = event.start;
            if ("end" in event && isNumber(event.end))
                this.end = event.end;
        }
    }
}
export class ColorEvent extends BaseEvent {
    start: RGBcolor = [255, 255, 255];
    end: RGBcolor = [255, 255, 255];
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isArrayOf3Numbers(event.start))
                this.start = event.start;
            if ("end" in event && isArrayOf3Numbers(event.end))
                this.end = event.end;
        }
    }
}
export class TextEvent extends BaseEvent {
    start: string = "";
    end: string = "";
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isString(event.start))
                this.start = event.start;
            if ("end" in event && isString(event.end))
                this.end = event.end;
        }
    }
}
export class Note {
    above: Bool = 1
    alpha = 255
    startTime: Beats = [0, 0, 1]
    endTime: Beats = [0, 0, 1]
    type = NoteType.Tap
    isFake: Bool = 0
    positionX = 0
    size = 1
    speed = 1
    yOffset = 0
    visibleTime = 999999.99
    _highlight = false
    _hitState = HitState.NotHitted
    _hitSeconds = Infinity
    _startSeconds?: number
    _endSeconds?: number
    constructor(note: unknown) {
        if (isObject(note)) {
            if ("above" in note && isNumber(note.above))
                this.above = (note.above == 1 ? 1 : 0);
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                this.alpha = note.alpha;
            if ("startTime" in note && isArrayOf3Numbers(note.startTime))
                this.startTime = note.startTime;
            if ("endTime" in note && isArrayOf3Numbers(note.endTime))
                this.endTime = note.endTime;
            if ("type" in note && note.type as number >= 1 && note.type as number <= 4 && Number.isInteger(note.type))
                this.type = note.type as NoteType;
            if ("isFake" in note && (note.isFake == 0 || note.isFake == 1))
                this.isFake = note.isFake as Bool;
            if ("positionX" in note && isNumber(note.positionX))
                this.positionX = note.positionX;
            if ("size" in note && isNumber(note.size))
                this.size = note.size;
            if ("speed" in note && isNumber(note.speed))
                this.speed = note.speed;
            if ("yOffset" in note && isNumber(note.yOffset))
                this.yOffset = note.yOffset;
            if ("visibleTime" in note && isNumber(note.visibleTime))
                this.visibleTime = note.visibleTime;
        }
    }
}
export class JudgeLine {
    Group: number = 0
    Name: string = "Unnamed"
    Texture: string = "line.png"
    /*alphaControl: { // unsupported 
        alpha: number,
        easing: Easing,
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
        easing: Easing,
        pos: number,
        x: number
    }[]
    sizeControl: {// unsupported 
        easing: Easing,
        size: number,
        x: number
    }[]
    skewControl: {// unsupported 
        easing: Easing,
        skew: number,
        x: number
    }[]
    yControl: {// unsupported 
        easing: Easing,
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
            if ("notes" in judgeLine && isArray(judgeLine.notes)) for (const note of judgeLine.notes) {
                this.notes.push(new Note(note));
            }
        }
    }
}
export type BPM = {
    bpm: number,
    startTime: Beats
}
export type ResourcePackage = {
    tap: ImageSource,
    flick: ImageSource,
    drag: ImageSource,
    holdHead: ImageSource,
    holdEnd: ImageSource,
    holdBody: ImageSource,
    tapHL: ImageSource,
    flickHL: ImageSource,
    dragHL: ImageSource,
    holdHLHead: ImageSource,
    holdHLEnd: ImageSource,
    holdHLBody: ImageSource,
    audioContext: AudioContext,
    tapSound: AudioBuffer,
    dragSound: AudioBuffer,
    flickSound: AudioBuffer,
    perfectHitFxFrames: ImageSource[],
    goodHitFxFrames: ImageSource[],
    hitFxFrameNumber: number,
    hitFxDuration: number, // 打击特效的持续时间，以秒为单位
    //hitFxScale: number, // 打击特效缩放比例
    hitFxRotate: boolean, // 打击特效是否随 Note 旋转
    //hitFxTinted: boolean, // 打击特效是否依照判定线颜色着色
    hideParticles: boolean, // 打击时是否隐藏方形粒子效果
    holdKeepHead: boolean, // Hold 触线后是否还显示头部
    holdRepeat: boolean, // Hold 的中间部分是否采用重复式拉伸
    holdCompact: boolean, // 是否把 Hold 的头部和尾部与 Hold 中间重叠
    colorPerfect: number, // AP（全 Perfect）情况下的判定线颜色
    colorGood: number // FC（全连）情况下的判定线颜色
}
export type ChartPackage = {
    chart: Chart,
    music: HTMLAudioElement,
    background: ImageSource,
    textures: Record<string, ImageSource>
}
export type ChartData = {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number,
    chartPackage: ChartPackage,
    resourcePackage: ResourcePackage,
    autoplay: boolean,
    judgement: {
        tap: {
            perfect: number,
            good: number,
            bad: number
        },
        hold: {
            perfect: number,
            good: number,
            bad: number
        },
        drag: {
            perfect: number
        },
        flick: {
            perfect: number
        },
    }
}
export class Chart {
    BPMList: BPM[]
    META: {
        charter: string,
        composer: string,
        illustrator: string,
        level: string,
        name: string,
        offset: number
    }
    judgeLineGroup: string[]
    judgeLineList: JudgeLine[]
    _highlighted: boolean
    highlightNotes() {
        if (!this._highlighted) {
            const allNotes = new Map<number, Note>();
            for (const judgeLine of this.judgeLineList) {
                for (const note of judgeLine.notes) {
                    const anotherNote = allNotes.get(getBeatsValue(note.startTime));
                    if (anotherNote) {
                        anotherNote._highlight = true;
                        note._highlight = true;
                    }
                    else {
                        allNotes.set(getBeatsValue(note.startTime), note);
                        note._highlight = false;
                    }
                }
            }
            this._highlighted = true;
        }
    }
    constructor(chart: unknown) {
        this.BPMList = [];
        this.META = {
            name: "Unknown",
            level: "SP Lv.?",
            offset: 0,
            charter: "Unknown",
            composer: "Unknown",
            illustrator: "Unknown"
        }
        this.judgeLineGroup = ["default"];
        this.judgeLineList = [];
        this._highlighted = false;

        if (isObject(chart)) {
            if ("BPMList" in chart && isArray(chart.BPMList)) for (const bpm of chart.BPMList) {
                const formatedBPM: BPM = {
                    bpm: 120,
                    startTime: [0, 0, 1]
                };
                if (isObject(bpm)) {
                    if ("bpm" in bpm && isNumber(bpm.bpm))
                        formatedBPM.bpm = bpm.bpm;
                    if ("startTime" in bpm && isArrayOf3Numbers(bpm.startTime))
                        formatedBPM.startTime = bpm.startTime;
                }
                this.BPMList.push(formatedBPM);
            }
            if ("META" in chart && isObject(chart.META)) {
                if ("name" in chart.META && isString(chart.META.name)) this.META.name = chart.META.name;
                if ("level" in chart.META && isString(chart.META.level)) this.META.level = chart.META.level;
                if ("offset" in chart.META && isNumber(chart.META.offset)) this.META.offset = chart.META.offset;
                if ("charter" in chart.META && isString(chart.META.charter)) this.META.charter = chart.META.charter;
                if ("composer" in chart.META && isString(chart.META.composer)) this.META.composer = chart.META.composer;
                if ("illustrator" in chart.META && isString(chart.META.illustrator)) this.META.illustrator = chart.META.illustrator;
            }
            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) for (const group of chart.judgeLineGroup) {
                let formatedGroup = "default";
                if (isString(group)) {
                    formatedGroup = group;
                }
                this.judgeLineGroup.push(formatedGroup);
            }
            if ("judgeLineList" in chart && isArray(chart.judgeLineList)) for (const judgeLine of chart.judgeLineList) {
                this.judgeLineList.push(new JudgeLine(judgeLine));
            }
        }
    }
}

export enum MainState {
    Playing, Editing
}
export enum TopState {
    Default
}
export enum RightState {
    Default, Settings
}
export type UIState = {
    main: MainState,
    top: TopState,
    right: RightState,
    topOpen: boolean,
    rightOpen: boolean,
    horzionalLines: number,
    verticalLines: number,
    viewSize: number,
    selectedJudgeLine: number,
    playbackRate: number
}