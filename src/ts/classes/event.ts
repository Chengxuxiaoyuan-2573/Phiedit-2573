import { getBeatsValue, beatsToSeconds } from "../tools";
import { isObject, isArrayOf4Numbers, isNumber, isArrayOf3Numbers, isString } from "../typeCheck";
import { Bool, EasingType, Beats, BPM, RGBcolor } from "../typeDefinitions";
export abstract class BaseEvent {
    bezier: Bool = 0; // unsupported 
    bezierPoints: [number, number, number, number] = [0, 0, 1, 1]; // unsupported 
    easingLeft: number = 0;
    easingRight: number = 1;
    easingType: EasingType = EasingType.Linear;
    abstract end: unknown;
    endTime: Beats = [1, 0, 1];
    abstract start: unknown;
    startTime: Beats = [0, 0, 1];
    _startSeconds?: number;
    _endSeconds?: number;
    get durationBeats() {
        return getBeatsValue(this.endTime) - getBeatsValue(this.startTime);
    }
    caculateSeconds(BPMList: BPM[]) {
        const startSeconds = this._startSeconds || (this._startSeconds = beatsToSeconds(BPMList, this.startTime));
        const endSeconds = this._endSeconds || (this._endSeconds = beatsToSeconds(BPMList, this.endTime));
        return { startSeconds, endSeconds };
    }
    constructor(event: unknown) {
        if (isObject(event)) {
            if ("bezier" in event && (event.bezier == 0 || event.bezier == 1))
                this.bezier = event.bezier as Bool;
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
export class NumberEvent extends BaseEvent {
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
export class ColorEvent extends BaseEvent {
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
export class TextEvent extends BaseEvent {
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