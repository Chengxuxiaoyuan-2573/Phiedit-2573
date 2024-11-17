import JSZip from "jszip";
import { data, createAudioBuffer, createImage, color } from "../tools";
import { isObject, isArrayOf2Numbers, isNumber, isBoolean } from "../typeCheck";
import { FileReaderExtends } from "./classExtends";
import { EditableImage } from "./editableImage";
import jsyaml from "js-yaml";

export class ResourcePackage {
    tap: HTMLImageElement;
    flick: HTMLImageElement;
    drag: HTMLImageElement;
    holdHead: HTMLCanvasElement;
    holdEnd: HTMLCanvasElement;
    holdBody: HTMLCanvasElement;
    tapHL: HTMLImageElement;
    flickHL: HTMLImageElement;
    dragHL: HTMLImageElement;
    holdHLHead: HTMLCanvasElement;
    holdHLEnd: HTMLCanvasElement;
    holdHLBody: HTMLCanvasElement;
    audioContext: AudioContext;
    tapSound: AudioBuffer;
    dragSound: AudioBuffer;
    flickSound: AudioBuffer;
    perfectHitFxFrames: HTMLCanvasElement[];
    goodHitFxFrames: HTMLCanvasElement[];
    hitFxDuration: number; // 打击特效的持续时间，以秒为单位
    //hitFxScale: number; // 打击特效缩放比例
    hitFxFrequency: number; // Hold 的打击特效播放频率（多少秒生成一个打击特效）
    hitFxRotate: boolean; // 打击特效是否随 Note 旋转
    //hitFxTinted: boolean; // 打击特效是否依照判定线颜色着色
    hideParticles: boolean; // 打击时是否隐藏方形粒子效果
    holdKeepHead: boolean; // Hold 触线后是否还显示头部
    holdRepeat: boolean; // Hold 的中间部分是否采用重复式拉伸
    holdCompact: boolean; // 是否把 Hold 的头部和尾部与 Hold 中间重叠
    colorPerfect: number; // AP（全 Perfect）情况下的判定线颜色
    colorGood: number; // FC（全连）情况下的判定线颜色
    constructor(resourcePackage: ResourcePackage) {
        this.tap = resourcePackage.tap;
        this.drag = resourcePackage.drag;
        this.flick = resourcePackage.flick;
        this.holdHead = resourcePackage.holdHead;
        this.holdEnd = resourcePackage.holdEnd;
        this.holdBody = resourcePackage.holdBody;
        this.tapHL = resourcePackage.tapHL;
        this.dragHL = resourcePackage.dragHL;
        this.flickHL = resourcePackage.flickHL;
        this.holdHLHead = resourcePackage.holdHLHead;
        this.holdHLEnd = resourcePackage.holdHLEnd;
        this.holdHLBody = resourcePackage.holdHLBody;
        this.audioContext = resourcePackage.audioContext;
        this.tapSound = resourcePackage.tapSound;
        this.dragSound = resourcePackage.dragSound;
        this.flickSound = resourcePackage.flickSound;
        this.perfectHitFxFrames = resourcePackage.perfectHitFxFrames;
        this.goodHitFxFrames = resourcePackage.goodHitFxFrames;
        this.hitFxDuration = resourcePackage.hitFxDuration;
        this.hitFxFrequency = resourcePackage.hitFxFrequency;
        this.hitFxRotate = resourcePackage.hitFxRotate;
        this.hideParticles = resourcePackage.hideParticles;
        this.holdKeepHead = resourcePackage.holdKeepHead;
        this.holdCompact = resourcePackage.holdCompact;
        this.holdRepeat = resourcePackage.holdRepeat;
        this.colorPerfect = resourcePackage.colorPerfect;
        this.colorGood = resourcePackage.colorGood;
    }
    static load(file: Blob, progressHandler?: (progress: string) => void, p = 2) {
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
                    const infoObj: unknown = info.name.endsWith(".json") ? JSON.parse(infoContent) : jsyaml.load(infoContent);
                    if (!isObject(infoObj)) throw new Error("Invalid info file");
                    let hitFx = [5, 6] as [number, number],
                        holdAtlas = [50, 50] as [number, number],
                        holdAtlasMH = [50, 110] as [number, number],
                        hitFxDuration = 0.5,
                        hitFxScale = 1.0,
                        hitFxFrequency = 0.1,
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
                    if ("hitFxFrequency" in infoObj && isNumber(infoObj.hitFxFrequency)) hitFxFrequency = infoObj.hitFxFrequency;
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
                    const [tapSound, dragSound, flickSound, hitFxImage,
                        tap, drag, flick, hold,
                        tapHL, dragHL, flickHL, holdHL] = await Promise.all([
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
                    return new ResourcePackage({
                        tap, drag, flick, holdHead, holdEnd, holdBody,
                        tapHL, dragHL, flickHL, holdHLHead, holdHLEnd, holdHLBody,
                        audioContext, tapSound, dragSound, flickSound,
                        perfectHitFxFrames, goodHitFxFrames, hitFxDuration, hitFxFrequency,
                        hitFxRotate, hideParticles, holdKeepHead, holdRepeat, holdCompact,
                        colorPerfect, colorGood
                    });
                })
            );
        })
    }
}
