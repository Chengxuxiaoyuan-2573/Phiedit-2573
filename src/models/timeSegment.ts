/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { addBeats, Beats, beatsToSeconds, BPM, getBeatsValue, isGreaterThanBeats, isGreaterThanOrEqualBeats, isLessThanBeats, isLessThanOrEqualBeats, makeSureBeatsValid } from "./beats";

/** 时间段，只要有开始和结束时间就可以 */
export interface ITimeSegment {
    startTime: Beats;
    endTime: Beats;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
}
export abstract class TimeSegment implements ITimeSegment {
    _startTime: Beats = [0, 0, 1];
    _endTime: Beats = [0, 0, 1];

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
    get durationBeats() {
        return getBeatsValue(this.endTime) - getBeatsValue(this.startTime);
    }
    abstract cachedStartSeconds: number;
    abstract cachedEndSeconds: number;

    abstract readonly BPMList: BPM[];
    calculateSeconds() {
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this.startTime);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this.endTime);
    }

    /** 确保 endTime 大于 startTime */
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

    isOverlapped(element: ITimeSegment, overlapWhenEqual = false) {
        return overlapWhenEqual ?
            isLessThanOrEqualBeats(element.startTime, this.endTime) && isGreaterThanOrEqualBeats(element.endTime, this.startTime) :
            isLessThanBeats(element.startTime, this.endTime) && isGreaterThanBeats(element.endTime, this.startTime);
    }
}