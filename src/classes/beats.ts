import { isNumber, isObject } from "lodash";
import math from "../tools/math";
import { isArrayOfNumbers } from "@/tools/typeCheck";
export interface IBPM {
    bpm: number
    startTime: Beats
}
export class BPM implements IBPM {
    bpm: number = 120
    _startTime: Beats = [0, 0, 1]
    get startTime() {
        return this._startTime;
    }
    set startTime(beats: Beats) {
        if (beats[2] == 0) beats[2] = 1;
        this._startTime = beats;
    }
    get startString() {
        const beats = formatBeats(this.startTime);
        return beats;
    }
    set startString(str: string) {
        const beats = validateBeats(parseBeats(str));
        this.startTime = beats;
    }
    toObject(): IBPM {
        return {
            bpm: this.bpm,
            startTime: this.startTime
        }
    }
    constructor(bpm: unknown) {
        if (isObject(bpm)) {
            if ("bpm" in bpm && isNumber(bpm.bpm)) {
                this.bpm = bpm.bpm;
            }
            if ("startTime" in bpm && isArrayOfNumbers(bpm.startTime, 3)) {
                this._startTime = bpm.startTime;
            }
        }
    }
}
/**
 * 第一个数字代表整数部分  
 * 第二、三个数字代表小数部分
 * 数值为第一个数字 + 第二个数字 / 第三个数字
 */
export type Beats = [number, number, number];

export function beatsToSeconds(BPMList: BPM[], beats: Beats | number): number {
    const beatsValue = isNumber(beats) ? beats : getBeatsValue(beats);
    let seconds = 0;

    // 找到第一个 startTime 大于等于 beatsValue 的 BPM 元素
    for (let i = 0; i < BPMList.length; i++) {
        const bpm = BPMList[i];
        const bpmStartTimeValue = getBeatsValue(bpm.startTime);

        if (beatsValue < bpmStartTimeValue) {
            break;
        }

        if (i == BPMList.length - 1 || beatsValue <= getBeatsValue(BPMList[i + 1].startTime)) {
            seconds += (beatsValue - bpmStartTimeValue) / bpm.bpm * 60;
        } else {
            seconds += (getBeatsValue(BPMList[i + 1].startTime) - bpmStartTimeValue) / bpm.bpm * 60;
        }
    }
    return seconds;
}

export function secondsToBeats(BPMList: BPM[], seconds: number): number {
    let beats = 0;
    let cumulativeSeconds = 0;
    for (let i = 0; i < BPMList.length; i++) {
        const bpm = BPMList[i];
        const nextCumulativeSeconds = i == BPMList.length - 1 ? seconds : beatsToSeconds(BPMList, BPMList[i + 1].startTime);
        beats += (nextCumulativeSeconds - cumulativeSeconds) * bpm.bpm / 60;
        cumulativeSeconds = nextCumulativeSeconds;
    }
    return beats;
}

export function getBeatsValue(beats: Beats) {
    return beats[0] + beats[1] / beats[2];
}

export function validateBeats(beats: Beats) {
    beats[0] += Math.floor(beats[1] / beats[2]);
    beats[1] %= beats[2];
    const g = math.gcd(beats[1], beats[2]);
    beats[1] /= g;
    beats[2] /= g;
    return beats;
}

export function formatBeats(beats: Beats) {
    return beats[0] + '.' + beats[1] + '/' + beats[2];
}

export function parseBeats(str: string) {
    const split = str.split(/\D/g);
    const beats: Beats = [
        Number.isNaN(+split[0]) ? 0 : +split[0],
        Number.isNaN(+split[1]) ? 0 : +split[1],
        Number.isNaN(+split[2]) ? 1 : +split[2]];
    return beats;
}

export function addBeats(beats1: Beats, beats2: Beats): Beats {
    const fenmu = math.lcm(beats1[2], beats2[2]);
    const fenzi1 = beats1[1] * fenmu / beats1[2];
    const fenzi2 = beats2[1] * fenmu / beats2[2];
    let fenzi = fenzi1 + fenzi2;
    const int = beats1[0] + beats2[0] + Math.floor(fenzi / fenmu);
    fenzi %= fenmu;
    return [int, fenzi, fenmu];
}
export function subBeats(beats1: Beats, beats2: Beats): Beats {
    return addBeats(beats1, [-beats2[0], -beats2[1], beats2[2]]);
}