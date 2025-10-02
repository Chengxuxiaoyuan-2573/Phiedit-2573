/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { ChartReadResult, ChartPackage, SYMBOL_CHART_JSON_ERROR, SYMBOL_EXTRA_JSON_ERROR } from "@/models/chartPackage";
import { ArrayedObject } from "@/tools/algorithm";
import MediaUtils from "@/tools/mediaUtils";
import Manager from "./abstract";

export default class ChartPackageLoader extends Manager {
    async load(chartReadResult: ChartReadResult) {
        return new ChartPackage({
            musicSrc: await this.loadMusicSrc(chartReadResult.musicData),
            background: await this.loadBackground(chartReadResult.backgroundData),
            textures: await this.loadTextures(chartReadResult.textures),
            chart: this.loadChart(chartReadResult.chartContent),
            extra: this.loadExtra(chartReadResult.extraContent),
        });
    }
    private async loadMusicSrc(musicData: ArrayBuffer) {
        const musicBlob = MediaUtils.arrayBufferToBlob(musicData);
        const musicSrc = await MediaUtils.createObjectURL(musicBlob);
        return musicSrc;
    }
    private async loadBackground(backgroundData: ArrayBuffer) {
        const backgroundBlob = MediaUtils.arrayBufferToBlob(backgroundData);
        const backgroundSrc = await MediaUtils.createObjectURL(backgroundBlob);
        const image = new Image();
        image.src = backgroundSrc;
        return image;
    }
    private async loadTextures(textures: Record<string, ArrayBuffer>) {
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
    private loadChart(chartContent: string) {
        try {
            return JSON.parse(chartContent);
        }
        catch {
            return SYMBOL_CHART_JSON_ERROR;
        }
    }
    private loadExtra(extraContent: string) {
        try {
            return JSON.parse(extraContent);
        }
        catch {
            return SYMBOL_EXTRA_JSON_ERROR;
        }
    }
}