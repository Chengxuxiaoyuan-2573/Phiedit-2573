import { ChartPackage } from "./classes/chartPackage"
import { NumberEvent, ColorEvent, TextEvent } from "./classes/event"
import { ResourcePackage } from "./classes/resourcePackage"
export type Beats = [number, number, number]
export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]
export type BezierPoints = [number, number, number, number]
export type Bool = 0 | 1
export type Ctx = CanvasRenderingContext2D
export enum EasingType {
    Linear = 1,
    SineOut, SineIn, QuadOut, QuadIn, SineInOut, QuadInOut,
    CubicOut, CubicIn, QuartOut, QuartIn, CubicInOut, QuartInOut,
    QuintOut, QuintIn, ExpoOut, ExpoIn,
    CircOut, CircIn, BackOut, BackIn, CircInOut, BackInOut,
    ElasticOut, ElacticIn, BounceOut, BounceIn, BounceIO, ElasticIO
}
export enum NoteType { Tap = 1, Hold, Flick, Drag }
export enum HitState { NotHitted, HoldingPerfect, HoldingGood, Perfect, Good, Bad, Miss }
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

export type BPM = {
    bpm: number,
    startTime: Beats
}
export type ChartData = {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number,
    chartPackage: ChartPackage,
    resourcePackage: ResourcePackage,
    autoplay: boolean & true
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
export type UI = {
    main: MainState,
    top: TopState,
    right: RightState,
    topOpen: boolean,
    rightOpen: boolean,
    horzionalLines: number,
    verticalSpace: number,
    verticalStretch: number,
    selectedJudgeLine: number,
    selectedEventLayer: number,
    playbackRate: number,
    wheelSpeed: number
}