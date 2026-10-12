/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的噪域（blockArea）。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/blockArea.html
 *
 * 注意：本编辑器暂不支持噪域功能，本类只负责读取并校验噪域的基础字段，
 * 以便统计数量并提示用户，噪域中的事件不会被转换。
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readArrayField, readOptionalBoolean, readCoordinate, readRequiredNumber } from "./helpers";

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

    /** 旋转事件（本编辑器暂不支持，保留原始数据） */
    rotateEvents: unknown[]

    /** 移动事件（本编辑器暂不支持，保留原始数据） */
    moveEvents: unknown[]

    /** 缩放事件（本编辑器暂不支持，保留原始数据） */
    scaleEvents: unknown[]
}

export class OfficialBlockArea implements IOfficialBlockArea, IObjectizable<IOfficialBlockArea> {
    topRightPercentage: [number, number] = [1, 1];
    bottomLeftPercentage: [number, number] = [0, 0];
    appearTime = 0;
    enableTime = 0;
    disableTime = 0;
    disappearTime = 0;
    isSubtract = false;
    rotateEvents: unknown[] = [];
    moveEvents: unknown[] = [];
    scaleEvents: unknown[] = [];
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
            rotateEvents: [...this.rotateEvents],
            moveEvents: [...this.moveEvents],
            scaleEvents: [...this.scaleEvents]
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

        // 噪域中的事件暂不支持转换，这里只做数组类型校验
        this.rotateEvents = readArrayField(source, "rotateEvents", this.errorMessages, context, "噪域") ?? [];
        this.moveEvents = readArrayField(source, "moveEvents", this.errorMessages, context, "噪域") ?? [];
        this.scaleEvents = readArrayField(source, "scaleEvents", this.errorMessages, context, "噪域") ?? [];
    }
}
