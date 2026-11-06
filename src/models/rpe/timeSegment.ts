/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { addBeats, Beats, beatsToSeconds, BPM, getBeatsValue, isGreaterThanBeats, isGreaterThanOrEqualBeats, isLessThanBeats, isLessThanOrEqualBeats, makeSureBeatsValid } from "./beats";
import { insert } from "@/tools/algorithm";

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

    /**
     * 包含本元素的、按 startTime 排序的数组。
     *
     * 由管理排序的容器（事件层、判定线的音符列表等）在添加元素时设置。
     * 设置之后，startTime 一旦变化，本元素会自动在这个数组中重新定位，
     * 保证列表的有序性始终得到维护，否则依赖二分查找的计算（如取某一时刻的事件值）会得到错误结果。
     */
    sortedArray: ITimeSegment[] | undefined = undefined;

    get startTime() {
        return this._startTime;
    }
    get endTime() {
        return this._endTime;
    }
    set startTime(beats: Beats) {
        const oldStartTime = this._startTime;
        this._startTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
        this.maintainSortedPosition(oldStartTime);
    }
    set endTime(beats: Beats) {
        this._endTime = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }

    /** startTime 变化后，把自己在所在排序数组中重新定位，维持数组按 startTime 有序 */
    private maintainSortedPosition(oldStartTime: Beats) {
        const array = this.sortedArray;
        if (!array || array.length === 0) {
            return;
        }

        if (getBeatsValue(oldStartTime) === getBeatsValue(this._startTime)) {
            return;
        }

        const index = array.indexOf(this);
        if (index === -1) {
            return;
        }

        array.splice(index, 1);
        insert(array, this, (x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
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