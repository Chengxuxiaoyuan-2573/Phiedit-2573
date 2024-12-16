import { formatBeats, parseBeats } from "../tools"
import { beatsToSeconds, validateBeats } from "./beats"
import { isObject, isNumber, isArrayOfNumbers } from "../typeCheck"
import { NoteType, BPM } from "../typeDefinitions"
import { Beats } from "./beats"
export interface INote {
    above: boolean
    alpha: number
    startTime: Beats
    endTime: Beats
    type: NoteType
    isFake: boolean
    positionX: number
    size: number
    speed: number
    yOffset: number
    visibleTime: number
}
export class Note implements INote {
    static readonly TAP_PERFECT = 0.08
    static readonly TAP_GOOD = 0.16
    static readonly TAP_BAD = 0.18
    static readonly HOLD_PERFECT = 0.08
    static readonly HOLD_GOOD = 0.16
    static readonly HOLD_BAD = 0.18
    static readonly DRAGFLICK_PERFECT = 0.18
    above = true
    alpha = 255
    isFake = false
    positionX = 0
    size = 1
    speed = 1
    yOffset = 0
    visibleTime = 999999.99
    _startTime: Beats = [0, 0, 1]
    _endTime: Beats = [0, 0, 1]
    type = NoteType.Tap
    highlight = false
    hitSeconds: number | undefined = undefined
    _willBeDeleted = false
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this.type == NoteType.Hold ? this._endTime : this._startTime;
    }
    set startTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        this._startTime = beats;
    }
    set endTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        if (this.type == NoteType.Hold)
            this._endTime = beats;
        else
            this._startTime = beats;
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
    delete(){
        this._willBeDeleted = true;
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
    caculateSeconds(BPMList: BPM[]) {
        const startSeconds = beatsToSeconds(BPMList, this.startTime);
        const endSeconds = beatsToSeconds(BPMList, this.endTime);
        return { startSeconds, endSeconds };
    }
    getJudgement(BPMList: BPM[]) {
        if (this.hitSeconds == undefined) return 'none';
        const { startSeconds } = this.caculateSeconds(BPMList);
        const delta = this.hitSeconds - startSeconds;
        const { perfect, good } = (() => {
            switch (this.type) {
                case NoteType.Tap: return {
                    perfect: Note.TAP_PERFECT,
                    good: Note.TAP_GOOD,
                }
                case NoteType.Hold: return {
                    perfect: Note.HOLD_PERFECT,
                    good: Note.HOLD_GOOD,
                }
                default: return {
                    perfect: Note.DRAGFLICK_PERFECT,
                    good: Note.DRAGFLICK_PERFECT,
                }
            }
        })();
        if (delta >= -perfect && delta < perfect) return 'perfect';
        if (delta >= -good && delta < good) return 'good';
        else/*if (delta >= -bad && delta < bad)*/ return 'bad';
    }
    constructor(note: unknown) {
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
                this.above = note.above == 1;
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                this.alpha = note.alpha;
            if ("type" in note && isNumber(note.type) && note.type >= 1 && note.type <= 4 && Number.isInteger(note.type))
                this.type = note.type;
            if ("isFake" in note)
                this.isFake = note.isFake == 1;
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