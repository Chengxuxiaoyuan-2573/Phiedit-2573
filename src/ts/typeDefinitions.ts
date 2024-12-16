import { Beats } from "./classes/beats"
export type Ctx = CanvasRenderingContext2D

export enum NoteType { Tap = 1, Hold, Flick, Drag }
export type BPM = {
    bpm: number,
    startTime: Beats
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
export enum LeftState {
    Default
}
export type ArrayRepeat<S, N extends number, Acc extends S[] = []> =
    Acc['length'] extends N ? Acc : ArrayRepeat<S, N, [...Acc, S]>