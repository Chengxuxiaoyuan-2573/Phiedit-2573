import { getBeatsValue } from "@/models/beats";
import { easingFuncs, EasingType } from "@/models/easing";
import { interpolateNumberEventValue, findLastEvent, interpolateColorEventValue, interpolateTextEventValue } from "@/models/event";
import { Note, NoteType, NoteAbove } from "@/models/note";
import store from "@/store";
import { sortAndForEach } from "@/tools/algorithm";
import canvasUtils from "@/tools/canvasUtils";
import { RGBcolor } from "@/tools/color";
import MathUtils from "@/tools/mathUtils";
import { TaskQueue } from "@/tools/taskQueue";
import { ceil } from "lodash";
import Manager from "../abstract";

export default class ChartRenderer extends Manager {
    /** 显示谱面到canvas上 */
    renderChart() {
        this.drawBackground();
        this.drawJudgeLines();
        this.drawNotes();
    }
    /** 显示背景的曲绘 */
    private drawBackground() {
        const settingsManager = store.useManager("settingsManager");
        const canvas = store.useCanvas();
        const chartPackage = store.useChartPackage();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const { background } = chartPackage;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
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
        drawRect(
            0,
            0,
            canvas.width,
            canvas.height,
            "black",
            true,
            settingsManager.backgroundDarkness / 100);
    }
    /** 显示判定线 */
    private drawJudgeLines() {
        const settingsManager = store.useManager("settingsManager");
        const canvas = store.useCanvas();
        const seconds = store.getSeconds();
        const chart = store.useChart();
        const chartPackage = store.useChartPackage();
        const ctx = canvasUtils.getContext(canvas);

        const drawLine = canvasUtils.drawLine.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const { textures } = chartPackage;
        sortAndForEach(chart.judgeLineList, (x, y) => x.zOrder - y.zOrder, (judgeLine, i) => {
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
            const radians = MathUtils.convertDegreesToRadians(angle);
            ctx.save();
            ctx.translate(this.convertXToCanvas(x), this.convertYToCanvas(y));
            ctx.rotate(radians);
            // 显示判定线号
            writeText(i.toString(), 0, 30, 30, color);
            ctx.scale(scaleX, scaleY);
            if (alpha < 0)
                ctx.globalAlpha = 0;
            else
                ctx.globalAlpha = alpha / 255;
            if (judgeLine.Texture in textures) {
                const image = textures[judgeLine.Texture];
                ctx.drawImage(
                    image,
                    -image.width / 2,
                    -image.height / 2,
                    image.width,
                    image.height);
            }
            else if (text == undefined) {
                drawLine(
                    -settingsManager.lineLength,
                    0,
                    settingsManager.lineLength,
                    0,
                    color,
                    settingsManager.lineWidth,
                    alpha / 255);
            }
            else {
                writeText(
                    text,
                    0,
                    0,
                    settingsManager.textSize,
                    color,
                    true,
                    alpha / 255);
            }
            ctx.restore();
        })
    }
    /** 显示音符及其打击特效 */
    private drawNotes() {
        const settingsManager = store.useManager("settingsManager");
        const canvas = store.useCanvas();
        const seconds = store.getSeconds();
        const chart = store.useChart();
        const resourcePackage = store.useResourcePackage();
        const ctx = canvasUtils.getContext(canvas);

        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const drawNote = (
            judgeLineInfo: Pick<ReturnType<typeof this.getJudgeLineInfo>, 'x' | 'y' | 'angle' | 'alpha'>,
            noteInfo: ReturnType<typeof this.getNoteInfo>,
            note: Note,
        ) => {
            const radians = MathUtils.convertDegreesToRadians(judgeLineInfo.angle);
            const missSeconds = note.type == NoteType.Tap ? Note.TAP_BAD : note.type == NoteType.Hold ? Note.HOLD_BAD : Note.DRAGFLICK_PERFECT;
            const startSeconds = note.cachedStartSeconds;
            if (startSeconds - seconds > note.visibleTime) return; // note不在可见时间内
            if (judgeLineInfo.alpha < 0) return; // 线的透明度是负数把note给隐藏了
            if (noteInfo.isCovered) return; // note在线下面
            if (note.type == NoteType.Hold) {
                const { type, highlight } = note;
                taskQueue.addTask(() => {
                    ctx.globalAlpha = note.alpha / 255;
                    const missed = seconds > startSeconds + missSeconds && note.getJudgement() == 'none';
                    if (missed) {
                        ctx.globalAlpha *= 0.5;
                    }
                    // 以判定线为参考系
                    ctx.save();
                    ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
                    ctx.rotate(radians);
                    if (noteInfo.startPositionY > noteInfo.endPositionY) {
                        //    startPositionY --> sy
                        //     endPositionY --> ey
                        //       positionX --> x
                        //  
                        // +6   _____               -6
                        // +5  /     \  A.x  = -6   -5
                        // +4  |  A  |  A.sy = 2    -4
                        // +3  |     |  A.ey = 5    -3
                        // +2  \_____/  A.sy < A.ey -2
                        // +1                       -1
                        // 0y x9876543210123456789x y0
                        // -1   _____               +1
                        // -2  /     \  B.x  = -6   +2
                        // -3  |  B  |  B.sy = -2   +3
                        // -4  |     |  B.ey = -5   +4
                        // -5  \_____/  B.sy > B.ey +5
                        // -6                       +6                     
                        // 上下翻转之后，y坐标再变相反数，可以正确显示倒打长条，否则会显示成倒的
                        // 因为canvas绘制图片时，无论图片的宽高是正数还是负数，图片都是正立的

                        ctx.scale(1, -1);
                        noteInfo.startPositionY = -noteInfo.startPositionY;
                        noteInfo.endPositionY = -noteInfo.endPositionY;
                    }
                    const height = noteInfo.endPositionY - noteInfo.startPositionY;
                    const { head, body, end } = resourcePackage.getSkin(type, highlight);
                    const width = note.size * settingsManager.noteSize *
                        resourcePackage.getSkin(type, highlight).body.width / resourcePackage.getSkin(type, false).body.width;
                    const headHeight = head.height / head.width * width;
                    const endHeight = end.height / end.width * width;

                    // 显示主体
                    if (resourcePackage.config.holdRepeat) {
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
                    if (seconds < startSeconds || resourcePackage.config.holdKeepHead) {
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
                    ctx.globalAlpha = note.alpha / 255;
                    if (seconds >= startSeconds) {
                        ctx.globalAlpha *= Math.max(0, 1 - (seconds - startSeconds) / missSeconds);
                    }
                    const image = resourcePackage.getSkin(type, highlight);
                    const width = note.size * settingsManager.noteSize *
                        resourcePackage.getSkin(type, highlight).width / resourcePackage.getSkin(type, false).width;
                    const height = image.height / image.width * settingsManager.noteSize;
                    // const noteHeight = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                    ctx.save();
                    ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
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
                // 自动击打音符（autoplay）
                if (seconds >= startSeconds - autoplayOffset) {
                    const hitted = note.hit(startSeconds - autoplayOffset);
                    if (hitted) {
                        resourcePackage.playSound(note.type);
                    }
                }
                // 如果当前时间小于击打时间，说明用户在音符被击打以后把进度条往回拖动了，重新把该音符设置为未击打状态
                if (note.hitSeconds && seconds < note.hitSeconds) {
                    note.hitSeconds = undefined;
                }
                // 显示打击特效
                if (!note.isFake) (() => {
                    const hitSeconds = note.hitSeconds;
                    if (note.type == NoteType.Hold) {
                        if (!hitSeconds || seconds >= endSeconds + resourcePackage.config.hitFxDuration)
                            return;
                    }
                    else {
                        if (!hitSeconds || seconds >= hitSeconds + resourcePackage.config.hitFxDuration)
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
                        const radians = MathUtils.convertDegreesToRadians(angle);
                        const judgement = note.getJudgement();
                        /** */
                        const hash = (a: number, b: number, c: number) => a * a + b * b + c * c;
                        const showHitFx = (type: 'perfect' | 'good' | 'bad', hitFxStartSeconds: number, n: number) => {
                            if (type == 'bad') {
                                const noteInfo = this.getNoteInfo(judgeLineNumber, noteNumber, hitSeconds);
                                ctx.globalAlpha = 1 - (seconds - hitSeconds) / resourcePackage.config.hitFxDuration;
                                ctx.save();
                                ctx.translate(this.convertXToCanvas(x), this.convertYToCanvas(y));
                                ctx.rotate(radians);
                                // 暂时没做好Bad特效的显示，所以用文字“BAD”来代替了
                                writeText("BAD", note.positionX, -noteInfo.startPositionY, 50, "red", true);
                                ctx.restore();
                            }
                            else {
                                const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitFxStartSeconds, {
                                    getX: true,
                                    getY: true,
                                    getAngle: true
                                });
                                const frameNumber = Math.floor(
                                    (seconds - hitFxStartSeconds)
                                    / resourcePackage.config.hitFxDuration
                                    * resourcePackage.perfectHitFxFrames.length
                                );
                                const angles: readonly number[] = MathUtils.randomNumbers(particleCount, hash(judgeLineNumber, noteNumber, n), 0, 360);
                                const xys = angles.map(angle => MathUtils.pole(0, 0, angle, particleRadius));
                                ctx.save();
                                const progress = (seconds - hitFxStartSeconds) / resourcePackage.config.hitFxDuration;

                                const hitFxPosition = MathUtils.moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                                const canvasX = this.convertXToCanvas(hitFxPosition.x);
                                const canvasY = this.convertYToCanvas(hitFxPosition.y);

                                const frames = type == 'perfect' ? resourcePackage.perfectHitFxFrames : resourcePackage.goodHitFxFrames;
                                const color = type == 'perfect' ? resourcePackage.config.colorPerfect : resourcePackage.config.colorGood;
                                if (frameNumber >= frames.length) return;
                                const frame = frames[frameNumber];

                                ctx.save();
                                ctx.translate(canvasX, canvasY);
                                if (resourcePackage.config.hitFxRotate) ctx.rotate(radians);
                                ctx.globalAlpha = 1;
                                ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                                if (!resourcePackage.config.hideParticles) {
                                    xys.forEach(({ x, y }) => {
                                        drawRect(x * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                            y * easingFuncs[EasingType.SineOut](progress) - particleSize / 2,
                                            particleSize,
                                            particleSize,
                                            color,
                                            true,
                                            1 - easingFuncs[EasingType.SineIn](progress));
                                    });
                                }
                                ctx.restore();
                            }
                        }
                        if (judgement == 'perfect' || judgement == 'good') {
                            if (note.type == NoteType.Hold) {

                                // 满足下面不等式时Hold的第n个打击特效可见
                                // n >= 0 （打击特效开始时间大于等于note开始时间）
                                // hitSeconds + n * hitFxFrequency <= endSeconds（打击特效开始时间小于等于note结束时间）
                                // hitSeconds + n * hitFxFrequency <= seconds（打击特效开始时间小于等于当前时间，即打击特效已经开始了）
                                // seconds < hitSeconds + n * hitFxFrequency + hitFxDuration （打击特效结束时间大于当前时间，即打击特效还没结束）
                                // 解不等式之后的结果：
                                // n >= 0
                                // n <= (endSeconds - hitSeconds) / hitFxFrequency
                                // n <= (seconds - hitSeconds) / hitFxFrequency
                                // n > (seconds - hitFxDuration - hitSeconds) / hitFxFrequency

                                for (
                                    let n = Math.max(0, ceil((seconds - resourcePackage.config.hitFxDuration - hitSeconds) / hitFxFrequency));
                                    n <= (endSeconds - hitSeconds) / hitFxFrequency &&
                                    n <= (seconds - hitSeconds) / hitFxFrequency;
                                    n++
                                ) {
                                    const hitFxStartSeconds = hitSeconds + n * hitFxFrequency;

                                    showHitFx(judgement, hitFxStartSeconds, n);
                                }
                            }
                            else {
                                showHitFx(judgement, hitSeconds, 0);
                            }
                        }
                        else if (judgement == 'bad') {
                            showHitFx(judgement, hitSeconds, 0);
                        }
                    }, Priority.HitFx);
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
    /** 获取note的Y坐标信息 */
    private getNoteInfo(lineNumber: number, noteNumber: number, seconds: number) {
        const settingsManager = store.useManager("settingsManager");
        const chart = store.useChart();
        // 异常处理
        if (!chart.judgeLineList || lineNumber < 0 || lineNumber >= chart.judgeLineList.length) {
            throw new Error('Invalid line number');
        }
        const judgeLine = chart.judgeLineList[lineNumber];

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

        startPositionY *= settingsManager.chartSpeed;
        endPositionY *= settingsManager.chartSpeed;

        if (seconds >= noteStartSeconds) startPositionY = -startPositionY;
        if (seconds >= noteEndSeconds) endPositionY = -endPositionY;

        const isCovered = endPositionY < 0 && judgeLine.isCover == 1 && seconds < noteEndSeconds;

        startPositionY = startPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;
        endPositionY = endPositionY * speed * (above === NoteAbove.Above ? 1 : -1) + yOffset;

        return { startPositionY, endPositionY, isCovered };
    }
    /** 获取判定线的事件信息 */
    private getJudgeLineInfo(lineNumber: number, seconds: number, {
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
        const chart = store.useChart();
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
            const { x: fatherX, y: fatherY, angle: fatherAngle } = this.getJudgeLineInfo(judgeLine.father, seconds, {
                getX: true,
                getY: true,
                getAngle: true
            }, visited);
            const { x: newX, y: newY } = MathUtils.moveAndRotate(fatherX, fatherY, fatherAngle, x, y);
            x = newX;
            y = newY;
        }
        const scaleX = getScaleX ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.scaleXEvents, seconds), seconds) || 1 : 1;
        const scaleY = getScaleY ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.scaleYEvents, seconds), seconds) || 1 : 1;
        const color: RGBcolor = getColor ? interpolateColorEventValue(findLastEvent(judgeLine.extended.colorEvents, seconds), seconds) : [128, 255, 128];
        const paint = getPaint ? interpolateNumberEventValue(findLastEvent(judgeLine.extended.paintEvents, seconds), seconds) : 0;
        const text = getText ? interpolateTextEventValue(findLastEvent(judgeLine.extended.textEvents, seconds), seconds) : '';
        return { x, y, angle, alpha, speed, scaleX, scaleY, color, paint, text };
    }
    /** 把谱面坐标系的X坐标转换成canvas坐标系的X坐标 */
    private convertXToCanvas(x: number) {
        const canvas = store.useCanvas();
        return x + (canvas.width / 2);
    }
    /** 把谱面坐标系的Y坐标转换成canvas坐标系的Y坐标 */
    private convertYToCanvas(y: number) {
        const canvas = store.useCanvas();
        return (canvas.height / 2) - y;
    }
}