import { Beats } from "./classes/beats"
import { NumberEvent } from "./classes/event"
import { Note } from "./classes/note"
export type BezierPoints = [number, number, number, number]
export type Ctx = CanvasRenderingContext2D

export enum NoteType { Tap = 1, Hold, Flick, Drag }
export type BPM = {
    bpm: number,
    startTime: Beats
}
export type ChartSettings = {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number
}
export enum MainState {
    Playing, Editing
}
export enum TopState {
    Default
}
export enum RightState {
    Default, Settings, Editing
}
export type UI = {
    /**
     * 主界面
     */
    main: MainState,
    /**
     * 顶部菜单栏
     */
    top: TopState,
    /**
     * 右侧菜单栏
     */
    right: RightState,
    topOpen: boolean,
    rightOpen: boolean,
    segmentPerBeat: number,
    trackSpace: number,
    pxPerSecond: number,
    currentJudgeLineNumber: number,
    currentEventLayerNumber: number,
    selection: ObjectCanBeEdited[],
    wheelSpeed: number,
    playbackRate:number
}
export type ObjectCanBeEdited = Note | NumberEvent;
export type UpperString = Uppercase<string>;
export type LowerString = Lowercase<string>;
export type ArrayRepeat<S, N extends number, Acc extends S[] = []> =
    Acc['length'] extends N ? Acc : ArrayRepeat<S, N, [...Acc, S]>
export type Add<A extends number, B extends number> = [...ArrayRepeat<'a', A>, ...ArrayRepeat<'a', B>]["length"];
