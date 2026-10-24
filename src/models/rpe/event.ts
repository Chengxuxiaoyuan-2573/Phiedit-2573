/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { BEZIER_POINTS_LENGTH, BezierPoints, cubicBezierEase, easingFuncs, EasingType, isEasingType } from "./easing";
import { Beats, beatsToSeconds, makeSureBeatsValid, BPM } from "./beats";
import { isArrayOfNumbers, Optional } from "../../tools/typeTools";
import { RGBcolor } from "../../tools/color";
import { isObject, isNumber, isString, isInteger, isArray, zip } from "lodash";
import { ITimeSegment, TimeSegment } from "./timeSegment";
import { IObjectizable } from "../objectizable";
import { isNumberOrVector, ShaderName, ShaderNumberType } from "./effect";
import { checkAndSort } from "../../tools/algorithm";
import type { Point } from "../../tools/mathUtils";
export interface IEvent<T = unknown> {
    bezier: 0 | 1;
    bezierPoints: BezierPoints;
    easingLeft: number;
    easingRight: number;
    easingType: EasingType;
    start: T;
    end: T;
    startTime: Beats;
    endTime: Beats;

    /** 暂时无用且不可编辑，RPE中代表事件的绑定组 */
    linkgroup: number;

    /**
     * 事件的锚点，即缩放 / 旋转的支点（噪域使用）。图片事件中代表图片的锚点
     *
     * 为可选字段：RPE 标准里只有缩放 / 旋转事件会写它，其余事件没有该字段。
     * 噪域事件省略时，缩放 / 旋转以噪域中心为支点。
     */
    anchor?: Point;

    /** 事件是否被禁用 */
    isDisabled: boolean;
}
export interface IEventExtendedOptions {
    judgeLineNumber: number;
    eventLayerId: string;
    eventNumber: number;
    BPMList: BPM[];
    type: EventType;
    id: string;
}
interface IEventIdentifier {
    readonly isEvent: true
}

/** 锚点（{ x, y }）包含的数字个数 */
const ANCHOR_LENGTH = 2;

/**
 * 读取事件的 anchor 字段。
 *
 * RPE 标准中事件自带 anchor，噪域用它表示缩放 / 旋转的支点，格式为 { x, y }（Point）。
 * 兼容写成 [x, y] 数组的旧谱面，读取后统一存成 Point。
 */
function readEventAnchor(value: unknown): Point | undefined {
    if (isArrayOfNumbers(value, ANCHOR_LENGTH)) {
        return { x: value[0], y: value[1] };
    }

    if (isObject(value) && isNumber((value as Record<string, unknown>).x) && isNumber((value as Record<string, unknown>).y)) {
        const point = value as Point;
        return { x: point.x, y: point.y };
    }

    return undefined;
}

export enum Bezier {
    On = 1,
    Off = 0
}
export function isBezier(value: unknown): value is Bezier {
    return value === Bezier.On || value === Bezier.Off;
}

export function isEvent(value: unknown): value is AbstractEvent {
    if (!isObject(value)) {
        return false;
    }
    return "isEvent" in value;
}

export function isNumberEvent(value: unknown): value is NumberEvent {
    if (!isObject(value)) {
        return false;
    }
    return "isNumberEvent" in value;
}

export function isColorEvent(value: unknown): value is ColorEvent {
    if (!isObject(value)) {
        return false;
    }
    return "isColorEvent" in value;
}

export function isTextEvent(value: unknown): value is TextEvent {
    if (!isObject(value)) {
        return false;
    }
    return "isTextEvent" in value;
}

// 缩放中心 / 旋转中心（锚点）使用 RPE 事件自带的 anchor 字段表示，不需要额外的事件类型
export const eventTypes = [
    "moveX", "moveY", "rotate", "alpha", "speed", "scaleX", "scaleY", "color", "paint", "text", "incline"
] as const;
type EventType = typeof eventTypes[number];
export const eventAttributes = [
    "bezier",
    "bezierPoints",
    "easingLeft",
    "easingRight",
    "easingType",
    "start",
    "end",
    "startTime",
    "endTime",
    "linkgroup",
    "anchor"
] as const;
export abstract class AbstractEvent<T = unknown> extends TimeSegment implements IObjectizable<IEvent<T>>, IEventExtendedOptions, IEventIdentifier {
    bezier: Bezier = Bezier.Off;
    bezierPoints: BezierPoints = [0, 0, 1, 1];
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract start: T;
    abstract end: T;
    _startTime: Beats = [0, 0, 1];
    _endTime: Beats = [0, 0, 1];
    linkgroup = 0;

    /** 事件的锚点，即缩放 / 旋转的支点（噪域使用）。没有该字段时由噪域按中心补上 */
    anchor?: Point;
    isDisabled: boolean = false;

    cachedStartSeconds: number;
    cachedEndSeconds: number;

    readonly BPMList: BPM[];

    /** 事件的唯一标识符，比如"0-1-moveX-2" 表示第0号判定线上第1层的2号moveX事件 */
    readonly id: string;

    /** 事件所在的判定线编号 */
    judgeLineNumber: number;

    /** 事件层级号，普通事件的层级号是数字（比如"0"，但仍然是字符串类型），特殊事件的层级号是字符"X" */
    eventLayerId: string;

    /** 事件类型 */
    type: EventType;

    /** 事件编号 */
    eventNumber: number;

    readonly errorMessages: string[] = [];
    readonly isEvent = true;
    toObject(): IEvent<T> {
        const event: IEvent<T> = {
            bezier: this.bezier,
            bezierPoints: [...this.bezierPoints],
            easingLeft: this.easingLeft,
            easingRight: this.easingRight,
            easingType: this.easingType,
            start: this.start,
            end: this.end,
            startTime: [...this.startTime],
            endTime: [...this.endTime],
            linkgroup: this.linkgroup,
            isDisabled: this.isDisabled,
        };

        // 只有带锚点的事件（噪域的缩放 / 旋转事件）才写出 anchor，避免污染其它事件
        if (this.anchor) {
            event.anchor = { x: this.anchor.x, y: this.anchor.y };
        }
        return event;
    }
    constructor(event: unknown, options: Optional<IEventExtendedOptions, "id">) {
        super();
        this.judgeLineNumber = options.judgeLineNumber;
        this.eventLayerId = options.eventLayerId;
        this.type = options.type;
        this.eventNumber = options.eventNumber;
        this.id = options.id ?? `${options.judgeLineNumber}-${options.eventLayerId}-${options.type}-${options.eventNumber}`;

        if (isObject(event)) {
            // bezier
            if ("bezier" in event) {
                if (isBezier(event.bezier)) {
                    this.bezier = event.bezier;
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 bezier 属性必须是 0 或 1，但读取到了 ${event.bezier}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 bezier 属性。将会被设为默认值 0。`);
            }

            // bezierPoints
            if ("bezierPoints" in event) {
                if (isArrayOfNumbers(event.bezierPoints, BEZIER_POINTS_LENGTH)) {
                    this.bezierPoints = [...event.bezierPoints];
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 bezierPoints 属性必须是包含4个数字的数组，但读取到了 ${JSON.stringify(event.bezierPoints)}。将会被设为默认值 [0, 0, 1, 1]。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 bezierPoints 属性。将会被设为默认值 [0, 0, 1, 1]。`);
            }

            // easingLeft and easingRight
            if ("easingLeft" in event && "easingRight" in event) {
                if (isNumber(event.easingLeft) && isNumber(event.easingRight)) {
                    if (event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                        this.easingLeft = event.easingLeft;
                        this.easingRight = event.easingRight;
                    }
                    else {
                        this.errorMessages.push(`${this.id}：事件的 easingLeft 和 easingRight 属性必须满足 0 <= easingLeft < easingRight <= 1，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被设为默认值 0 和 1。`);
                    }
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 easingLeft 和 easingRight 属性必须是数字，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被设为默认值 0 和 1。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 easingLeft 或 easingRight 属性。将会被设为默认值 0 和 1。`);
            }

            // easingType
            if ("easingType" in event) {
                if (isEasingType(event.easingType)) {
                    this.easingType = event.easingType;
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 easingType 属性必须是 1 到 29 之间的整数，但读取到了 ${event.easingType}。将会被设为默认值 1（线性缓动）。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 easingType 属性。将会被设为默认值 1（线性缓动）。`);
            }

            // startTime
            if ("startTime" in event) {
                if (isArrayOfNumbers(event.startTime, 3)) {
                    this._startTime = makeSureBeatsValid(event.startTime);
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 startTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.startTime)}。将会被设为默认值 [0, 0, 1]。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 startTime 属性。将会被设为默认值 [0, 0, 1]。`);
            }

            // endTime
            if ("endTime" in event) {
                if (isArrayOfNumbers(event.endTime, 3)) {
                    this._endTime = makeSureBeatsValid(event.endTime);
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 endTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.endTime)}。将会被设为 startTime 的值。`);
                    this._endTime = [...this._startTime];
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 endTime 属性。将会被设为 startTime 的值。`);
                this._endTime = [...this._startTime];
            }

            // linkgroup
            if ("linkgroup" in event) {
                if (isNumber(event.linkgroup) && Number.isInteger(event.linkgroup)) {
                    this.linkgroup = event.linkgroup;
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 linkgroup 属性必须是整数，但读取到了 ${event.linkgroup}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：事件缺少 linkgroup 属性。将会被设为默认值 0。`);
            }

            // anchor
            // 只有缩放 / 旋转事件会用到锚点，其余事件缺失该字段属于正常情况，此时保持为 undefined
            if ("anchor" in event) {
                this.anchor = readEventAnchor(event.anchor);
            }

            // isDisabled
            if ("isDisabled" in event) {
                if (typeof event.isDisabled === "boolean") {
                    this.isDisabled = event.isDisabled;
                }
                else {
                    this.errorMessages.push(`${this.id}：事件的 isDisabled 属性必须是布尔值，但读取到了 ${event.isDisabled}。将会被设为默认值 false。`);
                }
            }
            else {
                // this.errors.push(`${this.id}：事件缺少 isDisabled 属性。将会被设为默认值 false。`);
            }
        }
        else {
            this.errorMessages.push(`${this.id}：事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的事件。`);
        }

        this.BPMList = options.BPMList;
        this.cachedStartSeconds = beatsToSeconds(options.BPMList, this._startTime);
        this.cachedEndSeconds = beatsToSeconds(options.BPMList, this._endTime);
    }
}
export class NumberEvent extends AbstractEvent<number> {
    start: number = 0;
    end: number = 0;
    type: "moveX" | "moveY" | "rotate" | "alpha" | "speed" | "scaleX" | "scaleY" | "paint" | "incline";
    readonly isNumberEvent = true;

    /**
     * 速度事件的累计位移缓存（只有 speed 事件会被写入）。
     * 存在事件对象自身而不是按下标对齐的并行数组上，
     * 这样即使列表顺序在缓存计算之后发生了变化，也不会出现缓存值与事件错位的问题。
     */
    cachedSpeedQZH?: number;
    constructor(event: unknown, options: Optional<IEventExtendedOptions, "id">) {
        super(event, options);
        if (options.type === "color" || options.type === "text") {
            throw new Error("NumberEvent 的类型不能是 color 或 text");
        }
        else {
            this.type = options.type;
        }

        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isNumber(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 start 属性必须是数字，但读取到了 ${event.start}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 start 属性。将会被设为默认值 0。`);
            }

            // end
            if ("end" in event) {
                if (isNumber(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 end 属性必须是数字，但读取到了 ${event.end}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 end 属性。将会被设为默认值 0。`);
            }
        }
    }
}
export class ColorEvent extends AbstractEvent<RGBcolor> {
    start: RGBcolor = [255, 255, 255];
    end: RGBcolor = [255, 255, 255];
    type: "color";
    readonly isColorEvent = true;
    toObject() {
        const obj = super.toObject();
        obj.start = this.start.map(Math.round) as RGBcolor;
        obj.end = this.end.map(Math.round) as RGBcolor;
        return obj;
    }
    constructor(event: unknown, options: Optional<IEventExtendedOptions, "id">) {
        super(event, options);
        if (options.type !== "color") {
            throw new Error("ColorEvent 的类型必须为 color");
        }
        else {
            this.type = options.type;
        }

        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isArrayOfNumbers(event.start, 3)) {
                    this.start = [...event.start];
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 start 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.start)}。将会被设为默认值 [255, 255, 255]。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 start 属性。将会被设为默认值 [255, 255, 255]。`);
            }

            // end
            if ("end" in event) {
                if (isArrayOfNumbers(event.end, 3)) {
                    this.end = [...event.end];
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 end 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.end)}。将会被设为默认值 [255, 255, 255]。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 end 属性。将会被设为默认值 [255, 255, 255]。`);
            }
        }
    }
}
export class TextEvent extends AbstractEvent<string> {
    start: string = "";
    end: string = "";
    type: "text";
    readonly isTextEvent = true;
    constructor(event: unknown, options: Optional<IEventExtendedOptions, "id">) {
        super(event, options);
        if (options.type !== "text") {
            throw new Error("TextEvent 的类型必须为 text");
        }
        else {
            this.type = options.type;
        }

        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isString(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 start 属性必须是字符串，但读取到了 ${event.start}。将会被设为空字符串。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 start 属性。将会被设为空字符串。`);
            }

            // end
            if ("end" in event) {
                if (isString(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errorMessages.push(`${this.id}：${this.type}事件的 end 属性必须是字符串，但读取到了 ${event.end}。将会被设为空字符串。`);
                }
            }
            else {
                this.errorMessages.push(`${this.id}：${this.type}事件缺少 end 属性。将会被设为空字符串。`);
            }
        }
    }
}

interface ShaderEventExtendedOptions {
    BPMList: BPM[];
    shader: ShaderName;
    varName: string;
    eventNumber: number;
}

export class ShaderVariableEvent extends TimeSegment implements IEvent<ShaderNumberType>, ShaderEventExtendedOptions, IObjectizable<IEvent<ShaderNumberType>> {
    bezier: Bezier = Bezier.Off;
    bezierPoints: BezierPoints = [0, 0, 1, 1];
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    start: ShaderNumberType = 0;
    end: ShaderNumberType = 0;
    _startTime: Beats = [0, 0, 1];
    _endTime: Beats = [0, 0, 1];
    linkgroup = 0;

    /** 事件自带的锚点字段。shader 变量事件没有噪域那样的缩放 / 旋转支点，固定为 undefined */
    anchor?: Point;
    isDisabled: boolean = false;

    readonly errorMessages: string[] = [];
    BPMList: BPM[];
    shader: ShaderName;
    varName: string;
    eventNumber: number;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    toObject(): IEvent<ShaderNumberType> {
        const event: IEvent<ShaderNumberType> = {
            start: this.start,
            end: this.end,
            bezier: this.bezier,
            bezierPoints: this.bezierPoints,
            startTime: [...this.startTime],
            endTime: [...this.endTime],
            easingType: this.easingType,
            easingLeft: this.easingLeft,
            easingRight: this.easingRight,
            linkgroup: this.linkgroup,
            isDisabled: this.isDisabled,
        };

        if (this.anchor) {
            event.anchor = { x: this.anchor.x, y: this.anchor.y };
        }
        return event;
    }
    constructor(event: unknown, options: ShaderEventExtendedOptions) {
        super();
        this.BPMList = options.BPMList;
        this.shader = options.shader;
        this.varName = options.varName;
        this.eventNumber = options.eventNumber;
        if (isObject(event)) {
            // bezier
            if ("bezier" in event) {
                if (isBezier(event.bezier)) {
                    this.bezier = event.bezier;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 bezier 属性必须是 0 或 1，但读取到了 ${event.bezier}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 bezier 属性。将会被设为默认值 0。`);
            }

            // bezierPoints
            if ("bezierPoints" in event) {
                if (isArrayOfNumbers(event.bezierPoints, BEZIER_POINTS_LENGTH)) {
                    this.bezierPoints = [...event.bezierPoints];
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 bezierPoints 属性必须是包含4个数字的数组，但读取到了 ${JSON.stringify(event.bezierPoints)}。将会被设为默认值 [0, 0, 0, 0]。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 bezierPoints 属性。将会被设为默认值 [0, 0, 1, 1]。`);
            }

            // easingLeft and easingRight
            if ("easingLeft" in event && "easingRight" in event) {
                if (isNumber(event.easingLeft) && isNumber(event.easingRight)) {
                    if (event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                        this.easingLeft = event.easingLeft;
                        this.easingRight = event.easingRight;
                    }
                    else {
                        this.errorMessages.push(`shader变量事件：事件的 easingLeft 和 easingRight 属性必须满足 0 <= easingLeft < easingRight <= 1，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被设为默认值 0 和 1。`);
                    }
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 easingLeft 和 easingRight 属性必须是数字，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被设为默认值 0 和 1。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 easingLeft 或 easingRight 属性。将会被设为默认值 0 和 1。`);
            }

            // easingType
            if ("easingType" in event) {
                if (isEasingType(event.easingType)) {
                    this.easingType = event.easingType;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 easingType 属性必须是 1 到 29 之间的整数，但读取到了 ${event.easingType}。将会被设为默认值 1（线性缓动）。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 easingType 属性。将会被设为默认值 1（线性缓动）。`);
            }

            // startTime
            if ("startTime" in event) {
                if (isArrayOfNumbers(event.startTime, 3)) {
                    this._startTime = makeSureBeatsValid(event.startTime);
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 startTime 属性必须是一个含有 3 个数的数组，但读取到了 ${JSON.stringify(event.startTime)}。将会被设为默认值 [0, 0, 1]。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 startTime 属性。将会被设为默认值 [0, 0, 1]。`);
            }

            // endTime
            if ("endTime" in event) {
                if (isArrayOfNumbers(event.endTime, 3)) {
                    this._endTime = makeSureBeatsValid(event.endTime);
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 endTime 属性必须是一个含有 3 个数的数组，但读取到了 ${JSON.stringify(event.endTime)}。将会被设为 startTime 的值。`);
                    this._endTime = [...this._startTime];
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 endTime 属性。将会被设为 startTime 的值。`);
                this._endTime = [...this._startTime];
            }

            if ("start" in event) {
                if (isNumberOrVector(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 start 值必须是数字或矢量，但读取到了 ${event.start}。将会被设为 0。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 start 值。将会被设为 0。`);
            }

            if ("end" in event) {
                if (isNumberOrVector(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 end 值必须是数字或矢量，但读取到了 ${event.end}。将会被设为 0。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 end 值。将会被设为 0。`);
            }

            // linkgroup
            if ("linkgroup" in event) {
                if (isNumber(event.linkgroup) && Number.isInteger(event.linkgroup)) {
                    this.linkgroup = event.linkgroup;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 linkgroup 属性必须是整数，但读取到了 ${event.linkgroup}。将会被设为默认值 0。`);
                }
            }
            else {
                this.errorMessages.push(`shader变量事件：事件缺少 linkgroup 属性。将会被设为默认值 0。`);
            }

            // isDisabled
            if ("isDisabled" in event) {
                if (typeof event.isDisabled === "boolean") {
                    this.isDisabled = event.isDisabled;
                }
                else {
                    this.errorMessages.push(`shader变量事件：事件的 isDisabled 属性必须是布尔值，但读取到了 ${event.isDisabled}。将会被设为默认值 false。`);
                }
            }
            else {
                // this.errors.push(new ChartError(`shader变量事件：事件缺少 isDisabled 属性。将会被设为默认值 false。`);
            }
        }
        else {
            this.errorMessages.push(`shader变量事件：事件必须是一个对象，但读取到了 ${event}。将会被视为一个所有值都是默认值的事件。`);
        }

        this.BPMList = options.BPMList;
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this.startTime);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this.endTime);
    }
}
export function getEasingFunctionOfNumberEvent(event: IEvent<number>) {
    return event.bezier ?
        cubicBezierEase(event.bezierPoints) :
        (time: number) => {
            const left = event.easingLeft;
            const right = event.easingRight;
            const func = easingFuncs[event.easingType];
            const start = func(left);
            const end = func(right);
            const deltaX = right - left;
            const deltaY = end - start;

            return (func(time * deltaX + left) - start) / deltaY;
        };
}

export function interpolateNumberEventValue(event: IEvent<number> & ITimeSegment, seconds: number) {
    const startSeconds = event.cachedStartSeconds;
    const endSeconds = event.cachedEndSeconds;
    const { start, end } = event;
    if (endSeconds <= seconds) {
        return end;
    }
    else if (startSeconds >= seconds) {
        return start;
    }
    else {
        const dx = endSeconds - startSeconds;
        const dy = end - start;
        const sx = seconds - startSeconds;
        const easingFunction = getEasingFunctionOfNumberEvent(event);

        const easingFactor = easingFunction(sx / dx);
        return start + easingFactor * dy;
    }
}

export function interpolateColorEventValue(event: IEvent<RGBcolor> & ITimeSegment, seconds: number): RGBcolor {
    const startSeconds = event.cachedStartSeconds;
    const endSeconds = event.cachedEndSeconds;
    const { bezier, bezierPoints, start, end, easingType, easingLeft, easingRight, startTime, endTime } = event;
    const _interpolate = (part: 0 | 1 | 2) => {
        const e = {
            bezier,
            bezierPoints: [...bezierPoints] as BezierPoints,
            start: start[part],
            end: end[part],
            easingType,
            easingLeft,
            easingRight,
            startTime,
            endTime,
            cachedStartSeconds: event.cachedStartSeconds,
            cachedEndSeconds: event.cachedEndSeconds,
            linkgroup: 0,
            isDisabled: false,
        };
        return interpolateNumberEventValue(e, seconds);
    };

    if (endSeconds <= seconds) {
        return end;
    }
    else if (startSeconds >= seconds) {
        return start;
    }
    else {
        return [
            _interpolate(0),
            _interpolate(1),
            _interpolate(2)
        ];
    }
}

export function interpolateTextEventValue(event: IEvent<string> & ITimeSegment, seconds: number) {
    const startSeconds = event.cachedStartSeconds;
    const endSeconds = event.cachedEndSeconds;
    const { bezier, bezierPoints, start, end, easingType, easingLeft, easingRight, startTime, endTime } = event;
    if (endSeconds <= seconds) {
        return end.replace("%P%", "");
    }
    else if (startSeconds >= seconds) {
        return start.replace("%P%", "");
    }
    else {
        if (start.startsWith(end) || end.startsWith(start)) {
            const lengthStart = start.length;
            const lengthEnd = end.length;
            const e = {
                startTime,
                endTime,
                easingType,
                easingLeft,
                easingRight,
                bezier,
                bezierPoints: [...bezierPoints] as BezierPoints,
                start: lengthStart,
                end: lengthEnd,
                cachedStartSeconds: event.cachedStartSeconds,
                cachedEndSeconds: event.cachedEndSeconds,
                linkgroup: 0,
                isDisabled: false,
            };
            const length = Math.round(interpolateNumberEventValue(e, seconds));
            return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
        }
        else if (start.includes("%P%") || end.includes("%P%")) {
            const startNumber = parseFloat(start.replace("%P%", ""));
            const endNumber = parseFloat(end.replace("%P%", ""));
            const e = {
                startTime,
                endTime,
                easingType,
                easingLeft,
                easingRight,
                bezier,
                bezierPoints: [...bezierPoints] as BezierPoints,
                start: startNumber,
                end: endNumber,
                cachedStartSeconds: event.cachedStartSeconds,
                cachedEndSeconds: event.cachedEndSeconds,
                linkgroup: 0,
                isDisabled: false,
            };
            const number = interpolateNumberEventValue(e, seconds);
            return isInteger(startNumber) && isInteger(endNumber) ? number.toFixed(0) : number.toFixed(3);
        }
        return start;
    }
}

export function interpolateShaderVariableEventValue(event: IEvent<ShaderNumberType> & ITimeSegment, seconds: number) {
    const startSeconds = event.cachedStartSeconds;
    const endSeconds = event.cachedEndSeconds;
    const { start, end, startTime, endTime, bezier, bezierPoints, easingType, easingLeft, easingRight } = event;
    if (endSeconds <= seconds) {
        return end;
    }
    else if (startSeconds >= seconds) {
        return start;
    }
    else {
        if (isArray(start) && isArray(end)) {
            return zip(start, end).map(([startNum, endNum]) => {
                return interpolateNumberEventValue({
                    startTime,
                    endTime,
                    easingType,
                    easingLeft,
                    easingRight,
                    bezier,
                    bezierPoints: [...bezierPoints],
                    start: startNum!,
                    end: endNum!,
                    cachedStartSeconds: startSeconds,
                    cachedEndSeconds: endSeconds,
                    linkgroup: 0,
                    isDisabled: false,
                }, seconds);
            }) as Exclude<ShaderNumberType, number>;
        }
        else if (isNumber(start) && isNumber(end)) {
            const dx = endSeconds - startSeconds;
            const dy = end - start;
            const sx = seconds - startSeconds;
            const easingFunction = getEasingFunctionOfNumberEvent({
                startTime,
                endTime,
                easingType,
                easingLeft,
                easingRight,
                bezier,
                bezierPoints: [...bezierPoints],
                start,
                end,
                linkgroup: 0,
                isDisabled: false,
            });

            const easingFactor = easingFunction(sx / dx);
            return start + easingFactor * dy;
        }
        else {
            throw new Error(`无法处理的起始和结束值：${start} 和 ${end}`);
        }
    }
}

/** 找到开始时间不大于seconds的最大的事件。若不存在，返回null。*/
export function findLastEventIndex<T extends { isDisabled: boolean } & ITimeSegment>(events: T[], seconds: number): number {
    // 防御性维护：一旦列表因为任何路径失去有序性，在这里修正，保证二分查找结果正确
    checkAndSort(events, (a, b) => a.cachedStartSeconds - b.cachedStartSeconds);

    // 筛选所有未被禁用的事件
    const validEvents = events.map((event, i) => ({ event, i })).filter(event => !event.event.isDisabled);

    if (validEvents.length === 0) {
        return -1;
    }

    // 二分查找
    let left = 0;
    let right = validEvents.length - 1;
    let resultIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (validEvents[mid].event.cachedStartSeconds <= seconds) {
            resultIndex = mid;
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }

    if (resultIndex === -1) {
        return -1;
    }

    return validEvents[resultIndex].i;
}