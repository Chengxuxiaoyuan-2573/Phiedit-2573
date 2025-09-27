import { isString } from "lodash";
import { Typeof } from "./typeTools";

/**
 * 用于给输入的数据进行检查，类似于 Python 中的 assert 语句
 */
export default class Assertion {
    value: unknown;
    constructor(value: unknown) {
        this.value = value;
    }
    is(type: Typeof | (new () => unknown)) {
        if (isString(type)) {
            if (typeof this.value !== type) {
                throw new Error(`${this.value} is not of ${type} type`);
            }
        }
        else {
            if (!(this.value instanceof type)) {
                throw new Error(`${this.value} is not of ${type.name} type`);
            }
        }
        return this;
    }
    max(max: number) {
        if (this.value as number > max) {
            throw new Error(`${this.value} is greater than ${max}`);
        }
        return this;
    }
    min(min: number) {
        if (this.value as number < min) {
            throw new Error(`${this.value} is less than ${min}`);
        }
        return this;
    }
    integer() {
        if (!Number.isInteger(this.value)) {
            throw new Error(`${this.value} is not integer`);
        }
        return this;
    }
    nonZero() {
        if (this.value === 0) {
            throw new Error(`${this.value} is zero`);
        }
        return this;
    }
    notNaN() {
        if (Number.isNaN(this.value)) {
            throw new Error(`${this.value} is NaN`);
        }
        return this;
    }
    notEmpty() {
        if (this.value === undefined || this.value === null) {
            throw new Error(`${this.value} is empty`);
        }
        return this;
    }
    finite() {
        if (!Number.isFinite(this.value)) {
            throw new Error(`${this.value} is not finite`);
        }
        return this;
    }
    positive() {
        if (this.value as number <= 0) {
            throw new Error(`${this.value} is not positive`);
        }
        return this;
    }
    negative() {
        if (this.value as number >= 0) {
            throw new Error(`${this.value} is not negative`);
        }
        return this;
    }
    safeNumber() {
        if (this.value as number < Number.MIN_SAFE_INTEGER || this.value as number > Number.MAX_SAFE_INTEGER) {
            throw new Error(`${this.value} is not a safe number`);
        }
        return this;
    }
    notEmptyString() {
        if (this.value === "") {
            throw new Error(`${this.value} is an empty string`);
        }
        return this;
    }
    notEmptyArray() {
        if ((this.value as Array<unknown>).length === 0) {
            throw new Error(`${this.value} is an empty array`);
        }
        return this;
    }
    hasLengthOf(length: number) {
        if ((this.value as Array<unknown>).length !== length) {
            throw new Error(`${this.value} doesn't have a length of ${length}`);
        }
        return this;
    }
    hasProperty(property: string) {
        if (!Object.prototype.hasOwnProperty.call(this.value, property)) {
            throw new Error(`${this.value} doesn't have a property of ${property}`);
        }
        return this;
    }
    assertRegex(regex: RegExp) {
        if (!regex.test(this.value as string)) {
            throw new Error(`${this.value} is not valid according to the regex ${regex}`);
        }
        return this;
    }
}