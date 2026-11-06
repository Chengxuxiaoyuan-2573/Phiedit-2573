/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的判定线事件。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/event.html
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readOptionalNumber, readRequiredNumber } from "./helpers";

/**
 * 官方谱面的移动 / 旋转 / 透明度事件。
 *
 * - formatVersion 为 1 时，移动事件的 start、end 为打包后的整数，
 *   x = (v - v % 1000) / 1000，y = v % 1000，start2、end2 不存在。
 * - formatVersion 为 3 时，移动事件的 start、end 为 x 坐标，start2、end2 为 y 坐标。
 * - 旋转、透明度事件只使用 start、end。
 */
export interface IOfficialEvent {

    /** 事件开始时间，单位为 1.875 / bpm 秒 */
    startTime: number

    /** 事件结束时间，单位为 1.875 / bpm 秒 */
    endTime: number

    /** 事件开始时的数值（移动事件中为 x 坐标或被打包的坐标） */
    start: number

    /** 事件结束时的数值（移动事件中为 x 坐标或被打包的坐标） */
    end: number

    /** 移动事件结束时 y 坐标（仅 formatVersion 为 3 的移动事件存在） */
    start2: number

    /** 移动事件结束时 y 坐标（仅 formatVersion 为 3 的移动事件存在） */
    end2: number
}

export interface IOfficialSpeedEvent {

    /** 事件开始时间，单位为 1.875 / bpm 秒 */
    startTime: number

    /** 事件结束时间，单位为 1.875 / bpm 秒 */
    endTime: number

    /** 事件的值，单位为高度单位 */
    value: number

    /** 速度事件开始时判定线共流过的速度，仅方便计算用，本编辑器不使用 */
    floorPosition: number
}

export class OfficialEvent implements IOfficialEvent, IObjectizable<IOfficialEvent> {
    startTime = 0;
    endTime = 0;
    start = 0;
    end = 0;
    start2 = 0;
    end2 = 0;
    readonly errorMessages: string[] = [];

    toObject(): IOfficialEvent {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            start: this.start,
            end: this.end,
            start2: this.start2,
            end2: this.end2
        };
    }

    constructor(event: unknown, readonly context = "事件") {
        if (!isObject(event)) {
            this.errorMessages.push(`${context}：事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的事件。`);
            return;
        }

        const source = asRecord(event)!;

        this.startTime = readRequiredNumber(source, "startTime", 0, this.errorMessages, context, "事件");
        this.endTime = readRequiredNumber(source, "endTime", 0, this.errorMessages, context, "事件");
        this.start = readRequiredNumber(source, "start", 0, this.errorMessages, context, "事件");
        this.end = readRequiredNumber(source, "end", 0, this.errorMessages, context, "事件");

        // start2、end2 只有 formatVersion 为 3 的移动事件才有，缺失属于正常情况
        this.start2 = readOptionalNumber(source, "start2", 0, this.errorMessages, context, "事件");
        this.end2 = readOptionalNumber(source, "end2", 0, this.errorMessages, context, "事件");

        if (this.startTime > this.endTime) {
            this.errorMessages.push(`${context}：事件的 startTime（${this.startTime}）大于 endTime（${this.endTime}）。将会被忽略。`);
        }
    }
}

export class OfficialSpeedEvent implements IOfficialSpeedEvent, IObjectizable<IOfficialSpeedEvent> {
    startTime = 0;
    endTime = 0;
    value = 0;
    floorPosition = 0;
    readonly errorMessages: string[] = [];

    toObject(): IOfficialSpeedEvent {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            value: this.value,
            floorPosition: this.floorPosition
        };
    }

    constructor(event: unknown, readonly context = "速度事件") {
        if (!isObject(event)) {
            this.errorMessages.push(`${context}：速度事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的速度事件。`);
            return;
        }

        const source = asRecord(event)!;

        this.startTime = readRequiredNumber(source, "startTime", 0, this.errorMessages, context, "速度事件");
        this.endTime = readRequiredNumber(source, "endTime", 0, this.errorMessages, context, "速度事件");
        this.value = readRequiredNumber(source, "value", 0, this.errorMessages, context, "速度事件");
        this.floorPosition = readOptionalNumber(source, "floorPosition", 0, this.errorMessages, context, "速度事件");

        if (this.startTime > this.endTime) {
            this.errorMessages.push(`${context}：速度事件的 startTime（${this.startTime}）大于 endTime（${this.endTime}）。将会被忽略。`);
        }
    }
}
