/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

/**
 * 把一个日期对象格式化为字符串
 * @param date Date 对象
 * @param fmt 格式，例如 `"YYYY/MM/DD HH:mm:ss:SSS"`
 * @returns 格式化后的字符串
 */
export function formatDate(date: Date, fmt: string) {
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");

    const map: Record<string, string> = {
        YYYY: pad(date.getFullYear()),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
        SSS: pad(date.getMilliseconds(), 3),
    };

    return fmt.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, m => map[m]);
}