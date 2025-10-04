/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import path from "path";
import Manager from "../renderer/abstract";
import chartInfoManager from "./chartInfo";
import filesManager from "./files";
import fs from "fs";
import Constants from "@/constants";

class SaveChartManager extends Manager {
    async saveChart(chartId: string, chartContent: string, extraContent: string) {
        const folderPath = filesManager.getChartPath(chartId);
        const chartInfo = await chartInfoManager.readChartInfo(chartId);
        const chartPath = chartInfo.chart;
        const chartWholePath = path.join(folderPath, chartPath);
        const extraWholePath = path.join(folderPath, "extra.json");
        fs.writeFileSync(chartWholePath, chartContent, Constants.ENCODING);
        fs.writeFileSync(extraWholePath, extraContent, Constants.ENCODING);
    }
}
export default new SaveChartManager();