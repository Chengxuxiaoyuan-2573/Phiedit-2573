import { EasingType } from "./easing";
import { Beats, getBeatsValue, beatsToSeconds, validateBeats, BPM, formatBeats, parseBeats } from "./beats"
import { isArrayOfNumbers } from "../tools/typeCheck";
import { RGBcolor } from "./color";
import { isObject, isNumber, isString } from "lodash";
type BezierPoints = [number, number, number, number]
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
}
export abstract class BaseEvent<T = unknown> implements IEvent<T> {
    bezier: 0 | 1 = 0;
    bezierPoints: BezierPoints = [0, 0, 1, 1];
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract start: T;
    abstract end: T;
    _startTime: Beats = [0, 0, 1]
    _endTime: Beats = [0, 0, 1]
    abstract type?: string;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    BPMList: BPM[];
    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this._endTime;
    }
    set startTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        this._startTime = beats;
        if (getBeatsValue(this._startTime) > getBeatsValue(this._endTime)) {
            [this._startTime, this._endTime] = [this._endTime, this._startTime];
        }
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this._startTime);
    }
    set endTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        this._endTime = beats;
        if (getBeatsValue(this._startTime) > getBeatsValue(this._endTime)) {
            [this._startTime, this._endTime] = [this._endTime, this._startTime];
        }
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this._endTime);
    }
    get startString() {
        return formatBeats(this.startTime);
    }
    get endString() {
        return formatBeats(this.endTime);
    }
    set startString(str: string) {
        const beats = validateBeats(parseBeats(str));
        if (beats == null) return;
        this.startTime = beats;
    }
    set endString(str: string) {
        const beats = validateBeats(parseBeats(str));
        if (beats == null) return;
        this.endTime = beats;
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
    calculateSeconds(BPMList: BPM[]) {
        const startSeconds = beatsToSeconds(BPMList, this.startTime);
        const endSeconds = beatsToSeconds(BPMList, this.endTime);
        this.cachedStartSeconds = startSeconds;
        this.cachedEndSeconds = endSeconds;
    }
    toObject(): IEvent<T> {
        return {
            bezier: this.bezier,
            bezierPoints: this.bezierPoints,
            easingLeft: this.easingLeft,
            easingRight: this.easingRight,
            easingType: this.easingType,
            start: this.start,
            end: this.end,
            startTime: this.startTime,
            endTime: this.endTime
        }
    }
    constructor(event: unknown, BPMList: BPM[]) {
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
                this._startTime = event.startTime;
            if ("endTime" in event && isArrayOfNumbers(event.endTime, 3))
                this._endTime = event.endTime;
            else
                this._endTime = this._startTime;
        }
        this.BPMList = BPMList;
        this.cachedStartSeconds = beatsToSeconds(BPMList, this._startTime);
        this.cachedEndSeconds = beatsToSeconds(BPMList, this._endTime);
    }
}
export class NumberEvent<T extends 'moveX' | 'moveY' | 'rotate' | 'alpha' | 'speed' | 'scaleX' | 'scaleY' | 'paint' = 'moveX' | 'moveY' | 'rotate' | 'alpha' | 'speed' | 'scaleX' | 'scaleY' | 'paint'> extends BaseEvent<number> {
    start: number = 0;
    end: number = 0;
    type?: T;
    constructor(event: unknown, BPMList: BPM[], type?: T) {
        super(event, BPMList);
        this.type = type;
        if (isObject(event)) {
            if ("start" in event && isNumber(event.start))
                this.start = event.start;
            if ("end" in event && isNumber(event.end))
                this.end = event.end;
        }
    }
}
export class ColorEvent<T extends 'color' = 'color'> extends BaseEvent<RGBcolor> {
    start: RGBcolor = [128, 128, 255];
    end: RGBcolor = [128, 128, 255];
    type?: T;
    constructor(event: unknown, BPMList: BPM[], type?: T) {
        super(event, BPMList);
        this.type = type;
        if (isObject(event)) {
            if ("start" in event && isArrayOfNumbers(event.start, 3))
                this.start = [event.start[0], event.start[1], event.start[2]];
            if ("end" in event && isArrayOfNumbers(event.end, 3))
                this.end = [event.end[0], event.end[1], event.end[2]];
        }
    }
}
export class TextEvent<T extends 'text' = 'text'> extends BaseEvent<string> {
    start: string = "";
    end: string = "";
    type?: T;
    constructor(event: unknown, BPMList: BPM[], type?: T) {
        super(event, BPMList);
        this.type = type;
        if (isObject(event)) {
            if ("start" in event && isString(event.start))
                this.start = event.start;
            if ("end" in event && isString(event.end))
                this.end = event.end;
        }
    }
}