/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import FileUtils from "@/tools/fileUtils";

/** 时间戳的编码进制 */
const TIMESTAMP_ENCODING_BASE = 36;

class ChartIdCreator {
    /**
     * 随机生成一个谱面ID，格式为 `<谱面名称>-<8位随机字符>`。
     * @param name 谱面名称
     * @returns 随机生成的谱面ID
     */
    createRandomChartId(name: string) {
        // 把name中不能作为文件名的字符替换掉
        name = name.replace(FileUtils.CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX, "");

        // 把name中的空格替换为下划线
        name = name.replace(/\s/g, "_");

        const time = Math.round(Date.now()).toString(TIMESTAMP_ENCODING_BASE);
        return `${name}-${time}`;
    }
}
export default new ChartIdCreator();