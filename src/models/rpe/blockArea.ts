/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isObject, isNumber, isString, isArray } from "lodash";
import { Point } from "@/tools/mathUtils";
import { Beats, BPM, beatsCompare, makeSureBeatsValid } from "./beats";
import { IEvent, NumberEvent } from "./event";
import { isArrayOfNumbers } from "@/tools/typeTools";
import { IObjectizable } from "../objectizable";
import { insert } from "@/tools/algorithm";

/** 噪域在激活之前的默认反应（闪烁）时长，单位为秒 */
const DEFAULT_READY_FLASH = 0.5;

/** 噪域的默认名称 */
const DEFAULT_NAME = "噪域";

/** 噪域在编辑器中的默认横向位置 */
const DEFAULT_EDITOR_POSITION_X = 0;

/** 默认的坐标 */
const DEFAULT_POINT: Point = { x: 0, y: 0 };

/** 默认的拍数 */
const DEFAULT_BEATS: Beats = [0, 0, 1];

/** 坐标包含的数字个数 */
const POINT_LENGTH = 2;

/** 拍数包含的数字个数 */
const BEATS_LENGTH = 3;

/**
 * 噪域事件的类型。与 IEventExtendedOptions 中的 type 兼容。
 *
 * 其中 scaleAnchorX / scaleAnchorY 是缩放中心的 X / Y 坐标，rotateAnchorX / rotateAnchorY 是旋转中心的 X / Y 坐标。
 * 这四个通道都缺失时，以噪域的中心作为缩放中心与旋转中心。
 */
export type BlockAreaEventType =
    "moveX" | "moveY" | "rotate" | "scaleX" | "scaleY"
    | "scaleAnchorX" | "scaleAnchorY" | "rotateAnchorX" | "rotateAnchorY";

/** 噪域事件所在的“事件层”标识，仅用于生成事件 id */
const BLOCK_AREA_EVENT_LAYER_ID = "blockArea";

export interface IActiveInterval {

    /** 噪域被激活的时间 */
    startTime: Beats

    /** 噪域被取消激活的时间 */
    endTime: Beats

    /** 噪域被激活之前，给多长的反应时间，默认为0.5，反应时间内噪域将会闪烁以提示 */
    readyFlash: number
}

export interface IBlockArea {

    /** 噪域名称 */
    Name: string

    /** 激活事件，有该事件时说明噪域被激活 */
    activeIntervals: IActiveInterval[]

    /** 出现时间 */
    appearTime: Beats

    /** 左下角坐标 */
    bottomLeft: Point

    /** 消失时间 */
    disappearTime: Beats

    /** 显示在编辑器中时，噪域会被显示在哪里，不影响谱面显示时的效果 */
    editorPositionX: number

    /** 与其他噪域叠加时，是否会让相交的部分变为没有噪域 */
    isInvert: boolean

    /**
     * 控制噪域中心点的X坐标。
     * 事件在接口中使用对象形式（与 IBaseEventLayer 保持一致），在类中使用 NumberEvent
     */
    moveXEvents: IEvent<number>[]

    /** 控制噪域中心点的Y坐标 */
    moveYEvents: IEvent<number>[]

    /** 控制噪域的旋转 */
    rotateEvents: IEvent<number>[]

    /** 控制噪域宽度的缩放比例 */
    scaleXEvents: IEvent<number>[]

    /** 控制噪域高度的缩放比例 */
    scaleYEvents: IEvent<number>[]

    /**
     * 缩放中心的 X 坐标。缩放以该点为支点进行，即该点在缩放前后保持不动。
     * 缺失时以噪域中心（bottomLeft 与 topRight 的中点）为准
     */
    scaleAnchorXEvents: IEvent<number>[]

    /** 缩放中心的 Y 坐标。缺失时以噪域中心为准 */
    scaleAnchorYEvents: IEvent<number>[]

    /** 旋转中心的 X 坐标。旋转以该点为支点进行。缺失时以噪域中心为准 */
    rotateAnchorXEvents: IEvent<number>[]

    /** 旋转中心的 Y 坐标。缺失时以噪域中心为准 */
    rotateAnchorYEvents: IEvent<number>[]

    /** 右上角坐标 */
    topRight: Point
}

/** 噪域解析时需要的额外参数 */
export interface BlockAreaExtendedOptions {
    BPMList: BPM[]
    index: number
}

/** 读取一个数字字段，缺失时静默使用默认值，类型错误时记录错误信息 */
function readNumber(source: Record<string, unknown>, key: string, defaultValue: number, errors: string[], context: string, subject: string): number {
    const value = source[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (isNumber(value)) {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是数字，但读取到了 ${value}。将会被设为默认值 ${defaultValue}。`);
    return defaultValue;
}

/** 读取一个字符串字段，缺失时静默使用默认值，类型错误时记录错误信息 */
function readString(source: Record<string, unknown>, key: string, defaultValue: string, errors: string[], context: string, subject: string): string {
    const value = source[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (isString(value)) {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是字符串，但读取到了 ${value}。将会被设为默认值 "${defaultValue}"。`);
    return defaultValue;
}

/** 读取一个布尔字段，缺失时静默使用默认值，类型错误时记录错误信息 */
function readBoolean(source: Record<string, unknown>, key: string, defaultValue: boolean, errors: string[], context: string, subject: string): boolean {
    const value = source[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (typeof value === "boolean") {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是布尔值，但读取到了 ${value}。将会被设为默认值 ${defaultValue}。`);
    return defaultValue;
}

/** 读取一个拍数字段，缺失时静默使用默认值，类型错误时记录错误信息 */
function readBeats(source: Record<string, unknown>, key: string, defaultValue: Beats, errors: string[], context: string, subject: string): Beats {
    const value = source[key];
    if (value === undefined || value === null) {
        return [...defaultValue] as Beats;
    }

    if (isArrayOfNumbers(value, BEATS_LENGTH)) {
        return makeSureBeatsValid([...value] as Beats);
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是含有 ${BEATS_LENGTH} 个数字的数组，但读取到了 ${JSON.stringify(value)}。将会被设为默认值 [${defaultValue.join(", ")}]。`);
    return [...defaultValue] as Beats;
}

/** 读取一个坐标字段，支持 { x, y } 对象或 [x, y] 数组，缺失时静默使用默认值 */
function readPoint(source: Record<string, unknown>, key: string, defaultValue: Point, errors: string[], context: string, subject: string): Point {
    const value = source[key];
    if (value === undefined || value === null) {
        return { ...defaultValue };
    }

    if (isObject(value) &&
        isNumber((value as Record<string, unknown>).x) &&
        isNumber((value as Record<string, unknown>).y)) {
        const point = value as Point;
        return { x: point.x, y: point.y };
    }

    if (isArrayOfNumbers(value, POINT_LENGTH)) {
        return { x: value[0], y: value[1] };
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是含有 x、y 两个数字的对象或含有 ${POINT_LENGTH} 个数字的数组，但读取到了 ${JSON.stringify(value)}。将会被设为默认值 { x: ${defaultValue.x}, y: ${defaultValue.y} }。`);
    return { ...defaultValue };
}

/** 读取一组噪域事件，缺失时静默返回空数组，类型错误时记录错误信息 */
function readEventArray(
    source: Record<string, unknown>,
    key: string,
    type: BlockAreaEventType,
    options: BlockAreaExtendedOptions,
    errors: string[],
    context: string
): NumberEvent[] {
    const events: NumberEvent[] = [];
    const value = source[key];

    if (value === undefined || value === null) {
        return events;
    }

    if (!isArray(value)) {
        errors.push(`${context}：噪域的 ${key} 属性必须是数组，但读取到了 ${value}。将会被设为空数组。`);
        return events;
    }

    value.forEach((event, i) => {
        const newEvent = new NumberEvent(event, {
            judgeLineNumber: options.index,
            eventLayerId: BLOCK_AREA_EVENT_LAYER_ID,
            eventNumber: i,
            type,
            BPMList: options.BPMList
        });
        insert(events, newEvent, (x, y) => beatsCompare(x.startTime, y.startTime));
        errors.push(...newEvent.errorMessages);
    });

    return events;
}

export class ActiveInterval implements IActiveInterval, IObjectizable<IActiveInterval> {
    startTime: Beats = [...DEFAULT_BEATS] as Beats;
    endTime: Beats = [...DEFAULT_BEATS] as Beats;
    readyFlash = DEFAULT_READY_FLASH;
    readonly errorMessages: string[] = [];

    toObject(): IActiveInterval {
        return {
            startTime: [...this.startTime] as Beats,
            endTime: [...this.endTime] as Beats,
            readyFlash: this.readyFlash
        };
    }

    constructor(interval: unknown, readonly context = "激活区间") {
        if (!isObject(interval)) {
            this.errorMessages.push(`${context}：激活区间必须是一个对象，但读取到了 ${interval}。将会被视为一个所有值都是默认值的激活区间。`);
            return;
        }

        const source = interval as Record<string, unknown>;
        this.startTime = readBeats(source, "startTime", DEFAULT_BEATS, this.errorMessages, context, "激活区间");
        this.endTime = readBeats(source, "endTime", DEFAULT_BEATS, this.errorMessages, context, "激活区间");
        this.readyFlash = readNumber(source, "readyFlash", DEFAULT_READY_FLASH, this.errorMessages, context, "激活区间");
    }
}

export class BlockArea implements IBlockArea, IObjectizable<IBlockArea>, BlockAreaExtendedOptions {
    Name = DEFAULT_NAME;
    activeIntervals: ActiveInterval[] = [];
    appearTime: Beats = [...DEFAULT_BEATS] as Beats;
    bottomLeft: Point = { ...DEFAULT_POINT };
    disappearTime: Beats = [...DEFAULT_BEATS] as Beats;
    editorPositionX = DEFAULT_EDITOR_POSITION_X;
    isInvert = false;
    moveXEvents: NumberEvent[] = [];
    moveYEvents: NumberEvent[] = [];
    rotateEvents: NumberEvent[] = [];
    scaleXEvents: NumberEvent[] = [];
    scaleYEvents: NumberEvent[] = [];
    scaleAnchorXEvents: NumberEvent[] = [];
    scaleAnchorYEvents: NumberEvent[] = [];
    rotateAnchorXEvents: NumberEvent[] = [];
    rotateAnchorYEvents: NumberEvent[] = [];
    topRight: Point = { ...DEFAULT_POINT };
    readonly errorMessages: string[] = [];

    readonly BPMList: BPM[];

    /** 噪域在噪域列表中的编号 */
    readonly index: number;

    /** 该噪域的所有事件 */
    getAllEvents() {
        return [
            ...this.moveXEvents,
            ...this.moveYEvents,
            ...this.rotateEvents,
            ...this.scaleXEvents,
            ...this.scaleYEvents,
            ...this.scaleAnchorXEvents,
            ...this.scaleAnchorYEvents,
            ...this.rotateAnchorXEvents,
            ...this.rotateAnchorYEvents
        ];
    }

    toObject(): IBlockArea {
        return {
            Name: this.Name,
            activeIntervals: this.activeIntervals.map(interval => interval.toObject()),
            appearTime: [...this.appearTime] as Beats,
            bottomLeft: { ...this.bottomLeft },
            disappearTime: [...this.disappearTime] as Beats,
            editorPositionX: this.editorPositionX,
            isInvert: this.isInvert,
            moveXEvents: this.moveXEvents.map(event => event.toObject()),
            moveYEvents: this.moveYEvents.map(event => event.toObject()),
            rotateEvents: this.rotateEvents.map(event => event.toObject()),
            scaleXEvents: this.scaleXEvents.map(event => event.toObject()),
            scaleYEvents: this.scaleYEvents.map(event => event.toObject()),
            scaleAnchorXEvents: this.scaleAnchorXEvents.map(event => event.toObject()),
            scaleAnchorYEvents: this.scaleAnchorYEvents.map(event => event.toObject()),
            rotateAnchorXEvents: this.rotateAnchorXEvents.map(event => event.toObject()),
            rotateAnchorYEvents: this.rotateAnchorYEvents.map(event => event.toObject()),
            topRight: { ...this.topRight }
        };
    }

    constructor(blockArea: unknown, readonly options: BlockAreaExtendedOptions) {
        this.BPMList = options.BPMList;
        this.index = options.index;
        const context = `第${options.index}个噪域`;

        if (!isObject(blockArea)) {
            this.errorMessages.push(`${context}：噪域必须是一个对象，但读取到了 ${blockArea}。将会被视为一个所有值都是默认值的噪域。`);
            return;
        }

        const source = blockArea as Record<string, unknown>;

        this.Name = readString(source, "Name", DEFAULT_NAME, this.errorMessages, context, "噪域");
        this.appearTime = readBeats(source, "appearTime", DEFAULT_BEATS, this.errorMessages, context, "噪域");
        this.disappearTime = readBeats(source, "disappearTime", DEFAULT_BEATS, this.errorMessages, context, "噪域");
        this.bottomLeft = readPoint(source, "bottomLeft", DEFAULT_POINT, this.errorMessages, context, "噪域");
        this.topRight = readPoint(source, "topRight", DEFAULT_POINT, this.errorMessages, context, "噪域");
        this.editorPositionX = readNumber(source, "editorPositionX", DEFAULT_EDITOR_POSITION_X, this.errorMessages, context, "噪域");
        this.isInvert = readBoolean(source, "isInvert", false, this.errorMessages, context, "噪域");

        // 激活区间
        const activeIntervals = source.activeIntervals;
        if (activeIntervals === undefined || activeIntervals === null) {
            // 缺失属于正常情况
        }
        else if (isArray(activeIntervals)) {
            activeIntervals.forEach((interval, i) => {
                const newInterval = new ActiveInterval(interval, `${context} activeIntervals[${i}]`);
                this.activeIntervals.push(newInterval);
                this.errorMessages.push(...newInterval.errorMessages);
            });
        }
        else {
            this.errorMessages.push(`${context}：噪域的 activeIntervals 属性必须是数组，但读取到了 ${activeIntervals}。将会被设为空数组。`);
        }

        // 事件
        this.moveXEvents = readEventArray(source, "moveXEvents", "moveX", options, this.errorMessages, context);
        this.moveYEvents = readEventArray(source, "moveYEvents", "moveY", options, this.errorMessages, context);
        this.rotateEvents = readEventArray(source, "rotateEvents", "rotate", options, this.errorMessages, context);
        this.scaleXEvents = readEventArray(source, "scaleXEvents", "scaleX", options, this.errorMessages, context);
        this.scaleYEvents = readEventArray(source, "scaleYEvents", "scaleY", options, this.errorMessages, context);

        // 缩放中心与旋转中心。缺失时属于正常情况，此时以噪域中心作为中心
        this.scaleAnchorXEvents = readEventArray(source, "scaleAnchorXEvents", "scaleAnchorX", options, this.errorMessages, context);
        this.scaleAnchorYEvents = readEventArray(source, "scaleAnchorYEvents", "scaleAnchorY", options, this.errorMessages, context);
        this.rotateAnchorXEvents = readEventArray(source, "rotateAnchorXEvents", "rotateAnchorX", options, this.errorMessages, context);
        this.rotateAnchorYEvents = readEventArray(source, "rotateAnchorYEvents", "rotateAnchorY", options, this.errorMessages, context);
    }
}
