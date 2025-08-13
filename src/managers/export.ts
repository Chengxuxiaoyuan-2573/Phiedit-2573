import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
import store from "@/store";

export default class ExportManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("EXPORT", createCatchErrorByMessage((targetPath) => {
            this.export(targetPath);
        }, "导出"))
    }
    export(targetPath: string) {
        console.log(targetPath)
        const chartId = store.getChartId();
        console.log(chartId)
        window.electronAPI.exportChart(chartId, targetPath);
    }
}