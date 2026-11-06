/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的判定线。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/judgeLine.html
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readArrayField, readRequiredNumber } from "./helpers";
import { OfficialNote, IOfficialNote } from "./note";
import { OfficialEvent, OfficialSpeedEvent, IOfficialEvent, IOfficialSpeedEvent } from "./event";

/** Phigros Official 格式中的判定线 */
export interface IOfficialJudgeLine {

    /** 该判定线的 BPM */
    bpm: number

    /** 正面下落的音符 */
    notesAbove: IOfficialNote[]

    /** 反面下落的音符 */
    notesBelow: IOfficialNote[]

    /** 速度事件 */
    speedEvents: IOfficialSpeedEvent[]

    /** 移动事件 */
    judgeLineMoveEvents: IOfficialEvent[]

    /** 旋转事件 */
    judgeLineRotateEvents: IOfficialEvent[]

    /** 透明度事件 */
    judgeLineDisappearEvents: IOfficialEvent[]
}

const DEFAULT_BPM = 120;

export class OfficialJudgeLine implements IOfficialJudgeLine, IObjectizable<IOfficialJudgeLine> {
    bpm = DEFAULT_BPM;
    notesAbove: OfficialNote[] = [];
    notesBelow: OfficialNote[] = [];
    speedEvents: OfficialSpeedEvent[] = [];
    judgeLineMoveEvents: OfficialEvent[] = [];
    judgeLineRotateEvents: OfficialEvent[] = [];
    judgeLineDisappearEvents: OfficialEvent[] = [];
    readonly errorMessages: string[] = [];

    get notes() {
        return [...this.notesAbove, ...this.notesBelow];
    }

    toObject(): IOfficialJudgeLine {
        return {
            bpm: this.bpm,
            notesAbove: this.notesAbove.map(note => note.toObject()),
            notesBelow: this.notesBelow.map(note => note.toObject()),
            speedEvents: this.speedEvents.map(event => event.toObject()),
            judgeLineMoveEvents: this.judgeLineMoveEvents.map(event => event.toObject()),
            judgeLineRotateEvents: this.judgeLineRotateEvents.map(event => event.toObject()),
            judgeLineDisappearEvents: this.judgeLineDisappearEvents.map(event => event.toObject())
        };
    }

    constructor(judgeLine: unknown, readonly judgeLineNumber = 0) {
        const context = `第${judgeLineNumber}号判定线`;

        if (!isObject(judgeLine)) {
            this.errorMessages.push(`${context}：判定线必须是一个对象，但读取到了 ${judgeLine}。将会被视为一条所有值都是默认值的判定线。`);
            return;
        }

        const source = asRecord(judgeLine)!;

        this.bpm = readRequiredNumber(source, "bpm", DEFAULT_BPM, this.errorMessages, context, "判定线");

        if (this.bpm <= 0) {
            this.errorMessages.push(`${context}：判定线的 bpm 属性必须大于 0，但读取到了 ${this.bpm}。将会被设为默认值 ${DEFAULT_BPM}。`);
            this.bpm = DEFAULT_BPM;
        }

        // 音符
        const notesAbove = readArrayField(source, "notesAbove", this.errorMessages, context, "判定线");
        if (notesAbove) {
            notesAbove.forEach((note, i) => {
                const newNote = new OfficialNote(note, `${context} notesAbove[${i}]`);
                this.notesAbove.push(newNote);
                this.errorMessages.push(...newNote.errorMessages);
            });
        }

        const notesBelow = readArrayField(source, "notesBelow", this.errorMessages, context, "判定线");
        if (notesBelow) {
            notesBelow.forEach((note, i) => {
                const newNote = new OfficialNote(note, `${context} notesBelow[${i}]`);
                this.notesBelow.push(newNote);
                this.errorMessages.push(...newNote.errorMessages);
            });
        }

        // 速度事件
        const speedEvents = readArrayField(source, "speedEvents", this.errorMessages, context, "判定线");
        if (speedEvents) {
            speedEvents.forEach((event, i) => {
                const newEvent = new OfficialSpeedEvent(event, `${context} speedEvents[${i}]`);
                this.speedEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }

        // 移动事件
        const moveEvents = readArrayField(source, "judgeLineMoveEvents", this.errorMessages, context, "判定线");
        if (moveEvents) {
            moveEvents.forEach((event, i) => {
                const newEvent = new OfficialEvent(event, `${context} judgeLineMoveEvents[${i}]`);
                this.judgeLineMoveEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }

        // 旋转事件
        const rotateEvents = readArrayField(source, "judgeLineRotateEvents", this.errorMessages, context, "判定线");
        if (rotateEvents) {
            rotateEvents.forEach((event, i) => {
                const newEvent = new OfficialEvent(event, `${context} judgeLineRotateEvents[${i}]`);
                this.judgeLineRotateEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }

        // 透明度事件
        const disappearEvents = readArrayField(source, "judgeLineDisappearEvents", this.errorMessages, context, "判定线");
        if (disappearEvents) {
            disappearEvents.forEach((event, i) => {
                const newEvent = new OfficialEvent(event, `${context} judgeLineDisappearEvents[${i}]`);
                this.judgeLineDisappearEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }
    }
}
