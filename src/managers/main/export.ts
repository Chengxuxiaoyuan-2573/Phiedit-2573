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
import { Chart } from "@/models/rpe/chart";
import { baseEventTypes } from "@/models/rpe/eventLayer";
import { hashToDigits } from "@/tools/hash";
import { app } from "electron";

const DIGITS = 12;

/** 文件名中不允许出现的字符 */
const INVALID_FILE_NAME_CHARS_REGEX = /[\\/:*?"<>|]/;

export interface BatchExportRequest {
    chartId: string;

    /** 导出的文件名，可以带后缀名，会原样使用 */
    fileName: string;
}

class ExportChartManager extends Manager {
    async export(chartId: string, targetPath: string) {
        const chartDir = filesManager.getChartPath(chartId);
        const exportTempPath = filesManager.getTempPath("chartExport", chartId);

        // 确保目录存在。先清空，避免上一次导出残留的文件被打进压缩包里
        await fs.promises.rm(exportTempPath, { recursive: true, force: true });
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

    /**
     * 读取导出文件夹的信息，用于在导出前检查文件名冲突
     * @param folderPath 导出文件夹
     * @returns 文件夹是否存在，以及文件夹内已有的文件名
     */
    async readFolderInfo(folderPath: string) {
        try {
            const stat = await fs.promises.stat(folderPath);
            if (!stat.isDirectory()) {
                return { exists: false, files: [] as string[] };
            }

            const files = await fs.promises.readdir(folderPath);
            return { exists: true, files };
        }
        catch {
            // 路径不存在或者无法访问
            return { exists: false, files: [] as string[] };
        }
    }

    /**
     * 批量导出谱面。文件夹不存在时会自动创建。
     * @param folderPath 导出到的文件夹
     * @param requests 每个谱面的 ID 和导出后的文件名
     */
    async batchExport(folderPath: string, requests: BatchExportRequest[]) {
        const dir = folderPath.trim();
        if (dir === "") {
            throw new Error("导出文件夹不能为空");
        }

        // 文件名之间不能重复（Windows 的文件名不区分大小写）
        const lowerNames = requests.map(request => request.fileName.trim().toLowerCase());
        if (new Set(lowerNames).size !== lowerNames.length) {
            throw new Error("存在重复的导出文件名");
        }

        // 校验每个文件名本身是否合法
        for (const request of requests) {
            const fileName = request.fileName.trim();
            if (fileName === "") {
                throw new Error("导出文件名不能为空");
            }

            if (INVALID_FILE_NAME_CHARS_REGEX.test(fileName)) {
                throw new Error(`导出文件名 "${fileName}" 中含有非法字符`);
            }

            if (/[. ]$/.test(fileName)) {
                throw new Error(`导出文件名 "${fileName}" 不能以空格或点结尾`);
            }
        }

        // 不能与文件夹内已有的文件重名
        const info = await this.readFolderInfo(dir);
        if (info.exists) {
            const existingNames = new Set(info.files.map(name => name.toLowerCase()));
            const conflicts = requests
                .map(request => request.fileName.trim())
                .filter(fileName => existingNames.has(fileName.toLowerCase()));
            if (conflicts.length > 0) {
                throw new Error(`文件夹内已存在同名文件：${conflicts.join("、")}`);
            }
        }

        // 文件夹不存在时自动创建
        await fs.promises.mkdir(dir, { recursive: true });

        for (const request of requests) {
            await this.export(request.chartId, path.join(dir, request.fileName.trim()));
        }
    }
}
export default new ExportChartManager();