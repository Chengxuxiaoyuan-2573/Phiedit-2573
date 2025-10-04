/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "@/managers/renderer/abstract";
import filesManager from "./files";
import fs from "fs";
import Constants from "@/constants";

class ChartInfoManager extends Manager {
    /** 谱面信息文件的文件名 */
    readonly INFO_FILE_NAME = "info.txt";
    constructor() {
        super();
    }
    private async parse(info: string): Promise<ChartInfo> {
        const lines = info.split(/[\r\n]+/g);
        const infoObj = {
            name: "unknown",
            charter: "unknown",
            composer: "unknown",
            illustration: "unknown",
            level: "SP Lv.?",
            chart: "chart.json",
            song: "music.mp3",
            picture: "background.png",
        };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let [key, value] = line.split(":");
            if (!key || !value) continue;
            key = key.trim();
            value = value.trim();
            key = key.toLowerCase();
            if (key === "name") infoObj.name = value;
            else if (key === "charter") infoObj.charter = value;
            else if (key === "composer") infoObj.composer = value;
            else if (key === "illustration") infoObj.illustration = value;
            else if (key === "level") infoObj.level = value;
            else if (key === "chart") infoObj.chart = value;
            else if (key === "song") infoObj.song = value;
            else if (key === "picture") infoObj.picture = value;
        }
        return infoObj;
    }
    private async format(infoObj: ChartInfo) {
        const info = `#\nName: ${infoObj.name}\nCharter: ${infoObj.charter}\nComposer: ${infoObj.composer}\nIllustration: ${infoObj.illustration}\nLevel: ${infoObj.level}\nChart: ${infoObj.chart}\nSong: ${infoObj.song}\nPicture: ${infoObj.picture}\n`;
        return info;
    }

    private async readChartInfoAsString(chartId: string) {
        const info = await fs.promises.readFile(filesManager.getChartPath(chartId, this.INFO_FILE_NAME), Constants.ENCODING);
        return info;
    }

    async readChartInfo(chartId: string) {
        const text = this.parse(await this.readChartInfoAsString(chartId));
        return text;
    }

    async writeChartInfo(chartId: string, newInfo: Omit<ChartInfo, "song" | "background" | "chart">) {
        const info = await this.parse(await this.readChartInfoAsString(chartId));
        info.name = newInfo.name;
        info.charter = newInfo.charter;
        info.composer = newInfo.composer;
        info.illustration = newInfo.illustration;
        info.level = newInfo.level;
        return await fs.promises.writeFile(filesManager.getChartPath(chartId, this.INFO_FILE_NAME), await this.format(info));
    }
}
export interface ChartInfo {
    name: string,
    charter: string,
    composer: string,
    illustration: string,
    level: string,
    chart: string,
    song: string,
    picture: string
}
export default new ChartInfoManager();