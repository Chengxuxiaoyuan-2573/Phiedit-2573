export type Beats = [number, number, number]
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
export type BaseEvent = {
    "bezier": 0 | 1, // unsupported 
    "bezierPoints": [number, number, number, number], // unsupported 
    "easingLeft": number,
    "easingRight": number,
    "easingType": EasingType,
    "end": number,
    "endTime": Beats,
    "start": number,
    "startTime": Beats
}
export type Note = {
    "above": 0 | 1,
    "alpha": number,
    "endTime": Beats,
    "isFake": 0 | 1,
    "positionX": number,
    "size": number,
    "speed": number,
    "startTime": Beats,
    "type": NoteType,
    "visibleTime": number,
    "yOffset": number
}
export type BaseEventLayer = {
    "moveXEvents": BaseEvent[],
    "moveYEvents": BaseEvent[],
    "rotateEvents": BaseEvent[],
    "alphaEvents": BaseEvent[],
    "speedEvents": BaseEvent[]
}
export type JudgeLine = {
    "Group": number,
    "Name": string,
    /*"Texture": string, // unsupported */
    /*"alphaControl": { // unsupported 
        "alpha": number,
        "easing": Easing,
        "x": number
    }[],*/
    /*"bpmfactor": number,// unsupported */
    "eventLayers": BaseEventLayer[],
    /*"extended": { // unsupported 
        "scaleXEvents": {
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": number,
            "endTime": Beats,
            "linkgroup": number,
            "start": number,
            "startTime": Beats
        }[],
        "scaleYEvents": {
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": number,
            "endTime": Beats,
            "linkgroup": number,
            "start": number,
            "startTime": Beats
        }[],
        "colorEvents": {
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": string,
            "endTime": Beats,
            "linkgroup": number,
            "start": string,
            "startTime": Beats
        }[],
        "paintEvents": {
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": number,
            "endTime": Beats,
            "linkgroup": number,
            "start": number,
            "startTime": Beats
        }[],
        "textEvents": { 
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": string,
            "endTime": Beats,
            "linkgroup": number,
            "start": string,
            "startTime": Beats
        }[],
        "inclineEvents": {
            "bezier": 0 | 1,
            "bezierPoints": [number, number, number, number],
            "easingLeft": number,
            "easingRight": number,
            "easingType": Easing,
            "end": number,
            "endTime": Beats,
            "linkgroup": number,
            "start": number,
            "startTime": Beats
        }[],
    },*/
    "father": number,
    /*"isCover": number, // unsupported */
    "notes": Note[],
    /*"posControl": {// unsupported 
        "easing": Easing,
        "pos": number,
        "x": number
    }[],
    "sizeControl": {// unsupported 
        "easing": Easing,
        "size": number,
        "x": number
    }[],
    "skewControl": {// unsupported 
        "easing": Easing,
        "skew": number,
        "x": number
    }[],
    "yControl": {// unsupported 
        "easing": Easing,
        "x": number,
        "y": number
    }[],*/
    "zOrder": number
};
export type BPM = {
    "bpm": number,
    "startTime": Beats
};
export type Chart = {
    "BPMList": BPM[],
    "META": {
        "charter": string,
        "composer": string,
        "illustrator": string,
        "level": string,
        "name": string,
        "offset": number,
    },
    "judgeLineGroup": string[],
    "judgeLineList": JudgeLine[]
}
export type Settings = {
    backgroundDarkness: number,
    lineWidth: number
}
export type NoteSource = {
    Tap:HTMLImageElement,
    Flick:HTMLImageElement,
    Drag:HTMLImageElement,
    HoldHead:HTMLImageElement,
    HoldEnd:HTMLImageElement,
    HoldBody:HTMLImageElement,
    TapHL:HTMLImageElement,
    FlickHL:HTMLImageElement,
    DragHL:HTMLImageElement,
    HoldHLHead:HTMLImageElement,
    HoldHLEnd:HTMLImageElement,
    HoldHLBody:HTMLImageElement,
}