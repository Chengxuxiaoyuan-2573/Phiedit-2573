import jsYaml from "js-yaml";
import JSZip from 'jszip';
import { EditableImage } from './EditableImage';
import { color, data } from './tools';
import { isArray, isArrayOf2Numbers, isArrayOf3Numbers, isArrayOf4Numbers, isBoolean, isNumber, isObject, isString } from './typeCheck';
import { BaseEventLayer, Bool, BPM, Chart, ChartPackage, RGBcolor, ColorEvent, EasingType, HitState, JudgeLine, Note, NoteType, NumberEvent, ResourcePackage, TextEvent } from './typeDefinitions';
class FileReaderExtends extends FileReader {
    async readAsync(blob: Blob, type: 'arraybuffer', progressHandler: typeof this.onprogress): Promise<ArrayBuffer>;
    async readAsync(blob: Blob, type: 'dataurl', progressHandler: typeof this.onprogress): Promise<string>;
    async readAsync(blob: Blob, type: 'text', progressHandler: typeof this.onprogress): Promise<string>;
    async readAsync(blob: Blob, type: 'arraybuffer' | 'dataurl' | 'text', progressHandler: typeof this.onprogress = null) {
        this.onprogress = progressHandler;
        if (type == 'arraybuffer') {
            const promise = this._waitLoad();
            this.readAsArrayBuffer(blob);
            return await promise as ArrayBuffer;
        }
        else if (type == 'dataurl') {
            const promise = this._waitLoad();
            this.readAsArrayBuffer(blob);
            return await promise as string;
        }
        else if (type == 'text') {
            const promise = this._waitLoad();
            this.readAsText(blob);
            return await promise as string;
        }
    }
    _waitLoad() {
        return new Promise<typeof this.result>((resolve) => {
            this.onload = () => {
                resolve(this.result);
            }
        })
    }
}
export function readChartPackage(file: Blob) {
    console.group("Start reading");
    return new Promise<ChartPackage>(resolve => {
        const reader = new FileReaderExtends();
        resolve(reader.readAsync(file, 'arraybuffer', function (e: ProgressEvent) {
            console.log("Content loaded: " + data(e.loaded) + " / " + data(file.size) + " ( " + e.loaded / file.size * 100 + "% )");
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
            const textureBlobs: Record<string, Blob> = {};
            const promises: Promise<void>[] = [];
            Object.keys(zip.files).forEach(function (fileName) {
                if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(fileName)) {
                    const file = zip.file(fileName)!;
                    const promise = file.async('blob');
                    promises.push(promise.then(blob => {
                        textureBlobs[fileName] = blob;
                    }));
                }
            });
            const [music, background, chart, textures] = await Promise.all([
                musicFile.async('blob', meta => {
                    console.log("Music file loaded " + meta.percent + "%");
                }).then(createAudio),
                backgroundFile.async('blob', meta => {
                    console.log("Background file loaded " + meta.percent + "%");
                }).then(createImage),
                chartFile.async('text', meta => {
                    console.log("Chart file loaded " + meta.percent + "%");
                }).then((chartString) => {
                    const chart = JSON.parse(chartString);
                    const formatedChart = formatChart(chart);
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
            ]);
            console.log("Stop loading file")
            console.groupEnd();
            return { chart, music, background, textures };
        }))
    })
}
export function readResourcePackage(file: Blob) {
    console.group("Start reading");
    return new Promise<ResourcePackage>((resolve) => {
        const reader = new FileReaderExtends();
        resolve(
            reader.readAsync(file, 'arraybuffer', function (e: ProgressEvent) {
                console.log("Content loaded: " + data(e.loaded) + " / " + data(file.size) + " ( " + e.loaded / file.size * 100 + "% )");
            }).then(async result => {
                const zip = await JSZip.loadAsync(result);
                /*
                资源文件必须包括：
                click.png 和 click_mh.png：Click 音符的皮肤，mh 代表双押；为什么要用click而不是tap啊，tap不是本来的名字吗
                drag.png 和 drag_mh.png：Drag 音符的皮肤，mh 代表双押；为什么要用mh代表双押啊，要用HL就别用mh行不行
                flick.png 和 flick_mh.png：Flick 音符的皮肤，mh 代表双押；算了吧，还是把各种可能的名字都匹配吧
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
                const audioContext = new AudioContext();
                const tapSound = await tapSoundFile.async('arraybuffer').then(a => createAudioBuffer(audioContext, a));
                const dragSound = await dragSoundFile.async('arraybuffer').then(a => createAudioBuffer(audioContext, a));
                const flickSound = await flickSoundFile.async('arraybuffer').then(a => createAudioBuffer(audioContext, a));
                const hitFxImage = await hitFxPictureFile.async('blob').then(createImage);
                const
                    tap = await tapPictireFile.async('blob').then(createImage),
                    drag = await dragPictireFile.async('blob').then(createImage),
                    flick = await flickPictireFile.async('blob').then(createImage),
                    hold = await holdPictireFile.async('blob').then(createImage),
                    tapHL = await tapHLPictireFile.async('blob').then(createImage),
                    dragHL = await dragHLPictireFile.async('blob').then(createImage),
                    flickHL = await flickHLPictireFile.async('blob').then(createImage),
                    holdHL = await holdHLPictireFile.async('blob').then(createImage);
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
                        perfectHitFxFrame.stretchScale(hitFxScale, hitFxScale);
                        const goodHitFxFrame = perfectHitFxFrame.clone();
                        const coloredFramePerfect = hitFxTinted ? perfectHitFxFrame.color(color(colorPerfect)) : perfectHitFxFrame;
                        const coloredFrameGood = hitFxTinted ? goodHitFxFrame.color(color(colorGood)) : goodHitFxFrame;
                        perfectHitFxFrames.push(coloredFramePerfect.canvas);
                        goodHitFxFrames.push(coloredFrameGood.canvas);
                    }
                }
                console.log("Stop loading file")
                console.groupEnd();
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

function formatChart(chart: unknown): Chart {
    function _formatNumberEvents(formatedEvents: NumberEvent[], events: unknown[]) {
        for (const event of events) {
            const formatedEvent: NumberEvent = {
                bezier: 0,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 1,
                easingType: EasingType.Linear,
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 0,
                end: 0
            };
            if (isObject(event)) {
                if ("bezier" in event && (event.bezier == 0 || event.bezier == 1))
                    formatedEvent.bezier = event.bezier as Bool;
                if ("bezierPoints" in event && isArrayOf4Numbers(event.bezierPoints) && event.bezierPoints.length == 4)
                    formatedEvent.bezierPoints = event.bezierPoints;
                if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                    && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                    formatedEvent.easingLeft = event.easingLeft;
                    formatedEvent.easingRight = event.easingRight;
                }
                if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                    formatedEvent.easingType = event.easingType as EasingType;
                if ("startTime" in event && isArrayOf3Numbers(event.startTime) && event.startTime.length == 3)
                    formatedEvent.startTime = event.startTime;
                if ("endTime" in event && isArrayOf3Numbers(event.endTime) && event.endTime.length == 3)
                    formatedEvent.endTime = event.endTime;
                if ("start" in event && isNumber(event.start))
                    formatedEvent.start = event.start;
                if ("end" in event && isNumber(event.end))
                    formatedEvent.end = event.end;
            }
            formatedEvents.push(formatedEvent);
        }
    }
    function _formatColorEvents(formatedEvents: ColorEvent[], events: unknown[]) {
        for (const event of events) {
            const formatedEvent: ColorEvent = {
                bezier: 0,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 1,
                easingType: EasingType.Linear,
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: [255, 255, 255],
                end: [255, 255, 255]
            };
            if (isObject(event)) {
                if ("bezier" in event && (event.bezier == 0 || event.bezier == 1))
                    formatedEvent.bezier = event.bezier as Bool;
                if ("bezierPoints" in event && isArrayOf4Numbers(event.bezierPoints))
                    formatedEvent.bezierPoints = event.bezierPoints;
                if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                    && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                    formatedEvent.easingLeft = event.easingLeft;
                    formatedEvent.easingRight = event.easingRight;
                }
                if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                    formatedEvent.easingType = event.easingType as EasingType;
                if ("startTime" in event && isArrayOf3Numbers(event.startTime) && event.startTime.length == 3)
                    formatedEvent.startTime = event.startTime;
                if ("endTime" in event && isArrayOf3Numbers(event.endTime) && event.endTime.length == 3)
                    formatedEvent.endTime = event.endTime;
                if ("start" in event && isArray(event.start) && event.start.length == 3)
                    formatedEvent.start = event.start as RGBcolor;
                if ("end" in event && isArray(event.end) && event.end.length == 3)
                    formatedEvent.end = event.end as RGBcolor;
            }
            formatedEvents.push(formatedEvent);
        }
    }
    function _formatTextEvents(formatedEvents: TextEvent[], events: unknown[]) {
        for (const event of events) {
            const formatedEvent: TextEvent = {
                bezier: 0,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 1,
                easingType: EasingType.Linear,
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: "",
                end: ""
            };
            if (isObject(event)) {
                if ("bezier" in event && (event.bezier == 0 || event.bezier == 1))
                    formatedEvent.bezier = event.bezier as Bool;
                if ("bezierPoints" in event && isArrayOf4Numbers(event.bezierPoints) && event.bezierPoints.length == 4)
                    formatedEvent.bezierPoints = event.bezierPoints;
                if ("easingLeft" in event && "easingRight" in event && isNumber(event.easingLeft) && isNumber(event.easingRight)
                    && event.easingLeft >= 0 && event.easingRight <= 1 && event.easingLeft < event.easingRight) {
                    formatedEvent.easingLeft = event.easingLeft;
                    formatedEvent.easingRight = event.easingRight;
                }
                if ("easingType" in event && event.easingType as number >= 1 && event.easingType as number <= 29 && Number.isInteger(event.easingType))
                    formatedEvent.easingType = event.easingType as EasingType;
                if ("startTime" in event && isArrayOf3Numbers(event.startTime) && event.startTime.length == 3)
                    formatedEvent.startTime = event.startTime;
                if ("endTime" in event && isArrayOf3Numbers(event.endTime) && event.endTime.length == 3)
                    formatedEvent.endTime = event.endTime;
                if ("start" in event && isString(event.start))
                    formatedEvent.start = event.start;
                if ("end" in event && isString(event.end))
                    formatedEvent.end = event.end;
            }
            formatedEvents.push(formatedEvent);
        }
    }
    const formatedChart: Chart = {
        BPMList: [],
        META: {
            name: "Unknown",
            level: "SP Lv.?",
            offset: 0,
            charter: "Unknown",
            composer: "Unknown",
            illustrator: "Unknown"
        },
        judgeLineGroup: ["default"],
        judgeLineList: [],
        _highlighted: false
    };
    if (isObject(chart)) {
        if ("BPMList" in chart && isArray(chart.BPMList)) for (const bpm of chart.BPMList) {
            const formatedBPM: BPM = {
                bpm: 120,
                startTime: [0, 0, 1]
            };
            if (isObject(bpm)) {
                if ("bpm" in bpm && isNumber(bpm.bpm))
                    formatedBPM.bpm = bpm.bpm;
                if ("startTime" in bpm && isArrayOf3Numbers(bpm.startTime))
                    formatedBPM.startTime = bpm.startTime;
            }
            formatedChart.BPMList.push(formatedBPM);
        }
        if ("META" in chart && isObject(chart.META)) {
            if ("name" in chart.META && isString(chart.META.name)) formatedChart.META.name = chart.META.name;
            if ("level" in chart.META && isString(chart.META.level)) formatedChart.META.level = chart.META.level;
            if ("offset" in chart.META && isNumber(chart.META.offset)) formatedChart.META.offset = chart.META.offset;
            if ("charter" in chart.META && isString(chart.META.charter)) formatedChart.META.charter = chart.META.charter;
            if ("composer" in chart.META && isString(chart.META.composer)) formatedChart.META.composer = chart.META.composer;
            if ("illustrator" in chart.META && isString(chart.META.illustrator)) formatedChart.META.illustrator = chart.META.illustrator;
        }
        if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) for (const group of chart.judgeLineGroup) {
            let formatedGroup = "default";
            if (isString(group)) {
                formatedGroup = group;
            }
            formatedChart.judgeLineGroup.push(formatedGroup);
        }
        if ("judgeLineList" in chart && isArray(chart.judgeLineList)) for (const judgeLine of chart.judgeLineList) {
            const formatedJudgeLine: JudgeLine = {
                Group: 0,
                Name: "Unnamed",
                Texture: "line.png",
                eventLayers: [],
                notes: [],
                isCover: 1,
                extended: {
                    scaleXEvents: [],
                    scaleYEvents: [],
                    colorEvents: [],
                    paintEvents: [],
                    textEvents: []
                },
                father: -1,
                zOrder: 0
            };
            if (isObject(judgeLine)) {
                if ("Group" in judgeLine && isNumber(judgeLine.Group))
                    formatedJudgeLine.Group = judgeLine.Group;
                if ("Name" in judgeLine && isString(judgeLine.Name))
                    formatedJudgeLine.Name = judgeLine.Name;
                if ("Texture" in judgeLine && isString(judgeLine.Texture))
                    formatedJudgeLine.Texture = judgeLine.Texture;
                if ("isCover" in judgeLine && (judgeLine.isCover === 0 || judgeLine.isCover === 1))
                    formatedJudgeLine.isCover = judgeLine.isCover;
                if ("father" in judgeLine && isNumber(judgeLine.father))
                    formatedJudgeLine.father = judgeLine.father;
                if ("zOrder" in judgeLine && isNumber(judgeLine.zOrder))
                    formatedJudgeLine.zOrder = judgeLine.zOrder;
                if ("eventLayers" in judgeLine && isArray(judgeLine.eventLayers)) for (const eventLayer of judgeLine.eventLayers) {
                    const formatedEventLayer: BaseEventLayer = {
                        moveXEvents: [],
                        moveYEvents: [],
                        rotateEvents: [],
                        alphaEvents: [],
                        speedEvents: []
                    }
                    if (isObject(eventLayer)) {
                        if ("moveXEvents" in eventLayer && isArray(eventLayer.moveXEvents))
                            _formatNumberEvents(formatedEventLayer.moveXEvents, eventLayer.moveXEvents);
                        if ("moveYEvents" in eventLayer && isArray(eventLayer.moveYEvents))
                            _formatNumberEvents(formatedEventLayer.moveYEvents, eventLayer.moveYEvents);
                        if ("rotateEvents" in eventLayer && isArray(eventLayer.rotateEvents))
                            _formatNumberEvents(formatedEventLayer.rotateEvents, eventLayer.rotateEvents);
                        if ("alphaEvents" in eventLayer && isArray(eventLayer.alphaEvents))
                            _formatNumberEvents(formatedEventLayer.alphaEvents, eventLayer.alphaEvents);
                        if ("speedEvents" in eventLayer && isArray(eventLayer.speedEvents))
                            _formatNumberEvents(formatedEventLayer.speedEvents, eventLayer.speedEvents);
                    }
                    formatedJudgeLine.eventLayers.push(formatedEventLayer);
                }
                if ("extended" in judgeLine && isObject(judgeLine.extended)) {
                    if ("scaleXEvents" in judgeLine.extended && isArray(judgeLine.extended.scaleXEvents))
                        _formatNumberEvents(formatedJudgeLine.extended.scaleXEvents, judgeLine.extended.scaleXEvents);
                    if ("scaleYEvents" in judgeLine.extended && isArray(judgeLine.extended.scaleYEvents))
                        _formatNumberEvents(formatedJudgeLine.extended.scaleYEvents, judgeLine.extended.scaleYEvents);
                    if ("colorEvents" in judgeLine.extended && isArray(judgeLine.extended.colorEvents))
                        _formatColorEvents(formatedJudgeLine.extended.colorEvents, judgeLine.extended.colorEvents);
                    if ("paintEvents" in judgeLine.extended && isArray(judgeLine.extended.paintEvents))
                        _formatNumberEvents(formatedJudgeLine.extended.paintEvents, judgeLine.extended.paintEvents);
                    if ("textEvents" in judgeLine.extended && isArray(judgeLine.extended.textEvents))
                        _formatTextEvents(formatedJudgeLine.extended.textEvents, judgeLine.extended.textEvents);
                }
                if ("notes" in judgeLine && isArray(judgeLine.notes)) for (const note of judgeLine.notes) {
                    const formatedNote: Note = {
                        above: 1,
                        alpha: 255,
                        startTime: [0, 0, 1],
                        endTime: [0, 0, 1],
                        type: NoteType.Tap,
                        isFake: 0,
                        positionX: 0,
                        size: 1,
                        speed: 1,
                        yOffset: 0,
                        visibleTime: 999999.99,
                        _highlight: false,
                        _hitState: HitState.NotHitted,
                        _hitSeconds: Infinity
                    }
                    if (isObject(note)) {
                        if ("above" in note && isNumber(note.above))
                            formatedNote.above = (note.above == 1 ? 1 : 0);
                        if ("alpha" in note && isNumber(note.alpha) && note.alpha >= 0 && note.alpha <= 255)
                            formatedNote.alpha = note.alpha;
                        if ("startTime" in note && isArrayOf3Numbers(note.startTime))
                            formatedNote.startTime = note.startTime;
                        if ("endTime" in note && isArrayOf3Numbers(note.endTime))
                            formatedNote.endTime = note.endTime;
                        if ("type" in note && note.type as number >= 1 && note.type as number <= 4 && Number.isInteger(note.type))
                            formatedNote.type = note.type as NoteType;
                        if ("isFake" in note && (note.isFake == 0 || note.isFake == 1))
                            formatedNote.isFake = note.isFake as Bool;
                        if ("positionX" in note && isNumber(note.positionX))
                            formatedNote.positionX = note.positionX;
                        if ("size" in note && isNumber(note.size))
                            formatedNote.size = note.size;
                        if ("speed" in note && isNumber(note.speed))
                            formatedNote.speed = note.speed;
                        if ("yOffset" in note && isNumber(note.yOffset))
                            formatedNote.yOffset = note.yOffset;
                        if ("visibleTime" in note && isNumber(note.visibleTime))
                            formatedNote.visibleTime = note.visibleTime;
                    }
                    formatedJudgeLine.notes.push(formatedNote);
                }
            }
            formatedChart.judgeLineList.push(formatedJudgeLine);
        }
    }
    return formatedChart;
}