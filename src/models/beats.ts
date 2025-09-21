import { isNumber, isObject } from "lodash";
import MathUtils, { MIN_TO_SEC } from "../tools/mathUtils";
import { isArrayOfNumbers } from "@/tools/typeTools";
import ChartError from "./error";
import { IObjectizable } from "./objectizable";
export interface IBPM {
    bpm: number
    startTime: Beats
}
const DEFAULT_BPM = 120;
export class BPM implements IBPM, IObjectizable {
    bpm: number = DEFAULT_BPM;
    _startTime: Beats = [0, 0, 1];
    readonly errors: ChartError[] = [];

    /**
     * 为了兼容一些其他的格式，可能需要添加一些别名
     * BPM.startTime 的别名为：time
     */
    get startTime() {
        return this._startTime;
    }
    set startTime(beats: Beats) {
        this._startTime = makeSureBeatsValid(beats);
    }
    get time() {
        return this.startTime;
    }
    set time(beats: Beats) {
        this.startTime = beats;
    }
    get startString() {
        const beats = formatBeats(this.startTime);
        return beats;
    }
    set startString(str: string) {
        const beats = parseBeats(str);
        this.startTime = beats;
    }
    toObject(): IBPM {
        return {
            bpm: this.bpm,
            startTime: this.startTime
        };
    }
    constructor(bpm: unknown) {
        if (isObject(bpm)) {
            if ("bpm" in bpm) {
                if (isNumber(bpm.bpm)) {
                    this.bpm = bpm.bpm;
                }
                else {
                    this.errors.push(new ChartError(
                        `BPM 对象的 bpm 属性必须是数字，但读取到了 ${bpm.bpm}。将会被替换为数字 120。`,
                        "ChartReadError.TypeError",
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `BPM 缺少 bpm 属性。将会被替换为数字 120。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("startTime" in bpm) {
                if (isArrayOfNumbers(bpm.startTime, 3)) {
                    this._startTime = bpm.startTime;
                }
                else {
                    this.errors.push(new ChartError(
                        `BPM 对象的 startTime 属性必须是一个长度为 3 的数字数组，但读取到了 ${bpm.startTime}。将会被替换为 [0, 0, 1]。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `BPM 缺少 startTime 属性。将会被替换为 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty"
                ));
                this._startTime = [0, 0, 1];
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
export const BEATS_INTEGER_INDEX = 0;
export const BEATS_NUMERATOR_INDEX = 1;
export const BEATS_DENOMINATOR_INDEX = 2;
export const MAX_BEATS: Beats = [Infinity, 0, 1];
export const MIN_BEATS: Beats = [-Infinity, 0, 1];

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

        if (i === BPMList.length - 1 || beatsValue <= getBeatsValue(BPMList[i + 1].startTime)) {
            seconds += (beatsValue - bpmStartTimeValue) / bpm.bpm * MIN_TO_SEC;
        }
        else {
            seconds += (getBeatsValue(BPMList[i + 1].startTime) - bpmStartTimeValue) / bpm.bpm * MIN_TO_SEC;
        }
    }
    return seconds;
}

export function secondsToBeats(BPMList: BPM[], seconds: number): number {
    let beats = 0;
    let cumulativeSeconds = 0;

    for (let i = 0; i < BPMList.length; i++) {
        const currentBPM = BPMList[i];
        const segmentStart = beatsToSeconds(BPMList, currentBPM.startTime);

        // Determine segment end time
        const segmentEnd = i < BPMList.length - 1 ?
            beatsToSeconds(BPMList, BPMList[i + 1].startTime) :
            Infinity;

        // Actual calculation boundaries
        const effectiveStart = Math.max(cumulativeSeconds, segmentStart);
        const effectiveEnd = Math.min(segmentEnd, seconds);

        if (effectiveStart >= effectiveEnd) continue;

        const duration = effectiveEnd - effectiveStart;
        beats += duration * currentBPM.bpm / MIN_TO_SEC;
        cumulativeSeconds = effectiveEnd;

        if (cumulativeSeconds >= seconds) break;
    }

    return beats;
}

export function getBeatsValue(beats: Beats) {
    return beats[0] + beats[1] / beats[2];
}

export function makeSureBeatsValid(beats: Beats): Beats {
    if (beats[BEATS_DENOMINATOR_INDEX] === 0) {
        beats[BEATS_DENOMINATOR_INDEX] = 1;
    }
    return toBeats(getBeatsValue(beats));
}

export function toBeats(value: number): Beats {
    const integer = Math.floor(value);
    const decimal = value - integer;
    const [fenzi, fenmu] = MathUtils.realToRational(decimal);
    return [integer, fenzi, fenmu];
}

export function formatBeats(beats: Beats) {
    return beats[0] + "." + beats[1] + "/" + beats[2];
}

export function parseBeats(str: string) {
    const split = str.replaceAll(/\s/g, "").split(/\D/g);
    const beats: Beats = [
        Number.isNaN(+split[0]) ? 0 : +split[0],
        Number.isNaN(+split[1]) ? 0 : +split[1],
        Number.isNaN(+split[2]) ? 1 : +split[2]];
    return beats;
}

export function addBeats(beats1: Beats, beats2: Beats): Beats {
    const newBeats: Beats = [
        beats1[0] + beats2[0],
        beats1[1] * beats2[2] + beats2[1] * beats1[2],
        beats1[2] * beats2[2]
    ];
    return makeSureBeatsValid(newBeats);
}

export function subBeats(beats1: Beats, beats2: Beats): Beats {
    const newBeats: Beats = [
        beats1[0] - beats2[0],
        beats1[1] * beats2[2] - beats2[1] * beats1[2],
        beats1[2] * beats2[2]
    ];
    return makeSureBeatsValid(newBeats);
}

export function multiplyBeats(beats: Beats, ratio: number): Beats {
    const newBeats: Beats = [
        beats[0] * ratio,
        beats[1] * ratio,
        beats[2]
    ];
    return makeSureBeatsValid(newBeats);
}

export function divideBeats(beats: Beats, ratio: number) {
    const newBeats: Beats = [
        0,
        beats[0] * beats[2] + beats[1],
        beats[2] * ratio
    ];
    return makeSureBeatsValid(newBeats);
}

export function divide2Beats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) / getBeatsValue(beats2);
}

export function isLessThanBeats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) < getBeatsValue(beats2);
}

export function isGreaterThanBeats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) > getBeatsValue(beats2);
}

export function isEqualBeats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) === getBeatsValue(beats2);
}

export function isLessThanOrEqualBeats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) <= getBeatsValue(beats2);
}

export function isGreaterThanOrEqualBeats(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) >= getBeatsValue(beats2);
}

export function beatsCompare(beats1: Beats, beats2: Beats) {
    return getBeatsValue(beats1) - getBeatsValue(beats2);
}