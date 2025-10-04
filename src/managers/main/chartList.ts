/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isString } from "lodash";
import path from "path";
import fs from "fs";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import FileUtils from "@/tools/fileUtils";
import Constants from "@/constants";

class ChartListManager extends Manager {
    /** 谱面列表的文件，绝对路径 */
    private readonly chartListFile: string;

    constructor() {
        super();
        this.chartListFile = path.join(filesManager.chartFoldersDir, "list.json");
        if (!fs.existsSync(this.chartListFile)) {
            fs.writeFileSync(this.chartListFile, "[]");
        }
    }
    async readChartList(): Promise<string[]> {
        const text = await fs.promises.readFile(this.chartListFile, Constants.ENCODING);
        try {
            const chartList = JSON.parse(text);
            if (!Array.isArray(chartList)) {
                throw new Error("chartList 读取失败，因为 chartList 不是数组");
            }

            if (!chartList.every(isString)) {
                throw new Error("chartList 读取失败，因为 chartList 中有非字符串的元素");
            }
            return chartList;
        }
        catch {
            return [];
        }
    }
    async saveChartList(chartList: string[]) {
        return fs.promises.writeFile(this.chartListFile, JSON.stringify(chartList));
    }
    async addIdToChartList(chartId: string) {
        const chartList: string[] = await this.readChartList();

        // 在开头插入chartId
        chartList.splice(0, 0, chartId);
        this.saveChartList(chartList);
    }

    async modifyIdInChartList(chartId: string, newChartId: string) {
        if (!FileUtils.canBeFileName(newChartId)) {
            throw new Error(`无法修改谱面 ID 为 "${newChartId}"，因为它不能被用作文件名`);
        }
        fs.promises.rename(filesManager.getChartPath(chartId), filesManager.getChartPath(newChartId));
        const chartList: string[] = await this.readChartList();
        const index = chartList.indexOf(chartId);
        if (index !== -1) {
            chartList[index] = newChartId;
            this.saveChartList(chartList);
        }
        else {
            throw new Error(`未找到谱面ID：${chartId}`);
        }
    }

    async deleteIdFromChartList(chartId: string) {
        const chartList: string[] = await this.readChartList();

        // 删除chartId
        const index = chartList.indexOf(chartId);
        if (index !== -1) {
            chartList.splice(index, 1);
            this.saveChartList(chartList);
        }
        else {
            throw new Error(`未找到谱面ID：${chartId}`);
        }
    }
}

export default new ChartListManager();