import { ceil, floor } from "lodash";
import { easingFuncs, EasingType, cubicBezierEase } from "./classes/easing";
import { TaskQueue } from "./classes/taskQueue";
import { NumberEvent, ColorEvent, TextEvent, BaseEvent } from "./classes/event";
import { Box } from "./classes/box";
import { RGBcolor } from "./classes/color";
import { Note, NoteAbove, NoteType } from "./classes/note";
import { Beats, beatsToSeconds, getBeatsValue } from "./classes/beats";
import { CanvasState, Editor } from "./classes/editor";
import { getContext, sortAndForEach } from "./tools";
import canvasUtils from "./tools/canvasUtils";
import math from "./tools/math";
import { Cache } from "./store";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";

export default class Renderer {
    chartPackage: ChartPackage;
    resourcePackage: ResourcePackage;
    editor: Editor;
    cache: Cache;
    canvas: HTMLCanvasElement;
    /** 上一次显示画面的时间，用来计算FPS */
    renderTime: number;
    fps = 0;
    fpsHistory: number[] = [];
    static fpsHistoryMaxSize = 10;
    constructor(options: {
        chartPackage: ChartPackage,
        resourcePackage: ResourcePackage,
        editor: Editor,
        cache: Cache,
        canvas: HTMLCanvasElement
    }) {
        this.chartPackage = options.chartPackage;
        this.resourcePackage = options.resourcePackage;
        this.editor = options.editor;
        this.cache = options.cache;
        this.canvas = options.canvas;
        this.renderTime = Date.now();
    }
    render(seconds: number) {
        const { chart, background, textures } = this.chartPackage;
        seconds -= chart.META.offset / 1000;
        const ctx = getContext(this.canvas);
        const drawLine = canvasUtils.drawLine.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        /** 显示编辑器界面到canvas上 */
        const showEditor = (seconds: number) => {
            const drawBackground = () => {
                drawRect(0, 0, this.canvas.width, this.canvas.height, this.editor.backgroundColor, true);
            }
            /** 显示网格 */
            const drawGrid = () => {
                const min = floor(this.editor.getBeats(chart.BPMList, seconds, this.editor.notesViewBox.bottom));
                const max = ceil(this.editor.getBeats(chart.BPMList, seconds, this.editor.notesViewBox.top));
                for (let i = min; i <= max; i++) {
                    for (let j = 0; j < this.editor.horizonalLineCount; j++) {
                        const beats: Beats = [i, j, this.editor.horizonalLineCount];
                        const pos = this.editor.getPositionYOfSeconds(seconds, beatsToSeconds(chart.BPMList, beats));
                        if (j == 0) {
                            writeText(i.toString(),
                                (this.editor.eventsViewBox.left + this.editor.notesViewBox.right) / 2,
                                pos,
                                20,
                                this.editor.horzionalMainLineColor);
                            drawLine(this.editor.notesViewBox.left,
                                pos, this.editor.notesViewBox.right,
                                pos,
                                this.editor.horzionalMainLineColor);
                            drawLine(this.editor.eventsViewBox.left,
                                pos,
                                this.editor.eventsViewBox.right,
                                pos,
                                this.editor.horzionalMainLineColor);
                        }
                        else {
                            writeText(j.toString(),
                                (this.editor.eventsViewBox.left + this.editor.notesViewBox.right) / 2,
                                pos,
                                20,
                                this.editor.horzionalLineColor);
                            drawLine(this.editor.notesViewBox.left,
                                pos, this.editor.notesViewBox.right,
                                pos,
                                this.editor.horzionalLineColor);
                            drawLine(this.editor.eventsViewBox.left,
                                pos, this.editor.eventsViewBox.right,
                                pos,
                                this.editor.horzionalLineColor);
                        }
                    }
                }
                drawLine(
                    this.editor.notesViewBox.middleX,
                    this.editor.notesViewBox.top,
                    this.editor.notesViewBox.middleX,
                    this.editor.notesViewBox.bottom,
                    this.editor.verticalMainLineColor
                );

                for (let i = this.editor.notesViewBox.middleX + this.editor.verticalLineSpace;
                    i <= this.editor.notesViewBox.right;
                    i += this.editor.verticalLineSpace)
                    drawLine(i,
                        this.editor.notesViewBox.top,
                        i, this.editor.notesViewBox.bottom,
                        this.editor.verticalLineColor);

                for (let i = this.editor.notesViewBox.middleX - this.editor.verticalLineSpace;
                    i >= this.editor.notesViewBox.left;
                    i -= this.editor.verticalLineSpace)
                    drawLine(i,
                        this.editor.notesViewBox.top,
                        i,
                        this.editor.notesViewBox.bottom,
                        this.editor.verticalLineColor);

                for (let i = 1; i < 5; i++)
                    drawLine(this.editor.eventsViewBox.width * i / 5 + this.editor.eventsViewBox.left,
                        this.editor.eventsViewBox.top,
                        this.editor.eventsViewBox.width * i / 5 + this.editor.eventsViewBox.left,
                        this.editor.notesViewBox.bottom,
                        this.editor.verticalMainLineColor);

                drawRect(this.editor.notesViewBox.left,
                    this.editor.notesViewBox.top,
                    this.editor.notesViewBox.width,
                    this.editor.notesViewBox.height,
                    this.editor.borderColor);
                drawRect(this.editor.eventsViewBox.left,
                    this.editor.eventsViewBox.top,
                    this.editor.eventsViewBox.width,
                    this.editor.eventsViewBox.height,
                    this.editor.borderColor);
            }
            /** 显示note */
            const drawNotes = () => {
                const noteBoxes: Box<Note>[] = [];
                for (const note of judgeLine.notes) {
                    const { startSeconds: noteStartSeconds, endSeconds: noteEndSeconds } = note.calculateSeconds(chart.BPMList);
                    if (seconds >= noteStartSeconds && note.hitSeconds == undefined && !note.isFake) {
                        note.hitSeconds = noteStartSeconds; // You should use this instead of that ↓
                        // note.hitSeconds = seconds; // If you use this, Mr.Autoplay may be good or bad
                        this.resourcePackage.playSound(note.type);
                    }
                    if (note.hitSeconds && seconds < note.hitSeconds) {
                        note.hitSeconds = undefined;
                    }
                    // ctx.globalAlpha = note.alpha / 255;
                    if (note.type == NoteType.Hold) {
                        const { head, body, end } = this.resourcePackage.getSkin(note.type, note.highlight);

                        const baseSize = this.editor.notesViewBox.width / this.canvas.width * this.chartPackage.noteSize;
                        const noteWidth = baseSize * note.size
                            * this.resourcePackage.getSkin(note.type, note.highlight).body.width
                            / this.resourcePackage.getSkin(note.type, false).body.width;

                        const noteX = note.positionX * (this.editor.notesViewBox.width / this.canvas.width) + this.editor.notesViewBox.left + this.editor.notesViewBox.width / 2;
                        const noteStartY = this.editor.getPositionYOfSeconds(seconds, noteStartSeconds);
                        const noteEndY = this.editor.getPositionYOfSeconds(seconds, noteEndSeconds);
                        const noteHeight = noteStartY - noteEndY;
                        const noteHeadHeight = head.height / body.width * noteWidth;
                        const noteEndHeight = end.height / body.width * noteWidth;

                        ctx.drawImage(head, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
                        ctx.drawImage(body, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
                        ctx.drawImage(end, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
                        if (this.editor.selection.includes(note)) {
                            drawRect(
                                noteX - noteWidth / 2,
                                noteEndY - noteEndHeight,
                                noteWidth,
                                noteEndHeight + noteHeight + noteHeadHeight,
                                [...this.editor.selectionColor, 0.6],
                                true
                            );
                        }
                        noteBoxes.push(new Box(
                            noteEndY - this.editor.selectPadding,
                            noteStartY + this.editor.selectPadding,
                            noteX - noteWidth / 2 - this.editor.selectPadding,
                            noteX + noteWidth / 2 + this.editor.selectPadding,
                            note
                        ));
                    }
                    else {
                        const noteImage = this.resourcePackage.getSkin(note.type, note.highlight);

                        const baseSize = this.editor.notesViewBox.width / this.canvas.width * this.chartPackage.noteSize;
                        const noteWidth = baseSize * note.size
                            * this.resourcePackage.getSkin(note.type, note.highlight).width
                            / this.resourcePackage.getSkin(note.type, false).width;

                        const noteHeight = noteImage.height / noteImage.width * baseSize;
                        const noteX = note.positionX * (this.editor.notesViewBox.width / this.canvas.width) + this.editor.notesViewBox.left + this.editor.notesViewBox.width / 2;
                        const noteY = this.editor.getPositionYOfSeconds(seconds, noteStartSeconds);

                        ctx.drawImage(
                            noteImage,
                            noteX - noteWidth / 2,
                            noteY - noteHeight / 2,
                            noteWidth,
                            noteHeight
                        );
                        if (this.editor.selection.includes(note)) {
                            drawRect(
                                noteX - noteWidth / 2,
                                noteY - noteHeight / 2,
                                noteWidth,
                                noteHeight,
                                [...this.editor.selectionColor, 0.6],
                                true
                            );
                        }
                        noteBoxes.push(new Box(
                            noteY - this.editor.selectPadding,
                            noteY + this.editor.selectPadding,
                            noteX - noteWidth / 2 - this.editor.selectPadding,
                            noteX + noteWidth / 2 + this.editor.selectPadding,
                            note
                        ));
                    }
                }
                return noteBoxes;
            }
            /** 显示事件 */
            const drawEvents = <T extends NumberEvent>(events: T[], type: 'moveX' | 'moveY' | 'rotate' | 'alpha' | 'speed') => {
                const boxes: Box<T>[] = [];
                const column = {
                    moveX: 0,
                    moveY: 1,
                    rotate: 2,
                    alpha: 3,
                    speed: 4
                }[type];
                const eventX = this.editor.eventsViewBox.width * (column + 0.5) / 5 + this.editor.eventsViewBox.left;
                for (const event of events) {
                    const { startSeconds, endSeconds } = event.calculateSeconds(chart.BPMList);
                    const eventStartY = this.editor.getPositionYOfSeconds(seconds, startSeconds);
                    const eventEndY = this.editor.getPositionYOfSeconds(seconds, endSeconds);
                    const eventHeight = eventStartY - eventEndY;
                    drawRect(
                        eventX - this.editor.eventWidth / 2,
                        eventEndY,
                        this.editor.eventWidth,
                        eventHeight,
                        this.editor.selection.includes(event) ? this.editor.selectionColor : "white",
                        true
                    );
                    writeText(event.start.toFixed(2), eventX, eventStartY - 1, 30, "orange");
                    writeText(event.end.toFixed(2), eventX, eventEndY, 30, "orange");
                    const box = new Box(
                        eventEndY - this.editor.selectPadding,
                        eventStartY + this.editor.selectPadding,
                        eventX - this.editor.eventWidth / 2 - this.editor.selectPadding,
                        eventX + this.editor.eventWidth / 2 + this.editor.selectPadding,
                        event
                    );
                    boxes.push(box);
                }
                const currentEventValue = interpolateNumberEventValue(findLastEvent(events, seconds), seconds);
                writeText(currentEventValue.toFixed(2), eventX, this.editor.eventsViewBox.bottom - 20, 30, "white", false);
                writeText(currentEventValue.toFixed(2), eventX, this.editor.eventsViewBox.bottom - 20, 30, "blue", true);
                return boxes;
            }

            ctx.reset();
            drawBackground();
            ctx.lineWidth = this.editor.lineWidth;
            ctx.globalAlpha = 1;
            const judgeLine = chart.judgeLineList[this.editor.currentJudgeLineNumber];
            const eventLayer = judgeLine.eventLayers[this.editor.currentEventLayerNumber];
            drawGrid();
            this.cache.boxes = [
                ...drawNotes(),
                ...drawEvents(eventLayer.moveXEvents, 'moveX'),
                ...drawEvents(eventLayer.moveYEvents, 'moveY'),
                ...drawEvents(eventLayer.rotateEvents, 'rotate'),
                ...drawEvents(eventLayer.alphaEvents, 'alpha'),
                ...drawEvents(eventLayer.speedEvents, 'speed')
            ]
        }
        /** 显示谱面到canvas上 */
        const showChart = (seconds: number) => {
            /** 显示背景的曲绘 */
            const drawBackground = () => {
                const ctx = getContext(this.canvas);
                const canvasWidth = this.canvas.width;
                const canvasHeight = this.canvas.height;
                const imageWidth = background.width;
                const imageHeight = background.height;
                const scaleX = canvasWidth / imageWidth;
                const scaleY = canvasHeight / imageHeight;
                const scale = Math.max(scaleX, scaleY);
                const cropWidth = canvasWidth / scale;
                const cropHeight = canvasHeight / scale;
                let cropX = 0;
                let cropY = 0;
                if (scale == scaleX) {
                    cropY = (imageHeight - cropHeight) / 2;
                } else {
                    cropX = (imageWidth - cropWidth) / 2;
                }
                ctx.resetTransform();
                ctx.globalAlpha = 1;
                ctx.drawImage(
                    background,
                    cropX, cropY, cropWidth, cropHeight,
                    0, 0, canvasWidth, canvasHeight
                );
                ctx.fillStyle = "black";
                ctx.globalAlpha = this.chartPackage.backgroundDarkness / 100;
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            /** 显示判定线 */
            const drawJudgeLines = () => {
                sortAndForEach(chart.judgeLineList, (x, y) => x.zOrder - y.zOrder, (judgeLine, i) => {
                    const { x, y, angle, alpha, scaleX, scaleY, color, text } = getJudgeLineInfo(i, seconds, {
                        getX: true,
                        getY: true,
                        getAngle: true,
                        getAlpha: true,
                        getScaleX: true,
                        getScaleY: true,
                        getColor: true,
                        getText: true
                    });
                    const radians = math.convertDegreesToRadians(angle);
                    ctx.save();
                    ctx.translate(convertXToCanvas(x), convertYToCanvas(y));
                    ctx.rotate(radians);
                    writeText(i.toString(), 0, 30, 30, color);
                    ctx.scale(scaleX, scaleY);
                    if (alpha < 0)
                        ctx.globalAlpha = 0;
                    else
                        ctx.globalAlpha = alpha / 255;
                    // if (judgeLine.Texture != "line.png") console.log(textures, judgeLine.Texture);
                    if (judgeLine.Texture in textures) {
                        const image = textures[judgeLine.Texture];
                        ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
                    }
                    else if (text == undefined) {
                        drawLine(-this.chartPackage.lineLength, 0, this.chartPackage.lineLength, 0, color, this.chartPackage.lineWidth);
                    }
                    else {
                        writeText(text, 0, 0, this.chartPackage.textSize, color, true);
                    }
                    ctx.restore();
                })
            }
            /** 显示note */
            const drawNotes = () => {
                const drawNote = (
                    judgeLineInfo: Pick<ReturnType<typeof getJudgeLineInfo>, 'x' | 'y' | 'angle' | 'alpha'>,
                    noteInfo: ReturnType<typeof getNoteInfo>,
                    note: Note,
                ) => {
                    const radians = math.convertDegreesToRadians(judgeLineInfo.angle);
                    const missSeconds = note.type == NoteType.Tap ? Note.TAP_BAD : note.type == NoteType.Hold ? Note.HOLD_BAD : Note.DRAGFLICK_PERFECT;
                    const { startSeconds } = note.calculateSeconds(chart.BPMList);

                    if (startSeconds - seconds > note.visibleTime) return; // note不在可见时间内
                    if (judgeLineInfo.alpha < 0) return; // 线的透明度是负数把note给隐藏了
                    if (noteInfo.isCovered) return; // note在线下面
                    ctx.globalAlpha = note.alpha / 255;
                    if (note.type == NoteType.Hold) {
                        const { type, highlight } = note;
                        taskQueue.addTask(() => {
                            // 以判定线为坐标系
                            ctx.save();
                            ctx.translate(convertXToCanvas(judgeLineInfo.x), convertYToCanvas(judgeLineInfo.y));
                            ctx.rotate(radians);
                            if (noteInfo.startPositionY > noteInfo.endPositionY) {
                                ctx.scale(1, -1);
                                noteInfo.startPositionY = -noteInfo.startPositionY;
                                noteInfo.endPositionY = -noteInfo.endPositionY;
                                /*
                                startPositionY --> sy
                                endPositionY --> ey
                                positionX --> x
                                +6   _____               -6
                                +5  /     \  A.x  = -6   -5
                                +4  |  A  |  A.sy = 2    -4
                                +3  |     |  A.ey = 5    -3
                                +2  \_____/  A.sy < A.ey -2
                                +1                       -1
                                0y x9876543210123456789x y0
                                -1               _____   +1
                                -2  B.x  = 6    /     \  +2
                                -3  B.sy = -2   |  B  |  +3
                                -4  B.ey = -5   |     |  +4
                                -5  B.sy > B.ey \_____/  +5
                                -6                       +6                     
                                上下翻转之后，y坐标再变相反数，可以正确显示倒打长条
                                */
                            }
                            const height = noteInfo.endPositionY - noteInfo.startPositionY;
                            const { head, body, end } = this.resourcePackage.getSkin(type, highlight);
                            const width = note.size * this.chartPackage.noteSize *
                                this.resourcePackage.getSkin(type, highlight).body.width / this.resourcePackage.getSkin(type, false).body.width;
                            const headHeight = head.height / head.width * width;
                            const endHeight = end.height / end.width * width;
                            // 显示主体
                            if (this.resourcePackage.holdRepeat) {
                                const step = body.height / body.width * width;
                                for (let i = height; i >= 0; i -= step) {
                                    if (i < step) {
                                        ctx.drawImage(body,
                                            0, 0, body.width, body.height * (i / step),
                                            note.positionX - width / 2, -noteInfo.startPositionY - i, width, i);
                                    }
                                    else {
                                        ctx.drawImage(body, note.positionX - width / 2, -noteInfo.startPositionY - i, width, step);
                                    }
                                }
                            }
                            else {
                                ctx.drawImage(body, note.positionX - width / 2, -noteInfo.startPositionY - height, width, height);
                            }
                            // 显示头部
                            if (seconds < startSeconds || this.resourcePackage.holdKeepHead) {
                                ctx.drawImage(head, note.positionX - width / 2, -noteInfo.startPositionY, width, headHeight);
                            }
                            // 显示尾部
                            ctx.drawImage(end, note.positionX - width / 2, -noteInfo.endPositionY - endHeight, width, endHeight);

                            ctx.restore();
                        }, Priority.Hold);
                    }
                    else {
                        const { type, highlight } = note;
                        taskQueue.addTask(() => {
                            if (seconds >= startSeconds) {
                                ctx.globalAlpha = Math.max(0, 1 - (seconds - startSeconds) / missSeconds);
                            }
                            const image = this.resourcePackage.getSkin(type, highlight);
                            const width = note.size * this.chartPackage.noteSize *
                                this.resourcePackage.getSkin(type, highlight).width / this.resourcePackage.getSkin(type, false).width;
                            const height = image.height / image.width * this.chartPackage.noteSize;
                            // const noteHeight = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                            ctx.save();
                            ctx.translate(convertXToCanvas(judgeLineInfo.x), convertYToCanvas(judgeLineInfo.y));
                            ctx.rotate(radians);
                            ctx.drawImage(image,
                                0, 0, image.width, image.height,
                                note.positionX - width / 2, -noteInfo.startPositionY - height / 2, width, height);
                            ctx.restore();
                        }, Priority[note.typeString]);
                    }
                }
                enum Priority {
                    Hold = 1,
                    Drag = 2,
                    Tap = 3,
                    Flick = 4,
                    HitFx = 5
                }
                const autoplayOffset = 0;
                const taskQueue = new TaskQueue<void, Priority>();
                for (let judgeLineNumber = 0; judgeLineNumber < chart.judgeLineList.length; judgeLineNumber++) {
                    const judgeLine = chart.judgeLineList[judgeLineNumber];
                    const judgeLineInfo = getJudgeLineInfo(judgeLineNumber, seconds, {
                        getX: true,
                        getY: true,
                        getAngle: true,
                        getAlpha: true
                    });
                    for (let noteNumber = 0; noteNumber < judgeLine.notes.length; noteNumber++) {
                        const note = judgeLine.notes[noteNumber];
                        const { startSeconds, endSeconds } = note.calculateSeconds(chart.BPMList);
                        const noteInfo = getNoteInfo(judgeLineNumber, noteNumber, seconds);
                        if (note.hitSeconds == undefined && !note.isFake) {
                            if (seconds >= startSeconds - autoplayOffset) {
                                note.hitSeconds = startSeconds - autoplayOffset;
                                this.resourcePackage.playSound(note.type);
                            }
                        }
                        if (note.hitSeconds && seconds < note.hitSeconds) {
                            note.hitSeconds = undefined;
                        }
                        if (!note.isFake) (() => {
                            const hitSeconds = note.hitSeconds;
                            if (note.type == NoteType.Hold) {
                                if (!hitSeconds || seconds >= endSeconds + this.resourcePackage.hitFxDuration)
                                    return;
                            }
                            else {
                                if (!hitSeconds || seconds >= hitSeconds + this.resourcePackage.hitFxDuration)
                                    return;
                            }
                            /** Hold多少秒显示一次打击特效 */
                            const hitFxFrequency = 0.25;
                            /** 粒子大小 */
                            const particleSize = 25;
                            /** 粒子数量 */
                            const particleCount = 5;
                            /** 粒子半径 */
                            const particleRadius = 256;
                            taskQueue.addTask(() => {
                                const { x, y, angle } = getJudgeLineInfo(judgeLineNumber, hitSeconds, {
                                    getX: true,
                                    getY: true,
                                    getAngle: true
                                });
                                const radians = math.convertDegreesToRadians(angle);
                                const judgement = note.getJudgement(chart.BPMList);
                                const hash = (a: number, b: number, c: number) => {
                                    return a * a + b * b + c * c;
                                }
                                const showHitFx = (type: 'perfect' | 'good', frameNumber: number, x: number, y: number, angle: number, n: number) => {
                                    const angles: readonly number[] = math.randomNumbers(particleCount, hash(judgeLineNumber, noteNumber, n), 0, 360);
                                    const xys = angles.map(angle => math.pole(0, 0, angle, particleRadius));
                                    ctx.save();
                                    const frames = type == 'perfect' ? this.resourcePackage.perfectHitFxFrames : this.resourcePackage.goodHitFxFrames;
                                    const color = type == 'perfect' ? this.resourcePackage.colorPerfect : this.resourcePackage.colorGood;
                                    const progress = frameNumber / frames.length;

                                    const hitFxPosition = math.moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                                    const canvasX = convertXToCanvas(hitFxPosition.x);
                                    const canvasY = convertYToCanvas(hitFxPosition.y);

                                    if (frameNumber >= frames.length) return;
                                    const frame = frames[frameNumber];
                                    ctx.save();
                                    ctx.translate(canvasX, canvasY);
                                    if (this.resourcePackage.hitFxRotate) ctx.rotate(radians);
                                    ctx.globalAlpha = 1;
                                    ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                                    if (!this.resourcePackage.hideParticles) {
                                        ctx.globalAlpha = 1 - easingFuncs[EasingType.SineIn](progress);
                                        xys.forEach(({ x, y }) => {
                                            drawRect(x * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                                y * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                                particleSize,
                                                particleSize,
                                                color,
                                                true);
                                        });
                                    }
                                    ctx.restore();
                                }
                                if (judgement == 'perfect' || judgement == 'good') {
                                    if (note.type == NoteType.Hold) {
                                        /**
                                        满足下面不等式时Hold的第n个打击特效可见
                                        n >= 0 （打击特效开始时间大于等于note开始时间）
                                        hitSeconds + n * hitFxFrequency <= endSeconds（打击特效开始时间小于等于note结束时间）
                                        hitSeconds + n * hitFxFrequency <= seconds（打击特效开始时间小于等于当前时间，即打击特效已经开始了）
                                        seconds < hitSeconds + n * hitFxFrequency + hitFxDuration （打击特效结束时间大于当前时间，即打击特效还没结束）
                                        解不等式之后的结果：
                                        n >= 0
                                        n <= (endSeconds - hitSeconds) / hitFxFrequency
                                        n <= (seconds - hitSeconds) / hitFxFrequency
                                        n > (seconds - hitFxDuration - hitSeconds) / hitFxFrequency
                                        */
                                        for (
                                            let n = Math.max(0, ceil((seconds - this.resourcePackage.hitFxDuration - hitSeconds) / hitFxFrequency));
                                            n <= (endSeconds - hitSeconds) / hitFxFrequency &&
                                            n <= (seconds - hitSeconds) / hitFxFrequency;
                                            n++
                                        ) {
                                            const hitFxStartSeconds = hitSeconds + n * hitFxFrequency;
                                            const { x, y, angle } = getJudgeLineInfo(judgeLineNumber, hitFxStartSeconds, {
                                                getX: true,
                                                getY: true,
                                                getAngle: true
                                            });
                                            const frameNumber = Math.floor(
                                                (seconds - hitFxStartSeconds)
                                                / this.resourcePackage.hitFxDuration
                                                * this.resourcePackage.perfectHitFxFrames.length
                                            );
                                            showHitFx(judgement, frameNumber, x, y, angle, n);
                                        }
                                    }
                                    else {
                                        const frameNumber = Math.floor(
                                            (seconds - hitSeconds)
                                            / this.resourcePackage.hitFxDuration
                                            * this.resourcePackage.perfectHitFxFrames.length
                                        )
                                        showHitFx(judgement, frameNumber, x, y, angle, 0);
                                    }
                                }
                                else if (judgement == 'bad') {
                                    const noteInfo = getNoteInfo(judgeLineNumber, noteNumber, hitSeconds);
                                    ctx.globalAlpha = 1 - (seconds - hitSeconds) / this.resourcePackage.hitFxDuration;
                                    ctx.save();
                                    ctx.translate(convertXToCanvas(x), convertYToCanvas(y));
                                    ctx.rotate(radians);
                                    writeText("BAD", note.positionX, -noteInfo.startPositionY, 50, "red", true);
                                    ctx.restore();
                                }
                            }, 5);
                        })();
                        if (note.getJudgement(chart.BPMList) == 'bad') continue;
                        if (note.type == NoteType.Hold) {
                            if (seconds >= endSeconds) continue;
                        }
                        else {
                            if (note.hitSeconds && seconds >= note.hitSeconds) continue;
                        }
                        drawNote(judgeLineInfo, noteInfo, note);
                    }
                }
                taskQueue.run();
            }
            const getNoteInfo = (lineNumber: number, noteNumber: number, seconds: number) => {
                // 异常处理
                if (!chart.judgeLineList || lineNumber < 0 || lineNumber >= chart.judgeLineList.length) {
                    throw new Error('Invalid line number');
                }
                const judgeLine = chart.judgeLineList[lineNumber];

                if (!judgeLine.notes || noteNumber < 0 || noteNumber >= judgeLine.notes.length) {
                    throw new Error('Invalid note number');
                }
                const note = judgeLine.notes[noteNumber];

                const { startSeconds: noteStartSeconds, endSeconds: noteEndSeconds } = note.calculateSeconds(chart.BPMList);
                const { above, speed, yOffset, type } = note;

                let startPositionY = 0, endPositionY = 0;

                const calculateSegment = (start: number, end: number, a: number, b: number) => {
                    const h = end - start;
                    return (a + b) * h / 2;
                }
                for (const eventLayer of judgeLine.eventLayers) {
                    const speedEvents = eventLayer.speedEvents.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
                    for (let i = 0; i < speedEvents.length; i++) {
                        const current = speedEvents[i];
                        const next = speedEvents[i + 1];
                        const { startSeconds: currentStartSeconds, endSeconds: currentEndSeconds } = current.calculateSeconds(chart.BPMList);
                        const interpolateCurrentSpeedEvent = (sec: number) => {
                            return (sec - currentStartSeconds) / (currentEndSeconds - currentStartSeconds) * (current.end - current.start) + current.start;
                        }

                        const l1 = Math.min(seconds, noteStartSeconds), l2 = Math.min(seconds, noteEndSeconds),
                            r1 = Math.max(seconds, noteStartSeconds), r2 = Math.max(seconds, noteEndSeconds);

                        const nextStartSeconds = next ? next.calculateSeconds(chart.BPMList).startSeconds : Infinity;

                        if (currentStartSeconds <= l2 && l2 <= currentEndSeconds && currentEndSeconds <= r2)
                            endPositionY += calculateSegment(l2, currentEndSeconds, interpolateCurrentSpeedEvent(l2), current.end);
                        else if (l2 <= currentStartSeconds && currentStartSeconds <= r2 && r2 <= currentEndSeconds)
                            endPositionY += calculateSegment(currentStartSeconds, r2, current.start, interpolateCurrentSpeedEvent(r2));
                        else if (l2 <= currentStartSeconds && currentEndSeconds <= r2)
                            endPositionY += calculateSegment(currentStartSeconds, currentEndSeconds, current.start, current.end);
                        else if (currentStartSeconds <= l2 && r2 <= currentEndSeconds)
                            endPositionY += calculateSegment(l2, r2, interpolateCurrentSpeedEvent(l2), interpolateCurrentSpeedEvent(r2));


                        if (currentEndSeconds <= l2 && l2 <= nextStartSeconds && nextStartSeconds <= r2)
                            endPositionY += current.end * (nextStartSeconds - l2);
                        else if (l2 <= currentEndSeconds && nextStartSeconds <= r2)
                            endPositionY += current.end * (nextStartSeconds - currentEndSeconds);
                        else if (l2 <= currentEndSeconds && currentEndSeconds <= r2 && r2 <= nextStartSeconds)
                            endPositionY += current.end * (r2 - currentEndSeconds);
                        else if (currentEndSeconds <= l2 && r2 <= nextStartSeconds)
                            endPositionY += current.end * (r2 - l2);

                        if (type == NoteType.Hold && noteStartSeconds < seconds)
                            continue;

                        if (currentStartSeconds <= l1 && l1 <= currentEndSeconds && currentEndSeconds <= r1)
                            startPositionY += calculateSegment(l1, currentEndSeconds, interpolateCurrentSpeedEvent(l1), current.end);
                        else if (l1 <= currentStartSeconds && currentStartSeconds <= r1 && r1 <= currentEndSeconds)
                            startPositionY += calculateSegment(currentStartSeconds, r1, current.start, interpolateCurrentSpeedEvent(r1));
                        else if (l1 <= currentStartSeconds && currentEndSeconds <= r1)
                            startPositionY += calculateSegment(currentStartSeconds, currentEndSeconds, current.start, current.end);
                        else if (currentStartSeconds <= l1 && r1 <= currentEndSeconds)
                            startPositionY += calculateSegment(l1, r1, interpolateCurrentSpeedEvent(l1), interpolateCurrentSpeedEvent(r1));

                        if (currentEndSeconds <= l1 && l1 <= nextStartSeconds && nextStartSeconds <= r1)
                            startPositionY += current.end * (nextStartSeconds - l1);
                        else if (l1 <= currentEndSeconds && nextStartSeconds <= r1)
                            startPositionY += current.end * (nextStartSeconds - currentEndSeconds);
                        else if (l1 <= currentEndSeconds && currentEndSeconds <= r1 && r1 <= nextStartSeconds)
                            startPositionY += current.end * (r1 - currentEndSeconds);
                        else if (currentEndSeconds <= l1 && r1 <= nextStartSeconds)
                            startPositionY += current.end * (r1 - l1);

                    }
                }

                startPositionY *= this.chartPackage.chartSpeed;
                endPositionY *= this.chartPackage.chartSpeed;

                if (seconds >= noteStartSeconds) startPositionY = -startPositionY;
                if (seconds >= noteEndSeconds) endPositionY = -endPositionY;

                const isCovered = endPositionY < 0 && judgeLine.isCover == 1 && seconds < noteEndSeconds;

                startPositionY = startPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;
                endPositionY = endPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;

                return { startPositionY, endPositionY, isCovered };
            }
            const convertXToCanvas = (x: number) => {
                return x + (this.canvas.width / 2);
            }
            const convertYToCanvas = (y: number) => {
                return (this.canvas.height / 2) - y;
            }
            ctx.reset();
            drawBackground();
            drawJudgeLines();
            drawNotes();
        }
        const getJudgeLineInfo = (lineNumber: number, seconds: number, {
            getX = false,
            getY = false,
            getAngle = false,
            getAlpha = false,
            getSpeed = false,
            getScaleX = false,
            getScaleY = false,
            getColor = false,
            getPaint = false,
            getText = false
        }, visited: number[] = []) => {
            const judgeLine = chart.judgeLineList[lineNumber];
            if (visited.includes(lineNumber)) {
                console.error("Circular inheriting: " + visited.join(" -> ") + " -> " + lineNumber);
                console.error("Set the father of line " + lineNumber + " to -1");
                judgeLine.father = -1;
            }
            visited.push(lineNumber);
            let x = 0, y = 0, angle = 0, alpha = 0, speed = 0;
            for (const layer of judgeLine.eventLayers) {
                if (getX) x += interpolateNumberEventValue(findLastEvent(layer.moveXEvents, seconds), seconds);
                if (getY) y += interpolateNumberEventValue(findLastEvent(layer.moveYEvents, seconds), seconds);
                if (getAngle) angle += interpolateNumberEventValue(findLastEvent(layer.rotateEvents, seconds), seconds);
                if (getAlpha) alpha += interpolateNumberEventValue(findLastEvent(layer.alphaEvents, seconds), seconds);
                if (getSpeed) speed += interpolateNumberEventValue(findLastEvent(layer.speedEvents, seconds), seconds);
            }
            if (judgeLine.father >= 0 && judgeLine.father < chart.judgeLineList.length) {
                const { x: fatherX, y: fatherY, angle: fatherAngle } = getJudgeLineInfo(judgeLine.father, seconds, {
                    getX: true,
                    getY: true,
                    getAngle: true
                }, visited);
                const { x: newX, y: newY } = math.moveAndRotate(fatherX, fatherY, fatherAngle, x, y);
                const newAngle = angle;
                x = newX;
                y = newY;
                angle = newAngle;
            }
            const scaleX = getScaleX ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.scaleXEvents, seconds), seconds) || 1 : 1;
            const scaleY = getScaleY ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.scaleYEvents, seconds), seconds) || 1 : 1;
            const color: RGBcolor = getColor ? interpolateColorEventValue(findLastEvent(judgeLine.extended.colorEvents, seconds), seconds) : [128, 255, 128];
            const paint = getPaint ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.paintEvents, seconds), seconds) : 0;
            const text = getText ? interpolateTextEventValue(findLastEvent(judgeLine.extended.textEvents, seconds), seconds) : '';
            return { x, y, angle, alpha, speed, scaleX, scaleY, color, paint, text };
        }
        const interpolateNumberEventValue = (event: NumberEvent | null, seconds: number) => {
            const { startSeconds = 0, endSeconds = 0 } = event?.calculateSeconds(chart.BPMList) ?? {};
            const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = 0, end = 0, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1 } = event ?? {};
            if (endSeconds <= seconds) {
                return end;
            } else {
                const dx = endSeconds - startSeconds;
                const dy = end - start;
                const sx = seconds - startSeconds;
                const easingFunction = bezier ? cubicBezierEase(...bezierPoints) : easingFuncs[easingType];
                const easingFactor = easingFunction(sx / dx * (easingRight - easingLeft) + easingLeft);
                return start + easingFactor * dy;
            }
        }
        const interpolateColorEventValue = (event: ColorEvent | null, seconds: number): RGBcolor => {
            const { endSeconds = 0 } = event?.calculateSeconds(chart.BPMList) ?? {};
            const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = [255, 255, 255], end = [255, 255, 255], easingType = EasingType.Linear, easingLeft = 0, easingRight = 1, startTime, endTime } = event ?? {};
            const _interpolate = (part: 0 | 1 | 2) => {
                if (!event) return 127;
                const e = new NumberEvent({
                    bezier,
                    bezierPoints: [...bezierPoints],
                    start: start[part],
                    end: end[part],
                    easingType,
                    easingLeft,
                    easingRight,
                    startTime,
                    endTime
                });
                return interpolateNumberEventValue(e, seconds);
            }
            if (endSeconds <= seconds) {
                return end;
            } else {
                return [
                    _interpolate(0),
                    _interpolate(1),
                    _interpolate(2)
                ];
            }
        }
        const interpolateTextEventValue = (event: TextEvent | null, seconds: number) => {
            const { /*startSeconds = 0,*/ endSeconds = 0 } = event?.calculateSeconds(chart.BPMList) ?? {};
            const { bezier = 0, bezierPoints = [0, 0, 1, 1], start = undefined, end = undefined, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1, startTime, endTime } = event ?? {};
            if (endSeconds <= seconds) {
                return end;
            } else {
                if (start == undefined || end == undefined || event == null) return undefined;
                if (start.startsWith(end) || end.startsWith(start)) {
                    const lengthStart = start.length;
                    const lengthEnd = end.length;
                    const e = new NumberEvent({
                        startTime,
                        endTime,
                        easingType,
                        easingLeft,
                        easingRight,
                        bezier,
                        bezierPoints: [...bezierPoints],
                        start: lengthStart,
                        end: lengthEnd
                    });
                    const length = Math.round(interpolateNumberEventValue(e, seconds));
                    return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
                }
                return start;
            }
        }
        const findLastEvent = <T extends BaseEvent>(events: T[], seconds: number): T | null => {
            let lastEvent: T | null = null;
            let smallestDifference = Infinity;
            events.forEach(event => {
                const { startSeconds } = event.calculateSeconds(chart.BPMList);
                if (startSeconds <= seconds) {
                    const difference = seconds - startSeconds;
                    if (difference < smallestDifference) {
                        smallestDifference = difference;
                        lastEvent = event;
                    }
                }
            });
            return lastEvent;
        }
        try {
            chart.update();
            if (this.editor.canvasState == CanvasState.Editing) {
                showEditor(seconds);
            }
            else {
                showChart(seconds);
            }
        }
        catch (err) {
            console.error(err);
        }
        const now = performance.now();
        const delta = now - this.renderTime;

        if (delta > 0) {
            const currentFPS = 1000 / delta;
            this.fpsHistory.push(currentFPS);
            // 限制FPS历史数组的大小
            if (this.fpsHistory.length > Renderer.fpsHistoryMaxSize) {
                this.fpsHistory.shift();
            }
            // 计算平均FPS
            this.fps = math.avenage(this.fpsHistory);
        } else {
            this.fps = 0; // 或者设置为一个合理的默认值
        }

        this.renderTime = now;
    }
}