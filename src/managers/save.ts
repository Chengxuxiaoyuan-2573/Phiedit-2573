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
        const chart = store.useChart();
        const chartContent = JSON.stringify(chart.toObject());
        window.electronAPI.saveChart(store.getChartId(), chartContent);
    }
}