import { Chart, IChart } from "./chart";
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
    // static load(file: Blob, progressHandler?: (progress: string) => void, p = 2, signal?: AbortSignal) {
    //     return new Promise<ChartPackage>((resolve, reject) => {
    //         if (signal) {
    //             signal.onabort = () => {
    //                 reject("Loading is aborted");
    //             }
    //         }
    //         const reader = new FileReaderExtends();
    //         resolve(reader.readAsync(file, 'arraybuffer', function (e) {
    //             if (progressHandler)
    //                 progressHandler(`读取文件: ${formatData(e.loaded)} / ${formatData(file.size)} ( ${(e.loaded / file.size * 100).toFixed(p)}% )`);
    //         }).then(async result => {
    //             const zip = await JSZip.loadAsync(result);
    //             const { musicFile, backgroundFile, chartFile } = await ChartPackage.findFileInZip(zip);
    //             const _showProgress = () => {
    //                 if (progressHandler) progressHandler(
    //                     `音乐已加载${progress.music.toFixed(p)}%\n` +
    //                     `曲绘已加载${progress.background.toFixed(p)}%\n` +
    //                     `谱面已加载${progress.chart.toFixed(p)}%\n` +
    //                     `判定线贴图已加载${MathUtils.average(progress.textures).toFixed(p)}%`
    //                 )
    //             }
    //             const progress = {
    //                 music: 0,
    //                 background: 0,
    //                 chart: 0,
    //                 textures: new Array<number>()
    //             }
    //             const textureBlobs: Record<string, Blob> = {};
    //             const promises: Promise<void>[] = [];
    //             Object.entries(zip.files).forEach(function ([filePath, file]) {
    //                 if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(filePath)) {
    //                     const index = progress.textures.length;
    //                     progress.textures.push(0);
    //                     const promise = file.async('blob', function (meta) {
    //                         progress.textures[index] = meta.percent;
    //                         _showProgress();
    //                     });
    //                     const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
    //                     promises.push(promise.then(blob => {
    //                         textureBlobs[fileName] = blob;
    //                     }));
    //                 }
    //             });
    //             const [musicSrc, background, chart, textures] = await Promise.all([
    //                 musicFile.async('blob', meta => {
    //                     progress.music = meta.percent;
    //                     _showProgress();
    //                 }).then(MediaUtils.createObjectURL),

    //                 backgroundFile.async('blob', meta => {
    //                     progress.background = meta.percent;
    //                     _showProgress();
    //                 })
    //                     .then(MediaUtils.createImage),

    //                 chartFile.async('text', meta => {
    //                     progress.chart = meta.percent;
    //                     _showProgress();
    //                 })
    //                     .then((chartString) => JSON.parse(chartString)),

    //                 Promise.all(promises)
    //                     .then(async () => {
    //                         const textures: Record<string, HTMLImageElement> = {};
    //                         for (const textureName in textureBlobs) {
    //                             if (Object.prototype.hasOwnProperty.call(textureBlobs, textureName)) {
    //                                 textures[textureName] = await MediaUtils.createImage(textureBlobs[textureName]);
    //                             }
    //                         }
    //                         return textures;
    //                     })
    //             ]);
    //             return new ChartPackage({ musicSrc, background, chart, textures });
    //         }))
    //     })
    // }
}
/*
优先寻找info.txt，若没有该文件，或者该文件里没有音乐、图片和json文件的路径，下一步
随机选一个json文件，看是否有META.song和META.background，若没有，下一步
根据后缀名随机选择符合条件的音乐、图片和json文件，若未找到，报错（找不到音乐/图片/json文件）
*/