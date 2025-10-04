/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import JSZip from "jszip";
import path from "path";
import Manager from "../renderer/abstract";
import fs from "fs";
import FileUtils from "@/tools/fileUtils";
import { isObject, isString } from "lodash";
import chartListManager from "./chartList";
import filesManager from "./files";
import chartIdCreator from "./chartIdCreator";

class ImportChartManager extends Manager {
    async importChart(chartPackagePath: string) {
        const chartPackageFile = await fs.promises.readFile(chartPackagePath);
        const jszip = await JSZip.loadAsync(chartPackageFile);
        const { musicPath: musicPathInZip, backgroundPath: backgroundPathInZip, chartPath: chartPathInZip, texturePaths: texturePathsInZip } = await this.findFilesInZipChart(jszip);

        const musicFile = jszip.file(musicPathInZip)!;
        const backgroundFile = jszip.file(backgroundPathInZip)!;
        const chartFile = jszip.file(chartPathInZip)!;

        const musicExt = path.extname(musicPathInZip);
        const backgroundExt = path.extname(backgroundPathInZip);
        const chartExt = path.extname(chartPathInZip);

        const chartContent = await chartFile.async("text");
        const name = JSON.parse(chartContent)?.META?.name || "unknown";
        const chartId = chartIdCreator.createRandomChartId(name);

        const musicNameInFolder = `${chartId}${musicExt}`;
        const backgroundNameInFolder = `${chartId}${backgroundExt}`;
        const chartNameInFolder = `${chartId}${chartExt}`;

        const texturesFiles = texturePathsInZip.map(texturePath => jszip.file(texturePath)!);

        const chartDir = filesManager.getChartPath(chartId);

        async function saveFile(fileName: string, file: Uint8Array | string) {
            return fs.promises.writeFile(path.join(chartDir, fileName), file);
        }

        // 把 musicFile, backgroundFile, chartFile 解压到 chartPath 目录下，并添加一个 info.txt 文件
        fs.mkdirSync(chartDir);
        await Promise.all([
            musicFile.async("uint8array")
                .then(data => saveFile(musicNameInFolder, data)),
            backgroundFile.async("uint8array")
                .then(data => saveFile(backgroundNameInFolder, data)),
            chartFile.async("uint8array")
                .then(data => saveFile(chartNameInFolder, data)),
            Promise.all(
                texturesFiles.map(async (textureFile) => {
                    return textureFile.async("uint8array")
                        .then(data => saveFile(textureFile.name, data));
                })
            ),
            saveFile("info.txt", `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${musicNameInFolder}\nPicture: ${backgroundNameInFolder}\nChart: ${chartNameInFolder}`)
        ]);
        chartListManager.addIdToChartList(chartId);
        return chartId;
    }

    /**
     * 在 zip 格式的谱面压缩包中寻找一些必要的文件
     * @param zip 谱面压缩包的 JSZip 对象
     * @returns 包含音乐、曲绘和谱面文件相对于压缩包根目录的路径
     */
    async findFilesInZipChart(zip: JSZip) {
        let musicPath: string | undefined = undefined,
            backgroundPath: string | undefined = undefined,
            chartPath: string | undefined = undefined;

        const SYMBOL_CHART_JSON_ERROR = Symbol("Chart json parse error");

        // 寻找 info.txt 文件
        const infoFile = zip.file("info.txt");

        if (!infoFile) {
            for (const fileName in zip.files) {
                // 遍历压缩包，寻找 pec 或 json 文件
                if (/\.(pec|json)$/.test(fileName)) {
                    const file = zip.files[fileName];

                    // 试图解析为 json 格式
                    const chart: unknown = await (async () => {
                        return JSON.parse(await file.async("text"));
                    })().catch(() => {
                        // 解析失败，返回一个代表解析失败的 Symbol
                        return SYMBOL_CHART_JSON_ERROR;
                    });

                    // 如果解析失败，则跳过当前循环
                    if (chart === SYMBOL_CHART_JSON_ERROR) {
                        continue;
                    }

                    // 在解析的 json 文件里寻找 chart.META.song 和 chart.META.background 属性
                    if (isObject(chart) &&
                        "META" in chart && isObject(chart.META) &&
                        "song" in chart.META && isString(chart.META.song) &&
                        "background" in chart.META && isString(chart.META.background)) {
                        // 如果这两个属性存在

                        // 就把这个文件当作谱面文件
                        chartPath = fileName;

                        // 把相对于这个文件的 chart.META.song 当作音乐文件
                        musicPath = fileName.replace(/[^/\\]*$/, "") + chart.META.song;

                        // 把相对于这个文件的  chart.META.background 当作背景文件
                        backgroundPath = fileName.replace(/[^/\\]*$/, "") + chart.META.background;

                        // 然后就可以直接退出了
                        break;
                    }
                }
            }
        }
        else {
            // 如果有 info.txt 文件，就直接读取
            const info = await infoFile.async("text");

            // 逐行读取
            const lines = info.split(/[\r\n]+/g);
            for (const line of lines) {
                // 以冒号分隔
                const kv = line.split(":");

                // 必须要有一个键和一个值
                if (kv.length < 2) continue;

                // 把键两端的空格去掉，忽略大小写
                const key = kv[0].trim().toLowerCase();

                // 把值两端的空格去掉
                const value = kv[1].trim();

                // 读取音乐文件的路径
                if (key === "song" || key === "music") {
                    musicPath = value;
                }

                // 读取曲绘文件的路径
                if (key === "picture" || key === "background") {
                    backgroundPath = value;
                }

                // 读取谱面文件的路径
                if (key === "chart") {
                    chartPath = value;
                }
            }
        }

        // 把所有的图片文件都视为判定线贴图
        const texturePaths = [];
        for (const fileName in zip.files) {
            if (FileUtils.isImage(fileName)) {
                texturePaths.push(fileName);
            }
        }

        if (!musicPath) {
            throw new Error("无法获取音乐文件的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        if (!backgroundPath) {
            throw new Error("无法获取曲绘图片的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        if (!chartPath) {
            throw new Error("无法获取谱面文件的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        // 是否存在
        if (!zip.file(musicPath)) {
            throw new Error(`不存在的音乐文件：${musicPath}`);
        }

        if (!zip.file(backgroundPath)) {
            throw new Error(`不存在的曲绘文件：${backgroundPath}`);
        }

        if (!zip.file(chartPath)) {
            throw new Error(`不存在的谱面文件：${chartPath}`);
        }
        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths
        };
    }
}
export default new ImportChartManager();