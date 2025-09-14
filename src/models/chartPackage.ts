import MediaUtils from "@/tools/mediaUtils";
import { Chart, IChart } from "./chart";
import ChartError from "./error";
import { Extra, IExtra } from "./extra";
import { ArrayedObject } from "@/tools/algorithm";
export interface IChartPackage {
    chart: IChart;
    background: HTMLImageElement;
    musicSrc: string;
    textures: Record<string, HTMLImageElement>;
    extra: IExtra;
}
export interface ChartConfig {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number,
    noteSize: number,
}
export const SYMBOL_CHART_JSON_ERROR = Symbol("Chart JSON Error");
export const SYMBOL_EXTRA_JSON_ERROR = Symbol("Extra JSON Error");
export class ChartPackage implements IChartPackage {
    chart: Chart;
    background: HTMLImageElement;
    musicSrc: string;
    textures: Record<string, HTMLImageElement>;
    extra: Extra;
    errors: ChartError[] = [];
    constructor(chartPackage: IChartPackage) {
        this.chart = new Chart(chartPackage.chart);
        this.musicSrc = chartPackage.musicSrc;
        this.background = chartPackage.background;
        this.textures = chartPackage.textures;
        this.extra = new Extra(chartPackage.extra);

        this.errors.push(...this.chart.errors);
        this.errors.push(...this.extra.errors);

        this.extra.bpm.length = 0;
        this.extra.bpm.push(...this.chart.BPMList);
        this.extra.calculateSeconds();
    }
    static async loadFromChartReadResult(chartReadResult: ChartReadResult) {
        return new ChartPackage({
            musicSrc: await this.loadMusicSrc(chartReadResult.musicData),
            background: await this.loadBackground(chartReadResult.backgroundData),
            textures: await this.loadTextures(chartReadResult.textures),
            chart: this.loadChart(chartReadResult.chartContent),
            extra: this.loadExtra(chartReadResult.extraContent),
        });
    }
    private static async loadMusicSrc(musicData: ArrayBuffer) {
        const musicBlob = MediaUtils.arrayBufferToBlob(musicData);
        const musicSrc = await MediaUtils.createObjectURL(musicBlob);
        return musicSrc;
    }
    private static async loadBackground(backgroundData: ArrayBuffer) {
        const backgroundBlob = MediaUtils.arrayBufferToBlob(backgroundData);
        const backgroundSrc = await MediaUtils.createObjectURL(backgroundBlob);
        const image = new Image();
        image.src = backgroundSrc;
        return image;
    }
    private static async loadTextures(textures: Record<string, ArrayBuffer>) {
        const arrayedObject = new ArrayedObject(textures);
        return (await arrayedObject.map(async (key, arrayBuffer) => {
            const src = await MediaUtils.createObjectURL(arrayBuffer);
            const image = new Image();
            image.src = src;
            return image;
        })
            .waitPromises())
            .toObject();
    }
    private static loadChart(chartContent: string) {
        try {
            return JSON.parse(chartContent);
        }
        catch {
            return SYMBOL_CHART_JSON_ERROR;
        }
    }
    private static loadExtra(extraContent: string) {
        try {
            return JSON.parse(extraContent);
        }
        catch {
            return SYMBOL_EXTRA_JSON_ERROR;
        }
    }
}

export interface ChartReadResult {
    musicData: ArrayBuffer,
    backgroundData: ArrayBuffer,
    chartContent: string,
    textures: Record<string, ArrayBuffer>,
    extraContent: string
}

/*
优先寻找info.txt，若没有该文件，或者该文件里没有音乐、图片和json文件的路径，下一步
随机选一个json文件，看是否有META.song和META.background，若没有，下一步
根据后缀名随机选择符合条件的音乐、图片和json文件，若未找到，报错（找不到音乐/图片/json文件）
*/