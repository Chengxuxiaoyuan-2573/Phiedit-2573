/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * 官方谱面格式（Phigros Official）解析时用到的一些工具函数，
 * 用于统一「读取字段 → 校验 → 记录错误 → 使用默认值」这一流程。
 */

import { isArray, isNumber } from "lodash";

/** 把未知值转为可索引的对象，若不是对象则返回 null */
export function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === "object" && value !== null && !isArray(value)) {
        return value as Record<string, unknown>;
    }
    return null;
}

/**
 * 读取一个必填的数字字段。缺失或类型错误时向 `errors` 中写入错误信息，并返回默认值。
 * @param source 被读取的对象
 * @param key 字段名
 * @param defaultValue 默认值
 * @param errors 收集错误信息的数组
 * @param context 错误信息的前缀，例如 `第0号判定线 notesAbove[2]`
 * @param subject 错误信息的主语，例如 `音符`
 */
export function readRequiredNumber(
    source: Record<string, unknown>,
    key: string,
    defaultValue: number,
    errors: string[],
    context: string,
    subject: string
): number {
    if (key in source) {
        const value = source[key];
        if (isNumber(value)) {
            return value;
        }
        errors.push(`${context}：${subject}的 ${key} 属性必须是数字，但读取到了 ${value}。将会被设为默认值 ${defaultValue}。`);
    }
    else {
        errors.push(`${context}：${subject}缺少 ${key} 属性。将会被设为默认值 ${defaultValue}。`);
    }
    return defaultValue;
}

/**
 * 读取一个选填的数字字段。缺失时静默使用默认值，仅在类型错误时记录错误信息。
 */
export function readOptionalNumber(
    source: Record<string, unknown>,
    key: string,
    defaultValue: number,
    errors: string[],
    context: string,
    subject: string
): number {
    if (!(key in source)) {
        return defaultValue;
    }

    const value = source[key];

    // 官方谱面中高版本会省略一些字段，此时可能为 null，视为未填写
    if (value === null || value === undefined) {
        return defaultValue;
    }

    if (isNumber(value)) {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是数字，但读取到了 ${value}。将会被设为默认值 ${defaultValue}。`);
    return defaultValue;
}

/**
 * 读取一个数组字段。属性不存在或为 null 时返回 undefined（视为空数组，不记录错误）；
 * 类型错误时记录错误信息并返回 undefined。
 */
export function readArrayField(
    source: Record<string, unknown>,
    key: string,
    errors: string[],
    context: string,
    subject: string
): unknown[] | undefined {
    if (!(key in source)) {
        return undefined;
    }

    const value = source[key];

    // 官方谱面在数组为空时通常直接省略该字段，也可能写成 null
    if (value === null || value === undefined) {
        return undefined;
    }

    if (isArray(value)) {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是数组，但读取到了 ${value}。将会被设为空数组。`);
    return undefined;
}

/** 读取一个选填的布尔字段 */
export function readOptionalBoolean(
    source: Record<string, unknown>,
    key: string,
    defaultValue: boolean,
    errors: string[],
    context: string,
    subject: string
): boolean {
    if (!(key in source)) {
        return defaultValue;
    }

    const value = source[key];

    if (value === null || value === undefined) {
        return defaultValue;
    }

    if (typeof value === "boolean") {
        return value;
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是布尔值，但读取到了 ${value}。将会被设为默认值 ${defaultValue}。`);
    return defaultValue;
}

/**
 * 读取一个形如 { x: number, y: number } 的坐标字段。
 * 官方谱面中该字段在部分场景下也可能直接写成两个数字的数组。
 */
export function readCoordinate(
    source: Record<string, unknown>,
    key: string,
    errors: string[],
    context: string,
    subject: string,
    defaultValue: [number, number] = [0, 0]
): [number, number] {
    if (!(key in source)) {
        return [...defaultValue];
    }

    const value = source[key];
    const record = asRecord(value);

    if (record && isNumber(record.x) && isNumber(record.y)) {
        return [record.x, record.y];
    }

    if (isArray(value) && value.length === 2 && isNumber(value[0]) && isNumber(value[1])) {
        return [value[0], value[1]];
    }

    errors.push(`${context}：${subject}的 ${key} 属性必须是含有 x、y 两个数字的对象，但读取到了 ${JSON.stringify(value)}。将会被设为默认值 [${defaultValue[0]}, ${defaultValue[1]}]。`);
    return [...defaultValue];
}
