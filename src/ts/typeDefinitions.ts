export type Beats = [number, number, number]
export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]
export type BezierPoints = [number, number, number, number]
export type Bool = 0 | 1
export type ImageSource = HTMLImageElement | HTMLCanvasElement
export enum EasingType {
    Linear = 1,
    SineOut,
    SineIn,
    QuadOut,
    QuadIn,
    SineInOut,
    QuadInOut,
    CubicOut,
    CubicIn,
    QuartOut,
    QuartIn,
    CubicInOut,
    QuartInOut,
    QuintOut,
    QuintIn,
    ExpoOut,
    ExpoIn,
    CircOut,
    CircIn,
    BackOut,
    BackIn,
    CircInOut,
    BackInOut,
    ElasticOut,
    ElacticIn,
    BounceOut,
    BounceIn,
    BounceIO,
    ElasticIO
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
export type NumberEvent = {
    bezier: Bool, // unsupported 
    bezierPoints: [number, number, number, number], // unsupported 
    easingLeft: number,
    easingRight: number,
    easingType: EasingType,
    end: number,
    endTime: Beats,
    start: number,
    startTime: Beats
}
export type ColorEvent = {
    bezier: Bool,
    bezierPoints: [number, number, number, number],
    easingLeft: number,
    easingRight: number,
    easingType: EasingType,
    end: RGBcolor,
    endTime: Beats,
    start: RGBcolor,
    startTime: Beats
}
export type TextEvent = {
    bezier: Bool,
    bezierPoints: [number, number, number, number],
    easingLeft: number,
    easingRight: number,
    easingType: EasingType,
    end: string,
    endTime: Beats,
    start: string,
    startTime: Beats
}
export type Note = {
    type: NoteType,
    positionX: number,
    startTime: Beats,
    endTime: Beats,
    above: Bool,
    isFake: Bool,
    alpha: number,
    size: number,
    speed: number,
    visibleTime: number,
    yOffset: number,
    _highlight: boolean,
    _hitState: HitState,
    _hitSeconds: number,
    _startSeconds?: number,
    _endSeconds?: number
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
    textEvents: TextEvent[]/*
    inclineEvents: {// unsupported 
        bezier: Bool,
        bezierPoints: [number, number, number, number],
        easingLeft: number,
        easingRight: number,
        easingType: EasingType,
        end: number,
        endTime: Beats,
        linkgroup: number,
        start: number,
        startTime: Beats
    }[],*/
}
export type JudgeLine = {
    Group: number,
    Name: string,
    Texture: string,
    /*alphaControl: { // unsupported 
        alpha: number,
        easing: Easing,
        x: number
    }[],*/
    /*bpmfactor: number,// unsupported */
    eventLayers: BaseEventLayer[],
    extended: ExtendedEventLayer,
    father: number,
    isCover: Bool,
    notes: Note[],
    /*posControl: {// unsupported 
        easing: Easing,
        pos: number,
        x: number
    }[],
    sizeControl: {// unsupported 
        easing: Easing,
        size: number,
        x: number
    }[],
    skewControl: {// unsupported 
        easing: Easing,
        skew: number,
        x: number
    }[],
    yControl: {// unsupported 
        easing: Easing,
        x: number,
        y: number
    }[],*/
    zOrder: number
}
export type BPM = {
    bpm: number,
    startTime: Beats
}
export type Chart = {
    BPMList: BPM[],
    META: {
        charter: string,
        composer: string,
        illustrator: string,
        level: string,
        name: string,
        offset: number
    },
    judgeLineGroup: string[],
    judgeLineList: JudgeLine[],
    _highlighted: boolean
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
    textSize: number,
    chartSpeed: number,
    chartPackage:ChartPackage,
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
