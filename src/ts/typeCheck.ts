import { isArray, isNumber } from "lodash";
import { ArrayRepeat } from "./typeDefinitions";

export { isNumber, isArray, isString, isBoolean, isEmpty, isFunction, isSymbol, isObject } from "lodash";

export function isArrayOfNumbers<N extends number>(value: unknown, count?: N): value is ArrayRepeat<number, N> {
    if (!isArray(value)) return false;
    if (count != undefined && value.length != count) return false;
    return value.every(isNumber);
}