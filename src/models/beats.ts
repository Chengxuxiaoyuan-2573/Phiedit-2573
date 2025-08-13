import { isNumber, isObject } from "lodash";
import MathUtils from "../tools/mathUtils";
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
/**
 * @class BeatsImplementation
总结潜在的问题： 
1. 使用数字键0、1、2导致代码可读性差。 
2. parse方法的正则表达式可能不正确，导致解析错误。 
3. 构造函数中多次调用validate，导致性能问题和可能的逻辑错误。 
4. multiplyBeats方法使用非整数ratio可能导致integer部分出现小数，不符合预期。 
5. math.gcd可能未定义，导致运行时错误。 
6. validate方法中的分母为0时的处理可能隐藏错误，是否需要抛出异常或警告。 
7. 设置属性时多次调用validate，可能导致冗余计算。 
优化建议： 
1. 使用有意义的属性名代替数字键。 
2. 改进parse方法，使用更严格的正则表达式验证输入格式。 
3. 避免构造函数中多次调用validate，应该只在最后调用一次。 
4. 在multiplyBeats中正确处理ratio，可能将整个值计算后再分解为整数和分数部分。 
5. 实现或引入正确的gcd函数。 
6. 在设置分母为0时，可能需要抛出错误或警告，而不是静默修改。 
7. 减少validate的调用次数，避免冗余计算。 
现在，针对每个问题，需要给出具体的优化步骤。 
例如，关于构造函数中的多次validate调用问题，
因为当前的构造函数直接给this[0]、this[1]、this[2]赋值，
这会触发setter，从而调用validate。
然后构造函数最后又调用validate，导致多次执行。
应该修改构造函数，直接设置内部属性而不触发setter，
或者在构造函数中不触发setter。例如，使用私有属性，避免setter被触发。 
另外，关于math.gcd的问题，需要确保该函数存在。
例如，可以自己实现一个gcd函数，或者引入第三方库。
但代码中没有导入，所以这里需要添加gcd的实现。
export class BeatsImplementation implements Beats {
    0: number;
    1: number;
    2: number;
    get integer() {
        return this[0];
    }
    get numerator() {
        return this[1];
    }
    get denominator() {
        return this[2];
    }
    set integer(num: number) {
        this[0] = num;
    }
    set numerator(num: number) {
        this[1] = num;
    }
    set denominator(num: number) {
        this[2] = num;
    }

    get value() {
        return this.integer + this.numerator / this.denominator;
    }
    format() {
        return `${this[0]}.${this[1]}/${this[2]}`;
    }
    static parse(str: string) {
        const split = str.split(/\D/g);
        return new BeatsImplementation(
            Number.isNaN(+split[0]) ? 0 : +split[0],
            Number.isNaN(+split[1]) ? 0 : +split[1],
            Number.isNaN(+split[2]) ? 1 : +split[2]);
    }
    toObject() {
        return [this.integer, this.numerator, this.denominator];
    }
    validate() {

        // 确保分母不为零且不为负数
        if (this.denominator === 0) this.denominator = 1;
        if (this.denominator < 0) {
            this.numerator *= -1;
            this.denominator *= -1;
        }

        // 确保分子非负数
        const carry = Math.floor(this.numerator / this.denominator);
        this.integer += carry;
        this.numerator -= carry * this.denominator;

        // 约分
        const g = MathUtils.gcd(this.numerator, this.denominator);
        this.numerator /= g;
        this.denominator /= g;

    }
    addBeats(beats2: BeatsImplementation) {
        return new BeatsImplementation(
            this.integer + beats2.integer,
            this.numerator * beats2.denominator + beats2.numerator * this.denominator,
            this.denominator * beats2.denominator
        );
    }
    subBeats(beats2: BeatsImplementation) {
        return new BeatsImplementation(
            this.integer - beats2.integer,
            this.numerator * beats2.denominator - beats2.numerator * this.denominator,
            this.denominator * beats2.denominator
        );
    }
    multiplyBeats(ratio: number) {
        if (!isInteger(ratio)) {
            throw new Error("ratio must be integer");
        }
        return new BeatsImplementation(
            this.integer * ratio,
            this.numerator * ratio,
            this.denominator
        );
    }
    constructor(a: number, b: number, c: number) {
        this[0] = a;
        this[1] = b;
        this[2] = c;
        this.validate();
    }
}
*/
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
        const currentBPM = BPMList[i];
        const segmentStart = beatsToSeconds(BPMList, currentBPM.startTime);

        // Determine segment end time
        const segmentEnd = i < BPMList.length - 1
            ? beatsToSeconds(BPMList, BPMList[i + 1].startTime)
            : Infinity;

        // Actual calculation boundaries
        const effectiveStart = Math.max(cumulativeSeconds, segmentStart);
        const effectiveEnd = Math.min(segmentEnd, seconds);

        if (effectiveStart >= effectiveEnd) continue;

        const duration = effectiveEnd - effectiveStart;
        beats += duration * currentBPM.bpm / 60;
        cumulativeSeconds = effectiveEnd;

        if (cumulativeSeconds >= seconds) break;
    }

    return beats;
}

export function getBeatsValue(beats: Beats) {
    return beats[0] + beats[1] / beats[2];
}

export function validateBeats(beats: Beats): Beats {
    const newBeats: Beats = [beats[0], beats[1], beats[2]];

    // 确保分母不为零且不为负数
    if (newBeats[2] === 0) newBeats[2] = 1;
    if (newBeats[2] < 0) {
        newBeats[1] *= -1;
        newBeats[2] *= -1;
    }

    // 确保分子非负数
    const carry = Math.floor(newBeats[1] / newBeats[2]);
    newBeats[0] += carry;
    newBeats[1] -= carry * newBeats[2];

    // 约分
    const g = MathUtils.gcd(newBeats[1], newBeats[2]);
    newBeats[1] /= g;
    newBeats[2] /= g;

    return newBeats;
}

export function formatBeats(beats: Beats) {
    return beats[0] + '.' + beats[1] + '/' + beats[2];
}

export function parseBeats(str: string) {
    const split = str.replaceAll(/\s/g, "").split(/\D/g);
    const beats: Beats = [
        Number.isNaN(+split[0]) ? 0 : +split[0],
        Number.isNaN(+split[1]) ? 0 : +split[1],
        Number.isNaN(+split[2]) ? 1 : +split[2]];
    return beats;
}
/*
export function addBeats(beats1: Beats, beats2: Beats): Beats {
    const fenmu = math.lcm(beats1[2], beats2[2]);
    const fenzi1 = beats1[1] * fenmu / beats1[2];
    const fenzi2 = beats2[1] * fenmu / beats2[2];
    let fenzi = fenzi1 + fenzi2;
    const int = beats1[0] + beats2[0] + Math.floor(fenzi / fenmu);
    fenzi = math.mod(fenzi,fenmu);
    return [int, fenzi, fenmu];
}
*/
export function addBeats(beats1: Beats, beats2: Beats): Beats {
    const newBeats: Beats = [
        beats1[0] + beats2[0],
        beats1[1] * beats2[2] + beats2[1] * beats1[2],
        beats1[2] * beats2[2]
    ]
    return validateBeats(newBeats);
}
export function subBeats(beats1: Beats, beats2: Beats): Beats {
    const newBeats: Beats = [
        beats1[0] - beats2[0],
        beats1[1] * beats2[2] - beats2[1] * beats1[2],
        beats1[2] * beats2[2]
    ]
    return validateBeats(newBeats);
}
export function multiplyBeats(beats: Beats, ratio: number): Beats {
    const newBeats: Beats = [
        beats[0] * ratio,
        beats[1] * ratio,
        beats[2]
    ];
    return validateBeats(newBeats);
}
export function divideBeats(beats: Beats, ratio: number) {
    const newBeats: Beats = [
        0,
        beats[0] * beats[2] + beats[1],
        beats[2] * ratio
    ];
    return validateBeats(newBeats);
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