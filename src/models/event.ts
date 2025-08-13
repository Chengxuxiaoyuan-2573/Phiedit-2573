import { cubicBezierEase, easingFuncs, EasingType } from "./easing";
import { Beats, getBeatsValue, beatsToSeconds, validateBeats, BPM, addBeats } from "./beats"
import { isArrayOfNumbers } from "../tools/typeCheck";
import { RGBcolor } from "../tools/color";
import { isObject, isNumber, isString } from "lodash";
import { checkAndSort } from "@/tools/algorithm";
export type BezierPoints = [number, number, number, number]
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
    linkgroup: number;
    isDisabled: boolean;
}
interface EventOptions {
    judgeLineNumber: number;
    eventLayerId: string;
    eventNumber: number;
    BPMList: BPM[];
    type: string;
    id?: string;
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
export abstract class BaseEvent<T = unknown> implements IEvent<T> {
    bezier: 0 | 1 = 0;
    bezierPoints: BezierPoints = [0, 0, 0, 0];
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract start: T;
    abstract end: T;
    _startTime: Beats = [0, 0, 1]
    _endTime: Beats = [0, 0, 1]
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    readonly BPMList: BPM[];
    /** 事件的唯一标识符，比如"0-layer0-moveX0" 表示第0号判定线上第0层的0号moveX事件 */
    readonly id: string
    judgeLineNumber: number;
    type: string;
    /** 事件层级号，普通事件的层级号是数字（比如"0"，但仍然是字符串类型），特殊事件的层级号是字符"X" */
    eventLayerId: string;
    isDisabled: boolean = false;
    linkgroup = 0;
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this._endTime;
    }
    set startTime(beats: Beats) {
        this._startTime = validateBeats(beats);
        this.calculateSeconds();
    }
    set endTime(beats: Beats) {
        this._endTime = validateBeats(beats);
        this.calculateSeconds();
    }
    validateTime() {
        if (getBeatsValue(this.startTime) > getBeatsValue(this.endTime)) {
            const a = this.startTime, b = this.endTime;
            this.startTime = b;
            this.endTime = a;
        }
        else if (getBeatsValue(this.startTime) == getBeatsValue(this.endTime)) {
            this.endTime = addBeats(this.endTime, [0, 0, 1]); // 确保endTime大于startTime
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
        }
    }
    constructor(event: unknown, options: EventOptions) {
        this.judgeLineNumber = options.judgeLineNumber;
        this.eventLayerId = options.eventLayerId;
        this.type = options.type;
        this.id = options.id ?? `${options.judgeLineNumber}-${options.eventLayerId}-${options.type}-${options.eventNumber}`;
        if (isObject(event)) {
            if ("bezier" in event)
                this.bezier = event.bezier ? 1 : 0;
            if ("bezierPoints" in event && isArrayOfNumbers(event.bezierPoints, 4))
                this.bezierPoints = event.bezierPoints;
            if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                this.easingLeft = event.easingLeft;
                this.easingRight = event.easingRight;
            }
            if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                this.easingType = event.easingType as EasingType;
            if ("startTime" in event && isArrayOfNumbers(event.startTime, 3))
                this._startTime = [...event.startTime];
            if ("endTime" in event && isArrayOfNumbers(event.endTime, 3))
                this._endTime = [...event.endTime];
            else
                this._endTime = [...this._startTime];
        }
        this.BPMList = options.BPMList;
        this.cachedStartSeconds = beatsToSeconds(options.BPMList, this._startTime);
        this.cachedEndSeconds = beatsToSeconds(options.BPMList, this._endTime);
    }
}
export class NumberEvent extends BaseEvent<number> {
    start: number = 0;
    end: number = 0;
    constructor(event: unknown, options: EventOptions) {
        super(event, options);
        if (isObject(event)) {
            if ("start" in event && isNumber(event.start))
                this.start = event.start;
            if ("end" in event && isNumber(event.end))
                this.end = event.end;
        }
    }
}
export class ColorEvent extends BaseEvent<RGBcolor> {
    start: RGBcolor = [128, 128, 255];
    end: RGBcolor = [128, 128, 255];
    toObject() {
        const obj = super.toObject();
        obj.start = [...this.start];
        obj.end = [...this.end];
        return obj;
    }
    constructor(event: unknown, options: EventOptions) {
        super(event, options);
        if (isObject(event)) {
            if ("start" in event && isArrayOfNumbers(event.start, 3))
                this.start = [...event.start];
            if ("end" in event && isArrayOfNumbers(event.end, 3))
                this.end = [...event.end];
        }
    }
}
export class TextEvent extends BaseEvent<string> {
    start: string = "";
    end: string = "";
    constructor(event: unknown, options: EventOptions) {
        super(event, options);
        if (isObject(event)) {
            if ("start" in event && isString(event.start))
                this.start = event.start;
            if ("end" in event && isString(event.end))
                this.end = event.end;
        }
    }
}
type S = {
    cachedStartSeconds: number,
    cachedEndSeconds: number,
}
export function interpolateNumberEventValue(event: IEvent<number> & S | null, seconds: number) {
    const startSeconds = event?.cachedStartSeconds ?? 0;
    const endSeconds = event?.cachedEndSeconds ?? 0;
    const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = 0, end = 0, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1 } = event ?? {};
    if (endSeconds <= seconds) {
        return end;
    }
    else {
        const dx = endSeconds - startSeconds;
        const dy = end - start;
        const sx = seconds - startSeconds;
        const easingFunction = bezier ?
            cubicBezierEase(...bezierPoints) :
            (time: number) => {
                const left = easingLeft;
                const right = easingRight;
                const func = easingFuncs[easingType];
                const start = func(left);
                const end = func(right);
                const deltaX = right - left;
                const deltaY = end - start;

                return (func(time * deltaX + left) - start) / deltaY;
            }

        const easingFactor = easingFunction(sx / dx);
        return start + easingFactor * dy;
    }
}
export function interpolateColorEventValue(event: ColorEvent | null, seconds: number): RGBcolor {
    const defaultColor: RGBcolor = [0xff, 0xec, 0x9f];
    const endSeconds = event?.cachedEndSeconds ?? 0;
    const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = defaultColor, end = defaultColor, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1, startTime = [0, 0, 1], endTime = [0, 0, 1] } = event ?? {};
    const _interpolate = (part: 0 | 1 | 2) => {
        if (!event) return 127;
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
            cachedStartSeconds: beatsToSeconds(event.BPMList, event.startTime),
            cachedEndSeconds: beatsToSeconds(event.BPMList, event.endTime),
            linkgroup: 0,
            isDisabled: false,
        };
        return interpolateNumberEventValue(e, seconds);
    }
    if (endSeconds <= seconds) {
        return end;
    }
    else {
        return [
            _interpolate(0),
            _interpolate(1),
            _interpolate(2)
        ];
    }
}
export function interpolateTextEventValue(event: TextEvent | null, seconds: number) {
    const endSeconds = event?.cachedEndSeconds ?? 0;
    const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = undefined, end = undefined, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1, startTime = [0, 0, 1], endTime = [0, 0, 1] } = event ?? {};
    if (endSeconds <= seconds) {
        return end;
    }
    else {
        if (start == undefined || end == undefined || event == null) return undefined;
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
                cachedStartSeconds: beatsToSeconds(event.BPMList, event.startTime),
                cachedEndSeconds: beatsToSeconds(event.BPMList, event.endTime),
                linkgroup: 0,
                isDisabled: false,
            };
            const length = Math.round(interpolateNumberEventValue(e, seconds));
            return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
        }
        return start;
    }
}
export function findLastEvent<T extends BaseEvent>(events: T[], seconds: number): T | null {

    // // Filter valid events and sort by cachedStartSeconds
    // const validEvents = events.filter(event => 
    //     !event.isDisabled && 
    //     typeof event.cachedStartSeconds === 'number' && 
    //     event.cachedStartSeconds <= seconds
    // );
    const validEvents = events.filter(event => !event.isDisabled);

    if (validEvents.length === 0) {
        return null;
    }

    // Sort by cachedStartSeconds in ascending order
    checkAndSort(validEvents, (a, b) => a.cachedStartSeconds - b.cachedStartSeconds);

    // Binary search for the last event with start time <= seconds
    let left = 0;
    let right = validEvents.length - 1;
    let resultIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (validEvents[mid].cachedStartSeconds <= seconds) {
            resultIndex = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return resultIndex !== -1 ? validEvents[resultIndex] : null;
}