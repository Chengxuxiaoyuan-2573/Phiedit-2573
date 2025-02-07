import { reactive, ref } from "vue";
import { ChartPackage } from "./classes/chartPackage";
import chartPackageURL from "@/assets/DefaultChartPackage.zip";
import resourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import { ResourcePackage } from "./classes/resourcePackage";
import loadingText from "./tools/loadingText";
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
        .then(a => new ResourcePackage(a))),
    canvasRef = ref<HTMLCanvasElement | null>(null),
    audioRef = ref<HTMLAudioElement | null>(null);
loadingText.hide();