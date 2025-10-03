/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
import store from "@/store";

export default class ExportManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("EXPORT", createCatchErrorByMessage(async (targetPath) => {
            if (!targetPath) throw new Error("未选择保存路径");
            await this.export(targetPath);
        }, "导出"));
    }
    export(targetPath: string) {
        const chartId = store.getChartId();
        return window.electronAPI.exportChart(chartId, targetPath);
    }
}