/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Chart, IChart } from "./chart";
import ChartError from "./error";
import { Extra, IExtra } from "./extra";
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

        // 强制使 extra.bpm 与 chart.BPMList 相同
        this.extra.bpm.length = 0;
        this.extra.bpm.push(...this.chart.BPMList);
        this.extra.calculateSeconds();
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