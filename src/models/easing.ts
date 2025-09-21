import MathUtils, { Point } from "@/tools/mathUtils";
import { clamp, isNumber } from "lodash";
export type BezierPoints = [number, number, number, number]
export const BEZIER_X1_INDEX = 0;
export const BEZIER_Y1_INDEX = 1;
export const BEZIER_X2_INDEX = 2;
export const BEZIER_Y2_INDEX = 3;
export const BEZIER_POINTS_LENGTH = 4;

export enum EasingType {
    Linear = 1,
    OutSine, InSine, OutQuad, InQuad, IOSine, IOQuad,
    OutCubic, InCubic, OutQuart, InQuart, IOCubic, IOQuart,
    OutQuint, InQuint, OutExpo, InExpo,
    OutCirc, InCirc, OutBack, InBack, IOCirc, IOBack,
    OutElastic, InElastic, OutBounce, InBounce, IOBounce, IOElastic
}
/* eslint-disable no-magic-numbers */
/* 这段代码就像 magic 一样神奇，怎么可能没有 magic numbers */
export const easingFuncs: Record<EasingType, (t: number) => number> = {
    [EasingType.Linear]: (t: number) => t,
    [EasingType.OutSine]: (t: number) => Math.sin(t * Math.PI / 2),
    [EasingType.InSine]: (t: number) => 1 - Math.cos(t * Math.PI / 2),
    [EasingType.OutQuad]: (t: number) => 1 - (t - 1) ** 2,
    [EasingType.InQuad]: (t: number) => t ** 2,
    [EasingType.IOSine]: (t: number) => (1 - Math.cos(t * Math.PI)) / 2,
    [EasingType.IOQuad]: (t: number) => ((t *= 2) < 1 ? t ** 2 : -((t - 2) ** 2 - 2)) / 2,
    [EasingType.OutCubic]: (t: number) => 1 + (t - 1) ** 3,
    [EasingType.InCubic]: (t: number) => t ** 3,
    [EasingType.OutQuart]: (t: number) => 1 - (t - 1) ** 4,
    [EasingType.InQuart]: (t: number) => t ** 4,
    [EasingType.IOCubic]: (t: number) => ((t *= 2) < 1 ? t ** 3 : (t - 2) ** 3 + 2) / 2,
    [EasingType.IOQuart]: (t: number) => ((t *= 2) < 1 ? t ** 4 : -((t - 2) ** 4 - 2)) / 2,
    [EasingType.OutQuint]: (t: number) => 1 + (t - 1) ** 5,
    [EasingType.InQuint]: (t: number) => t ** 5,
    [EasingType.OutExpo]: (t: number) => 1 - 2 ** (-10 * t),
    [EasingType.InExpo]: (t: number) => 2 ** (10 * (t - 1)),
    [EasingType.OutCirc]: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
    [EasingType.InCirc]: (t: number) => 1 - Math.sqrt(1 - t ** 2),
    [EasingType.OutBack]: (t: number) => (2.70158 * t - 1) * (t - 1) ** 2 + 1,
    [EasingType.InBack]: (t: number) => (2.70158 * t - 1.70158) * t ** 2,
    [EasingType.IOCirc]: (t: number) => ((t *= 2) < 1 ? 1 - Math.sqrt(1 - t ** 2) : Math.sqrt(1 - (t - 2) ** 2) + 1) / 2,
    [EasingType.IOBack]: (t: number) => t < .5 ? (14.379638 * t - 5.189819) * t ** 2 : (14.379638 * t - 9.189819) * (t - 1) ** 2 + 1,
    [EasingType.OutElastic]: (t: number) => 1 - 2 ** (-10 * t) * Math.cos(t * Math.PI / .15),
    [EasingType.InElastic]: (t: number) => 2 ** (10 * (t - 1)) * Math.cos((t - 1) * Math.PI / .15),
    [EasingType.OutBounce]: (t: number) => ((t *= 11) < 4 ? t ** 2 : t < 8 ? (t - 6) ** 2 + 12 : t < 10 ? (t - 9) ** 2 + 15 : (t - 10.5) ** 2 + 15.75) / 16,
    [EasingType.InBounce]: (t: number) => 1 - easingFuncs[EasingType.OutBounce](1 - t),
    [EasingType.IOBounce]: (t: number) => t < 0.5 ? (1 - easingFuncs[EasingType.OutBounce](1 - 2 * t)) / 2 : (1 + easingFuncs[EasingType.OutBounce](2 * t - 1)) / 2,
    [EasingType.IOElastic]: (t: number) => t < .5 ? 2 ** (20 * t - 11) * Math.sin((160 * t + 1) * Math.PI / 18) : 1 - 2 ** (9 - 20 * t) * Math.sin((160 * t + 1) * Math.PI / 18)
} as const;
/* eslint-enable no-magic-numbers */

/**
 * 使用辛普森法则对一个函数进行积分
 * @param f 被积分的函数
 * @param a 积分下限
 * @param b 积分上限
 * @param n 积分精度
 * @returns 积分结果
 */
function integrateWithSimpson(f: (x: number) => number, a: number, b: number, n = 100): number {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += f(x) * (i % 2 === 0 ? 2 : 4);
    }

    return sum * h / 3;
}

/**
 * 计算物体从时刻 t0 到时刻 t 的位移
 * @param easingType - 缓动函数类型（如 EasingType.OutSine）
 * @param t0 - 开始时间
 * @param t1 - 结束时间
 * @param v0 - 初始速度
 * @param v1 - 末速度
 * @param t - 当前时间
 */
export function calculateDisplacement(
    easingFunc: (t: number) => number,
    t0: number,
    t1: number,
    v0: number,
    v1: number,
    t: number
): number {
    const mappedT = (t - t0) / (t1 - t0);
    if (mappedT < 0 || mappedT > 1) {
        throw new Error("Invalid time");
    }

    // 计算 ∫₀^mappedT easingFunc(s) ds
    const integral = integrateWithSimpson(easingFunc, 0, mappedT);

    // 代入位移公式
    return v0 * (t - t0) + (v1 - v0) * (t1 - t0) * integral;
}

export function isEasingType(type: unknown): type is EasingType {
    if (!isNumber(type)) {
        return false;
    }
    return type in EasingType;
}
export enum EasingTypeGroups {
    Linear, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, Bounce
}
export const groupedEasingType = {
    [EasingTypeGroups.Linear]: {
        out: EasingType.Linear,
        in: EasingType.Linear,
        inOut: EasingType.Linear
    },
    [EasingTypeGroups.Sine]: {
        out: EasingType.OutSine,
        in: EasingType.InSine,
        inOut: EasingType.IOSine
    },
    [EasingTypeGroups.Quad]: {
        out: EasingType.OutQuad,
        in: EasingType.InQuad,
        inOut: EasingType.IOQuad
    },
    [EasingTypeGroups.Cubic]: {
        out: EasingType.OutCubic,
        in: EasingType.InCubic,
        inOut: EasingType.IOCubic
    },
    [EasingTypeGroups.Quart]: {
        out: EasingType.OutQuart,
        in: EasingType.InQuart,
        inOut: EasingType.IOQuart
    },
    [EasingTypeGroups.Quint]: {
        out: EasingType.OutQuint,
        in: EasingType.InQuint,
        inOut: undefined
    },
    [EasingTypeGroups.Expo]: {
        out: EasingType.OutExpo,
        in: EasingType.InExpo,
        inOut: undefined
    },
    [EasingTypeGroups.Circ]: {
        out: EasingType.OutCirc,
        in: EasingType.InCirc,
        inOut: EasingType.IOCirc
    },
    [EasingTypeGroups.Back]: {
        out: EasingType.OutBack,
        in: EasingType.InBack,
        inOut: EasingType.IOBack
    },
    [EasingTypeGroups.Elastic]: {
        out: EasingType.OutElastic,
        in: EasingType.InElastic,
        inOut: EasingType.IOElastic
    },
    [EasingTypeGroups.Bounce]: {
        out: EasingType.OutBounce,
        in: EasingType.InBounce,
        inOut: EasingType.IOBounce
    },
} as const;

const BEZIER_PRECISION = 1e-6;

/**
 * 创建一个三次贝塞尔曲线函数。
 * @param points 三次贝塞尔曲线中间两个控制点的顶点。最开始的点固定为（0，0），最后的点固定为（1，1）。
 * @returns 三次贝塞尔曲线函数。接受一个时间t，返回x、y坐标。
 */
export function createBezierCurve(points: BezierPoints) {
    return function (t: number): Point {
        const p0 = { x: 0, y: 0 }, p3 = { x: 1, y: 1 };
        const p1 = { x: points[BEZIER_X1_INDEX], y: points[BEZIER_Y1_INDEX] };
        const p2 = { x: points[BEZIER_X2_INDEX], y: points[BEZIER_Y2_INDEX] };
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    };
}

/**
 * 创建一个基于三次贝塞尔曲线的缓动函数。
 *
 * 该函数接受四个控制点坐标（p1x, p1y, p2x, p2y），生成一个根据给定 x 值计算对应 y 值的函数，
 * 用于实现自定义的动画缓动效果。曲线起点为 (0, 0)，终点为 (1, 1)。
 *
 * @param points - 包含四个数字的数组，分别表示两个控制点的坐标 [p1x, p1y, p2x, p2y]
 * @returns 返回一个函数，该函数接收一个介于 0 到 1 之间的数值 x，并返回对应的 y 值
 */
export function cubicBezierEase(points: BezierPoints) {
    const [p1x, p1y, p2x, p2y] = points;
    return function (x: number) {
        x = clamp(x, 0, 1);
        return calculateYForXOnBezierCurve(
            x,
            { x: 0, y: 0 },
            { x: p1x, y: p1y },
            { x: p2x, y: p2y },
            { x: 1, y: 1 }
        );
    };
}

/**
 * 根据参数 t 计算三次贝塞尔曲线上某一点的坐标值。
 *
 * 使用三次贝塞尔曲线的标准公式进行计算。
 *
 * @param t - 曲线参数，范围在 [0, 1] 之间
 * @param p0 - 起点坐标值
 * @param p1 - 第一个控制点坐标值
 * @param p2 - 第二个控制点坐标值
 * @param p3 - 终点坐标值
 * @returns 返回在参数 t 下曲线上对应点的坐标值
 */
function calculateBezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 +
        3 * u * u * t * p1 +
        3 * u * t * t * p2 +
        t * t * t * p3;
}

/**
 * 在给定 X 坐标的情况下，通过二分查找法求出对应的参数 t。
 *
 * 此方法通过不断缩小区间来逼近目标 X 值所对应的参数 t。
 *
 * @param x - 目标 X 坐标值
 * @param x0 - 起点 X 坐标
 * @param x1 - 第一个控制点 X 坐标
 * @param x2 - 第二个控制点 X 坐标
 * @param x3 - 终点 X 坐标
 * @param epsilon - 精度阈值，默认为 1e-6
 * @returns 返回与目标 X 值最接近的参数 t
 */
function findTForX(x: number, x0: number, x1: number, x2: number, x3: number, epsilon = BEZIER_PRECISION): number {
    // 使用二分查找逼近目标 t 值
    let low = 0;
    let high = 1;
    let t = 0.5;

    // 最多迭代 20 次以确保性能和精度平衡
    const MAX_LOOP_COUNT = 20;
    for (let i = 0; i < MAX_LOOP_COUNT; i++) {
        const currentX = calculateBezierPoint(t, x0, x1, x2, x3);
        if (Math.abs(currentX - x) < epsilon) {
            break;
        }

        if (currentX < x) {
            low = t;
        }
        else {
            high = t;
        }
        t = (low + high) / 2;
    }

    return t;
}

/**
 * 根据给定的 X 值，在三次贝塞尔曲线上计算对应的 Y 值。
 *
 * 首先通过 findTForX 找到与 X 对应的参数 t，然后使用该参数计算 Y 值。
 *
 * @param x - 输入的 X 值，范围应在 [0, 1]
 * @param p0 - 起点坐标 {x, y}
 * @param p1 - 第一个控制点坐标 {x, y}
 * @param p2 - 第二个控制点坐标 {x, y}
 * @param p3 - 终点坐标 {x, y}
 * @returns 返回与输入 X 值相对应的 Y 值
 */
function calculateYForXOnBezierCurve(
    x: number,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point
): number {
    // 查找与目标 x 对应的参数 t
    const t = findTForX(x, p0.x, p1.x, p2.x, p3.x);

    // 根据参数 t 计算对应的 y 值
    return calculateBezierPoint(t, p0.y, p1.y, p2.y, p3.y);
}

export function getEasingValue(easingType: EasingType, startT: number, endT: number, start: number, end: number, t: number): number {
    if (easingType === EasingType.Linear) {
        return start + (end - start) * ((t - startT) / (endT - startT));
    }

    const easingFunc = easingFuncs[easingType];
    if (!easingFunc) {
        throw new Error(`未知的缓动类型: ${easingType}`);
    }

    const normalizedT = (t - startT) / (endT - startT);
    return start + (end - start) * easingFunc(normalizedT);
}

export function formatBezierPoints(points: BezierPoints): string {
    return `(${MathUtils.formatDecimal(points[BEZIER_X1_INDEX], 2)},${MathUtils.formatDecimal(points[BEZIER_Y1_INDEX], 2)}) (${MathUtils.formatDecimal(points[BEZIER_X2_INDEX], 2)},${MathUtils.formatDecimal(points[BEZIER_Y2_INDEX], 2)})`;
}

export function parseBezierPoints(points: string): BezierPoints | null {
    const match = points.match(/\((.*),(.*)\) ?\((.*),(.*)\)/);
    if (!match) {
        return null;
    }

    const [, x1, x2, y1, y2] = match;
    return [parseFloat(x1), parseFloat(x2), parseFloat(y1), parseFloat(y2)];
}