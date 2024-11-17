import { beatsToSeconds, playSound } from "../tools"
import { isObject, isNumber, isArrayOf3Numbers } from "../typeCheck"
import { Bool, Beats, NoteType, HitState, BPM } from "../typeDefinitions"
import { NoteJudgement } from "./noteJudgement"
import { ResourcePackage } from "./resourcePackage"
export class Note {
    above: Bool = 1
    alpha = 255
    startTime: Beats = [0, 0, 1]
    endTime: Beats = [0, 0, 1]
    type = NoteType.Tap
    isFake: Bool = 0
    positionX = 0
    size = 1
    speed = 1
    yOffset = 0
    visibleTime = 999999.99
    _highlight = false
    _hitState = HitState.NotHitted
    _hitSeconds = Infinity
    _playedSound = false
    _startSeconds?: number
    _endSeconds?: number
    _judgement: NoteJudgement | null = null;
    playSound(resourcePackage: ResourcePackage) {
        const audioBuffer =
            this.type == NoteType.Drag ? resourcePackage.dragSound :
                this.type == NoteType.Flick ? resourcePackage.flickSound :
                    this.type == NoteType.Tap ? resourcePackage.tapSound : resourcePackage.tapSound;
        playSound(resourcePackage.audioContext, audioBuffer);
        this._playedSound = true;
    }
    caculateSeconds(BPMList: BPM[]) {
        const startSeconds = this._startSeconds || (this._startSeconds = beatsToSeconds(BPMList, this.startTime));
        const endSeconds = this._endSeconds || (this._endSeconds = beatsToSeconds(BPMList, this.endTime));
        return { startSeconds, endSeconds };
    }
    constructor(note: unknown) {
        if (isObject(note)) {
            if ("above" in note && isNumber(note.above))
                this.above = (note.above == 1 ? 1 : 0);
            if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                this.alpha = note.alpha;
            if ("startTime" in note && isArrayOf3Numbers(note.startTime))
                this.startTime = note.startTime;
            if ("endTime" in note && isArrayOf3Numbers(note.endTime))
                this.endTime = note.endTime;
            if ("type" in note && isNumber(note.type) && note.type >= 1 && note.type <= 4 && Number.isInteger(note.type))
                this.type = note.type;
            if ("isFake" in note && (note.isFake == 0 || note.isFake == 1))
                this.isFake = note.isFake as Bool;
            if ("positionX" in note && isNumber(note.positionX))
                this.positionX = note.positionX;
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