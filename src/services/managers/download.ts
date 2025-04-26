import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import MediaUtils from "@/tools/mediaUtils";

class DownloadManager {
    constructor() {
        globalEventEmitter.on("DOWNLOAD", () => {
            this.download();
        })
    }
    download() {
        const chart = store.useChart();
        const text = JSON.stringify(chart.toObject());
        const fileName = chart.META.name + '.json';
        MediaUtils.downloadText(text, fileName, 'application/json');
    }
}
export default new DownloadManager();