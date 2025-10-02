/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { beatsToSeconds, BPM, makeSureBeatsValid } from "./beats";
import { isArrayOfNumbers,  Optional } from "../tools/typeTools";
import { Beats } from "./beats";
import { isObject, isNumber } from "lodash";
import ChartError from "./error";
import { ITimeSegment, TimeSegment } from "./timeSegment";
import { IObjectizable } from "./objectizable";
export enum NoteAbove {
    Above = 1,
    Below = 0,
}
export enum NoteFake {
    Real = 0,
    Fake = 1,
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
export const noteAttributes = [
    "above",
    "alpha",
    "startTime",
    "endTime",
    "type",
    "isFake",
    "positionX",
    "size",
    "speed",
    "yOffset",
    "visibleTime"
] as const;
export interface INoteExtendedOptions {
    judgeLineNumber: number,
    BPMList: BPM[],
    noteNumber: number
    id: string
}
export interface INoteJudgement {
    hitSeconds: number | undefined
    hit(seconds: number): string
    unhit(): void
    getJudgementRange(): {
        perfect: number,
        good: number,
        bad: number
    }
    getJudgement(): "perfect" | "good" | "bad" | "none"
}
export interface INoteHighlight {
    highlight: boolean;
}
interface INoteIdentifier {
    readonly isNote: true
}
export enum NoteType { Tap = 1, Hold, Flick, Drag }
function isNoteType(type: unknown): type is NoteType {
    return type === NoteType.Tap || type === NoteType.Hold || type === NoteType.Flick || type === NoteType.Drag;
}

export function isNoteLike(value: unknown): value is INote {
    if (!isObject(value)) {
        return false;
    }
    return "isNote" in value;
}

const
    TAP_PERFECT = 0.08,
    TAP_GOOD = 0.16,
    TAP_BAD = 0.18,
    HOLD_PERFECT = 0.08,
    HOLD_GOOD = 0.16,
    HOLD_BAD = 0.18,
    DRAGFLICK_PERFECT = 0.18,
    DEFAULT_ABOVE = NoteAbove.Above,
    DEFAULT_ALPHA = 255,
    DEFAULT_ISFAKE = NoteFake.Real,
    DEFAULT_POSITIONX = 0,
    DEFAULT_SIZE = 1,
    DEFAULT_SPEED = 1,
    DEFAULT_YOFFSET = 0,
    DEFAULT_START_TIME: Beats = [0, 0, 1],
    DEFAULT_END_TIME: Beats = [0, 0, 1],
    DEFAULT_VISIBLETIME = 999999,
    DEFAULT_TYPE = NoteType.Tap;

export class Note extends TimeSegment implements INote, ITimeSegment, IObjectizable<INote>, INoteExtendedOptions, INoteIdentifier, INoteHighlight {
    above = DEFAULT_ABOVE;
    alpha = DEFAULT_ALPHA;
    isFake = DEFAULT_ISFAKE;
    positionX = DEFAULT_POSITIONX;
    size = DEFAULT_SIZE;
    speed = DEFAULT_SPEED;
    yOffset = DEFAULT_YOFFSET;
    visibleTime = DEFAULT_VISIBLETIME;
    _startTime: Beats = [...DEFAULT_START_TIME];
    _endTime: Beats = [...DEFAULT_END_TIME];
    type = DEFAULT_TYPE;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    cachedIsJudged: boolean = false;
    readonly isNote = true;
    readonly BPMList: BPM[];

    /** note 的唯一标识符，比如 "0-note-1" 表示第0号判定线上的第1号 note */
    readonly id: string;

    /** note 所属的判定线编号 */
    judgeLineNumber: number;

    /** note 的编号 */
    noteNumber: number;

    highlight = false;
    readonly errors: ChartError[] = [];
    toObject(): INote {
        return {
            startTime: [...this.startTime],
            endTime: [...this.endTime],
            type: this.type,
            positionX: this.positionX,
            above: this.above,
            alpha: this.alpha,
            speed: this.speed,
            size: this.size,
            isFake: this.isFake,
            visibleTime: this.visibleTime,
            yOffset: this.yOffset
        };
    }
    hitSeconds: number | undefined = undefined;
    hit(seconds: number) {
        if (this.isFake) {
            // 该音符是假音符，无法被击打
            return "FAKE";
        }

        if (this.hitSeconds !== undefined) {
            // 该音符已经被击打
            return "ALREADY_HIT";
        }
        this.hitSeconds = seconds;
        if (this.getJudgement() === "none") {
            // 该音符击打的时间不在判定范围内，击打无效
            this.hitSeconds = undefined;
            return "NOT_IN_JUDGEMENT_RANGE";
        }
        return "SUCCESS";
    }
    unhit() {
        this.hitSeconds = undefined;
    }
    getJudgementRange() {
        switch (this.type) {
            case NoteType.Tap:
                return {
                    perfect: TAP_PERFECT,
                    good: TAP_GOOD,
                    bad: TAP_BAD
                };
            case NoteType.Hold:
                return {
                    perfect: HOLD_PERFECT,
                    good: HOLD_GOOD,
                    bad: HOLD_BAD
                };
            default:
                return {
                    perfect: DRAGFLICK_PERFECT,
                    good: DRAGFLICK_PERFECT,
                    bad: DRAGFLICK_PERFECT
                };
        }
    }
    getJudgement() {
        if (this.hitSeconds === undefined) return "none";
        const startSeconds = this.cachedStartSeconds;
        const delta = this.hitSeconds - startSeconds;
        const { perfect, good, bad } = (() => {
            switch (this.type) {
                case NoteType.Tap: return {
                    perfect: TAP_PERFECT,
                    good: TAP_GOOD,
                    bad: TAP_BAD
                };
                case NoteType.Hold: return {
                    perfect: HOLD_PERFECT,
                    good: HOLD_GOOD,
                    bad: HOLD_BAD
                };
                default: return {
                    perfect: DRAGFLICK_PERFECT,
                    good: DRAGFLICK_PERFECT,
                    bad: DRAGFLICK_PERFECT
                };
            }
        })();
        if (delta >= -perfect && delta < perfect) return "perfect";
        if (delta >= -good && delta < good) return "good";
        else if (delta >= -bad && delta < bad) return "bad";
        else return "none";
    }
    constructor(note: unknown, options: Optional<INoteExtendedOptions, "id">) {
        super();
        this.judgeLineNumber = options.judgeLineNumber;
        this.noteNumber = options.noteNumber;
        this.id = options.id ?? `${options.judgeLineNumber}-note-${options.noteNumber}`;
        if (isObject(note)) {
            // startTime
            if ("startTime" in note) {
                if (isArrayOfNumbers(note.startTime, 3)) {
                    this._startTime = makeSureBeatsValid(note.startTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 startTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(note.startTime)}。将会被替换为默认值 [0, 0, 1]。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 startTime 属性。将会被设为默认值 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("endTime" in note) {
                if (isArrayOfNumbers(note.endTime, 3)) {
                    this._endTime = makeSureBeatsValid(note.endTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 endTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(note.endTime)}。将会被替换为 startTime 的值。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                    this._endTime = makeSureBeatsValid(this._startTime);
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 endTime 属性。将会被设为 startTime 的值。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
                this._endTime = makeSureBeatsValid(this._startTime);
            }

            if ("positionX" in note) {
                if (isNumber(note.positionX)) {
                    this.positionX = note.positionX;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 positionX 属性必须是数字，但读取到了 ${note.positionX}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 positionX 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("above" in note) {
                if (isNumber(note.above)) {
                    this.above = note.above === 1 ? NoteAbove.Above : NoteAbove.Below;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 above 属性必须是 0 或 1，但读取到了 ${note.above}。将会被替换为数字 1。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 above 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("alpha" in note) {
                if (isNumber(note.alpha)) {
                    if (note.alpha >= 0 && note.alpha <= 255) {
                        this.alpha = note.alpha;
                    }
                    else {
                        this.errors.push(new ChartError(
                            `${this.id}：音符的 alpha 属性必须是 0 到 255 之间的数字，但读取到了 ${note.alpha}。将会被替换为数字 255。`,
                            "ChartReadError.OutOfRange",
                            "error",
                            this
                        ));
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 alpha 属性必须是数字，但读取到了 ${note.alpha}。将会被替换为数字 255。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 alpha 属性。将会被设为数字 255。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("type" in note) {
                if (isNoteType(note.type)) {
                    this.type = note.type;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 type 属性必须是 1 到 4 之间的整数，但读取到了 ${note.type}。将会被替换为数字 1（Tap 音符）。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 type 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("isFake" in note) {
                if (isNumber(note.isFake)) {
                    this.isFake = note.isFake === 1 ? NoteFake.Fake : NoteFake.Real;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 isFake 属性必须是 0 或 1，但读取到了 ${note.isFake}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 isFake 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("size" in note) {
                if (isNumber(note.size)) {
                    this.size = note.size;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 size 属性必须是数字，但读取到了 ${note.size}。将会被替换为数字 1。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 size 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("speed" in note) {
                if (isNumber(note.speed)) {
                    this.speed = note.speed;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 speed 属性必须是数字，但读取到了 ${note.speed}。将会被替换为数字 1。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 speed 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("yOffset" in note) {
                if (isNumber(note.yOffset)) {
                    this.yOffset = note.yOffset;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 yOffset 属性必须是数字，但读取到了 ${note.yOffset}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 yOffset 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            if ("visibleTime" in note) {
                if (isNumber(note.visibleTime)) {
                    this.visibleTime = note.visibleTime;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：音符的 visibleTime 属性必须是数字，但读取到了 ${note.visibleTime}。将会被替换为数字 999999。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：音符缺少 visibleTime 属性。将会被设为数字 999999。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}：音符必须是一个对象，但读取到了 ${note}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
                this
            ));
        }
        this.BPMList = options.BPMList;
        this.cachedStartSeconds = beatsToSeconds(options.BPMList, this.startTime);
        this.cachedEndSeconds = beatsToSeconds(options.BPMList, this.endTime);
    }
}