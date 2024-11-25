import { beatsToSeconds, formatBeats, parseBeats, playSound } from "../tools"
import { isObject, isNumber, isArrayOf3Numbers } from "../typeCheck"
import { Beats, NoteType, BPM } from "../typeDefinitions"
import { ResourcePackage } from "./resourcePackage"
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
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this._endTime;
    }
    set startTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        if (this.type != NoteType.Hold) {
            this._endTime = beats;
        }
        this._startTime = beats;
        this._startSecondsCache = undefined;
    }
    set endTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        if (this.type != NoteType.Hold) {
            this._startTime = beats;
        }
        this._endTime = beats;
        this._endSecondsCache = undefined;
    }
    get startString() {
        return formatBeats(this.startTime);
    }
    get endString() {
        return formatBeats(this.endTime);
    }
    set startString(str: string) {
        const beats = parseBeats(str);
        if (beats == null) return;
        this.startTime = beats;
    }
    set endString(str: string) {
        const beats = parseBeats(str);
        if (beats == null) return;
        this.endTime = beats;
    }
    _type = NoteType.Tap
    get type() {
        return this._type;
    }
    set type(type: NoteType) {
        if (this._type == NoteType.Hold && type != NoteType.Hold) {
            this.endTime = this.startTime;
        }
        this._type = type;
    }
    highlight = false
    hitSeconds: number | undefined = undefined
    _startSecondsCache: number | undefined = undefined
    _endSecondsCache: number | undefined = undefined
    toObject():INote {
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
    playSound(resourcePackage: ResourcePackage) {
        const audioBuffer =
            this.type == NoteType.Drag ? resourcePackage.dragSound :
                this.type == NoteType.Flick ? resourcePackage.flickSound :
                    this.type == NoteType.Tap ? resourcePackage.tapSound : resourcePackage.tapSound;
        playSound(resourcePackage.audioContext, audioBuffer);
    }
    caculateSeconds(BPMList: BPM[]) {
        /*
        // 用这个代码会有bug，但是牺牲一点性能还是可以接受的吧
        const startSeconds = (() => {
            if (this._startSecondsCache) return this._startSecondsCache;
            else return this._startSecondsCache = beatsToSeconds(BPMList, this.startTime);
        })();
        const endSeconds = (() => {
            if (this._endSecondsCache) return this._endSecondsCache;
            else return this._endSecondsCache = beatsToSeconds(BPMList, this.endTime);
        })();
        */
        const startSeconds = this._startSecondsCache = beatsToSeconds(BPMList, this.startTime);
        const endSeconds = this._endSecondsCache = beatsToSeconds(BPMList, this.endTime);
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
            if ("startTime" in note && isArrayOf3Numbers(note.startTime))
                this._startTime = note.startTime;
            if ("endTime" in note && isArrayOf3Numbers(note.endTime))
                this._endTime = note.endTime;
            if ("positionX" in note && isNumber(note.positionX))
                this.positionX = note.positionX;
            if ("above" in note)
                this.above = note.above == 1;
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                this.alpha = note.alpha;
            if ("type" in note && isNumber(note.type) && note.type >= 1 && note.type <= 4 && Number.isInteger(note.type))
                this._type = note.type;
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