import { reactive } from "vue";
import { Box } from "./classes/box";
import { ChartPackage } from "./classes/chartPackage";
import { NumberEvent } from "./classes/event";
import { Note } from "./classes/note";
import chartPackageURL from "@/assets/DefaultChartPackage.zip";
import resourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import { ResourcePackage } from "./classes/resourcePackage";
import loadingText from "./tools/loadingText";

export type Cache = {
    /** 编辑器界面中所有的碰撞箱，包括Note碰撞箱和事件碰撞箱 */
    boxes: Box<Note | NumberEvent>[],
}
export const
    chartPackage = reactive(await fetch(chartPackageURL)
        .then(res => res.blob())
        .then(blob => ChartPackage.load(blob, str => {
            loadingText.show(str)
        }))
        .then(a => new ChartPackage(a))),
    resourcePackage = reactive(await fetch(resourcePackageURL)
        .then(res => res.blob())
        .then(blob => ResourcePackage.load(blob, str => {
            loadingText.show(str)
        }))
        .then(a => new ResourcePackage(a)))
loadingText.hide();