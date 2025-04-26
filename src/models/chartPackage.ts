import JSZip from "jszip";
import { formatData } from "../tools/algorithm";
import { isObject, isString } from "lodash";
import { Chart, IChart } from "./chart";
import { FileReaderExtends } from "../tools/classExtends";
import MathUtils from "../tools/mathUtils";
import MediaUtils from "../tools/mediaUtils";
export interface IChartPackage {
    chart: IChart;
    background: HTMLImageElement;
    musicSrc: string;
    textures: Record<string, HTMLImageElement>
}
export interface ChartConfig {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number,
    noteSize: number,
}
export class ChartPackage implements IChartPackage {
    chart: Chart;
    background: HTMLImageElement;
    musicSrc: string;
    textures: Record<string, HTMLImageElement>;
    constructor(chartPackage: IChartPackage) {
        this.chart = new Chart(chartPackage.chart);
        this.musicSrc = chartPackage.musicSrc;
        this.background = chartPackage.background;
        this.textures = chartPackage.textures;
    }
    static load(file: Blob, progressHandler?: (progress: string) => void, p = 2, signal?: AbortSignal) {
        return new Promise<ChartPackage>((resolve, reject) => {
            if (signal) {
                signal.onabort = () => {
                    reject("Loading is aborted");
                }
            }
            const reader = new FileReaderExtends();
            resolve(reader.readAsync(file, 'arraybuffer', function (e) {
                if (progressHandler)
                    progressHandler(`读取文件: ${formatData(e.loaded)} / ${formatData(file.size)} ( ${(e.loaded / file.size * 100).toFixed(p)}% )`);
            }).then(async result => {
                const zip = await JSZip.loadAsync(result);
                let musicPath: string | undefined = undefined,
                    backgroundPath: string | undefined = undefined,
                    chartPath: string | undefined = undefined;
                const infoFile = zip.file("info.txt");
                if (!infoFile) {
                    for (const fileName in zip.files) {
                        const file = zip.files[fileName];
                        if (/\.(pec|json)$/.test(fileName)) {
                            const chart: unknown = JSON.parse(await file.async('text'));
                            if (isObject(chart) &&
                                "META" in chart && isObject(chart.META) &&
                                "song" in chart.META && isString(chart.META.song) &&
                                "background" in chart.META && isString(chart.META.background)) {
                                chartPath = fileName;
                                musicPath = fileName.replace(/[^/\\]*$/, "") + chart.META.song;
                                backgroundPath = fileName.replace(/[^/\\]*$/, "") + chart.META.background;
                                break;
                            }
                        }
                    }
                }
                else {
                    const info = await infoFile.async('text');
                    const lines = info.split(/[\r\n]+/g);
                    for (const line of lines) {
                        const kv = line.split(":");
                        if (kv.length <= 1) continue;
                        const key = kv[0].trim().toLowerCase();
                        const value = kv[1].trim();
                        if (key == "song" || key == "music") {
                            musicPath = value;
                        }
                        if (key == "picture" || key == "background" || key == "illustration") {
                            backgroundPath = value;
                        }
                        if (key == "chart") {
                            chartPath = value;
                        }
                    }
                }
                if (!musicPath) {
                    throw new Error("Missing song name")
                }
                if (!backgroundPath) {
                    throw new Error("Missing picture name")
                }
                if (!chartPath) {
                    throw new Error("Missing chart name")
                }
                const musicFile = zip.file(musicPath);
                const backgroundFile = zip.file(backgroundPath);
                const chartFile = zip.file(chartPath);
                if (!musicFile) {
                    throw new Error("Missing music file")
                }
                if (!backgroundFile) {
                    throw new Error("Missing background file")
                }
                if (!chartFile) {
                    throw new Error("Missing chart file")
                }
                const _showProgress = () => {
                    if (progressHandler) progressHandler(
                        `音乐已加载${progress.music.toFixed(p)}%\n` +
                        `曲绘已加载${progress.background.toFixed(p)}%\n` +
                        `谱面已加载${progress.chart.toFixed(p)}%\n` +
                        `判定线贴图已加载${MathUtils.average(progress.textures).toFixed(p)}%`
                    )
                }
                const progress = {
                    music: 0,
                    background: 0,
                    chart: 0,
                    textures: new Array<number>()
                }
                const textureBlobs: Record<string, Blob> = {};
                const promises: Promise<void>[] = [];
                Object.entries(zip.files).forEach(function ([filePath, file]) {
                    if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(filePath)) {
                        const index = progress.textures.length;
                        progress.textures.push(0);
                        const promise = file.async('blob', function (meta) {
                            progress.textures[index] = meta.percent;
                            _showProgress();
                        });
                        const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
                        promises.push(promise.then(blob => {
                            textureBlobs[fileName] = blob;
                        }));
                    }
                });
                const [musicSrc, background, chart, textures] = await Promise.all([
                    musicFile.async('blob', meta => {
                        progress.music = meta.percent;
                        _showProgress();
                    }).then(MediaUtils.createObjectURL),

                    backgroundFile.async('blob', meta => {
                        progress.background = meta.percent;
                        _showProgress();
                    })
                        .then(MediaUtils.createImage),

                    chartFile.async('text', meta => {
                        progress.chart = meta.percent;
                        _showProgress();
                    })
                        .then((chartString) => JSON.parse(chartString)),

                    Promise.all(promises)
                        .then(async () => {
                            const textures: Record<string, HTMLImageElement> = {};
                            for (const textureName in textureBlobs) {
                                if (Object.prototype.hasOwnProperty.call(textureBlobs, textureName)) {
                                    textures[textureName] = await MediaUtils.createImage(textureBlobs[textureName]);
                                }
                            }
                            return textures;
                        })
                ]);
                return new ChartPackage({ musicSrc, background, chart, textures });
            }))
        })
    }
}