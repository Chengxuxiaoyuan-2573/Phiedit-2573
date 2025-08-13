import { clamp } from "lodash";

/** 
 * 小秘密：这段代码是从lchzh3473的模拟器里抄过来的
 */
export const easingFuncs = {
    1: (t: number) => t,
    2: (t: number) => Math.sin(t * Math.PI / 2),
    3: (t: number) => 1 - Math.cos(t * Math.PI / 2),
    4: (t: number) => 1 - (t - 1) ** 2,
    5: (t: number) => t ** 2,
    6: (t: number) => (1 - Math.cos(t * Math.PI)) / 2,
    7: (t: number) => ((t *= 2) < 1 ? t ** 2 : -((t - 2) ** 2 - 2)) / 2,
    8: (t: number) => 1 + (t - 1) ** 3,
    9: (t: number) => t ** 3,
    10: (t: number) => 1 - (t - 1) ** 4,
    11: (t: number) => t ** 4,
    12: (t: number) => ((t *= 2) < 1 ? t ** 3 : (t - 2) ** 3 + 2) / 2,
    13: (t: number) => ((t *= 2) < 1 ? t ** 4 : -((t - 2) ** 4 - 2)) / 2,
    14: (t: number) => 1 + (t - 1) ** 5,
    15: (t: number) => t ** 5,
    16: (t: number) => 1 - 2 ** (-10 * t),
    17: (t: number) => 2 ** (10 * (t - 1)),
    18: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
    19: (t: number) => 1 - Math.sqrt(1 - t ** 2),
    20: (t: number) => (2.70158 * t - 1) * (t - 1) ** 2 + 1,
    21: (t: number) => (2.70158 * t - 1.70158) * t ** 2,
    22: (t: number) => ((t *= 2) < 1 ? 1 - Math.sqrt(1 - t ** 2) : Math.sqrt(1 - (t - 2) ** 2) + 1) / 2,
    23: (t: number) => t < .5 ? (14.379638 * t - 5.189819) * t ** 2 : (14.379638 * t - 9.189819) * (t - 1) ** 2 + 1,
    24: (t: number) => 1 - 2 ** (-10 * t) * Math.cos(t * Math.PI / .15),
    25: (t: number) => 2 ** (10 * (t - 1)) * Math.cos((t - 1) * Math.PI / .15),
    26: (t: number) => ((t *= 11) < 4 ? t ** 2 : t < 8 ? (t - 6) ** 2 + 12 : t < 10 ? (t - 9) ** 2 + 15 : (t - 10.5) ** 2 + 15.75) / 16,
    27: (t: number) => 1 - easingFuncs[26](1 - t),
    28: (t: number) => (t *= 2) < 1 ? easingFuncs[26](t) / 2 : easingFuncs[27](t - 1) / 2 + .5,
    29: (t: number) => t < .5 ? 2 ** (20 * t - 11) * Math.sin((160 * t + 1) * Math.PI / 18) : 1 - 2 ** (9 - 20 * t) * Math.sin((160 * t + 1) * Math.PI / 18)
} as const;

export enum EasingType {
    Linear = 1,
    OutSine, InSine, OutQuad, InQuad, IOSine, IOQuad,
    OutCubic, InCubic, OutQuart, InQuart, IOCubic, IOQuart,
    OutQuint, InQuint, OutExpo, InExpo,
    OutCirc, InCirc, OutBack, InBack, IOCirc, IOBack,
    OutElastic, InElastic, OutBounce, InBounce, IOBounce, IOElastic
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

export function cubicBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
    return function (t: number) {
        t = clamp(t, 0, 1);
        const x = Math.pow(1 - t, 3) * p1x + 3 * Math.pow(1 - t, 2) * t * p2x + 3 * (1 - t) * Math.pow(t, 2) * (1 - p2x) + Math.pow(t, 3) * (1 - p1x);
        const y = Math.pow(1 - t, 3) * p1y + 3 * Math.pow(1 - t, 2) * t * p2y + 3 * (1 - t) * Math.pow(t, 2) * (1 - p2y) + Math.pow(t, 3) * (1 - p1y);
        if (x == x)
            return y;
        else
            return y;
    };
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