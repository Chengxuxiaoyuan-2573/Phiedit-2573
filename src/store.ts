import { Ref, ref } from "vue";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";

class Store {
    chartPackageRef: Ref<ChartPackage | null>;
    resourcePackageRef: Ref<ResourcePackage | null>;
    canvasRef: Ref<HTMLCanvasElement | null>;
    audioRef: Ref<HTMLAudioElement | null>;
    constructor() { 
        this.chartPackageRef = ref(null);
        this.resourcePackageRef = ref(null);
        this.canvasRef = ref(null);
        this.audioRef = ref(null);
    }
    useChartPackage(){
        if(!this.chartPackageRef.value)
            throw new Error("Chart package is not loaded");
        return this.chartPackageRef.value;
    }
    useChart(){
        if(!this.chartPackageRef.value)
            throw new Error("Chart package is not loaded");
        return this.chartPackageRef.value.chart;
    }
    useResourcePackage(){
        if(!this.resourcePackageRef.value)
            throw new Error("Resource package is not loaded");
        return this.resourcePackageRef.value;
    }
    useCanvas(){
        if(!this.canvasRef.value)
            throw new Error("Canvas is not loaded");
        return this.canvasRef.value;
    }
    useAudio(){
        if(!this.audioRef.value)
            throw new Error("Audio is not loaded");
        return this.audioRef.value;
    }
    getSeconds(){
        return this.useAudio().currentTime - this.useChart().META.offset / 1000;
    }
}
const store = new Store();
export default store;
const { audioRef, canvasRef } = store;
export {
    audioRef,
    canvasRef
}