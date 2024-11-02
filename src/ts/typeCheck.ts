export function isNumber(value: unknown) {
    return typeof value === "number";
}
export function isString(value: unknown) {
    return typeof value === "string";
}
export function isBoolean(value: unknown) {
    return typeof value == 'boolean';
}
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}
export function isObject(value: unknown) {
    return typeof value == 'object' && value != null;
}
export function isArrayOf2Numbers(value: unknown): value is [number, number] {
    return isArray(value) && value.length == 2 && isNumber(value[0]) && isNumber(value[1]);
}
export function isArrayOf3Numbers(value: unknown): value is [number, number, number] {
    return isArray(value) && value.length == 3 && isNumber(value[0]) && isNumber(value[1]) && isNumber(value[2]);
}
export function isArrayOf4Numbers(value: unknown): value is [number, number, number, number] {
    return isArray(value) && value.length == 4 && isNumber(value[0]) && isNumber(value[1]) && isNumber(value[2]) && isNumber(value[3]);
}