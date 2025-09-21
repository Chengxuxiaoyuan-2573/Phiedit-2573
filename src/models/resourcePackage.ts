import JSZip from "jszip";
import { isArrayOfNumbers } from "../tools/typeTools";
import { FileReaderExtends } from "../tools/classExtends";
import EditableImage from "../tools/editableImage";
import jsyaml from "js-yaml";
import { parseRGBAfromNumber, RGBAcolor } from "../tools/color";
import { NoteType } from "./note";
import { isObject, isNumber, isBoolean, mean } from "lodash";
import MediaUtils from "../tools/mediaUtils";
type Image = HTMLImageElement | HTMLCanvasElement;
interface IResourcePackage {
    tap: HTMLImageElement;
    flick: HTMLImageElement;
    drag: HTMLImageElement;
    hold: HTMLImageElement;
    holdHead: HTMLCanvasElement;
    holdEnd: HTMLCanvasElement;
    holdBody: HTMLCanvasElement;
    tapHL: HTMLImageElement;
    flickHL: HTMLImageElement;
    dragHL: HTMLImageElement;
    holdHL: HTMLImageElement;
    holdHLHead: HTMLCanvasElement;
    holdHLEnd: HTMLCanvasElement;
    holdHLBody: HTMLCanvasElement;
    tapSound: AudioBuffer;
    dragSound: AudioBuffer;
    flickSound: AudioBuffer;
    perfectHitFxFrames: Image[];
    goodHitFxFrames: Image[];
    config: ResourceConfig;
}
interface ResourceConfig {

    /** 打击特效的持续时间，以秒为单位 */
    hitFxDuration: number;

    /** 打击特效缩放比例，该属性已经在加载资源包时预先乘以该属性的值 */
    // hitFxScale: number;

    /** 打击特效是否随 Note 旋转 */
    hitFxRotate: boolean;

    /** 打击特效是否依照判定线颜色着色，该属性已经在加载资源包时预先给打击特效上了色 */
    // hitFxTinted: boolean;

    /** 打击时是否隐藏方形粒子效果 */
    hideParticles: boolean;

    /** Hold 触线后是否还显示头部 */
    holdKeepHead: boolean;

    /** Hold 的中间部分是否采用重复式拉伸 */
    holdRepeat: boolean;

    /** 是否把 Hold 的头部和尾部与 Hold 中间重叠 */
    holdCompact: boolean;

    /** AP（全 Perfect）情况下的判定线颜色 */
    colorPerfect: RGBAcolor;

    /** FC（全连）情况下的判定线颜色 */
    colorGood: RGBAcolor;
}
const audioContext = new AudioContext();

/* eslint-disable no-magic-numbers */
const
    DEFAULT_HITFX = [5, 6] as [number, number],
    DEFAULT_HOLD_ATLAS = [50, 50] as [number, number],
    DEFAULT_HOLD_ATLAS_MH = [50, 110] as [number, number],
    DEFAULT_HITFX_DURATION = 0.5,
    DEFAULT_HITFX_SCALE = 1.0,
    DEFAULT_HITFX_ROTATE = false,
    DEFAULT_HITFX_TINTED = true,
    DEFAULT_HIDE_PARTICLES = false,
    DEFAULT_HOLD_KEEPHEAD = false,
    DEFAULT_HOLD_REPEAT = false,
    DEFAULT_HOLD_COMPACT = false,
    DEFAULT_COLOR_PERFECT: RGBAcolor = [0xff, 0xec, 0x9f, 0xe1],
    DEFAULT_COLOR_GOOD: RGBAcolor = [0xb4, 0xe1, 0xff, 0xeb],
    HITFX_SIZE = 256;
/* eslint-enable no-magic-numbers */

export class ResourcePackage implements IResourcePackage {
    tap: HTMLImageElement;
    flick: HTMLImageElement;
    drag: HTMLImageElement;
    hold: HTMLImageElement;
    holdHead: HTMLCanvasElement;
    holdEnd: HTMLCanvasElement;
    holdBody: HTMLCanvasElement;
    tapHL: HTMLImageElement;
    flickHL: HTMLImageElement;
    dragHL: HTMLImageElement;
    holdHL: HTMLImageElement;
    holdHLHead: HTMLCanvasElement;
    holdHLEnd: HTMLCanvasElement;
    holdHLBody: HTMLCanvasElement;
    tapSound: AudioBuffer;
    dragSound: AudioBuffer;
    flickSound: AudioBuffer;
    perfectHitFxFrames: Image[];
    goodHitFxFrames: Image[];
    config: ResourceConfig;
    getSkin(noteType: NoteType.Hold, highlight: boolean): { head: HTMLCanvasElement, body: HTMLCanvasElement, end: HTMLCanvasElement };
    getSkin(noteType: NoteType.Tap | NoteType.Drag | NoteType.Flick, highlight: boolean): HTMLImageElement;
    getSkin(noteType: NoteType, highlight: boolean) {
        if (noteType === NoteType.Drag) {
            if (highlight) {
                return this.dragHL;
            }
            else {
                return this.drag;
            }
        }
        else if (noteType === NoteType.Flick) {
            if (highlight) {
                return this.flickHL;
            }
            else {
                return this.flick;
            }
        }
        else if (noteType === NoteType.Tap) {
            if (highlight) {
                return this.tapHL;
            }
            else {
                return this.tap;
            }
        }
        else {
            if (highlight) {
                return {
                    head: this.holdHLHead,
                    body: this.holdHLBody,
                    end: this.holdHLEnd
                };
            }
            else {
                return {
                    head: this.holdHead,
                    body: this.holdBody,
                    end: this.holdEnd
                };
            }
        }
    }
    playSound(noteType: NoteType, volume = 1) {
        switch (noteType) {
            case NoteType.Tap:
            case NoteType.Hold:
                MediaUtils.playSound.call(audioContext, this.tapSound, undefined, volume);
                return;
            case NoteType.Drag:
                MediaUtils.playSound.call(audioContext, this.dragSound, undefined, volume);
                return;
            case NoteType.Flick:
                MediaUtils.playSound.call(audioContext, this.flickSound, undefined, volume);
                return;
        }
    }
    constructor(resourcePackage: IResourcePackage) {
        this.tap = resourcePackage.tap;
        this.flick = resourcePackage.flick;
        this.drag = resourcePackage.drag;
        this.hold = resourcePackage.hold;
        this.holdHead = resourcePackage.holdHead;
        this.holdEnd = resourcePackage.holdEnd;
        this.holdBody = resourcePackage.holdBody;
        this.tapHL = resourcePackage.tapHL;
        this.flickHL = resourcePackage.flickHL;
        this.dragHL = resourcePackage.dragHL;
        this.holdHL = resourcePackage.holdHL;
        this.holdHLHead = resourcePackage.holdHLHead;
        this.holdHLEnd = resourcePackage.holdHLEnd;
        this.holdHLBody = resourcePackage.holdHLBody;
        this.tapSound = resourcePackage.tapSound;
        this.dragSound = resourcePackage.dragSound;
        this.flickSound = resourcePackage.flickSound;
        this.perfectHitFxFrames = resourcePackage.perfectHitFxFrames;
        this.goodHitFxFrames = resourcePackage.goodHitFxFrames;
        this.config = resourcePackage.config;
    }
    static load(arrayBuffer: ArrayBuffer, progressHandler?: (e: ResPakLoadProgress) => void) {
        return new Promise<ResourcePackage>((resolve) => {
            const blob = MediaUtils.arrayBufferToBlob(arrayBuffer);
            const reader = new FileReaderExtends();
            resolve(
                reader.readAsync(blob, "arraybuffer", function (e: ProgressEvent) {
                    if (progressHandler) {
                        progressHandler({
                            progress: e.loaded / e.total * 100,
                            description: "读取资源包内容"
                        });
                    }
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
                    const infoContent = await info.async("text");
                    const infoObj: unknown = info.name.endsWith(".json") ? JSON.parse(infoContent) : jsyaml.load(infoContent);
                    if (!isObject(infoObj)) throw new Error("Invalid info file");
                    let hitFx: [number, number] = DEFAULT_HITFX,
                        holdAtlas: [number, number] = DEFAULT_HOLD_ATLAS,
                        holdAtlasMH: [number, number] = DEFAULT_HOLD_ATLAS_MH,
                        hitFxDuration = DEFAULT_HITFX_DURATION,
                        hitFxScale = DEFAULT_HITFX_SCALE,
                        hitFxRotate = DEFAULT_HITFX_ROTATE,
                        hitFxTinted = DEFAULT_HITFX_TINTED,
                        hideParticles = DEFAULT_HIDE_PARTICLES,
                        holdKeepHead = DEFAULT_HOLD_KEEPHEAD,
                        holdRepeat = DEFAULT_HOLD_REPEAT,
                        holdCompact = DEFAULT_HOLD_COMPACT,
                        colorPerfect: RGBAcolor = DEFAULT_COLOR_PERFECT,
                        colorGood: RGBAcolor = DEFAULT_COLOR_GOOD;
                    if ("hitFx" in infoObj && isArrayOfNumbers(infoObj.hitFx, 2)) hitFx = infoObj.hitFx;
                    else throw new Error("Missing property hitFx in info file");
                    if ("holdAtlas" in infoObj && isArrayOfNumbers(infoObj.holdAtlas, 2)) holdAtlas = infoObj.holdAtlas;
                    else throw new Error("Missing property holdAtlas in info file");
                    if ("holdAtlasMH" in infoObj && isArrayOfNumbers(infoObj.holdAtlasMH, 2)) holdAtlasMH = infoObj.holdAtlasMH;
                    else throw new Error("Missing property holdAtlasMH in info file");
                    if ("hitFxDuration" in infoObj && isNumber(infoObj.hitFxDuration)) hitFxDuration = infoObj.hitFxDuration;
                    if ("hitFxScale" in infoObj && isNumber(infoObj.hitFxScale)) hitFxScale = infoObj.hitFxScale;
                    if ("hitFxRotate" in infoObj && isBoolean(infoObj.hitFxRotate)) hitFxRotate = infoObj.hitFxRotate;
                    if ("hitFxTinted" in infoObj && isBoolean(infoObj.hitFxTinted)) hitFxTinted = infoObj.hitFxTinted;
                    if ("hideParticles" in infoObj && isBoolean(infoObj.hideParticles)) hideParticles = infoObj.hideParticles;
                    if ("holdKeepHead" in infoObj && isBoolean(infoObj.holdKeepHead)) holdKeepHead = infoObj.holdKeepHead;
                    if ("holdRepeat" in infoObj && isBoolean(infoObj.holdRepeat)) holdRepeat = infoObj.holdRepeat;
                    if ("holdCompact" in infoObj && isBoolean(infoObj.holdCompact)) holdCompact = infoObj.holdCompact;
                    if ("colorPerfect" in infoObj && isNumber(infoObj.colorPerfect)) colorPerfect = parseRGBAfromNumber(infoObj.colorPerfect);
                    if ("colorGood" in infoObj && isNumber(infoObj.colorGood)) colorGood = parseRGBAfromNumber(infoObj.colorGood);
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
                    };
                    const _showProgress = () => {
                        if (progressHandler) {
                            progressHandler({
                                description: "读取资源包中的文件",
                                progress: mean(Object.values(progress))
                            });
                        }
                    };

                    const tapSoundPromise = tapSoundFile.async("arraybuffer", meta => {
                        progress.tapSound = meta.percent;
                        _showProgress();
                    }).then(MediaUtils.createAudioBuffer.bind(audioContext));
                    const dragSoundPromise = dragSoundFile.async("arraybuffer", meta => {
                        progress.dragSound = meta.percent;
                        _showProgress();
                    }).then(MediaUtils.createAudioBuffer.bind(audioContext));
                    const flickSoundPromise = flickSoundFile.async("arraybuffer", meta => {
                        progress.flickSound = meta.percent;
                        _showProgress();
                    }).then(MediaUtils.createAudioBuffer.bind(audioContext));
                    const hitFxImagePromise = hitFxPictureFile.async("blob", meta => {
                        progress.hitFx = meta.percent;
                        _showProgress();
                    }).then(MediaUtils.createImage);
                    const
                        tapPromise = tapPictireFile.async("blob", meta => {
                            progress.tap = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        dragPromise = dragPictireFile.async("blob", meta => {
                            progress.drag = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        flickPromise = flickPictireFile.async("blob", meta => {
                            progress.flick = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        holdPromise = holdPictireFile.async("blob", meta => {
                            progress.hold = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        tapHLPromise = tapHLPictireFile.async("blob", meta => {
                            progress.tapHL = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        dragHLPromise = dragHLPictireFile.async("blob", meta => {
                            progress.dragHL = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        flickHLPromise = flickHLPictireFile.async("blob", meta => {
                            progress.flickHL = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage),
                        holdHLPromise = holdHLPictireFile.async("blob", meta => {
                            progress.holdHL = meta.percent;
                            _showProgress();
                        }).then(MediaUtils.createImage);
                    const [tapSound, dragSound, flickSound, hitFxImage,
                        tap, drag, flick, hold,
                        tapHL, dragHL, flickHL, holdHL] =
                        await Promise.all([
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
                    const perfectHitFxFrames: Image[] = [];
                    const goodHitFxFrames: Image[] = [];
                    for (let i = 0; i < hitFx[1]; i++) {
                        for (let j = 0; j < hitFx[0]; j++) {
                            const perfectHitFxFrame = new EditableImage(hitFxImage, j * hitFxWidth, i * hitFxHeight, hitFxWidth, hitFxHeight);
                            perfectHitFxFrame.stretch(HITFX_SIZE * hitFxScale, HITFX_SIZE * hitFxScale);
                            const goodHitFxFrame = perfectHitFxFrame.clone();
                            const coloredFramePerfect = hitFxTinted ? perfectHitFxFrame.color(colorPerfect) : perfectHitFxFrame;
                            const coloredFrameGood = hitFxTinted ? goodHitFxFrame.color(colorGood) : goodHitFxFrame;
                            perfectHitFxFrames.push(coloredFramePerfect.canvas);
                            goodHitFxFrames.push(coloredFrameGood.canvas);
                        }
                    }
                    return new ResourcePackage({
                        tap, drag, flick, holdHead, holdEnd, holdBody, hold,
                        tapHL, dragHL, flickHL, holdHLHead, holdHLEnd, holdHLBody, holdHL,
                        tapSound, dragSound, flickSound,
                        perfectHitFxFrames, goodHitFxFrames,
                        config: {
                            hitFxDuration, hitFxRotate, hideParticles,
                            holdKeepHead, holdRepeat, holdCompact,
                            colorPerfect, colorGood
                        }
                    });
                })
            );
        });
    }
}
interface ResPakLoadProgress {

    /** 加载描述 */
    description: string;

    /** 加载进度 */
    progress: number;
}