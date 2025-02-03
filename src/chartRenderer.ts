import { ceil } from "lodash";
import { easingFuncs, EasingType, cubicBezierEase } from "./classes/easing";
import { TaskQueue } from "./classes/taskQueue";
import { NumberEvent, ColorEvent, TextEvent, BaseEvent } from "./classes/event";
import { RGBcolor } from "./classes/color";
import { Note, NoteAbove, NoteType } from "./classes/note";
import { getBeatsValue } from "./classes/beats";
import { getContext } from "./tools";
import canvasUtils from "./tools/canvasUtils";
import math from "./tools/math";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";
import { Ref } from "vue";
import { sortAndForEach } from "./tools/algorithm";

export default class ChartRenderer {
    chartPackage: ChartPackage
    resourcePackage: ResourcePackage
    canvasRef: Ref<HTMLCanvasElement>
    get canvas(){
        return this.canvasRef.value;
    }
    get chart() {
        return this.chartPackage.chart;
    }
    ctx: CanvasRenderingContext2D;
    constructor(options: {
        chartPackage: ChartPackage,
        resourcePackage: ResourcePackage,
        canvasRef: Ref<HTMLCanvasElement>
    }) {
        this.chartPackage = options.chartPackage;
        this.resourcePackage = options.resourcePackage;
        this.canvasRef = options.canvasRef;
        this.ctx = getContext(this.canvas);
    }
    /** 显示谱面到canvas上 */
    renderChart(musicTime: number) {
        const seconds = musicTime - this.chart.META.offset / 1000;
        try {
            this.drawBackground();
            this.drawJudgeLines(seconds);
            this.drawNotes(seconds);
        }
        catch (err) {
            console.error(err);
        }
    }
    /** 显示背景的曲绘 */
    drawBackground() {
        const { background } = this.chartPackage;
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
        ctx.globalAlpha = this.chartPackage.config.backgroundDarkness / 100;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /** 显示判定线 */
    drawJudgeLines(seconds:number) {
        const drawLine = canvasUtils.drawLine.bind(this.ctx);
        const writeText = canvasUtils.writeText.bind(this.ctx);
        const { textures } = this.chartPackage;
        sortAndForEach(this.chart.judgeLineList, (x, y) => x.zOrder - y.zOrder, (judgeLine, i) => {
            const { x, y, angle, alpha, scaleX, scaleY, color, text } = this.getJudgeLineInfo(i, seconds, {
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
            this.ctx.save();
            this.ctx.translate(this.convertXToCanvas(x), this.convertYToCanvas(y));
            this.ctx.rotate(radians);
            writeText(i.toString(), 0, 30, 30, color);
            this.ctx.scale(scaleX, scaleY);
            if (alpha < 0)
                this.ctx.globalAlpha = 0;
            else
                this.ctx.globalAlpha = alpha / 255;
            // if (judgeLine.Texture != "line.png") console.log(textures, judgeLine.Texture);
            if (judgeLine.Texture in textures) {
                const image = textures[judgeLine.Texture];
                this.ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
            }
            else if (text == undefined) {
                drawLine(-this.chartPackage.config.lineLength, 0, this.chartPackage.config.lineLength, 0, color, this.chartPackage.config.lineWidth);
            }
            else {
                writeText(text, 0, 0, this.chartPackage.config.textSize, color, true);
            }
            this.ctx.restore();
        })
    }
    /** 显示note和打击特效 */
    drawNotes(seconds:number) {
        const drawRect = canvasUtils.drawRect.bind(this.ctx);
        const writeText = canvasUtils.writeText.bind(this.ctx);
        const drawNote = (
            judgeLineInfo: Pick<ReturnType<typeof this.getJudgeLineInfo>, 'x' | 'y' | 'angle' | 'alpha'>,
            noteInfo: ReturnType<typeof this.getNoteInfo>,
            note: Note,
        ) => {
            const radians = math.convertDegreesToRadians(judgeLineInfo.angle);
            const missSeconds = note.type == NoteType.Tap ? Note.TAP_BAD : note.type == NoteType.Hold ? Note.HOLD_BAD : Note.DRAGFLICK_PERFECT;
            const startSeconds = note.cachedStartSeconds;
            if (startSeconds - seconds > note.visibleTime) return; // note不在可见时间内
            if (judgeLineInfo.alpha < 0) return; // 线的透明度是负数把note给隐藏了
            if (noteInfo.isCovered) return; // note在线下面
            if (note.type == NoteType.Hold) {
                const { type, highlight } = note;
                taskQueue.addTask(() => {
                    this.ctx.globalAlpha = note.alpha / 255;
                    // 以判定线为坐标系
                    this.ctx.save();
                    this.ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
                    this.ctx.rotate(radians);
                    if (noteInfo.startPositionY > noteInfo.endPositionY) {
                        this.ctx.scale(1, -1);
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
                    const width = note.size * this.chartPackage.config.noteSize *
                        this.resourcePackage.getSkin(type, highlight).body.width / this.resourcePackage.getSkin(type, false).body.width;
                    const headHeight = head.height / head.width * width;
                    const endHeight = end.height / end.width * width;
                    // 显示主体
                    if (this.resourcePackage.config.holdRepeat) {
                        const step = body.height / body.width * width;
                        for (let i = height; i >= 0; i -= step) {
                            if (i < step) {
                                this.ctx.drawImage(body,
                                    0, 0, body.width, body.height * (i / step),
                                    note.positionX - width / 2, -noteInfo.startPositionY - i, width, i);
                            }
                            else {
                                this.ctx.drawImage(body, note.positionX - width / 2, -noteInfo.startPositionY - i, width, step);
                            }
                        }
                    }
                    else {
                        this.ctx.drawImage(body, note.positionX - width / 2, -noteInfo.startPositionY - height, width, height);
                    }
                    // 显示头部
                    if (seconds < startSeconds || this.resourcePackage.config.holdKeepHead) {
                        this.ctx.drawImage(head, note.positionX - width / 2, -noteInfo.startPositionY, width, headHeight);
                    }
                    // 显示尾部
                    this.ctx.drawImage(end, note.positionX - width / 2, -noteInfo.endPositionY - endHeight, width, endHeight);

                    this.ctx.restore();
                }, Priority.Hold);
            }
            else {
                const { type, highlight } = note;
                taskQueue.addTask(() => {
                    this.ctx.globalAlpha = note.alpha / 255;
                    if (seconds >= startSeconds) {
                        this.ctx.globalAlpha *= Math.max(0, 1 - (seconds - startSeconds) / missSeconds);
                    }
                    const image = this.resourcePackage.getSkin(type, highlight);
                    const width = note.size * this.chartPackage.config.noteSize *
                        this.resourcePackage.getSkin(type, highlight).width / this.resourcePackage.getSkin(type, false).width;
                    const height = image.height / image.width * this.chartPackage.config.noteSize;
                    // const noteHeight = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                    this.ctx.save();
                    this.ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
                    this.ctx.rotate(radians);
                    this.ctx.drawImage(image,
                        0, 0, image.width, image.height,
                        note.positionX - width / 2, -noteInfo.startPositionY - height / 2, width, height);
                    this.ctx.restore();
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
        for (let judgeLineNumber = 0; judgeLineNumber < this.chart.judgeLineList.length; judgeLineNumber++) {
            const judgeLine = this.chart.judgeLineList[judgeLineNumber];
            const judgeLineInfo = this.getJudgeLineInfo(judgeLineNumber, seconds, {
                getX: true,
                getY: true,
                getAngle: true,
                getAlpha: true
            });
            for (let noteNumber = 0; noteNumber < judgeLine.notes.length; noteNumber++) {
                const note = judgeLine.notes[noteNumber];
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;
                const noteInfo = this.getNoteInfo(judgeLineNumber, noteNumber, seconds);
                if (note.getJudgement() == 'none' && !note.isFake) {
                    if (seconds >= startSeconds - autoplayOffset) {
                        note.hitSeconds = startSeconds - autoplayOffset;
                        this.resourcePackage.playSound(note.type);
                    }
                }
                if (note.hitSeconds && seconds < note.hitSeconds) {
                    note.hitSeconds = undefined;
                }
                // 里面有return，要用立即执行函数
                if (!note.isFake) (() => {
                    const hitSeconds = note.hitSeconds;
                    if (note.type == NoteType.Hold) {
                        if (!hitSeconds || seconds >= endSeconds + this.resourcePackage.config.hitFxDuration)
                            return;
                    }
                    else {
                        if (!hitSeconds || seconds >= hitSeconds + this.resourcePackage.config.hitFxDuration)
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
                        const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitSeconds, {
                            getX: true,
                            getY: true,
                            getAngle: true
                        });
                        const radians = math.convertDegreesToRadians(angle);
                        const judgement = note.getJudgement();
                        const hash = (a: number, b: number, c: number) => {
                            return a * a + b * b + c * c;
                        }
                        const showHitFx = (type: 'perfect' | 'good', frameNumber: number, x: number, y: number, angle: number, n: number) => {
                            const angles: readonly number[] = math.randomNumbers(particleCount, hash(judgeLineNumber, noteNumber, n), 0, 360);
                            const xys = angles.map(angle => math.pole(0, 0, angle, particleRadius));
                            this.ctx.save();
                            const frames = type == 'perfect' ? this.resourcePackage.perfectHitFxFrames : this.resourcePackage.goodHitFxFrames;
                            const color = type == 'perfect' ? this.resourcePackage.config.colorPerfect : this.resourcePackage.config.colorGood;
                            const progress = frameNumber / frames.length;

                            const hitFxPosition = math.moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                            const canvasX = this.convertXToCanvas(hitFxPosition.x);
                            const canvasY = this.convertYToCanvas(hitFxPosition.y);

                            if (frameNumber >= frames.length) return;
                            const frame = frames[frameNumber];
                            this.ctx.save();
                            this.ctx.translate(canvasX, canvasY);
                            if (this.resourcePackage.config.hitFxRotate) this.ctx.rotate(radians);
                            this.ctx.globalAlpha = 1;
                            this.ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                            if (!this.resourcePackage.config.hideParticles) {
                                this.ctx.globalAlpha = 1 - easingFuncs[EasingType.SineIn](progress);
                                xys.forEach(({ x, y }) => {
                                    drawRect(x * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                        y * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                        particleSize,
                                        particleSize,
                                        color,
                                        true);
                                });
                            }
                            this.ctx.restore();
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
                                    let n = Math.max(0, ceil((seconds - this.resourcePackage.config.hitFxDuration - hitSeconds) / hitFxFrequency));
                                    n <= (endSeconds - hitSeconds) / hitFxFrequency &&
                                    n <= (seconds - hitSeconds) / hitFxFrequency;
                                    n++
                                ) {
                                    const hitFxStartSeconds = hitSeconds + n * hitFxFrequency;
                                    const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitFxStartSeconds, {
                                        getX: true,
                                        getY: true,
                                        getAngle: true
                                    });
                                    const frameNumber = Math.floor(
                                        (seconds - hitFxStartSeconds)
                                        / this.resourcePackage.config.hitFxDuration
                                        * this.resourcePackage.perfectHitFxFrames.length
                                    );
                                    showHitFx(judgement, frameNumber, x, y, angle, n);
                                }
                            }
                            else {
                                const frameNumber = Math.floor(
                                    (seconds - hitSeconds)
                                    / this.resourcePackage.config.hitFxDuration
                                    * this.resourcePackage.perfectHitFxFrames.length
                                )
                                showHitFx(judgement, frameNumber, x, y, angle, 0);
                            }
                        }
                        else if (judgement == 'bad') {
                            const noteInfo = this.getNoteInfo(judgeLineNumber, noteNumber, hitSeconds);
                            this.ctx.globalAlpha = 1 - (seconds - hitSeconds) / this.resourcePackage.config.hitFxDuration;
                            this.ctx.save();
                            this.ctx.translate(this.convertXToCanvas(x), this.convertYToCanvas(y));
                            this.ctx.rotate(radians);
                            writeText("BAD", note.positionX, -noteInfo.startPositionY, 50, "red", true);
                            this.ctx.restore();
                        }
                    }, 5);
                })();
                if (note.getJudgement() == 'bad') continue;
                if (note.type == NoteType.Hold) {
                    if (seconds >= endSeconds) continue;
                }
                else {
                    if (note.getJudgement() != 'none') continue;
                }
                drawNote(judgeLineInfo, noteInfo, note);
            }
        }
        taskQueue.run();
    }
    getNoteInfo(lineNumber: number, noteNumber: number, seconds: number) {
        // 异常处理
        if (!this.chart.judgeLineList || lineNumber < 0 || lineNumber >= this.chart.judgeLineList.length) {
            throw new Error('Invalid line number');
        }
        const judgeLine = this.chart.judgeLineList[lineNumber];

        if (!judgeLine.notes || noteNumber < 0 || noteNumber >= judgeLine.notes.length) {
            throw new Error('Invalid note number');
        }
        const note = judgeLine.notes[noteNumber];


        const noteStartSeconds = note.cachedStartSeconds;
        const noteEndSeconds = note.cachedEndSeconds;
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
                const currentStartSeconds = current.cachedStartSeconds;
                const currentEndSeconds = current.cachedEndSeconds;
                const interpolateCurrentSpeedEvent = (sec: number) => {
                    return (sec - currentStartSeconds) / (currentEndSeconds - currentStartSeconds) * (current.end - current.start) + current.start;
                }

                const l1 = Math.min(seconds, noteStartSeconds), l2 = Math.min(seconds, noteEndSeconds),
                    r1 = Math.max(seconds, noteStartSeconds), r2 = Math.max(seconds, noteEndSeconds);

                const nextStartSeconds = next ? next.cachedStartSeconds : Infinity;

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

        startPositionY *= this.chartPackage.config.chartSpeed;
        endPositionY *= this.chartPackage.config.chartSpeed;

        if (seconds >= noteStartSeconds) startPositionY = -startPositionY;
        if (seconds >= noteEndSeconds) endPositionY = -endPositionY;

        const isCovered = endPositionY < 0 && judgeLine.isCover == 1 && seconds < noteEndSeconds;

        startPositionY = startPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;
        endPositionY = endPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;

        return { startPositionY, endPositionY, isCovered };
    }
    getJudgeLineInfo(lineNumber: number, seconds: number, {
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
    }, visited: number[] = []) {
        const judgeLine = this.chart.judgeLineList[lineNumber];
        if (visited.includes(lineNumber)) {
            console.error("Circular inheriting: " + visited.join(" -> ") + " -> " + lineNumber);
            console.error("Set the father of line " + lineNumber + " to -1");
            judgeLine.father = -1;
        }
        visited.push(lineNumber);
        let x = 0, y = 0, angle = 0, alpha = 0, speed = 0;
        for (const layer of judgeLine.eventLayers) {
            if (getX) x += this.interpolateNumberEventValue(this.findLastEvent(layer.moveXEvents, seconds), seconds);
            if (getY) y += this.interpolateNumberEventValue(this.findLastEvent(layer.moveYEvents, seconds), seconds);
            if (getAngle) angle += this.interpolateNumberEventValue(this.findLastEvent(layer.rotateEvents, seconds), seconds);
            if (getAlpha) alpha += this.interpolateNumberEventValue(this.findLastEvent(layer.alphaEvents, seconds), seconds);
            if (getSpeed) speed += this.interpolateNumberEventValue(this.findLastEvent(layer.speedEvents, seconds), seconds);
        }
        if (judgeLine.father >= 0 && judgeLine.father < this.chart.judgeLineList.length) {
            const { x: fatherX, y: fatherY, angle: fatherAngle } = this.getJudgeLineInfo(judgeLine.father, seconds, {
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
        const scaleX = getScaleX ? this.interpolateNumberEventValue(this.findLastEvent(judgeLine.extended.scaleXEvents, seconds), seconds) || 1 : 1;
        const scaleY = getScaleY ? this.interpolateNumberEventValue(this.findLastEvent(judgeLine.extended.scaleYEvents, seconds), seconds) || 1 : 1;
        const color: RGBcolor = getColor ? this.interpolateColorEventValue(this.findLastEvent(judgeLine.extended.colorEvents, seconds), seconds) : [128, 255, 128];
        const paint = getPaint ? this.interpolateNumberEventValue(this.findLastEvent(judgeLine.extended.paintEvents, seconds), seconds) : 0;
        const text = getText ? this.interpolateTextEventValue(this.findLastEvent(judgeLine.extended.textEvents, seconds), seconds) : '';
        return { x, y, angle, alpha, speed, scaleX, scaleY, color, paint, text };
    }
    interpolateNumberEventValue(event: NumberEvent | null, seconds: number) {
        const startSeconds = event?.cachedStartSeconds ?? 0;
        const endSeconds = event?.cachedEndSeconds ?? 0;
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
    interpolateColorEventValue(event: ColorEvent | null, seconds: number): RGBcolor {
        const endSeconds = event?.cachedEndSeconds ?? 0;
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
            }, this.chart.BPMList);
            return this.interpolateNumberEventValue(e, seconds);
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
    interpolateTextEventValue(event: TextEvent | null, seconds: number) {
        const endSeconds = event?.cachedEndSeconds ?? 0;
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
                }, this.chart.BPMList);
                const length = Math.round(this.interpolateNumberEventValue(e, seconds));
                return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
            }
            return start;
        }
    }
    findLastEvent<T extends BaseEvent>(events: T[], seconds: number) {
        let lastEvent: T | null = null;
        let smallestDifference = Infinity;
        for (const event of events) {
            const startSeconds = event.cachedStartSeconds;
            if (startSeconds <= seconds) {
                const difference = seconds - startSeconds;
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    lastEvent = event;
                }
            }
        }
        return lastEvent;
    }
    convertXToCanvas(x: number) {
        return x + (this.canvas.width / 2);
    }
    convertYToCanvas(y: number) {
        return (this.canvas.height / 2) - y;
    }
}