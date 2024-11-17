import JSZip from "jszip";
import { data, avg, createAudio, createImage } from "../tools";
import { isObject, isString } from "../typeCheck";
import { Chart } from "./chart";
import { FileReaderExtends } from "./classExtends";
export class ChartPackage {
    chart: Chart;
    background: HTMLImageElement;
    music: HTMLAudioElement;
    textures: Record<string, HTMLImageElement>
    constructor(chartPackage: ChartPackage) {
        this.chart = new Chart(chartPackage.chart);
        this.music = chartPackage.music;
        this.background = chartPackage.background;
        this.textures = chartPackage.textures;
    }
    static load(file: Blob, progressHandler?: (progress: string) => void, p = 2) {
        return new Promise<ChartPackage>(resolve => {
            const reader = new FileReaderExtends();
            resolve(reader.readAsync(file, 'arraybuffer', function (e: ProgressEvent) {
                if (progressHandler)
                    progressHandler("读取文件: " + data(e.loaded) + " / " + data(file.size) + " ( " + (e.loaded / file.size * 100).toFixed(p) + "% )");
            }).then(async result => {
                const zip = await JSZip.loadAsync(result);
                let musicPath: string | undefined = undefined, backgroundPath: string | undefined = undefined, chartPath: string | undefined = undefined;
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
                        if (key == "picture" || key == "background" || key == "illustrate") {
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
                    throw new Error("Missing song file")
                }
                if (!backgroundFile) {
                    throw new Error("Missing background file")
                }
                if (!chartFile) {
                    throw new Error("Missing chart file")
                }
                const _showProgress = () => {
                    if (progressHandler) progressHandler(
                        "音乐已加载" + progress.music.toFixed(p) +
                        "%\n曲绘已加载" + progress.background.toFixed(p) +
                        "%\n谱面已加载" + progress.chart.toFixed(p) +
                        "%\n判定线贴图已加载" + avg(progress.textures).toFixed(p) + "%"
                    )
                }
                const progress = {
                    music: 0,
                    background: 0,
                    chart: 0,
                    textures: [] as number[]
                }
                const textureBlobs: Record<string, Blob> = {};
                const promises: Promise<void>[] = [];
                Object.keys(zip.files).forEach(function (fileName) {
                    if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(fileName)) {
                        const index = progress.textures.push(0) - 1;
                        const file = zip.file(fileName)!;
                        const promise = file.async('blob', function (meta) {
                            progress.textures[index] = meta.percent;
                            _showProgress();
                        });
                        promises.push(promise.then(blob => {
                            textureBlobs[fileName] = blob;
                        }));
                    }
                });
                const [music, background, chart, textures] = await Promise.all([
                    musicFile.async('blob', meta => {
                        progress.music = meta.percent;
                        _showProgress();
                    }).then(createAudio),
                    backgroundFile.async('blob', meta => {
                        progress.background = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    chartFile.async('text', meta => {
                        progress.chart = meta.percent;
                        _showProgress();
                    }).then((chartString) => {
                        const chart = JSON.parse(chartString);
                        const formatedChart = new Chart(chart);
                        return formatedChart;
                    }),
                    Promise.all(promises).then(async () => {
                        const textureImages: Record<string, HTMLImageElement> = {};
                        for (const textureName in textureBlobs) {
                            if (Object.prototype.hasOwnProperty.call(textureBlobs, textureName)) {
                                textureImages[textureName] = await createImage(textureBlobs[textureName]);
                            }
                        }
                        return textureImages;
                    })
                ])
                return new ChartPackage({ chart, music, background, textures });
            }))
        })
    }
}