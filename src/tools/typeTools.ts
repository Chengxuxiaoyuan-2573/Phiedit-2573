import { isArray, isNumber } from "lodash";

export type ArrayRepeat<S, N extends number, Acc extends S[] = []> = Acc["length"] extends N ? Acc : ArrayRepeat<S, N, [...Acc, S]>;
type UK = unknown;
export type Add<A extends number, B extends number> = [...ArrayRepeat<UK, A>, ...ArrayRepeat<UK, B>]["length"];
export type Sub<A extends number, B extends number, Acc extends UK[] = ArrayRepeat<UK, B>, Bcc extends UK[] = []> = Acc["length"] extends A ? Bcc["length"] : Sub<A, B, [...Acc, UK], [...Bcc, UK]>;
export type Mul<A extends number, B extends number, Acc extends UK[] = [], Bcc extends UK[] = []> = Bcc["length"] extends B ? Acc["length"] : Mul<A, B, [...Acc, ...ArrayRepeat<UK, A>], [...Bcc, UK]>;
export type NumberString = `${number}`;
export type BigIntString = `${bigint}`;
export type StringStartsWith<S extends string> = `${S}${string}`;
export type StringEndsWith<S extends string> = `${string}${S}`;
export type StringContains<S extends string> = `${string}${S}${string}`;
export type StringConcat<S extends string, T extends string> = `${S}${T}`;

/** 把 T 中的 A 属性变为可选 */
export type Optional<T, A extends keyof T> = Omit<T, A> & Partial<Pick<T, A>>;

/** 把 T 中的 A 属性变为 B 类型 */
export type Replace<T, A extends keyof T, B> = Omit<T, A> & { [K in A]: B };

/** 把 T 中的所有属性都变为必选 */
export type Required<T> = { [K in keyof T]-?: T[K] };

/** 把 T 中的每个属性都取消只读 */
export type NotReadonly<T> = { -readonly [P in keyof T]: T[P] };

/** typeof 表达式可能返回的值类型 */
export type Typeof = "number" | "string" | "boolean" | "object" | "function" | "symbol" | "undefined" | "bigint";

export type BasicType = string | number | boolean | bigint | symbol | null | undefined;
export type BasicArray = (BasicType | BasicObject | BasicArray)[];
export type BasicObject = {
    [key: string]: BasicType | BasicObject | BasicArray
}

/** 深度搜索把每个属性都变为可选 */
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

/** 深度搜索把每个属性都变为只读 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/** 深度搜索把每个属性都变为非只读 */
export type DeepNotReadonly<T> = {
    -readonly [P in keyof T]: DeepNotReadonly<T[P]>;
};

/** 从联合类型 T 中筛选出与 U 兼容的类型 */
export type Filter<T, U> = T extends U ? T : never;

/** 判断两个类型是否相等 */
export type IsEqual<T, U> = [T] extends [U] ? [U] extends [T] ? true : false : false;

/** 创建一个键值对象，其中所有属性都是可选的 */
export type PartialRecord<K extends string | number | symbol, V> = { [P in K]?: V };

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 把联合类型中的所有类型提取为一个数组 */
export type UnionToTuple<T> =
    UnionToIntersection<T extends any ? (t: T) => T : never> extends (_: any) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : [];

/** 把联合类型变为交叉类型 */
export type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void)
    ? I
    : never;

/* eslint-enable @typescript-eslint/no-explicit-any */

export type NotEmpty = NonNullable<unknown>;

/* eslint-disable no-magic-numbers, no-loss-of-precision */
export type Infinity = 1e114514;
export type NegativeInfinity = -1e114514;
export type NaN = typeof NaN;
/* eslint-enable no-magic-numbers, no-loss-of-precision */

export function isArrayOf<T>(value: unknown, ...types: (Typeof | (new (...args: unknown[]) => T))[]): value is T[] {
    return Array.isArray(value) && value.every(item => types.some(type => {
        if (typeof type === "string") {
            return typeof item === type;
        }
        else {
            return item instanceof type;
        }
    }));
}

export function isArrayOfNumbers<N extends number>(value: unknown, count?: N): value is ArrayRepeat<number, N> {
    // 如果连数组都不是的话，就返回 false
    if (!isArray(value)) return false;

    // 如果长度不匹配，就返回 false
    if (count !== undefined && value.length !== count) return false;

    // 判断数组中的元素是否都是数字
    return value.every(isNumber);
}

export function isTruthy(value: unknown) {
    return value ? true : false;
}

export function isFalsy(value: unknown): value is false | 0 | "" | null | undefined | NaN {
    return !value;
}

export function isBasicType(value: unknown): value is BasicType {
    if (value === null) return true;
    return !(typeof value === "object" || typeof value === "function");
}