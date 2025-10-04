/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import FileUtils from "@/tools/fileUtils";
import path from "path";
import Manager from "../renderer/abstract";
import fs from "fs";
import filesManager from "./files";
import chartInfoManager from "./chartInfo";
import Constants from "@/constants";

class LoadManager extends Manager {
    /** 加载判定线贴图 */
    async loadTextures(chartId: string) {
        const folderPath = filesManager.getChartPath(chartId);
        const texturePaths = [];
        const allFiles = await fs.promises.readdir(folderPath);
        for (const fileName of allFiles) {
            if (FileUtils.isImage(fileName)) {
                texturePaths.push(fileName);
            }
        }
        return texturePaths;
    }
    async loadChart(chartId: string) {
        const folderPath = filesManager.getChartPath(chartId);
        const { song: musicPath, picture: backgroundPath, chart: chartPath } = await chartInfoManager.readChartInfo(chartId);
        const texturePaths = await this.loadTextures(chartId);

        const musicWholePath = path.join(folderPath, musicPath);
        const backgroundWholePath = path.join(folderPath, backgroundPath);
        const chartWholePath = path.join(folderPath, chartPath);
        const textureWholePaths = texturePaths.map(texturePath => path.join(folderPath, texturePath));
        const extraPath = path.join(folderPath, "extra.json");

        const musicData = await fs.promises.readFile(musicWholePath);
        const backgroundData = await fs.promises.readFile(backgroundWholePath);
        const chartContent = await fs.promises.readFile(chartWholePath, Constants.ENCODING).catch(() => "");
        const textureDatas = await Promise.all(textureWholePaths.map(texturePath => fs.promises.readFile(texturePath)));
        const extraContent = await fs.promises.readFile(extraPath, Constants.ENCODING).catch(() => "");

        // 将texturePaths和textureDatas合并为一个对象
        const textures: Record<string, ArrayBuffer> = {};
        texturePaths.forEach((path, index) => {
            textures[path] = textureDatas[index].buffer as ArrayBuffer;
        });

        return {
            musicData: musicData.buffer,
            backgroundData: backgroundData.buffer,
            chartContent,
            textures,
            extraContent
        };
    }
}
export default new LoadManager();