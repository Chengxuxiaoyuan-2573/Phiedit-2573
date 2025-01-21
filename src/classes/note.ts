
import { beatsToSeconds, BPM, formatBeats, parseBeats, validateBeats } from "./beats"
import { isArrayOfNumbers } from "../typeCheck"
import { Beats, getBeatsValue } from "./beats"
import { isObject, isNumber } from "lodash"
export enum NoteAbove {
    Above = 1,
    Below = 2
}
export interface INote<T extends NoteType = NoteType> {
    above: NoteAbove
    alpha: number
    startTime: Beats
    endTime: Beats
    type: T
    isFake: 0 | 1
    positionX: number
    size: number
    speed: number
    yOffset: number
    visibleTime: number
}
export enum NoteType { Tap = 1, Hold, Flick, Drag }
export class Note<T extends NoteType = NoteType> implements INote<T> {
    static readonly TAP_PERFECT = 0.08
    static readonly TAP_GOOD = 0.16
    static readonly TAP_BAD = 0.18
    static readonly HOLD_PERFECT = 0.08
    static readonly HOLD_GOOD = 0.16
    static readonly HOLD_BAD = 0.18
    static readonly DRAGFLICK_PERFECT = 0.18
    above: NoteAbove
    alpha: number
    type: T
    isFake: 0 | 1
    positionX: number
    size: number
    speed: number
    yOffset: number
    visibleTime: number
    _startTime: Beats
    _endTime: Beats
    get typeString() {
        switch (this.type) {
            case NoteType.Tap: return 'Tap';
            case NoteType.Drag: return 'Drag';
            case NoteType.Flick: return 'Flick';
            default: return 'Hold';
        }
    }
    isHold(): this is Note<NoteType.Hold> {
        return this.type == NoteType.Hold;
    }
    highlight = false
    hitSeconds: number | undefined = undefined
    _willBeDeleted = false
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        if (this.isHold())
            return this._endTime;
        else
            return this._startTime;
    }
    set startTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        this._startTime = beats;
        if (getBeatsValue(this._startTime) > getBeatsValue(this._endTime)) {
            [this._startTime, this._endTime] = [this._endTime, this._startTime];
        }
    }
    set endTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        if (this.isHold())
            this._endTime = beats;
        else
            this._startTime = beats;
        if (getBeatsValue(this._startTime) > getBeatsValue(this._endTime)) {
            [this._startTime, this._endTime] = [this._endTime, this._startTime];
        }
    }
    get startString() {
        const beats = formatBeats(this.startTime);
        return beats;
    }
    get endString() {
        const beats = formatBeats(this.endTime);
        return beats;
    }
    set startString(str: string) {
        const beats = validateBeats(parseBeats(str));
        this.startTime = beats;
    }
    set endString(str: string) {
        const beats = validateBeats(parseBeats(str));
        this.endTime = beats;
    }
    delete() {
        this._willBeDeleted = true;
    }
    toObject(): INote<T> {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            type: this.type,
            positionX: this.positionX,
            above: this.above,
            alpha: this.alpha,
            speed: this.speed,
            size: this.size,
            isFake: this.isFake,
            visibleTime: this.visibleTime,
            yOffset: this.yOffset
        }
    }
    calculateSeconds(BPMList: BPM[]) {
        const startSeconds = beatsToSeconds(BPMList, this.startTime);
        const endSeconds = beatsToSeconds(BPMList, this.endTime);
        return { startSeconds, endSeconds };
    }
    getJudgement(BPMList: BPM[]) {
        if (this.hitSeconds == undefined) return 'none';
        const { startSeconds } = this.calculateSeconds(BPMList);
        const delta = this.hitSeconds - startSeconds;
        const { perfect, good, bad } = (() => {
            switch (this.type) {
                case NoteType.Tap: return {
                    perfect: Note.TAP_PERFECT,
                    good: Note.TAP_GOOD,
                    bad: Note.TAP_BAD
                }
                case NoteType.Hold: return {
                    perfect: Note.HOLD_PERFECT,
                    good: Note.HOLD_GOOD,
                    bad: Note.HOLD_BAD
                }
                default: return {
                    perfect: Note.DRAGFLICK_PERFECT,
                    good: Note.DRAGFLICK_PERFECT,
                    bad: Note.DRAGFLICK_PERFECT
                }
            }
        })();
        if (delta >= -perfect && delta < perfect) return "perfect";
        if (delta >= -good && delta < good) return "good";
        else if (delta >= -bad && delta < bad) return "bad";
        else return "none";
    }
    static load(note: unknown) {
        let above = NoteAbove.Above
        let alpha = 255
        let isFake: 0 | 1 = 0
        let positionX = 0
        let size = 1
        let speed = 1
        let yOffset = 0
        let visibleTime = 999999
        let startTime: Beats = [0, 0, 1]
        let endTime: Beats = [0, 0, 1]
        let type = NoteType.Tap
        if (isObject(note)) {
            if ("startTime" in note && isArrayOfNumbers(note.startTime, 3))
                startTime = note.startTime;
            if ("endTime" in note && isArrayOfNumbers(note.endTime, 3))
                endTime = note.endTime;
            else
                endTime = startTime;
            if ("positionX" in note && isNumber(note.positionX))
                positionX = note.positionX;
            if ("above" in note)
                above = note.above == NoteAbove.Above ? NoteAbove.Above : NoteAbove.Below;
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                alpha = note.alpha;
            if ("type" in note && isNumber(note.type) && note.type >= 1 && note.type <= 4 && Number.isInteger(note.type))
                type = note.type;
            if ("isFake" in note)
                isFake = note.isFake ? 1 : 0;
            if ("size" in note && isNumber(note.size))
                size = note.size;
            if ("speed" in note && isNumber(note.speed))
                speed = note.speed;
            if ("yOffset" in note && isNumber(note.yOffset))
                yOffset = note.yOffset;
            if ("visibleTime" in note && isNumber(note.visibleTime))
                visibleTime = note.visibleTime;
        }
        return new Note({
            startTime, endTime, type, positionX, above, isFake, size, speed, alpha, yOffset, visibleTime
        });
    }
    constructor(note: INote<T>) {
        this._startTime = note.startTime;
        this._endTime = note.endTime;
        this.type = note.type;
        this.positionX = note.positionX;
        this.above = note.above;
        this.isFake = note.isFake;
        this.speed = note.speed;
        this.alpha = note.alpha;
        this.size = note.size;
        this.visibleTime = note.visibleTime;
        this.yOffset = note.yOffset;
    }
}