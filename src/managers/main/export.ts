/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "../renderer/abstract";
import filesManager from "./files";
import chartInfoManager from "./chartInfo";
import fs from "fs";
import path from "path";
import Constants from "@/constants";
import { Chart } from "@/models/chart";
import { baseEventTypes } from "@/models/eventLayer";
import { hashToDigits } from "@/tools/hash";
import { app } from "electron";

const DIGITS = 12;

class ExportChartManager extends Manager {
    async export(chartId: string, targetPath: string) {
        const chartDir = filesManager.getChartPath(chartId);
        const exportTempPath = filesManager.getTempPath("chartExport", chartId);

        // 确保目录存在
        await fs.promises.mkdir(exportTempPath, { recursive: true });

        // 复制
        await fs.promises.cp(chartDir, exportTempPath, { recursive: true });

        // 清除掉所有的被禁用的事件
        const infoPath = path.join(exportTempPath, chartInfoManager.INFO_FILE_NAME);
        const infoText = await fs.promises.readFile(infoPath, Constants.ENCODING);
        const info = await chartInfoManager.parse(infoText);

        const chartPath = path.join(exportTempPath, info.chart);
        const musicPath = path.join(exportTempPath, info.song);
        const backgroundPath = path.join(exportTempPath, info.picture);

        const chartText = await fs.promises.readFile(chartPath, Constants.ENCODING);
        const chart = new Chart(JSON.parse(chartText), app.getVersion());
        for (const judgeLine of chart.judgeLineList) {
            for (const eventLayer of judgeLine.eventLayers) {
                for (const type of baseEventTypes) {
                    const eventList = eventLayer.getEventsByType(type);
                    for (let i = eventList.length - 1; i >= 0; i--) {
                        const event = eventList[i];
                        if (event.isDisabled) {
                            eventList.splice(i, 1);
                        }
                    }
                }
            }
        }

        const newChart = chart.toObject();
        await fs.promises.writeFile(chartPath, JSON.stringify(newChart));

        // （偷偷说一句，RPE真的太难支持了，文件格式稍微不对就会出问题）
        const number = "2573" + hashToDigits(chartId, DIGITS).toString();
        const musicExt = path.extname(info.song);
        const backgroundExt = path.extname(info.picture);
        const chartExt = path.extname(info.chart);
        const newMusicName = number + musicExt;
        const newBackgroundName = number + backgroundExt;
        const newChartName = number + chartExt;
        const newMusicPath = path.join(exportTempPath, newMusicName);
        const newBackgroundPath = path.join(exportTempPath, newBackgroundName);
        const newChartPath = path.join(exportTempPath, newChartName);
        await Promise.all([
            fs.promises.rename(chartPath, newChartPath),
            fs.promises.rename(musicPath, newMusicPath),
            fs.promises.rename(backgroundPath, newBackgroundPath),
        ]);
        info.chart = newChartName;
        info.picture = newBackgroundName;
        info.song = newMusicName;
        info.path = number;
        await fs.promises.writeFile(infoPath, await chartInfoManager.format(info));

        const data = await filesManager.packageFolderToZip(exportTempPath);
        await fs.promises.writeFile(targetPath, data);
    }
}
export default new ExportChartManager();