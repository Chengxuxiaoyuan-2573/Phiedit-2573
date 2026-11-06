/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的音符。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/note.html
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readOptionalNumber, readRequiredNumber } from "./helpers";

/** Phigros Official 格式中的音符 */
export interface IOfficialNote {

    /** 音符类型：1 = Tap、2 = Drag、3 = Hold、4 = Flick */
    type: number

    /** 音符的时间，单位为 1.875 / bpm 秒 */
    time: number

    /** Hold 的持续时间（仅 Hold 有意义），单位为 1.875 / bpm 秒 */
    holdTime: number

    /** 音符的横向坐标 */
    positionX: number

    /** 音符的速度倍率（Hold 时为尾部速度倍率） */
    speed: number

    /** 音符判定时距离判定线的高度，仅方便计算用，本编辑器不使用 */
    floorPosition: number
}

export enum OfficialNoteType {
    Tap = 1,
    Drag = 2,
    Hold = 3,
    Flick = 4
}

export function isOfficialNoteType(type: unknown): type is OfficialNoteType {
    return type === OfficialNoteType.Tap ||
        type === OfficialNoteType.Drag ||
        type === OfficialNoteType.Hold ||
        type === OfficialNoteType.Flick;
}

const DEFAULT_TYPE = OfficialNoteType.Tap;
const DEFAULT_TIME = 0;
const DEFAULT_HOLD_TIME = 0;
const DEFAULT_POSITION_X = 0;
const DEFAULT_SPEED = 1;
const DEFAULT_FLOOR_POSITION = 0;

export class OfficialNote implements IOfficialNote, IObjectizable<IOfficialNote> {
    type = DEFAULT_TYPE;
    time = DEFAULT_TIME;
    holdTime = DEFAULT_HOLD_TIME;
    positionX = DEFAULT_POSITION_X;
    speed = DEFAULT_SPEED;
    floorPosition = DEFAULT_FLOOR_POSITION;
    readonly errorMessages: string[] = [];

    toObject(): IOfficialNote {
        return {
            type: this.type,
            time: this.time,
            holdTime: this.holdTime,
            positionX: this.positionX,
            speed: this.speed,
            floorPosition: this.floorPosition
        };
    }

    constructor(note: unknown, readonly context = "音符") {
        if (!isObject(note)) {
            this.errorMessages.push(`${context}：音符必须是一个对象，但读取到了 ${note}。将会被视为一个所有值都是默认值的音符。`);
            return;
        }

        const source = asRecord(note)!;

        this.type = readRequiredNumber(source, "type", DEFAULT_TYPE, this.errorMessages, context, "音符");
        this.time = readRequiredNumber(source, "time", DEFAULT_TIME, this.errorMessages, context, "音符");
        this.holdTime = readOptionalNumber(source, "holdTime", DEFAULT_HOLD_TIME, this.errorMessages, context, "音符");
        this.positionX = readOptionalNumber(source, "positionX", DEFAULT_POSITION_X, this.errorMessages, context, "音符");
        this.speed = readOptionalNumber(source, "speed", DEFAULT_SPEED, this.errorMessages, context, "音符");
        this.floorPosition = readOptionalNumber(source, "floorPosition", DEFAULT_FLOOR_POSITION, this.errorMessages, context, "音符");

        if (!isOfficialNoteType(this.type)) {
            this.errorMessages.push(`${context}：官方音符的 type 属性必须是 1 到 4 之间的整数，但读取到了 ${this.type}。将会被设为默认值 ${DEFAULT_TYPE}（Tap 音符）。`);
            this.type = DEFAULT_TYPE;
        }
    }
}
