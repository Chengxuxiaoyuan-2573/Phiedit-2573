import jsYaml from "js-yaml";
import JSZip from 'jszip';
import { EditableImage } from './EditableImage';
import { avg, color, data } from './tools';
import { isArrayOf2Numbers, isBoolean, isNumber, isObject, isString } from './typeCheck';
import { Chart, ChartPackage, ResourcePackage } from './typeDefinitions';
import { FileReaderExtends } from "./classExtends";
export function loadChartPackage(file: Blob, progressHandler?: (progress: string) => void, p = 2) {
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
            return { chart, music, background, textures };
        }))
    })
}
export function loadResourcePackage(file: Blob, progressHandler?: (progress: string) => void, p = 2) {
    return new Promise<ResourcePackage>((resolve) => {
        const reader = new FileReaderExtends();
        resolve(
            reader.readAsync(file, 'arraybuffer', function (e: ProgressEvent) {
                if (progressHandler)
                    progressHandler("读取文件: " + data(e.loaded) + " / " + data(file.size) + " ( " + (e.loaded / file.size * 100).toFixed(p) + "% )");
            }).then(async result => {
                const zip = await JSZip.loadAsync(result);
                /*
                资源文件必须包括：
                click.png 和 click_mh.png：Click 音符的皮肤，mh 代表双押；为什么要用click而不是tap啊，tap不是本来的名字吗
                drag.png 和 drag_mh.png：Drag 音符的皮肤，mh 代表双押；为什么要用mh代表双押啊，要用HL就别用mh行不行
                flick.png 和 flick_mh.png：Flick 音符的皮肤，mh 代表双押；算了吧，还是把各种可能的名字都匹配上吧
                hold.png 和 hold_mh.png：Hold 音符的皮肤，mh 代表双押；
                hit_fx.png：打击特效图片。
                资源文件可以包括（即若不包括，将使用默认）：
                click.ogg、drag.ogg 和 flick.ogg：对应音符的打击音效，注意采样率必须为 44100Hz，否则在渲染时（prpr - render）会导致崩溃；
                ending.mp3：结算界面背景音乐。
                */
                const tapPictireFile = zip.file(/(click|tap|blue)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0];
                const tapHLPictireFile = zip.file(/(click|tap|blue)[_\- ]?(mh|hl)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0] || tapPictireFile;
                const dragPictireFile = zip.file(/(drag|yellow)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0];
                const dragHLPictireFile = zip.file(/(drag|yellow)[_\- ]?(mh|hl)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0] || dragPictireFile;
                const flickPictireFile = zip.file(/(flick|slide|red|pink)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0];
                const flickHLPictireFile = zip.file(/(flick|slide|red|pink)[_\- ]?(mh|hl)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0] || flickPictireFile;
                const holdPictireFile = zip.file(/(hold|long)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0];
                const holdHLPictireFile = zip.file(/(hold|long)[_\- ]?(mh|hl)\.(png|jpg|jpeg|bmp|gif|svg)/i)[0] || holdPictireFile;
                if (!tapPictireFile) throw new Error("Missing tap picture (tap.png, blue.png or click.png)");
                if (!dragPictireFile) throw new Error("Missing drag picture (drag.png or yellow.png)");
                if (!flickPictireFile) throw new Error("Missing flick picture (flick.png, slide.png, red.png or pink.png)");
                if (!holdPictireFile) throw new Error("Missing hold picture (hold.png or long.png)");
                const tapSoundFile = zip.file(/(click|tap|blue)\.(ogg|mp3|wav|m4a)/i)[0];
                const dragSoundFile = zip.file(/(drag|yellow)\.(ogg|mp3|wav|m4a)/i)[0];
                const flickSoundFile = zip.file(/(flick|slide|red|pink)\.(ogg|mp3|wav|m4a)/i)[0];
                const hitFxPictureFile = zip.file(/hit[_\- ]?fx.(png|jpg|jpeg|bmp|gif|svg)/i)[0];
                if (!tapSoundFile) throw new Error("Missing tap sound (tap.ogg, blue.ogg or click.ogg)");
                if (!dragSoundFile) throw new Error("Missing drag sound (drag.ogg or yellow.ogg)");
                if (!flickSoundFile) throw new Error("Missing flick sound (flick.ogg, slide.ogg, red.ogg or pink.ogg)");
                if (!hitFxPictureFile) throw new Error("Missing hit picture (hit_fx.png)");
                const info = zip.file(/info\.(yml|json)$/)[0];
                if (!info) throw new Error("Missing info file (info.yml or info.json)");
                const infoContent = await info.async('text');
                const infoObj: unknown = info.name.endsWith(".json") ? JSON.parse(infoContent) : jsYaml.load(infoContent);
                if (!isObject(infoObj)) throw new Error("Invalid info file");
                let hitFx = [5, 6] as [number, number],
                    holdAtlas = [50, 50] as [number, number],
                    holdAtlasMH = [50, 110] as [number, number],
                    hitFxDuration = 0.5,
                    hitFxScale = 1.0,
                    hitFxRotate = false,
                    hitFxTinted = true,
                    hideParticles = false,
                    holdKeepHead = false,
                    holdRepeat = false,
                    holdCompact = false,
                    colorPerfect = 0xe1ffec9f,
                    colorGood = 0xebb4e1ff;
                if ("hitFx" in infoObj && isArrayOf2Numbers(infoObj.hitFx)) hitFx = infoObj.hitFx;
                else throw new Error("Missing property hitFx in info file");
                if ("holdAtlas" in infoObj && isArrayOf2Numbers(infoObj.holdAtlas)) holdAtlas = infoObj.holdAtlas;
                else throw new Error("Missing property holdAtlas in info file");
                if ("holdAtlasMH" in infoObj && isArrayOf2Numbers(infoObj.holdAtlasMH)) holdAtlasMH = infoObj.holdAtlasMH;
                else throw new Error("Missing property holdAtlasMH in info file");
                if ("hitFxDuration" in infoObj && isNumber(infoObj.hitFxDuration)) hitFxDuration = infoObj.hitFxDuration;
                if ("hitFxScale" in infoObj && isNumber(infoObj.hitFxScale)) hitFxScale = infoObj.hitFxScale;
                if ("hitFxRotate" in infoObj && isBoolean(infoObj.hitFxRotate)) hitFxRotate = infoObj.hitFxRotate;
                if ("hitFxTinted" in infoObj && isBoolean(infoObj.hitFxTinted)) hitFxTinted = infoObj.hitFxTinted;
                if ("hideParticles" in infoObj && isBoolean(infoObj.hideParticles)) hideParticles = infoObj.hideParticles;
                if ("holdKeepHead" in infoObj && isBoolean(infoObj.holdKeepHead)) holdKeepHead = infoObj.holdKeepHead;
                if ("holdRepeat" in infoObj && isBoolean(infoObj.holdRepeat)) holdRepeat = infoObj.holdRepeat;
                if ("holdCompact" in infoObj && isBoolean(infoObj.holdCompact)) holdCompact = infoObj.holdCompact;
                if ("colorPerfect" in infoObj && isNumber(infoObj.colorPerfect)) colorPerfect = infoObj.colorPerfect;
                if ("colorGood" in infoObj && isNumber(infoObj.colorGood)) colorGood = infoObj.colorGood;
                const progress = {
                    tapSound: 0,
                    dragSound: 0,
                    flickSound: 0,
                    tap: 0,
                    drag: 0,
                    flick: 0,
                    hold: 0,
                    tapHL: 0,
                    dragHL: 0,
                    flickHL: 0,
                    holdHL: 0,
                    hitFx: 0
                }
                const _showProgress = () => {
                    if (progressHandler) progressHandler(
                        "Tap音效已加载" + progress.tapSound.toFixed(p) +
                        "%\nDrag音效已加载" + progress.flickSound.toFixed(p) +
                        "%\nFlick音效已加载" + progress.tapSound.toFixed(p) +
                        "%\n打击特效已加载" + progress.hitFx.toFixed(p) +
                        "%\nTap皮肤已加载" + progress.tap.toFixed(p) +
                        "%\nDrag皮肤已加载" + progress.drag.toFixed(p) +
                        "%\nFlick皮肤已加载" + progress.flick.toFixed(p) +
                        "%\nHold皮肤已加载" + progress.hold.toFixed(p) +
                        "%\nTap双押皮肤已加载" + progress.tapHL.toFixed(p) +
                        "%\nDrag双押皮肤已加载" + progress.dragHL.toFixed(p) +
                        "%\nFlick双押皮肤已加载" + progress.flickHL.toFixed(p) +
                        "%\nHold双押皮肤已加载" + progress.holdHL.toFixed(p) + "%"
                    )
                }
                const audioContext = new AudioContext();
                const tapSoundPromise = tapSoundFile.async('arraybuffer', meta => {
                    progress.tapSound = meta.percent;
                    _showProgress();
                }).then(a => createAudioBuffer(audioContext, a));
                const dragSoundPromise = dragSoundFile.async('arraybuffer', meta => {
                    progress.dragSound = meta.percent;
                    _showProgress();
                }).then(a => createAudioBuffer(audioContext, a));
                const flickSoundPromise = flickSoundFile.async('arraybuffer', meta => {
                    progress.flickSound = meta.percent;
                    _showProgress();
                }).then(a => createAudioBuffer(audioContext, a));
                const hitFxImagePromise = hitFxPictureFile.async('blob', meta => {
                    progress.hitFx = meta.percent;
                    _showProgress();
                }).then(createImage);
                const
                    tapPromise = tapPictireFile.async('blob', meta => {
                        progress.tap = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    dragPromise = dragPictireFile.async('blob', meta => {
                        progress.drag = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    flickPromise = flickPictireFile.async('blob', meta => {
                        progress.flick = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    holdPromise = holdPictireFile.async('blob', meta => {
                        progress.hold = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    tapHLPromise = tapHLPictireFile.async('blob', meta => {
                        progress.tapHL = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    dragHLPromise = dragHLPictireFile.async('blob', meta => {
                        progress.dragHL = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    flickHLPromise = flickHLPictireFile.async('blob', meta => {
                        progress.flickHL = meta.percent;
                        _showProgress();
                    }).then(createImage),
                    holdHLPromise = holdHLPictireFile.async('blob', meta => {
                        progress.holdHL = meta.percent;
                        _showProgress();
                    }).then(createImage);
                const [tapSound, dragSound, flickSound, hitFxImage, tap, drag, flick, hold, tapHL, dragHL, flickHL, holdHL] = await Promise.all([
                    tapSoundPromise, dragSoundPromise, flickSoundPromise, hitFxImagePromise,
                    tapPromise, dragPromise, flickPromise, holdPromise,
                    tapHLPromise, dragHLPromise, flickHLPromise, holdHLPromise
                ]);
                const holdHead = new EditableImage(hold)
                    .cutTop(hold.height - holdAtlas[1])
                    .canvas;
                const holdEnd = new EditableImage(hold)
                    .cutBottom(hold.height - holdAtlas[0])
                    .canvas;
                const holdBody = new EditableImage(hold)
                    .cutTop(holdAtlas[0])
                    .cutBottom(holdAtlas[1])
                    .canvas;
                const holdHLHead = new EditableImage(holdHL)
                    .cutTop(holdHL.height - holdAtlasMH[1])
                    .canvas;
                const holdHLEnd = new EditableImage(holdHL)
                    .cutBottom(holdHL.height - holdAtlasMH[0])
                    .canvas;
                const holdHLBody = new EditableImage(holdHL)
                    .cutTop(holdAtlasMH[0])
                    .cutBottom(holdAtlasMH[1])
                    .canvas;
                const hitFxWidth = hitFxImage.width / hitFx[0];
                const hitFxHeight = hitFxImage.height / hitFx[1];
                const perfectHitFxFrames: HTMLCanvasElement[] = [];
                const goodHitFxFrames: HTMLCanvasElement[] = [];
                const hitFxFrameNumber = hitFx[0] * hitFx[1];
                for (let i = 0; i < hitFx[1]; i++) {
                    for (let j = 0; j < hitFx[0]; j++) {
                        const perfectHitFxFrame = EditableImage.empty(hitFxWidth, hitFxHeight);
                        perfectHitFxFrame.ctx.drawImage(
                            hitFxImage, j * hitFxWidth, i * hitFxHeight, hitFxWidth, hitFxHeight,
                            0, 0, hitFxWidth, hitFxHeight
                        );
                        perfectHitFxFrame.stretch(256 * hitFxScale, 256 * hitFxScale);
                        const goodHitFxFrame = perfectHitFxFrame.clone();
                        const coloredFramePerfect = hitFxTinted ? perfectHitFxFrame.color(color(colorPerfect)) : perfectHitFxFrame;
                        const coloredFrameGood = hitFxTinted ? goodHitFxFrame.color(color(colorGood)) : goodHitFxFrame;
                        perfectHitFxFrames.push(coloredFramePerfect.canvas);
                        goodHitFxFrames.push(coloredFrameGood.canvas);
                    }
                }
                return {
                    tap, drag, flick, holdHead, holdEnd, holdBody,
                    tapHL, dragHL, flickHL, holdHLHead, holdHLEnd, holdHLBody,
                    audioContext, tapSound, dragSound, flickSound,
                    perfectHitFxFrames, goodHitFxFrames, hitFxDuration, hitFxRotate,
                    hideParticles, holdKeepHead, holdRepeat, holdCompact,
                    colorPerfect, colorGood, hitFxFrameNumber
                };
            })
        );
    })
}

function createImage(blob: Blob) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(objectUrl);
        })
        image.src = objectUrl;
        image.onload = () => {
            resolve(image);
        }
        image.onerror = () => {
            reject();
        }
    })
}
function createAudio(blob: Blob) {
    return new Promise<HTMLAudioElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio();
        window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(objectUrl);
        })
        audio.src = objectUrl;
        audio.oncanplay = () => {
            resolve(audio);
        }
        audio.onerror = () => {
            reject();
        }
    })
}

async function createAudioBuffer(audioContext: AudioContext, arraybuffer: ArrayBuffer) {
    const audioBuffer = await audioContext.decodeAudioData(arraybuffer);
    return audioBuffer;
}

