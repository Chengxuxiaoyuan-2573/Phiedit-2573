import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
export default class SaveManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("SAVE", createCatchErrorByMessage(() => {
            this.save();
        }, "保存"))
    }
    async save() {
        const chartId = store.getChartId();
        const chart = store.useChart();
        const chartObject = chart.toObject();
        const chartInfo = await window.electronAPI.readChartInfo(chartId);
        chartObject.META.song = chartInfo.song;
        chartObject.META.background = chartInfo.picture;
        const chartContent = JSON.stringify(chartObject);
        window.electronAPI.saveChart(store.getChartId(), chartContent);
        window.electronAPI.writeChartInfo(store.getChartId(), chart.META.toObject());
    }
}