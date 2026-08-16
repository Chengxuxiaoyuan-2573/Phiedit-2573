/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

const modulusCache = new Map<number, bigint>();

function getModulus(digits: number): bigint {
    if (!modulusCache.has(digits)) {
        modulusCache.set(digits, BigInt(10) ** BigInt(digits));
    }
    return modulusCache.get(digits)!;
}

export function hashToDigits(str: string, digits: number): string {
    // 边界处理
    if (digits <= 0) return "";

    // 1. 64位 FNV-1a 哈希（替代你原来的 32位 DJB2）
    let hash = BigInt("0xCBF29CE484222325");
    const PRIME = BigInt("0x100000001B3");
    const MASK = BigInt("0xFFFFFFFFFFFFFFFF");

    const bytes = new TextEncoder().encode(str);
    for (const byte of bytes) {
        hash ^= BigInt(byte);
        hash = hash * PRIME & MASK;
    }

    // 2. 取模 10^digits
    const modulus = getModulus(digits);
    const result = hash % modulus;

    // 3. 补零至指定长度
    return result.toString().padStart(digits, "0");
}