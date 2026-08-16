/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Chart } from "@/models/chart";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import fs from "fs";
import { BPM } from "@/models/beats";
import path from "path";
import chartListManager from "./chartList";
import chartIdCreator from "./chartIdCreator";
import { app } from "electron";

class AddChartManager extends Manager {
    async addChart(musicPath: string, backgroundPath: string, name: string) {
        const chartId = chartIdCreator.createRandomChartId(name);
        const chartDir = filesManager.getChartPath(chartId);
        fs.mkdirSync(chartDir);

        const chart = this.createAnEmptyChart(name);

        const musicExt = path.extname(musicPath);
        const backgroundExt = path.extname(backgroundPath);
        const chartExt = ".json";

        const promises = [
            fs.promises.copyFile(musicPath, path.join(chartDir, chartId + musicExt)),
            fs.promises.copyFile(backgroundPath, path.join(chartDir, chartId + backgroundExt)),
            fs.promises.writeFile(path.join(chartDir, chartId + chartExt), JSON.stringify(chart.toObject())),
            fs.promises.writeFile(path.join(chartDir, "info.txt"), `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${chartId + musicExt}\nPicture: ${chartId + backgroundExt}\nChart: ${chartId + ".json"}`)
        ];
        chartListManager.addIdToChartList(chartId);
        await Promise.all(promises);
        return chartId;
    }

    /** 创建一个空的谱面 */
    private createAnEmptyChart(chartName: string) {
        const lines = 24;
        const chart = new Chart(lines, app.getVersion());
        chart.BPMList.push(new BPM({
            bpm: 120,
            startTime: [0, 0, 1]
        }));
        chart.META.name = chartName;

        chart.judgeLineList[0].eventLayers[0].moveYEvents[0].start = -250;
        chart.judgeLineList[0].eventLayers[0].moveYEvents[0].end = -250;
        chart.judgeLineList[0].eventLayers[0].alphaEvents[0].start = 255;
        chart.judgeLineList[0].eventLayers[0].alphaEvents[0].end = 255;

        return chart;
    }
}
export default new AddChartManager();