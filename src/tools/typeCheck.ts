import { isArray, isNumber } from "lodash";

export type ArrayRepeat<S, N extends number, Acc extends S[] = []> = Acc['length'] extends N ? Acc : ArrayRepeat<S, N, [...Acc, S]>;

export function isArrayOfNumbers<N extends number>(value: unknown, count?: N): value is ArrayRepeat<number, N> {
    if (!isArray(value)) return false;
    if (count != undefined && value.length != count) return false;
    return value.every(isNumber);
}