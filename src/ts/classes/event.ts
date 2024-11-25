import { getBeatsValue, beatsToSeconds } from "../tools";
import { isObject, isArrayOf4Numbers, isNumber, isArrayOf3Numbers, isString } from "../typeCheck";
import { EasingType, Beats, BPM, RGBcolor } from "../typeDefinitions";
export interface IEvent<T> {
    bezier: boolean;
    bezierPoints: [number, number, number, number];
    easingLeft: number;
    easingRight: number;
    easingType: EasingType;
    start: T;
    end: T;
    startTime: Beats;
    endTime: Beats;
}
export abstract class BaseEvent<T> implements IEvent<T> {
    bezier: boolean = false; // unsupported 
    bezierPoints: [number, number, number, number] = [0, 0, 1, 1]; // unsupported 
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract start: T;
    abstract end: T;
    startTime: Beats = [0, 0, 1];
    endTime: Beats = [1, 0, 1];
    _startSecondsCache: number | undefined = undefined;
    _endSecondsCache: number | undefined = undefined;
    get durationBeats() {
        return getBeatsValue(this.endTime) - getBeatsValue(this.startTime);
    }
    caculateSeconds(BPMList: BPM[]) {
        const startSeconds = this._startSecondsCache || (this._startSecondsCache = beatsToSeconds(BPMList, this.startTime));
        const endSeconds = this._endSecondsCache || (this._endSecondsCache = beatsToSeconds(BPMList, this.endTime));
        return { startSeconds, endSeconds };
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
    constructor(event: unknown) {
        if (isObject(event)) {
            if ("bezier" in event)
                this.bezier = event.bezier == 1;
            if ("bezierPoints" in event && isArrayOf4Numbers(event.bezierPoints) && event.bezierPoints.length == 4)
                this.bezierPoints = event.bezierPoints;
            if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                this.easingLeft = event.easingLeft;
                this.easingRight = event.easingRight;
            }
            if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                this.easingType = event.easingType as EasingType;
            if ("startTime" in event && isArrayOf3Numbers(event.startTime) && event.startTime.length == 3)
                this.startTime = event.startTime;
            if ("endTime" in event && isArrayOf3Numbers(event.endTime) && event.endTime.length == 3)
                this.endTime = event.endTime;
        }
    }
}
export class NumberEvent extends BaseEvent<number> {
    start: number = 0;
    end: number = 0;
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isNumber(event.start))
                this.start = event.start;
            if ("end" in event && isNumber(event.end))
                this.end = event.end;
        }
    }
}
export class ColorEvent extends BaseEvent<RGBcolor> {
    start: RGBcolor = [255, 255, 255];
    end: RGBcolor = [255, 255, 255];
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isArrayOf3Numbers(event.start))
                this.start = event.start;
            if ("end" in event && isArrayOf3Numbers(event.end))
                this.end = event.end;
        }
    }
}
export class TextEvent extends BaseEvent<string> {
    start: string = "";
    end: string = "";
    constructor(event: unknown) {
        super(event);
        if (isObject(event)) {
            if ("start" in event && isString(event.start))
                this.start = event.start;
            if ("end" in event && isString(event.end))
                this.end = event.end;
        }
    }
}