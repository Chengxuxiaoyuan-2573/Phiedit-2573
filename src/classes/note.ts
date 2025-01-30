
import { beatsToSeconds, BPM, formatBeats, parseBeats, validateBeats } from "./beats"
import { isArrayOfNumbers } from "../tools/typeCheck"
import { Beats, getBeatsValue } from "./beats"
import { isObject, isNumber } from "lodash"
export enum NoteAbove {
    Above = 1,
    Below = 2
}
export interface INote {
    above: NoteAbove
    alpha: number
    startTime: Beats
    endTime: Beats
    type: NoteType
    isFake: 0 | 1
    positionX: number
    size: number
    speed: number
    yOffset: number
    visibleTime: number
}
export enum NoteType { Tap = 1, Hold, Flick, Drag }
export class Note implements INote {
    static readonly TAP_PERFECT = 0.08
    static readonly TAP_GOOD = 0.16
    static readonly TAP_BAD = 0.18
    static readonly HOLD_PERFECT = 0.08
    static readonly HOLD_GOOD = 0.16
    static readonly HOLD_BAD = 0.18
    static readonly DRAGFLICK_PERFECT = 0.18
    above = NoteAbove.Above
    alpha = 255
    isFake: 0 | 1 = 0
    positionX = 0
    size = 1
    speed = 1
    yOffset = 0
    visibleTime = 999999
    _startTime: Beats = [0, 0, 1]
    _endTime: Beats = [0, 0, 1]
    type = NoteType.Tap
    cachedStartSeconds: number
    cachedEndSeconds: number
    BPMList: BPM[]
    get typeString() {
        switch (this.type) {
            case NoteType.Tap: return 'Tap';
            case NoteType.Drag: return 'Drag';
            case NoteType.Flick: return 'Flick';
            default: return 'Hold';
        }
    }
    highlight = false
    hitSeconds: number | undefined = undefined
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        if (this.type == NoteType.Hold)
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
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this._startTime);
    }
    set endTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        if (this.type == NoteType.Hold)
            this._endTime = beats;
        else
            this._startTime = beats;
        if (getBeatsValue(this._startTime) > getBeatsValue(this._endTime)) {
            [this._startTime, this._endTime] = [this._endTime, this._startTime];
        }
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this._endTime);
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
    toObject(): INote {
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
        this.cachedStartSeconds = startSeconds;
        this.cachedEndSeconds = endSeconds;
    }
    getJudgement() {
        if (this.hitSeconds == undefined) return 'none';
        const startSeconds = this.cachedStartSeconds;
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
    constructor(note: unknown, BPMList: BPM[]) {
        if (isObject(note)) {
            if ("startTime" in note && isArrayOfNumbers(note.startTime, 3))
                this._startTime = note.startTime;
            if ("endTime" in note && isArrayOfNumbers(note.endTime, 3))
                this._endTime = note.endTime;
            else
                this._endTime = this._startTime;
            if ("positionX" in note && isNumber(note.positionX))
                this.positionX = note.positionX;
            if ("above" in note)
                this.above = note.above == NoteAbove.Above ? NoteAbove.Above : NoteAbove.Below;
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                this.alpha = note.alpha;
            if ("type" in note && isNumber(note.type) && note.type >= 1 && note.type <= 4 && Number.isInteger(note.type))
                this.type = note.type;
            if ("isFake" in note)
                this.isFake = note.isFake ? 1 : 0;
            if ("size" in note && isNumber(note.size))
                this.size = note.size;
            if ("speed" in note && isNumber(note.speed))
                this.speed = note.speed;
            if ("yOffset" in note && isNumber(note.yOffset))
                this.yOffset = note.yOffset;
            if ("visibleTime" in note && isNumber(note.visibleTime))
                this.visibleTime = note.visibleTime;
        }
        this.BPMList = BPMList;
        this.cachedStartSeconds = beatsToSeconds(BPMList, this.startTime);
        this.cachedEndSeconds = beatsToSeconds(BPMList, this.endTime);
    }
}