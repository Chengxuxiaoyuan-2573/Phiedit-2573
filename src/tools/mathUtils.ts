import { isString } from "lodash";

export const DEG_TO_RAD = Math.PI / 180;
export const KB_TO_BYTE = 1024;
export const DAY_TO_HOUR = 24;
export const HOUR_TO_MIN = 60;
export const MIN_TO_SEC = 60;
export const SEC_TO_MS = 1000;

/**
 * 所有与坐标计算相关的方法，角度为 0 时向右，角度为 90 时向下，
 * 因为在 RPE 中，0 度代表判定线面向上方，此时向右为判定线的x轴正方向；
 * 90 度代表判定线面向右方，此时向下为判定线的x轴正方向
 *
 * @class 数学工具类
 */
export default class MathUtils {
    /**
     * 求从 (x1, y1) 点往 dir 方向移动 x2，左转 90 度，再移动 y2 得到的坐标
     * dir 为 0 表示向右（X轴正方向），为 90 表示向下（Y轴负方向）
     */
    static moveAndRotate(x1: number, y1: number, dir: number, x2: number, y2: number) {
        // 初始方向向量（单位向量）
        const dx = Math.cos(this.degToRad(dir));
        const dy = -Math.sin(this.degToRad(dir));

        // 计算初始移动后的坐标
        const x2New = x1 + x2 * dx;
        const y2New = y1 + x2 * dy;

        // 原来的y分量变成新的-x分量
        const newDx = -dy;

        // 原来的x分量变成新的y分量
        const newDy = dx;

        // 计算最终坐标
        const xFinal = x2New + y2 * newDx;
        const yFinal = y2New + y2 * newDy;
        return { x: xFinal, y: yFinal };
    }

    /**
     * 以直角坐标系的 (x, y) 为原点建立极坐标系，然后将极坐标转换为直角坐标
     * @param x 极坐标原点在直角坐标系中的x坐标
     * @param y 极坐标原点在直角坐标系中的y坐标
     * @param theta 点在极坐标原点的方向，为 0 表示向右（X轴正方向），为 90 表示向下（Y轴负方向）
     * @param r 点离极坐标原点的距离
     */
    static pole(x: number, y: number, theta: number, r: number) {
        return this.moveAndRotate(x, y, theta, r, 0);
    }
    static degToRad(degrees: number) {
        return degrees * DEG_TO_RAD;
    }
    static radToDeg(radians: number) {
        return radians / DEG_TO_RAD;
    }
    static mod(x: number, y: number) {
        return (x % y + y) % y;
    }
    static average(a: number[]) {
        return a.reduce((x, y) => x + y) / a.length;
    }
    static distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    static gcd(a: number, b: number): number {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a === 0 && b === 0 ? 0 : a;
    }
    static lcm(a: number, b: number) {
        a = Math.abs(a);
        b = Math.abs(b);
        if (a === 0 || b === 0) {
            return 0;
        }

        return a / this.gcd(a, b) * b;
    }
    static pow(base: number, exponent: number): number {
        if (!Number.isInteger(exponent)) {
            return base ** exponent;
        }

        let result = 1;
        if (exponent < 0) {
            return this.pow(1 / base, -exponent);
        }

        while (exponent > 0) {
            if (exponent & 1) {
                result *= base;
            }
            exponent >>= 1;
            base *= base;
        }
        return result;
    }
    static round(value: number, digits = 0) {
        const base = this.pow(10, digits);
        return Math.round(value * base) / base;
    }
    static randomNumbers(count: number, seed?: number | string, min = 0, max = 1): number[] {
        const LCG_MULTIPLIER = 9301;
        const LCG_INCREMENT = 49297;
        const LCG_MODULUS = 233280;

        if (seed === undefined) {
            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(Math.random() * (max - min) + min);
            }
            return result;
        }

        if (isString(seed)) {
            seed = MathUtils.hashCode(seed);
        }

        // 种子值更新函数
        function updateSeed(seed: number): number {
            return MathUtils.mod(seed * LCG_MULTIPLIER + LCG_INCREMENT, LCG_MODULUS);
        }

        // 初始化结果数组
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            seed = updateSeed(seed);
            result.push(min + seed / LCG_MODULUS * (max - min));
        }

        return result;
    }
    static hashCode(str: string) {
        // 将字符串str转换为数字
        // 使用简单的哈希函数将字符串转换为数字
        const HASH_SHIFT = 5;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << HASH_SHIFT) - hash + char;

            // 转换为32位整数
            hash = hash & hash;
        }
        return hash;
    }
    static between(num: number, min: number, max: number) {
        return num >= Math.min(min, max) && num <= Math.max(min, max);
    }
    static formatData(bytes: number, p = 2) {
        return this.format(["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], KB_TO_BYTE, bytes, p);
    }
    static formatTime(seconds: number) {
        if (seconds < 1) {
            return `${Math.floor(seconds * SEC_TO_MS)}ms`;
        }

        if (seconds < MIN_TO_SEC) {
            return `${Math.floor(seconds)}s`;
        }

        if (seconds < HOUR_TO_MIN * MIN_TO_SEC) {
            return `${Math.floor(seconds / MIN_TO_SEC)}min ${Math.floor(seconds % MIN_TO_SEC)}s`;
        }

        if (seconds < DAY_TO_HOUR * HOUR_TO_MIN * MIN_TO_SEC) {
            return `${Math.floor(seconds / HOUR_TO_MIN / MIN_TO_SEC)}hr ${Math.floor(seconds / MIN_TO_SEC % HOUR_TO_MIN)}min ${Math.floor(seconds % MIN_TO_SEC)}s`;
        }

        return `${Math.floor(seconds / DAY_TO_HOUR / HOUR_TO_MIN / MIN_TO_SEC)}d ${Math.floor(seconds / HOUR_TO_MIN / MIN_TO_SEC % DAY_TO_HOUR)}hr ${Math.floor(seconds / MIN_TO_SEC % HOUR_TO_MIN)}min ${Math.floor(seconds % MIN_TO_SEC)}s`;
    }

    // staticformatTime(seconds: number) {
    //     const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    //     const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    //     return `${min}:${sec}`;
    // }
    static format(units: string[], base: number, num: number, p = 2): string {
        // 输入参数有效性检查
        if (!Array.isArray(units) || units.length === 0) {
            throw new Error("Invalid units array");
        }

        if (typeof base !== "number" || base <= 0) {
            throw new Error("Invalid base: " + base);
        }

        if (!isFinite(num) || isNaN(num)) {
            throw new Error("Invalid number: " + num);
        }

        if (typeof p !== "number" || p < 0 || !Number.isInteger(p)) {
            throw new Error("Invalid precision: " + p);
        }

        let result = "";
        for (let i = 0; i < units.length; i++) {
            if (num < base || i === units.length - 1) {
                result = num.toFixed(p) + " " + units[i];
                break;
            }
            num /= base;
        }

        return result;
    }
    static formatDecimal(num: number, p: number) {
        if (num === 0) {
            return "0";
        }

        let str = num.toFixed(p).replace(/0+$/, "");
        if (str.endsWith(".")) {
            str = str.slice(0, -1);
        }
        return str;
    }

    /** 把任意实数表示为两个整数相除的结果 */
    static realToRational(num: number): [number, number] {
        // 1 / 0 === Infinity
        if (num === Infinity) {
            return [1, 0];
        }

        // -1 / 0 === -Infinity
        if (num === -Infinity) {
            return [-1, 0];
        }

        // 0 / 0 is NaN
        if (isNaN(num)) {
            return [0, 0];
        }

        const PRECISION = 0.0001;
        const MAX_ITERATIONS = 1000;

        const isNegative = num < 0;
        const absNum = Math.abs(num);

        // Continued fraction algorithm variables
        // Previous convergent numerator and denominator
        let prevNumerator = 0;
        let prevDenominator = 1;

        // Current convergent numerator and denominator
        let currNumerator = 1;
        let currDenominator = 0;

        // Current coefficient and remainder
        let coefficient = Math.floor(absNum);
        let remainder = absNum - coefficient;

        // Calculate initial convergent
        let numerator = coefficient * currNumerator + prevNumerator;
        let denominator = coefficient * currDenominator + prevDenominator;

        let i = 0;
        while (Math.abs(numerator / denominator - absNum) > PRECISION && i < MAX_ITERATIONS) {
            remainder = 1 / remainder;
            coefficient = Math.floor(remainder);
            remainder -= coefficient;

            // Shift values for next iteration
            prevNumerator = currNumerator;
            prevDenominator = currDenominator;
            currNumerator = numerator;
            currDenominator = denominator;

            // Calculate new convergent
            numerator = coefficient * currNumerator + prevNumerator;
            denominator = coefficient * currDenominator + prevDenominator;

            i++;
        }

        if (i >= MAX_ITERATIONS) {
            throw new Error(`Failed to approximate ${num} as a rational number within ${PRECISION} precision`);
        }

        const finalNumerator = isNegative ? -numerator : numerator;
        return [finalNumerator, denominator];
    }
    static addTime(time: Date, addedSeconds: number) {
        return new Date(time.getTime() + addedSeconds * SEC_TO_MS);
    }
}

/** XY坐标对 */
export type Point = { x: number, y: number };