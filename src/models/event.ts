import { BEZIER_POINTS_LENGTH, BezierPoints, cubicBezierEase, easingFuncs, EasingType, isEasingType } from "./easing";
import { Beats, getBeatsValue, beatsToSeconds, makeSureBeatsValid, BPM, addBeats, isGreaterThanBeats, isLessThanBeats, isLessThanOrEqualBeats, isGreaterThanOrEqualBeats } from "./beats";
import { isArrayOfNumbers } from "../tools/typeTools";
import { RGBcolor } from "../tools/color";
import { isObject, isNumber, isString, isInteger, isArray, zip } from "lodash";
import { checkAndSort } from "@/tools/algorithm";
import ChartError from "./error";
import { Note } from "./note";
import { ITimeSegment } from "./timeSegment";
import { IObjectizable } from "./objectizable";
import { isNumberOrVector, ShaderName, ShaderNumberType } from "./effect";
export type NoteOrEvent = Note | NumberEvent | ColorEvent | TextEvent;
export interface IEvent<T> {
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
    linkgroup?: number;

    /** 事件是否被禁用 */
    isDisabled?: boolean;
}
interface EventOptions {
    judgeLineNumber: number;
    eventLayerId: string;
    eventNumber: number;
    BPMList: BPM[];
    type: string;
    id?: string;
}
export enum Bezier {
    On = 1,
    Off = 0
}
export function isBezier(value: unknown): value is Bezier {
    return value === Bezier.On || value === Bezier.Off;
}
export const eventTypes = ["moveX", "moveY", "rotate", "alpha", "speed", "scaleX", "scaleY", "color", "paint", "text"] as const;
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
    "linkgroup"
] as const;
export abstract class EventLike<T = unknown> implements IEvent<T> {
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
    isDisabled: boolean = false;
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this._endTime;
    }
    set startTime(beats: Beats) {
        this._startTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    set endTime(beats: Beats) {
        this._endTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }

    /** 缓存的开始时间，以秒为单位 */
    abstract cachedStartSeconds: number;

    /** 缓存的结束时间，以秒为单位 */
    abstract cachedEndSeconds: number;

    /** BPM列表，引用chart.BPMList，方便计算秒数用 */
    abstract readonly BPMList: BPM[];

    calculateSeconds() {
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this.startTime);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this.endTime);
    }
}
export abstract class AbstractEvent<T = unknown> extends EventLike<T> implements IObjectizable, ITimeSegment {
    cachedStartSeconds: number;
    cachedEndSeconds: number;

    readonly BPMList: BPM[];

    /** 事件的唯一标识符，比如"0-1-moveX-2" 表示第0号判定线上第1层的2号moveX事件 */
    readonly id: string;

    /** 事件所在的判定线编号 */
    judgeLineNumber: number;

    /** 事件类型 */
    type: string;

    /** 事件层级号，普通事件的层级号是数字（比如"0"，但仍然是字符串类型），特殊事件的层级号是字符"X" */
    eventLayerId: string;

    readonly errors: ChartError[] = [];

    /** 确保endTime大于startTime */
    makeSureTimeValid() {
        if (getBeatsValue(this.startTime) > getBeatsValue(this.endTime)) {
            const a = this.startTime, b = this.endTime;
            this.startTime = b;
            this.endTime = a;
        }
        else if (getBeatsValue(this.startTime) === getBeatsValue(this.endTime)) {
            this.endTime = addBeats(this.endTime, [0, 0, 1]);
        }
    }
    get easingLeftRight() {
        return [this.easingLeft, this.easingRight];
    }
    set easingLeftRight(easingLeftRight: [number, number]) {
        [this.easingLeft, this.easingRight] = easingLeftRight;
    }
    get durationBeats() {
        return getBeatsValue(this.endTime) - getBeatsValue(this.startTime);
    }
    calculateSeconds() {
        const startSeconds = beatsToSeconds(this.BPMList, this.startTime);
        const endSeconds = beatsToSeconds(this.BPMList, this.endTime);
        this.cachedStartSeconds = startSeconds;
        this.cachedEndSeconds = endSeconds;
    }
    toObject(): IEvent<T> {
        return {
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
    }
    isOverlapped(element: NoteOrEvent, overlapWhenEqual = false) {
        return overlapWhenEqual ?
            isLessThanOrEqualBeats(element.startTime, this.endTime) && isGreaterThanOrEqualBeats(element.endTime, this.startTime) :
            isLessThanBeats(element.startTime, this.endTime) && isGreaterThanBeats(element.endTime, this.startTime);
    }
    constructor(event: unknown, options: EventOptions) {
        super();
        this.judgeLineNumber = options.judgeLineNumber;
        this.eventLayerId = options.eventLayerId;
        this.type = options.type;
        this.id = options.id ?? `${options.judgeLineNumber}-${options.eventLayerId}-${options.type}-${options.eventNumber}`;

        if (isObject(event)) {
            // bezier
            if ("bezier" in event) {
                if (isBezier(event.bezier)) {
                    this.bezier = event.bezier;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 bezier 属性必须是 0 或 1，但读取到了 ${event.bezier}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 bezier 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // bezierPoints
            if ("bezierPoints" in event) {
                if (isArrayOfNumbers(event.bezierPoints, BEZIER_POINTS_LENGTH)) {
                    this.bezierPoints = [...event.bezierPoints];
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 bezierPoints 属性必须是包含4个数字的数组，但读取到了 ${JSON.stringify(event.bezierPoints)}。将会被替换为默认值 [0, 0, 0, 0]。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 bezierPoints 属性。将会被设为默认值 [0, 0, 1, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // easingLeft and easingRight
            if ("easingLeft" in event && "easingRight" in event) {
                if (isNumber(event.easingLeft) && isNumber(event.easingRight)) {
                    if (event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                        this.easingLeft = event.easingLeft;
                        this.easingRight = event.easingRight;
                    }
                    else {
                        this.errors.push(new ChartError(
                            `${this.id}：事件的 easingLeft 和 easingRight 属性必须满足 0 <= easingLeft < easingRight <= 1，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被替换为默认值 0 和 1。`,
                            "ChartReadError.OutOfRange",
                            "error",
                            this as NumberEvent | ColorEvent | TextEvent
                        ));
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 easingLeft 和 easingRight 属性必须是数字，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被替换为默认值 0 和 1。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 easingLeft 或 easingRight 属性。将会被设为默认值 0 和 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // easingType
            if ("easingType" in event) {
                if (isEasingType(event.easingType)) {
                    this.easingType = event.easingType;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 easingType 属性必须是 1 到 29 之间的整数，但读取到了 ${event.easingType}。将会被替换为默认值 1（线性缓动）。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 easingType 属性。将会被设为默认值 1（线性缓动）。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // startTime
            if ("startTime" in event) {
                if (isArrayOfNumbers(event.startTime, 3)) {
                    this._startTime = makeSureBeatsValid(event.startTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 startTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.startTime)}。将会被替换为默认值 [0, 0, 1]。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 startTime 属性。将会被设为默认值 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // endTime
            if ("endTime" in event) {
                if (isArrayOfNumbers(event.endTime, 3)) {
                    this._endTime = makeSureBeatsValid(event.endTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 endTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.endTime)}。将会被替换为 startTime 的值。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                    this._endTime = [...this._startTime];
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 endTime 属性。将会被设为 startTime 的值。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
                this._endTime = [...this._startTime];
            }

            // linkgroup
            if ("linkgroup" in event) {
                if (isNumber(event.linkgroup) && Number.isInteger(event.linkgroup)) {
                    this.linkgroup = event.linkgroup;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 linkgroup 属性必须是整数，但读取到了 ${event.linkgroup}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：事件缺少 linkgroup 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this as NumberEvent | ColorEvent | TextEvent
                ));
            }

            // isDisabled
            if ("isDisabled" in event) {
                if (typeof event.isDisabled === "boolean") {
                    this.isDisabled = event.isDisabled;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：事件的 isDisabled 属性必须是布尔值，但读取到了 ${event.isDisabled}。将会被替换为 false。`,
                        "ChartReadError.TypeError",
                        "error",
                        this as NumberEvent | ColorEvent | TextEvent
                    ));
                }
            }
            else {
                // this.errors.push(new ChartError(
                //     `${this.id}：事件缺少 isDisabled 属性。将会被设为 false。`,
                //     "ChartReadError.MissingProperty",
                //     "error",
                // ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}：事件必须是一个对象，但读取到了 ${event}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
                this as NumberEvent | ColorEvent | TextEvent
            ));
        }

        this.BPMList = options.BPMList;
        this.cachedStartSeconds = beatsToSeconds(options.BPMList, this._startTime);
        this.cachedEndSeconds = beatsToSeconds(options.BPMList, this._endTime);
    }
}
export class NumberEvent extends AbstractEvent<number> {
    start: number = 0;
    end: number = 0;
    constructor(event: unknown, options: EventOptions) {
        super(event, options);
        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isNumber(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 start 属性必须是数字，但读取到了 ${event.start}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 start 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            // end
            if ("end" in event) {
                if (isNumber(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 end 属性必须是数字，但读取到了 ${event.end}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 end 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}：${this.type}事件必须是一个对象，但读取到了 ${event}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
                this
            ));
        }
    }
}
export class ColorEvent extends AbstractEvent<RGBcolor> {
    start: RGBcolor = [255, 255, 255];
    end: RGBcolor = [255, 255, 255];
    toObject() {
        const obj = super.toObject();
        obj.start = [...this.start];
        obj.end = [...this.end];
        return obj;
    }
    constructor(event: unknown, options: EventOptions) {
        super(event, options);
        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isArrayOfNumbers(event.start, 3)) {
                    this.start = [...event.start];
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 start 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.start)}。将会被替换为默认值 [255, 255, 255]。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 start 属性。将会被设为默认值 [255, 255, 255]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            // end
            if ("end" in event) {
                if (isArrayOfNumbers(event.end, 3)) {
                    this.end = [...event.end];
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 end 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.end)}。将会被替换为默认值 [255, 255, 255]。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 end 属性。将会被设为默认值 [255, 255, 255]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}：${this.type}事件必须是一个对象，但读取到了 ${event}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
                this
            ));
        }
    }
}
export class TextEvent extends AbstractEvent<string> {
    start: string = "";
    end: string = "";
    constructor(event: unknown, options: EventOptions) {
        super(event, options);

        if (isObject(event)) {
            // start
            if ("start" in event) {
                if (isString(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 start 属性必须是字符串，但读取到了 ${event.start}。将会被替换为空字符串。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 start 属性。将会被设为空字符串。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }

            // end
            if ("end" in event) {
                if (isString(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}：${this.type}事件的 end 属性必须是字符串，但读取到了 ${event.end}。将会被替换为空字符串。`,
                        "ChartReadError.TypeError",
                        "error",
                        this
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}：${this.type}事件缺少 end 属性。将会被设为空字符串。`,
                    "ChartReadError.MissingProperty",
                    "error",
                    this
                ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}：${this.type}事件必须是一个对象，但读取到了 ${event}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
                this
            ));
        }
    }
}

interface ShaderEventOptions {
    BPMList: BPM[];
    shader: ShaderName;
    varName: string;
    eventNumber: number;
}

/** ShaderVariableEvent 只是结构与事件相像，但并没有真正的判定线编号、所属事件层级、事件 id 等属性，也不能被历史记录，所以继承 EventLike 而不是 AbstractEvent */
export class ShaderVariableEvent extends EventLike<ShaderNumberType> {
    start: ShaderNumberType = 0;
    end: ShaderNumberType = 0;
    readonly errors: ChartError[] = [];
    BPMList: BPM[];
    shader: string;
    varName: string;
    eventNumber: number;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    toObject(): IEvent<ShaderNumberType> {
        return {
            start: this.start,
            end: this.end,
            bezier: this.bezier,
            bezierPoints: this.bezierPoints,
            startTime: [...this.startTime],
            endTime: [...this.endTime],
            easingType: this.easingType,
            easingLeft: this.easingLeft,
            easingRight: this.easingRight,
        };
    }
    _startTime: Beats = [0, 0, 1];
    _endTime: Beats = [0, 0, 1];
    get startTime() {
        return this._startTime;
    }
    set startTime(beats: Beats) {
        this._startTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get endTime() {
        return this._endTime;
    }
    set endTime(beats: Beats) {
        this._endTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    constructor(event: unknown, options: ShaderEventOptions) {
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
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 bezier 属性必须是 0 或 1，但读取到了 ${event.bezier}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 bezier 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                ));
            }

            // bezierPoints
            if ("bezierPoints" in event) {
                if (isArrayOfNumbers(event.bezierPoints, BEZIER_POINTS_LENGTH)) {
                    this.bezierPoints = [...event.bezierPoints];
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 bezierPoints 属性必须是包含4个数字的数组，但读取到了 ${JSON.stringify(event.bezierPoints)}。将会被替换为默认值 [0, 0, 0, 0]。`,
                        "ChartReadError.TypeError",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 bezierPoints 属性。将会被设为默认值 [0, 0, 1, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error",
                ));
            }

            // easingLeft and easingRight
            if ("easingLeft" in event && "easingRight" in event) {
                if (isNumber(event.easingLeft) && isNumber(event.easingRight)) {
                    if (event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                        this.easingLeft = event.easingLeft;
                        this.easingRight = event.easingRight;
                    }
                    else {
                        this.errors.push(new ChartError(
                            `shader变量事件：事件的 easingLeft 和 easingRight 属性必须满足 0 <= easingLeft < easingRight <= 1，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被替换为默认值 0 和 1。`,
                            "ChartReadError.OutOfRange",
                            "error",
                        ));
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 easingLeft 和 easingRight 属性必须是数字，但读取到了 easingLeft=${event.easingLeft}, easingRight=${event.easingRight}。将会被替换为默认值 0 和 1。`,
                        "ChartReadError.TypeError",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 easingLeft 或 easingRight 属性。将会被设为默认值 0 和 1。`,
                    "ChartReadError.MissingProperty",
                    "error",
                ));
            }

            // easingType
            if ("easingType" in event) {
                if (isEasingType(event.easingType)) {
                    this.easingType = event.easingType;
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 easingType 属性必须是 1 到 29 之间的整数，但读取到了 ${event.easingType}。将会被替换为默认值 1（线性缓动）。`,
                        "ChartReadError.TypeError",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 easingType 属性。将会被设为默认值 1（线性缓动）。`,
                    "ChartReadError.MissingProperty",
                    "error",

                ));
            }

            // startTime
            if ("startTime" in event) {
                if (isArrayOfNumbers(event.startTime, 3)) {
                    this._startTime = makeSureBeatsValid(event.startTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 startTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.startTime)}。将会被替换为默认值 [0, 0, 1]。`,
                        "ChartReadError.TypeError",
                        "error",

                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 startTime 属性。将会被设为默认值 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error",

                ));
            }

            // endTime
            if ("endTime" in event) {
                if (isArrayOfNumbers(event.endTime, 3)) {
                    this._endTime = makeSureBeatsValid(event.endTime);
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 endTime 属性必须是包含3个数字的数组，但读取到了 ${JSON.stringify(event.endTime)}。将会被替换为 startTime 的值。`,
                        "ChartReadError.TypeError",
                        "error",

                    ));
                    this._endTime = [...this._startTime];
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 endTime 属性。将会被设为 startTime 的值。`,
                    "ChartReadError.MissingProperty",
                    "error",

                ));
                this._endTime = [...this._startTime];
            }

            if ("start" in event) {
                if (isNumberOrVector(event.start)) {
                    this.start = event.start;
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 start 值必须是数字或矢量，但读取到了 ${event.start}。将会被设为 0。`,
                        "ChartReadError.MissingProperty",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 start 值。将会被设为 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                ));
            }

            if ("end" in event) {
                if (isNumberOrVector(event.end)) {
                    this.end = event.end;
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 end 值必须是数字或矢量，但读取到了 ${event.end}。将会被设为 0。`,
                        "ChartReadError.MissingProperty",
                        "error",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 end 值。将会被设为 0。`,
                    "ChartReadError.MissingProperty",
                    "error",
                ));
            }

            // linkgroup
            if ("linkgroup" in event) {
                if (isNumber(event.linkgroup) && Number.isInteger(event.linkgroup)) {
                    this.linkgroup = event.linkgroup;
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 linkgroup 属性必须是整数，但读取到了 ${event.linkgroup}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError",
                        "error",

                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `shader变量事件：事件缺少 linkgroup 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty",
                    "error",

                ));
            }

            // isDisabled
            if ("isDisabled" in event) {
                if (typeof event.isDisabled === "boolean") {
                    this.isDisabled = event.isDisabled;
                }
                else {
                    this.errors.push(new ChartError(
                        `shader变量事件：事件的 isDisabled 属性必须是布尔值，但读取到了 ${event.isDisabled}。将会被替换为 false。`,
                        "ChartReadError.TypeError",
                        "error",

                    ));
                }
            }
            else {
                // this.errors.push(new ChartError(
                //     `shader变量事件：事件缺少 isDisabled 属性。将会被设为 false。`,
                //     "ChartReadError.MissingProperty",
                //     "error",
                // ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `shader变量事件：事件必须是一个对象，但读取到了 ${event}。将会使用默认值。`,
                "ChartReadError.TypeError",
                "error",
            ));
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
            });

            const easingFactor = easingFunction(sx / dx);
            return start + easingFactor * dy;
        }
        else {
            throw new Error(`无法处理的起始和结束值：${start} 和 ${end}`);
        }
    }
}

/**
 * 找到开始时间不大于seconds的最大的事件。若不存在，返回null。
 */
export function findLastEvent<T extends { isDisabled: boolean } & ITimeSegment>(events: T[], seconds: number): T | null {
    // // Filter valid events and sort by cachedStartSeconds
    // const validEvents = events.filter(event =>
    //     !event.isDisabled &&
    //     typeof event.cachedStartSeconds === 'number' &&
    //     event.cachedStartSeconds <= seconds
    // );
    // Sort by cachedStartSeconds in ascending order
    checkAndSort(events, (a, b) => a.cachedStartSeconds - b.cachedStartSeconds);

    const validEvents = events.filter(event => !event.isDisabled);

    if (validEvents.length === 0) {
        return null;
    }

    // Binary search for the last event with start time <= seconds
    let left = 0;
    let right = validEvents.length - 1;
    let resultIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (validEvents[mid].cachedStartSeconds <= seconds) {
            resultIndex = mid;
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }

    return resultIndex !== -1 ? validEvents[resultIndex] : null;
}