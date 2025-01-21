import { clamp } from "lodash";

type SimpleFunction = (t: number) => number;
export const easingFuncs: Record<EasingType, SimpleFunction> = {
    1: (t) => t,
    2: (t) => Math.sin(t * Math.PI / 2),
    3: (t) => 1 - Math.cos(t * Math.PI / 2),
    4: (t) => 1 - (t - 1) ** 2,
    5: (t) => t ** 2,
    6: (t) => (1 - Math.cos(t * Math.PI)) / 2,
    7: (t) => ((t *= 2) < 1 ? t ** 2 : -((t - 2) ** 2 - 2)) / 2,
    8: (t) => 1 + (t - 1) ** 3,
    9: (t) => t ** 3,
    10: (t) => 1 - (t - 1) ** 4,
    11: (t) => t ** 4,
    12: (t) => ((t *= 2) < 1 ? t ** 3 : (t - 2) ** 3 + 2) / 2,
    13: (t) => ((t *= 2) < 1 ? t ** 4 : -((t - 2) ** 4 - 2)) / 2,
    14: (t) => 1 + (t - 1) ** 5,
    15: (t) => t ** 5,
    16: (t) => 1 - 2 ** (-10 * t),
    17: (t) => 2 ** (10 * (t - 1)),
    18: (t) => Math.sqrt(1 - (t - 1) ** 2),
    19: (t) => 1 - Math.sqrt(1 - t ** 2),
    20: (t) => (2.70158 * t - 1) * (t - 1) ** 2 + 1,
    21: (t) => (2.70158 * t - 1.70158) * t ** 2,
    22: (t) => ((t *= 2) < 1 ? 1 - Math.sqrt(1 - t ** 2) : Math.sqrt(1 - (t - 2) ** 2) + 1) / 2,
    23: (t) => t < .5 ? (14.379638 * t - 5.189819) * t ** 2 : (14.379638 * t - 9.189819) * (t - 1) ** 2 + 1,
    24: (t) => 1 - 2 ** (-10 * t) * Math.cos(t * Math.PI / .15),
    25: (t) => 2 ** (10 * (t - 1)) * Math.cos((t - 1) * Math.PI / .15),
    26: (t) => ((t *= 11) < 4 ? t ** 2 : t < 8 ? (t - 6) ** 2 + 12 : t < 10 ? (t - 9) ** 2 + 15 : (t - 10.5) ** 2 + 15.75) / 16,
    27: (t) => 1 - easingFuncs[26](1 - t),
    28: (t) => (t *= 2) < 1 ? easingFuncs[26](t) / 2 : easingFuncs[27](t - 1) / 2 + .5,
    29: (t) => t < .5 ? 2 ** (20 * t - 11) * Math.sin((160 * t + 1) * Math.PI / 18) : 1 - 2 ** (9 - 20 * t) * Math.sin((160 * t + 1) * Math.PI / 18)
};

export enum EasingType {
    Linear = 1,
    SineOut, SineIn, QuadOut, QuadIn, SineInOut, QuadInOut,
    CubicOut, CubicIn, QuartOut, QuartIn, CubicInOut, QuartInOut,
    QuintOut, QuintIn, ExpoOut, ExpoIn,
    CircOut, CircIn, BackOut, BackIn, CircInOut, BackInOut,
    ElasticOut, ElacticIn, BounceOut, BounceIn, BounceIO, ElasticIO
}

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
