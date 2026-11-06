/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isObject, isNumber, isString, isArray, clamp } from "lodash";
import { Point } from "@/tools/mathUtils";
import MathUtils from "@/tools/mathUtils";
import { Beats, BPM, beatsCompare, beatsToSeconds, makeSureBeatsValid } from "./beats";
import { IEvent, NumberEvent, findLastEventIndex, interpolateNumberEventValue } from "./event";
import { isArrayOfNumbers } from "@/tools/typeTools";
import { IObjectizable } from "../objectizable";
import { insert } from "@/tools/algorithm";
import { TimeSegment } from "./timeSegment";
import { getBlockAreaCorners } from "@/tools/blockAreaGeometry";
import type { Pair } from "polygon-clipping";

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
 * 缩放中心 / 旋转中心（锚点）是事件自带的 anchor 字段，不是单独的事件类型。
 */
export type BlockAreaEventType = "moveX" | "moveY" | "rotate" | "scaleX" | "scaleY";

/** 噪域事件所在的“事件层”标识，仅用于生成事件 id */
export const BLOCK_AREA_EVENT_LAYER_ID = "blockArea";

/**
 * 噪域编辑区右侧的 6 栏事件，顺序与界面上的显示顺序一致。
 *
 * 其中 activeIntervals 是激活区间（不是普通的事件），其余 5 栏与噪域的事件一一对应。
 */
export const blockAreaEventTracks = [
    "activeIntervals",
    "moveXEvents",
    "moveYEvents",
    "rotateEvents",
    "scaleXEvents",
    "scaleYEvents"
] as const;
export type BlockAreaEventTrack = typeof blockAreaEventTracks[number];

/** 除激活区间以外的事件栏，即真正存有 NumberEvent 的那些栏 */
export type BlockAreaNumberEventTrack = Exclude<BlockAreaEventTrack, "activeIntervals">;

/** 由事件栏得到事件类型。激活区间没有事件类型，返回 null */
export function getBlockAreaEventTypeOfTrack(track: BlockAreaEventTrack): BlockAreaEventType | null {
    switch (track) {
        case "moveXEvents": return "moveX";
        case "moveYEvents": return "moveY";
        case "rotateEvents": return "rotate";
        case "scaleXEvents": return "scaleX";
        case "scaleYEvents": return "scaleY";
        default: return null;
    }
}

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

    /** 控制噪域中心点的X坐标 */
    moveXEvents: IEvent<number>[]

    /** 控制噪域中心点的Y坐标 */
    moveYEvents: IEvent<number>[]

    /** 控制噪域的旋转 */
    rotateEvents: IEvent<number>[]

    /** 控制噪域宽度的缩放比例 */
    scaleXEvents: IEvent<number>[]

    /** 控制噪域高度的缩放比例 */
    scaleYEvents: IEvent<number>[]

    /** 右上角坐标 */
    topRight: Point
}

/** 撤销、重做时保留的事件标识和编号分配状态 */
export type BlockAreaEventState = Record<BlockAreaEventType, {
    nextNumber: number
    identities: Pick<NumberEvent, "id" | "eventNumber">[]
}>;

/** 噪域解析时需要的额外参数 */
export interface BlockAreaExtendedOptions {
    BPMList: BPM[]
    index: number
    eventState?: BlockAreaEventState
}

/** 激活区间解析时需要的额外参数 */
export interface ActiveIntervalOptions {

    /** 用于把拍数换算成秒数 */
    BPMList: BPM[]

    /** 出错信息中的上下文，例如“第0个噪域 activeIntervals[1]” */
    context?: string
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
        const identity = options.eventState?.[type].identities[i];
        const newEvent = new NumberEvent(event, {
            judgeLineNumber: options.index,
            eventLayerId: BLOCK_AREA_EVENT_LAYER_ID,
            eventNumber: identity?.eventNumber ?? i,
            id: identity?.id,
            type,
            BPMList: options.BPMList
        });
        insert(events, newEvent, (x, y) => beatsCompare(x.startTime, y.startTime));
        newEvent.sortedArray = events;
        errors.push(...newEvent.errorMessages);
    });

    return events;
}

export class ActiveInterval extends TimeSegment implements IActiveInterval, IObjectizable<IActiveInterval> {
    readyFlash = DEFAULT_READY_FLASH;
    readonly errorMessages: string[] = [];

    /** 此激活区间所属的噪域。由噪域在创建时写入，方便从激活区间反查噪域 */
    owner: BlockArea | null = null;

    readonly BPMList: BPM[];
    cachedStartSeconds = 0;
    cachedEndSeconds = 0;

    toObject(): IActiveInterval {
        return {
            startTime: [...this.startTime] as Beats,
            endTime: [...this.endTime] as Beats,
            readyFlash: this.readyFlash
        };
    }

    constructor(interval: unknown, readonly options: ActiveIntervalOptions) {
        super();
        this.BPMList = options.BPMList;
        const context = options.context ?? "激活区间";

        if (!isObject(interval)) {
            this.errorMessages.push(`${context}：激活区间必须是一个对象，但读取到了 ${interval}。将会被视为一个所有值都是默认值的激活区间。`);
            this.startTime = [...DEFAULT_BEATS] as Beats;
            this.endTime = [...DEFAULT_BEATS] as Beats;
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
    private _appearTime: Beats = [...DEFAULT_BEATS] as Beats;
    private _disappearTime: Beats = [...DEFAULT_BEATS] as Beats;
    bottomLeft: Point = { ...DEFAULT_POINT };
    editorPositionX = DEFAULT_EDITOR_POSITION_X;
    isInvert = false;
    moveXEvents: NumberEvent[] = [];
    moveYEvents: NumberEvent[] = [];
    rotateEvents: NumberEvent[] = [];
    scaleXEvents: NumberEvent[] = [];
    scaleYEvents: NumberEvent[] = [];
    topRight: Point = { ...DEFAULT_POINT };
    readonly errorMessages: string[] = [];

    readonly BPMList: BPM[];

    /** 出现时间对应的秒数缓存，仅在 appearTime / disappearTime 被修改或 BPM 列表变化时重新计算 */
    cachedStartSeconds = 0;

    /** 消失时间对应的秒数缓存，仅在 appearTime / disappearTime 被修改或 BPM 列表变化时重新计算 */
    cachedEndSeconds = 0;

    get appearTime() {
        return this._appearTime;
    }
    set appearTime(beats: Beats) {
        this._appearTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get disappearTime() {
        return this._disappearTime;
    }
    set disappearTime(beats: Beats) {
        this._disappearTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }

    /** 重新计算出现 / 消失时间的秒数缓存 */
    calculateSeconds() {
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this._appearTime);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this._disappearTime);
    }

    /**
     * 噪域编号。
     *
     * 这个编号用于生成噪域事件的 id，必须在噪域的生命周期内保持不变，
     * 因此删除其他噪域时不会重新编号（噪域在列表中的位置请用 blockAreaList 的下标）。
     */
    readonly index: number;

    /** 该噪域的所有事件 */
    getAllEvents() {
        return [
            ...this.moveXEvents,
            ...this.moveYEvents,
            ...this.rotateEvents,
            ...this.scaleXEvents,
            ...this.scaleYEvents
        ];
    }

    /** 各类型事件的下一个编号，用于生成不重复的事件 id */
    private readonly eventNumbers: Record<BlockAreaEventType, number> = {
        moveX: 0,
        moveY: 0,
        rotate: 0,
        scaleX: 0,
        scaleY: 0
    };

    /** 事件标识只供历史记录使用，导出的谱面不包含这些字段 */
    getEventState(): BlockAreaEventState {
        const capture = (type: BlockAreaEventType) => ({
            nextNumber: this.eventNumbers[type],
            identities: this.getEventsByType(type).map(({ id, eventNumber }) => ({ id, eventNumber }))
        });
        return {
            moveX: capture("moveX"),
            moveY: capture("moveY"),
            rotate: capture("rotate"),
            scaleX: capture("scaleX"),
            scaleY: capture("scaleY")
        };
    }

    /** 获取某一类型的事件列表 */
    getEventsByType(type: BlockAreaEventType): NumberEvent[] {
        switch (type) {
            case "moveX": return this.moveXEvents;
            case "moveY": return this.moveYEvents;
            case "rotate": return this.rotateEvents;
            case "scaleX": return this.scaleXEvents;
            case "scaleY": return this.scaleYEvents;
        }
    }

    /** 获取某一栏的事件列表。激活区间的类型与事件不同，返回的是 ActiveInterval[] */
    getEventsOfTrack(track: BlockAreaEventTrack): NumberEvent[] | ActiveInterval[] {
        if (track === "activeIntervals") {
            return this.activeIntervals;
        }

        return this.getEventsByType(getBlockAreaEventTypeOfTrack(track)!);
    }

    /** 所有事件的数量 */
    get numOfEvents() {
        return this.getAllEvents().length;
    }

    /** 添加一个事件，返回被添加的事件 */
    addEvent(event: unknown, type: BlockAreaEventType, id?: string): NumberEvent {
        const events = this.getEventsByType(type);
        const newEvent = new NumberEvent(event, {
            judgeLineNumber: this.index,
            eventLayerId: BLOCK_AREA_EVENT_LAYER_ID,
            eventNumber: this.eventNumbers[type]++,
            type,
            BPMList: this.BPMList,
            id
        });
        insert(events, newEvent, (x, y) => beatsCompare(x.startTime, y.startTime));
        newEvent.sortedArray = events;
        this.errorMessages.push(...newEvent.errorMessages);
        return newEvent;
    }

    /** 添加一个激活区间，返回被添加的激活区间 */
    addActiveInterval(interval: unknown, context = "激活区间"): ActiveInterval {
        const newInterval = new ActiveInterval(interval, { BPMList: this.BPMList, context });
        newInterval.owner = this;
        insert(this.activeIntervals, newInterval, (x, y) => beatsCompare(x.startTime, y.startTime));
        newInterval.sortedArray = this.activeIntervals;
        this.errorMessages.push(...newInterval.errorMessages);
        return newInterval;
    }

    /** 在指定位置插入一个激活区间（撤销删除时使用），返回被插入的激活区间 */
    insertActiveInterval(interval: unknown, position: number, context = "激活区间"): ActiveInterval {
        const newInterval = new ActiveInterval(interval, { BPMList: this.BPMList, context });
        newInterval.owner = this;
        this.activeIntervals.splice(clamp(position, 0, this.activeIntervals.length), 0, newInterval);
        newInterval.sortedArray = this.activeIntervals;
        this.errorMessages.push(...newInterval.errorMessages);
        return newInterval;
    }

    /** 删除一个激活区间 */
    removeActiveInterval(interval: ActiveInterval) {
        const index = this.activeIntervals.indexOf(interval);
        if (index !== -1) {
            this.activeIntervals.splice(index, 1);
            interval.owner = null;
        }
    }

    /** 确保消失时间不早于出现时间 */
    makeSureTimeValid() {
        if (beatsCompare(this.appearTime, this.disappearTime) > 0) {
            const appearTime = this.appearTime;
            this.appearTime = this.disappearTime;
            this.disappearTime = appearTime;
        }
    }

    /** 当前时间是否处于某个激活区间内（即噪域此刻是否生效） */
    isActiveAt(seconds: number) {
        return this.cachedStartSeconds <= seconds && seconds <= this.cachedEndSeconds &&
            this.activeIntervals.some(interval =>
                interval.cachedStartSeconds <= seconds && seconds <= interval.cachedEndSeconds);
    }

    /**
     * 计算噪域在某一时刻的四个角，使用谱面坐标系（y 轴向上）。
     *
     * 变换模型与渲染器一致：以基准矩形中心为支点缩放、旋转，
     * 中心沿各事件的 anchor 驱动的轨迹运动，最后叠加移动事件的偏移。
     *
     * @returns 依次为左上、右上、右下、左下的四个角
     */
    getCornersAt(seconds: number): Pair[] {
        const center = this.getCenter();

        return getBlockAreaCorners({
            seconds,
            baseCenter: [center.x, center.y],
            halfSize: [
                Math.abs(this.topRight.x - this.bottomLeft.x) / 2,
                Math.abs(this.topRight.y - this.bottomLeft.y) / 2
            ],
            position: [
                this.sampleEventValue(this.moveXEvents, seconds, center.x),
                this.sampleEventValue(this.moveYEvents, seconds, center.y)
            ],
            radians: MathUtils.degToRad(this.sampleEventValue(this.rotateEvents, seconds, 0)),
            scale: [
                this.sampleEventValue(this.scaleXEvents, seconds, 1),
                this.sampleEventValue(this.scaleYEvents, seconds, 1)
            ],
            scaleXEvents: this.scaleXEvents,
            scaleYEvents: this.scaleYEvents,
            rotateEvents: this.rotateEvents,
            sample: interpolateNumberEventValue,
            findEventIndex: findLastEventIndex
        });
    }

    /** 采样某一条事件通道在某一时刻的值，没有生效的事件时使用 fallback */
    private sampleEventValue(events: NumberEvent[], seconds: number, fallback: number) {
        const event = events[findLastEventIndex(events, seconds)];
        return event ? interpolateNumberEventValue(event, seconds) : fallback;
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
                const newInterval = new ActiveInterval(interval, {
                    BPMList: this.BPMList,
                    context: `${context} activeIntervals[${i}]`
                });
                newInterval.owner = this;

                // 按开始时间有序插入。谱面文件里的激活区间不保证有序，而编辑区显示和
                // 撤销/重做的位置记录都依赖数组顺序，读取时统一维护为按时间有序
                insert(this.activeIntervals, newInterval, (x, y) => beatsCompare(x.startTime, y.startTime));
                newInterval.sortedArray = this.activeIntervals;
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

        // 缩放 / 旋转需要支点。RPE 标准把锚点写在事件的 anchor 字段上（Point 格式 { x, y }），
        // 而没有该字段的谱面（早期谱面、手写谱面）按「绕噪域中心缩放、旋转」处理，与加入 anchor 字段之前的行为一致。
        // 这里把中心直接写进事件，这样保存出去的谱面带有显式锚点，重新打开时结果不会变。
        const center = this.getCenter();
        for (const event of [...this.rotateEvents, ...this.scaleXEvents, ...this.scaleYEvents]) {
            if (event.anchor === undefined) {
                event.anchor = { x: center.x, y: center.y };
            }
        }

        for (const track of blockAreaEventTracks) {
            const type = getBlockAreaEventTypeOfTrack(track);
            if (type) {
                this.eventNumbers[type] = options.eventState?.[type].nextNumber ?? this.getEventsByType(type).length;
            }
        }
    }

    /** 噪域的中心，即 bottomLeft 与 topRight 的中点。也是事件没有 anchor 时的默认锚点 */
    getCenter(): Point {
        return {
            x: (this.bottomLeft.x + this.topRight.x) / 2,
            y: (this.bottomLeft.y + this.topRight.y) / 2
        };
    }
}
