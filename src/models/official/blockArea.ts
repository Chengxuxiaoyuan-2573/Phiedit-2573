/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的噪域（blockArea）。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/blockArea.html
 *
 * 噪域下的四个时间点以及所有事件的 time 均为音乐时间（秒）。
 * 事件为「关键帧」形式：只记录 time 与目标值，起始值为上一个事件的值（第一个事件之前取默认值）。
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readArrayField, readCoordinate, readOptionalBoolean, readOptionalNumber, readRequiredNumber } from "./helpers";

/** 噪域的移动事件（关键帧形式） */
export interface IOfficialBlockAreaMoveEvent {

    /** 移动的目标坐标（方块中心），单位为谱面渲染范围 */
    endPosition: [number, number]

    /** 事件的时间，单位为秒 */
    time: number

    /** x 方向的缓动类型 */
    easeTypeX: number

    /** y 方向的缓动类型 */
    easeTypeY: number
}

/** 噪域的旋转事件（关键帧形式） */
export interface IOfficialBlockAreaRotateEvent {

    /** 旋转中心坐标，单位为谱面渲染范围 */
    anchor: [number, number]

    /** 事件的时间，单位为秒 */
    time: number

    /** 缓动类型 */
    easeType: number

    /** 旋转角度，单位为度 */
    rotation: number
}

/** 噪域的缩放事件（关键帧形式） */
export interface IOfficialBlockAreaScaleEvent {

    /** 缩放中心坐标，单位为谱面渲染范围 */
    anchor: [number, number]

    /** 事件的时间，单位为秒 */
    time: number

    /** x 方向的缓动类型 */
    easeTypeX: number

    /** y 方向的缓动类型 */
    easeTypeY: number

    /** 缩放倍率，(1, 1) 表示原始大小 */
    scale: [number, number]
}

/** Phigros Official 格式中的噪域 */
export interface IOfficialBlockArea {

    /** 方块区域的右上角坐标 */
    topRightPercentage: [number, number]

    /** 方块区域的左下角坐标 */
    bottomLeftPercentage: [number, number]

    /** 方块出现的时间，单位为秒 */
    appearTime: number

    /** 方块进入 Active 的时间，单位为秒 */
    enableTime: number

    /** 方块进入 Disabled 的时间，单位为秒 */
    disableTime: number

    /** 方块消失的时间，单位为秒 */
    disappearTime: number

    /** 是否为减算方块 */
    isSubtract: boolean

    /** 旋转事件 */
    rotateEvents: IOfficialBlockAreaRotateEvent[]

    /** 移动事件 */
    moveEvents: IOfficialBlockAreaMoveEvent[]

    /** 缩放事件 */
    scaleEvents: IOfficialBlockAreaScaleEvent[]
}

export class OfficialBlockAreaMoveEvent implements IOfficialBlockAreaMoveEvent, IObjectizable<IOfficialBlockAreaMoveEvent> {
    endPosition: [number, number] = [0, 0];
    time = 0;
    easeTypeX = 0;
    easeTypeY = 0;
    readonly errorMessages: string[] = [];

    toObject(): IOfficialBlockAreaMoveEvent {
        return {
            endPosition: [...this.endPosition] as [number, number],
            time: this.time,
            easeTypeX: this.easeTypeX,
            easeTypeY: this.easeTypeY
        };
    }

    constructor(event: unknown, readonly context = "移动事件") {
        if (!isObject(event)) {
            this.errorMessages.push(`${context}：移动事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的移动事件。`);
            return;
        }

        const source = asRecord(event)!;
        this.endPosition = readCoordinate(source, "endPosition", this.errorMessages, context, "移动事件", [0, 0]);
        this.time = readRequiredNumber(source, "time", 0, this.errorMessages, context, "移动事件");
        this.easeTypeX = readOptionalNumber(source, "easeTypeX", 0, this.errorMessages, context, "移动事件");
        this.easeTypeY = readOptionalNumber(source, "easeTypeY", 0, this.errorMessages, context, "移动事件");
    }
}

export class OfficialBlockAreaRotateEvent implements IOfficialBlockAreaRotateEvent, IObjectizable<IOfficialBlockAreaRotateEvent> {
    anchor: [number, number] = [0, 0];
    time = 0;
    easeType = 0;
    rotation = 0;
    readonly errorMessages: string[] = [];

    toObject(): IOfficialBlockAreaRotateEvent {
        return {
            anchor: [...this.anchor] as [number, number],
            time: this.time,
            easeType: this.easeType,
            rotation: this.rotation
        };
    }

    constructor(event: unknown, readonly context = "旋转事件") {
        if (!isObject(event)) {
            this.errorMessages.push(`${context}：旋转事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的旋转事件。`);
            return;
        }

        const source = asRecord(event)!;
        this.anchor = readCoordinate(source, "anchor", this.errorMessages, context, "旋转事件", [0, 0]);
        this.time = readRequiredNumber(source, "time", 0, this.errorMessages, context, "旋转事件");
        this.easeType = readOptionalNumber(source, "easeType", 0, this.errorMessages, context, "旋转事件");
        this.rotation = readRequiredNumber(source, "rotation", 0, this.errorMessages, context, "旋转事件");
    }
}

export class OfficialBlockAreaScaleEvent implements IOfficialBlockAreaScaleEvent, IObjectizable<IOfficialBlockAreaScaleEvent> {
    anchor: [number, number] = [0, 0];
    time = 0;
    easeTypeX = 0;
    easeTypeY = 0;
    scale: [number, number] = [1, 1];
    readonly errorMessages: string[] = [];

    toObject(): IOfficialBlockAreaScaleEvent {
        return {
            anchor: [...this.anchor] as [number, number],
            time: this.time,
            easeTypeX: this.easeTypeX,
            easeTypeY: this.easeTypeY,
            scale: [...this.scale] as [number, number]
        };
    }

    constructor(event: unknown, readonly context = "缩放事件") {
        if (!isObject(event)) {
            this.errorMessages.push(`${context}：缩放事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的缩放事件。`);
            return;
        }

        const source = asRecord(event)!;
        this.anchor = readCoordinate(source, "anchor", this.errorMessages, context, "缩放事件", [0, 0]);
        this.time = readRequiredNumber(source, "time", 0, this.errorMessages, context, "缩放事件");
        this.easeTypeX = readOptionalNumber(source, "easeTypeX", 0, this.errorMessages, context, "缩放事件");
        this.easeTypeY = readOptionalNumber(source, "easeTypeY", 0, this.errorMessages, context, "缩放事件");
        this.scale = readCoordinate(source, "scale", this.errorMessages, context, "缩放事件", [1, 1]);
    }
}

export class OfficialBlockArea implements IOfficialBlockArea, IObjectizable<IOfficialBlockArea> {
    topRightPercentage: [number, number] = [1, 1];
    bottomLeftPercentage: [number, number] = [0, 0];
    appearTime = 0;
    enableTime = 0;
    disableTime = 0;
    disappearTime = 0;
    isSubtract = false;
    rotateEvents: OfficialBlockAreaRotateEvent[] = [];
    moveEvents: OfficialBlockAreaMoveEvent[] = [];
    scaleEvents: OfficialBlockAreaScaleEvent[] = [];
    readonly errorMessages: string[] = [];

    toObject(): IOfficialBlockArea {
        return {
            topRightPercentage: [...this.topRightPercentage] as [number, number],
            bottomLeftPercentage: [...this.bottomLeftPercentage] as [number, number],
            appearTime: this.appearTime,
            enableTime: this.enableTime,
            disableTime: this.disableTime,
            disappearTime: this.disappearTime,
            isSubtract: this.isSubtract,
            rotateEvents: this.rotateEvents.map(event => event.toObject()),
            moveEvents: this.moveEvents.map(event => event.toObject()),
            scaleEvents: this.scaleEvents.map(event => event.toObject())
        };
    }

    constructor(blockArea: unknown, readonly context = "噪域") {
        if (!isObject(blockArea)) {
            this.errorMessages.push(`${context}：噪域必须是一个对象，但读取到了 ${blockArea}。将会被视为一个所有值都是默认值的噪域。`);
            return;
        }

        const source = asRecord(blockArea)!;

        this.topRightPercentage = readCoordinate(source, "topRightPercentage", this.errorMessages, context, "噪域", [1, 1]);
        this.bottomLeftPercentage = readCoordinate(source, "bottomLeftPercentage", this.errorMessages, context, "噪域", [0, 0]);
        this.appearTime = readRequiredNumber(source, "appearTime", 0, this.errorMessages, context, "噪域");
        this.enableTime = readRequiredNumber(source, "enableTime", 0, this.errorMessages, context, "噪域");
        this.disableTime = readRequiredNumber(source, "disableTime", 0, this.errorMessages, context, "噪域");
        this.disappearTime = readRequiredNumber(source, "disappearTime", 0, this.errorMessages, context, "噪域");
        this.isSubtract = readOptionalBoolean(source, "isSubtract", false, this.errorMessages, context, "噪域");

        // 旋转事件
        const rotateEvents = readArrayField(source, "rotateEvents", this.errorMessages, context, "噪域");
        if (rotateEvents) {
            rotateEvents.forEach((event, i) => {
                const newEvent = new OfficialBlockAreaRotateEvent(event, `${context} rotateEvents[${i}]`);
                this.rotateEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }

        // 移动事件
        const moveEvents = readArrayField(source, "moveEvents", this.errorMessages, context, "噪域");
        if (moveEvents) {
            moveEvents.forEach((event, i) => {
                const newEvent = new OfficialBlockAreaMoveEvent(event, `${context} moveEvents[${i}]`);
                this.moveEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }

        // 缩放事件
        const scaleEvents = readArrayField(source, "scaleEvents", this.errorMessages, context, "噪域");
        if (scaleEvents) {
            scaleEvents.forEach((event, i) => {
                const newEvent = new OfficialBlockAreaScaleEvent(event, `${context} scaleEvents[${i}]`);
                this.scaleEvents.push(newEvent);
                this.errorMessages.push(...newEvent.errorMessages);
            });
        }
    }
}
