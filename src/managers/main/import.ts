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
import { isArray, isObject, isString } from "lodash";
import chartListManager from "./chartList";
import filesManager from "./files";
import chartIdCreator from "./chartIdCreator";
import logManager from "./log";
import convertManager from "./convert";
import type { ChartFormat, OfficialMetaSource } from "./convert";
import { formatDate } from "@/tools/date";
import { app } from "electron";

/** 导入谱面的结果 */
export interface ImportChartResult {

    /** 导入后生成的谱面 ID */
    chartId: string;

    /** 转谱过程中出现的错误信息。选择 RPE 格式或转谱无错误时为空数组 */
    convertErrorMessages: string[];

    /** 转谱错误日志文件的路径。仅当存在转谱错误时提供 */
    convertLogPath?: string;
}

/** 在压缩包中按后缀名寻找第一个匹配的文件 */
function findFirstFileByExtension(zip: JSZip, extensions: readonly string[]) {
    const regex = new RegExp(`\\.(${extensions.join("|")})$`, "i");
    for (const fileName in zip.files) {
        const file = zip.files[fileName];
        if (file.dir) continue;
        if (regex.test(fileName)) {
            return fileName;
        }
    }
    return undefined;
}

/** 把文件路径统一为使用正斜杠的形式，便于跨平台比较和查找 */
function normalizePath(fileName: string) {
    return fileName.replace(/\\/g, "/");
}

/** 把压缩包内的所有文件按正斜杠路径重新索引，便于统一查找 */
function createNormalizedZipFileMap(zip: JSZip) {
    const map: Record<string, JSZip.JSZipObject> = {};
    for (const fileName in zip.files) {
        const file = zip.files[fileName];
        if (!file.dir) {
            map[normalizePath(fileName)] = file;
        }
    }
    return map;
}

class ImportChartManager extends Manager {
    /**
     * 导入谱面。
     * @param chartPackagePath 谱面压缩包的路径
     * @param format 谱面文件使用的格式。`rpe` 时按现有逻辑读取；`official` 时会先转谱为 RPE 再存储
     */
    async importChart(chartPackagePath: string, format: ChartFormat = "rpe"): Promise<ImportChartResult> {
        const chartPackageFile = await fs.promises.readFile(chartPackagePath);
        const jszip = await JSZip.loadAsync(chartPackageFile);
        const zipFiles = createNormalizedZipFileMap(jszip);
        const findZipFile = (fileName: string) => zipFiles[normalizePath(fileName)];
        const { musicPath: musicPathInZip, backgroundPath: backgroundPathInZip, chartPath: chartPathInZip, texturePaths: texturePathsInZip, meta } = await this.findFilesInZipChart(jszip, format);

        const musicFile = findZipFile(musicPathInZip)!;
        const backgroundFile = findZipFile(backgroundPathInZip)!;
        const chartFile = findZipFile(chartPathInZip)!;

        const musicExt = path.extname(musicPathInZip);
        const backgroundExt = path.extname(backgroundPathInZip);
        const chartExt = path.extname(chartPathInZip);

        const chartContent = await chartFile.async("text");

        // 选择 RPE 格式时保持原有逻辑：谱面文件被原样存储。
        // 选择官方格式时：先把官方谱面转谱为 RPE，再把转谱后的 RPE 谱面存储。
        // 无论哪种情况，存储到用户数据文件夹后的谱面始终是 RPE 格式。
        let storedChartContent = chartContent;
        let name: string;
        let convertErrorMessages: string[] = [];

        if (format === "official") {
            const convertResult = convertManager.convertOfficialToRpe(JSON.parse(chartContent) as unknown, {
                version: app.getVersion(),
                meta
            });
            storedChartContent = JSON.stringify(convertResult.chart);
            convertErrorMessages = convertResult.errorMessages;

            // 官方谱面本身没有元数据，曲名从压缩包的 info.txt 中获取
            name = meta.name || "unknown";
        }
        else {
            name = JSON.parse(chartContent)?.META?.name || "unknown";
        }

        const chartId = chartIdCreator.createRandomChartId(name);

        const musicNameInFolder = `${chartId}${musicExt}`;
        const backgroundNameInFolder = `${chartId}${backgroundExt}`;
        const chartNameInFolder = `${chartId}${chartExt}`;

        const chartDir = filesManager.getChartPath(chartId);

        async function saveFile(fileName: string, file: Uint8Array | string) {
            const normalizedFileName = normalizePath(fileName);

            // 防止压缩包内的文件路径穿越到谱面文件夹之外
            if (normalizedFileName.split("/").includes("..")) {
                throw new Error(`压缩包内的文件路径不合法：${fileName}`);
            }

            const wholePath = path.join(chartDir, normalizedFileName);

            // 文件可能位于多层目录结构中，先确保目录存在
            await fs.promises.mkdir(path.dirname(wholePath), { recursive: true });
            return fs.promises.writeFile(wholePath, file);
        }

        // 选择官方格式时，info.txt 里的元数据来自官方压缩包，需要保留下来
        const infoContent = format === "official" ?
            `#\nName: ${name}\nCharter: ${meta.charter ?? "unknown"}\nComposer: ${meta.composer ?? "unknown"}\nIllustrator: ${meta.illustration ?? "unknown"}\nLevel: ${meta.level ?? "SP Lv.?"}\nSong: ${musicNameInFolder}\nPicture: ${backgroundNameInFolder}\nChart: ${chartNameInFolder}` :
            `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${musicNameInFolder}\nPicture: ${backgroundNameInFolder}\nChart: ${chartNameInFolder}`;

        // 把 musicFile, backgroundFile, chartFile 解压到 chartPath 目录下，并添加一个 info.txt 文件
        fs.mkdirSync(chartDir);
        await Promise.all([
            musicFile.async("uint8array")
                .then(data => saveFile(musicNameInFolder, data)),
            backgroundFile.async("uint8array")
                .then(data => saveFile(backgroundNameInFolder, data)),
            saveFile(chartNameInFolder, storedChartContent),
            Promise.all(
                texturePathsInZip.map(async (texturePath) => {
                    return findZipFile(texturePath)!.async("uint8array")
                        .then(data => saveFile(texturePath, data));
                })
            ),
            saveFile("info.txt", infoContent)
        ]);
        chartListManager.addIdToChartList(chartId);

        // 转谱出错时，输出日志文件并把路径返回给渲染进程，供其提示用户
        let convertLogPath: string | undefined;
        if (convertErrorMessages.length > 0) {
            convertLogPath = await this.writeConvertLog(chartId, convertErrorMessages);
        }

        return {
            chartId,
            convertErrorMessages,
            convertLogPath
        };
    }

    /** 把转谱错误写入日志文件，返回日志文件的路径 */
    private async writeConvertLog(chartId: string, errorMessages: readonly string[]) {
        const logFileName = `${formatDate(new Date(), "YYYYMMDD_HHmmss")}_convert.log`;
        const logFilePath = await logManager.openLog(logFileName);
        await logManager.addLog(`${formatDate(new Date(), "YYYY/MM/DD HH:mm:ss")} 导入官方谱面时，转谱出现了 ${errorMessages.length} 个错误（谱面 ID：${chartId}）：`);
        for (const message of errorMessages) {
            await logManager.addLog(message);
        }
        await logManager.closeLog();
        return logFilePath;
    }

    /**
     * 在压缩包中寻找官方格式的谱面文件。
     * 官方谱面的根对象含有 judgeLineList 数组，据此识别。
     * @param zip 谱面压缩包的 JSZip 对象
     * @returns 谱面文件相对于压缩包根目录的路径，找不到时返回 undefined
     */
    private async findOfficialChartPath(zip: JSZip) {
        for (const fileName in zip.files) {
            if (!/\.(pec|json)$/.test(fileName)) continue;
            const file = zip.files[fileName];
            const chart: unknown = await file.async("text")
                .then(text => JSON.parse(text) as unknown)
                .catch(() => undefined);
            if (isObject(chart) && "judgeLineList" in chart && isArray(chart.judgeLineList)) {
                return fileName;
            }
        }
        return undefined;
    }

    /**
     * 在 zip 格式的谱面压缩包中寻找一些必要的文件
     * @param zip 谱面压缩包的 JSZip 对象
     * @param format 谱面文件使用的格式
     * @returns 包含音乐、曲绘和谱面文件相对于压缩包根目录的路径，以及从 info.txt 中读取到的元数据
     */
    async findFilesInZipChart(zip: JSZip, format: ChartFormat = "rpe") {
        let musicPath: string | undefined = undefined,
            backgroundPath: string | undefined = undefined,
            chartPath: string | undefined = undefined;

        const zipFiles = createNormalizedZipFileMap(zip);
        const findZipFile = (fileName: string) => zipFiles[normalizePath(fileName)];

        /** 从 info.txt 中读取到的元数据，供官方谱面转谱时使用 */
        const meta: OfficialMetaSource = {};

        const SYMBOL_CHART_JSON_ERROR = Symbol("Chart json parse error");

        // 寻找 info.txt 文件
        const infoFile = zip.file("info.txt");

        if (!infoFile) {
            if (format === "official") {
                // 官方格式：寻找含有 judgeLineList 数组的 json 文件
                chartPath = await this.findOfficialChartPath(zip);
            }
            else {
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
                            musicPath = normalizePath(fileName.replace(/[^/\\]*$/, "") + chart.META.song);

                            // 把相对于这个文件的  chart.META.background 当作背景文件
                            backgroundPath = normalizePath(fileName.replace(/[^/\\]*$/, "") + chart.META.background);

                            // 然后就可以直接退出了
                            break;
                        }
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
                    musicPath = normalizePath(value);
                }

                // 读取曲绘文件的路径
                if (key === "picture" || key === "background") {
                    backgroundPath = normalizePath(value);
                }

                // 读取谱面文件的路径
                if (key === "chart") {
                    chartPath = normalizePath(value);
                }

                // 读取元数据（官方谱面的曲名、谱师等信息只存在于 info.txt 中）
                if (key === "name") {
                    meta.name = value;
                }

                if (key === "charter") {
                    meta.charter = value;
                }

                if (key === "composer") {
                    meta.composer = value;
                }

                if (key === "illustrator" || key === "illustration") {
                    meta.illustration = value;
                }

                if (key === "level") {
                    meta.level = value;
                }
            }
        }

        // 官方谱面的 info.txt 通常不含音乐、曲绘的路径，缺失时按后缀名兜底查找
        if (format === "official") {
            if (!chartPath) {
                chartPath = await this.findOfficialChartPath(zip);
            }

            if (!musicPath) {
                musicPath = findFirstFileByExtension(zip, FileUtils.AUDIO_EXTENSIONS);
            }

            if (!backgroundPath) {
                backgroundPath = findFirstFileByExtension(zip, FileUtils.IMAGE_EXTENSIONS);
            }
        }

        // 把所有的图片文件都视为判定线贴图（跳过目录，路径统一为正斜杠形式，保留多层目录结构）
        const texturePaths = [];
        for (const fileName in zip.files) {
            const file = zip.files[fileName];
            if (file.dir) continue;
            const normalizedFileName = normalizePath(fileName);
            if (FileUtils.isImage(normalizedFileName)) {
                texturePaths.push(normalizedFileName);
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
        if (!findZipFile(musicPath)) {
            throw new Error(`不存在的音乐文件：${musicPath}`);
        }

        if (!findZipFile(backgroundPath)) {
            throw new Error(`不存在的曲绘文件：${backgroundPath}`);
        }

        if (!findZipFile(chartPath)) {
            throw new Error(`不存在的谱面文件：${chartPath}`);
        }
        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths,
            meta
        };
    }
}
export default new ImportChartManager();
