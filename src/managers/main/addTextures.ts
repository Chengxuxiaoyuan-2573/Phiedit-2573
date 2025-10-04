/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import FileUtils from "@/tools/fileUtils";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import path from "path";
import fs from "fs";

class AddTexturesManager extends Manager {
    async addTextures(chartId: string, texturePaths: string[]) {
        const textureArrayBuffers: Record<string, ArrayBufferLike> = {};
        const promises = [];
        for (const texturePath of texturePaths) {
            if (!FileUtils.isImage(texturePath)) {
                throw new Error(`${texturePath} 不是图片文件`);
            }

            const chartDir = filesManager.getChartPath(chartId);

            // 把图片文件复制到chartDir下
            promises.push(fs.promises.copyFile(texturePath, path.join(chartDir, path.basename(texturePath))));
            const textureFile = await fs.promises.readFile(texturePath);
            const textureArrayBuffer = textureFile.buffer;
            textureArrayBuffers[path.basename(texturePath)] = textureArrayBuffer;
        }
        await Promise.all(promises);
        return textureArrayBuffers;
    }
}
export default new AddTexturesManager();