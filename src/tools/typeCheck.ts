import { isArray, isNumber } from "lodash";

export type ArrayRepeat<S, N extends number, Acc extends S[] = []> = Acc['length'] extends N ? Acc : ArrayRepeat<S, N, [...Acc, S]>;
export type Add<A extends number, B extends number> = [...ArrayRepeat<number, A>, ...ArrayRepeat<number, B>]['length'];
export type NumberString = `${number}`;
export type BigIntString = `${bigint}`;
export type StringStartsWith<S extends string> = `${S}${string}`;
export type StringEndsWith<S extends string> = `${string}${S}`;
export type StringContains<S extends string> = `${string}${S}${string}`;
export function isArrayOfNumbers<N extends number>(value: unknown, count?: N): value is ArrayRepeat<number, N> {
    if (!isArray(value)) return false;
    if (count != undefined && value.length != count) return false;
    return value.every(isNumber);
}