import { Box } from "./classes/box"
import { ChartPackage } from "./classes/chartPackage"
import { NumberEvent } from "./classes/event"
import { Note } from "./classes/note"
import { ResourcePackage } from "./classes/resourcePackage"
export type Beats = [number, number, number]
export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]
export type BezierPoints = [number, number, number, number]
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
    resourcePackage: ResourcePackage
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
    boxes: Boxes,
    selectedNotes: Note[],
    selectedMoveXEvents: NumberEvent[],
    selectedMoveYEvents: NumberEvent[],
    selectedRotateEvents: NumberEvent[],
    selectedAlphaEvents: NumberEvent[],
    selectedSpeedEvents: NumberEvent[]
}
export type Boxes = {
    noteBoxes: Box<Note>[],
    moveXEventBoxes: Box<NumberEvent>[],
    moveYEventBoxes: Box<NumberEvent>[],
    rotateEventBoxes: Box<NumberEvent>[],
    alphaEventBoxes: Box<NumberEvent>[],
    speedEventBoxes: Box<NumberEvent>[]
}