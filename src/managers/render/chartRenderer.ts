import { easingFuncs, EasingType } from "@/models/easing";
import { interpolateNumberEventValue, findLastEvent, interpolateColorEventValue, interpolateTextEventValue } from "@/models/event";
import { Note, NoteAbove, NoteType } from "@/models/note";
import store from "@/store";
import { sortAndForEach } from "@/tools/algorithm";
import canvasUtils from "@/tools/canvasUtils";
import { RGBcolor } from "@/tools/color";
import MathUtils from "@/tools/mathUtils";
import { ceil } from "lodash";
import Manager from "../abstract";
import globalEventEmitter from "@/eventEmitter";
import { ArrayRepeat } from "@/tools/typeCheck";

export default class ChartRenderer extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("RENDER_CHART", () => {
            this.render();
        })
    }
    /** 显示谱面到canvas上 */
    render() {
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
            settingsManager._settings.backgroundDarkness / 100);
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
                    -settingsManager._settings.lineLength,
                    0,
                    settingsManager._settings.lineLength,
                    0,
                    color,
                    settingsManager._settings.lineWidth,
                    alpha / 255);
            }
            else {
                writeText(
                    text,
                    0,
                    0,
                    settingsManager._settings.textSize,
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

        enum Priority {
            Hold,
            Drag,
            Tap,
            Flick,
            HitFx
        }
        // const taskQueue = new TaskQueue<void, Priority>();
        const functions: ArrayRepeat<(() => void)[], 5> = [[], [], [], [], []];
        for (let judgeLineNumber = 0; judgeLineNumber < chart.judgeLineList.length; judgeLineNumber++) {
            const judgeLine = chart.judgeLineList[judgeLineNumber];
            const judgeLineInfo = this.getJudgeLineInfo(judgeLineNumber, seconds, {
                getX: true,
                getY: true,
                getAngle: true,
                getAlpha: true
            });
            const currentPositionY = judgeLine.getPositionOfSeconds(seconds);
            const drawNote = (note: Note) => {
                // 把当前判定线的角度转为弧度
                const radians = MathUtils.convertDegreesToRadians(judgeLineInfo.angle);
                const missSeconds = note.type == NoteType.Tap ? Note.TAP_BAD : note.type == NoteType.Hold ? Note.HOLD_BAD : Note.DRAGFLICK_PERFECT;
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;
                // 计算音符头部和尾部离判定线的距离
                let startPositionY = judgeLine.getPositionOfSeconds(startSeconds) - currentPositionY;
                let endPositionY = judgeLine.getPositionOfSeconds(endSeconds) - currentPositionY;

                // 正在判定的Hold音符，头部强制设为0
                if (note.type == NoteType.Hold && seconds >= startSeconds && seconds < endSeconds) {
                    startPositionY = 0;
                }
                const isCovered = endPositionY < 0 && judgeLine.isCover == 1 && seconds < endSeconds;

                startPositionY = startPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                endPositionY = endPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;


                if (startSeconds - seconds > note.visibleTime) return; // note不在可见时间内
                if (judgeLineInfo.alpha < 0) return; // 线的透明度是负数把note给隐藏了
                if (isCovered) return; // note被遮罩了

                if (note.type == NoteType.Hold) {
                    const { type, highlight } = note;
                    functions[Priority.Hold].push(() => {
                        ctx.globalAlpha = note.alpha / 255;
                        const missed = seconds > startSeconds + missSeconds && note.getJudgement() == 'none';
                        if (missed) {
                            ctx.globalAlpha *= 0.5;
                        }
                        // 以判定线为参考系
                        ctx.save();
                        ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        if (startPositionY > endPositionY) {
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
                            startPositionY = -startPositionY;
                            endPositionY = -endPositionY;
                        }
                        const height = endPositionY - startPositionY;
                        const { head, body, end } = resourcePackage.getSkin(type, highlight);
                        const width = note.size * settingsManager._settings.noteSize *
                            resourcePackage.getSkin(type, highlight).body.width / resourcePackage.getSkin(type, false).body.width;
                        const headHeight = head.height / head.width * width;
                        const endHeight = end.height / end.width * width;

                        // 显示主体

                        // holdRepeat 有性能问题，长条太长时会很卡
                        if (resourcePackage.config.holdRepeat) {
                            const step = body.height / body.width * width;
                            for (let i = height; i >= 0; i -= step) {
                                if (i < step) {
                                    ctx.drawImage(body,
                                        0, 0, body.width, body.height * (i / step),
                                        note.positionX - width / 2, -startPositionY - i, width, i);
                                }
                                else {
                                    ctx.drawImage(body, note.positionX - width / 2, -startPositionY - i, width, step);
                                }
                            }
                        }
                        else {
                            ctx.drawImage(body, note.positionX - width / 2, -startPositionY - height, width, height);
                        }
                        // 显示头部
                        if (seconds < startSeconds || resourcePackage.config.holdKeepHead) {
                            ctx.drawImage(head, note.positionX - width / 2, -startPositionY, width, headHeight);
                        }
                        // 显示尾部
                        ctx.drawImage(end, note.positionX - width / 2, -endPositionY - endHeight, width, endHeight);

                        ctx.restore();
                    });
                }
                else {
                    const { type, highlight } = note;
                    functions[Priority[note.typeString]].push(() => {
                        ctx.globalAlpha = note.alpha / 255;
                        // 当前时间大于音符时间，说明音符时间到了还没有击打，显示为即将miss（不透明度降低）
                        if (seconds >= startSeconds) {
                            if (note.isFake) {
                                return;
                            }
                            ctx.globalAlpha *= Math.max(0, 1 - (seconds - startSeconds) / missSeconds);
                        }
                        const image = resourcePackage.getSkin(type, highlight);
                        const width = note.size * settingsManager._settings.noteSize *
                            resourcePackage.getSkin(type, highlight).width / resourcePackage.getSkin(type, false).width;
                        const height = image.height / image.width * settingsManager._settings.noteSize;
                        // const height = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                        ctx.save();
                        ctx.translate(this.convertXToCanvas(judgeLineInfo.x), this.convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        ctx.drawImage(image,
                            0, 0, image.width, image.height,
                            note.positionX - width / 2, -startPositionY - height / 2, width, height);
                        ctx.restore();
                    });
                }
            }
            for (let noteNumber = 0; noteNumber < judgeLine.notes.length; noteNumber++) {
                const note = judgeLine.notes[noteNumber];
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;
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
                    functions[Priority.HitFx].push(() => {
                        const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitSeconds, {
                            getX: true,
                            getY: true,
                            getAngle: true
                        });
                        const radians = MathUtils.convertDegreesToRadians(angle);
                        const judgement = note.getJudgement();
                        /** 一个随机数种子生成器，只要保证输入不同的数字输出也不同就可以，这个是最优的方案 */
                        const hash = (a: number, b: number, c: number) => a * a + b * b + c * c;
                        /** 
                         * 给这个音符显示打击特效，“这个”音符见外部作用域中的 `note` 变量。
                         * @param type 判定类型
                         * @param hitFxStartSeconds 打击特效开始出现的时间
                         * @param n 打击特效的序号。对于非 Hold 音符或判定为 Bad 的音符，`n` 永远为 0。
                         * `n` 仅用于计算打击特效粒子的位置
                        */
                        const showHitFx = (type: 'perfect' | 'good' | 'bad', hitFxStartSeconds: number, n: number) => {
                            if (type == 'bad') {
                                let startPositionY = judgeLine.getPositionOfSeconds(startSeconds) - judgeLine.getPositionOfSeconds(hitSeconds);
                                startPositionY = startPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                                ctx.globalAlpha = 0.5 * (1 - (seconds - hitSeconds) / resourcePackage.config.hitFxDuration);
                                ctx.save();
                                ctx.translate(this.convertXToCanvas(x), this.convertYToCanvas(y));
                                ctx.rotate(radians);
                                if (note.type == NoteType.Hold) {
                                    if (seconds > hitSeconds + resourcePackage.config.hitFxDuration) {
                                        ctx.restore();
                                        return;
                                    }
                                    let endPositionY = judgeLine.getPositionOfSeconds(endSeconds) - judgeLine.getPositionOfSeconds(hitSeconds);
                                    endPositionY = endPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                                    if (startPositionY > endPositionY) {
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
                                        startPositionY = -startPositionY;
                                        endPositionY = -endPositionY;
                                    }
                                    const height = endPositionY - startPositionY;
                                    const { head, body, end } = resourcePackage.getSkin(note.type, note.highlight);
                                    const width = note.size * settingsManager._settings.noteSize *
                                        resourcePackage.getSkin(note.type, note.highlight).body.width / resourcePackage.getSkin(note.type, false).body.width;
                                    const headHeight = head.height / head.width * width;
                                    const endHeight = end.height / end.width * width;

                                    // 显示主体
                                    if (resourcePackage.config.holdRepeat) {
                                        const step = body.height / body.width * width;
                                        for (let i = height; i >= 0; i -= step) {
                                            if (i < step) {
                                                ctx.drawImage(body,
                                                    0, 0, body.width, body.height * (i / step),
                                                    note.positionX - width / 2, -startPositionY - i, width, i);
                                            }
                                            else {
                                                ctx.drawImage(body, note.positionX - width / 2, -startPositionY - i, width, step);
                                            }
                                        }
                                    }
                                    else {
                                        ctx.drawImage(body, note.positionX - width / 2, -startPositionY - height, width, height);
                                    }
                                    // 显示头部
                                    ctx.drawImage(head, note.positionX - width / 2, -startPositionY, width, headHeight);
                                    // 显示尾部
                                    ctx.drawImage(end, note.positionX - width / 2, -endPositionY - endHeight, width, endHeight);
                                }
                                else {
                                    const image = resourcePackage.getSkin(note.type, note.highlight);
                                    const width = note.size * settingsManager._settings.noteSize *
                                        resourcePackage.getSkin(note.type, note.highlight).width / resourcePackage.getSkin(note.type, false).width;
                                    const height = image.height / image.width * settingsManager._settings.noteSize;
                                    // const noteHeight = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                                    ctx.drawImage(image,
                                        0, 0, image.width, image.height,
                                        note.positionX - width / 2, -startPositionY - height / 2, width, height);
                                }
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
                                // 用判定线号、音符编号和打击特效的序号生成一个随机数作为种子，用来生成打击特效的粒子
                                const randomSeed = hash(judgeLineNumber, noteNumber, n);
                                const angles: readonly number[] = MathUtils.randomNumbers(particleCount, randomSeed, 0, 360);
                                const xys = angles.map(angle => MathUtils.pole(0, 0, angle, particleRadius));
                                const progress = (seconds - hitFxStartSeconds) / resourcePackage.config.hitFxDuration;

                                const hitFxPosition = MathUtils.moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                                const canvasX = this.convertXToCanvas(hitFxPosition.x);
                                const canvasY = this.convertYToCanvas(hitFxPosition.y);

                                const frames = type == 'perfect' ? resourcePackage.perfectHitFxFrames : resourcePackage.goodHitFxFrames;
                                const color = type == 'perfect' ? resourcePackage.config.colorPerfect : resourcePackage.config.colorGood;
                                // 如果当前的打击特效帧数不在范围内，则不显示特效
                                // 因为不在范围内说明打击特效还未开始或已结束
                                if (frameNumber < 0 || frameNumber >= frames.length) return;
                                const frame = frames[frameNumber];

                                ctx.save();
                                ctx.translate(canvasX, canvasY);
                                if (resourcePackage.config.hitFxRotate) ctx.rotate(radians);
                                ctx.globalAlpha = 1;
                                ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                                if (!resourcePackage.config.hideParticles) {
                                    xys.forEach(({ x, y }) => {
                                        drawRect(x * easingFuncs[EasingType.OutSine](progress) - particleSize / 2,
                                            y * easingFuncs[EasingType.OutSine](progress) - particleSize / 2,
                                            particleSize,
                                            particleSize,
                                            color,
                                            true,
                                            1 - easingFuncs[EasingType.InSine](progress));
                                    });
                                }
                                ctx.restore();
                            }
                        }
                        if (judgement == 'perfect' || judgement == 'good') {
                            if (note.type == NoteType.Hold) {
                                /**
                                 * 满足下面不等式时Hold的第n个打击特效可见
                                 * 
                                 * n >= 0
                                 * （要是n是负数的话就没意义了）
                                 * 
                                 * n > (seconds - hitFxDuration - hitSeconds) / hitFxFrequency
                                 * （即 hitSeconds + n * hitFxFrequency + hitFxDuration > seconds）
                                 * （打击特效结束时间大于当前时间，即打击特效还没结束）
                                 * 
                                 * n <= (endSeconds - hitSeconds) / hitFxFrequency
                                 * （用Hold的结束时间减去被击打的时间，除以打击特效频率，得到的数表示Hold可以显示多少个打击特效）
                                 * 
                                 * n <= (seconds - hitSeconds) / hitFxFrequency
                                 * （即 hitSeconds + n * hitFxFrequency <= seconds）
                                 * （打击特效开始时间小于等于当前时间，即打击特效已经开始了）
                                 */

                                for (
                                    // 初始值取两式的最大值，因为要同时大于等于这两个式子
                                    let n = Math.max(0, ceil((seconds - resourcePackage.config.hitFxDuration - hitSeconds) / hitFxFrequency));
                                    // 要同时小于等于两个式子
                                    n <= (endSeconds - hitSeconds) / hitFxFrequency &&
                                    n <= (seconds - hitSeconds) / hitFxFrequency;
                                    // n必须是整数，每次循环加1
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
                    });
                })();

                // 不论是什么种类的音符，被判定为bad的都不绘制，只绘制打击特效
                if (note.getJudgement() == 'bad') continue;

                // 已经结束的Hold音符不绘制
                if (note.type == NoteType.Hold) {
                    if (seconds >= endSeconds) continue;
                }

                // 已经被判定的非Hold音符不绘制
                else {
                    if (note.getJudgement() != 'none') continue;
                }
                drawNote(note);
            }
        }
        // 依次运行 functions 列表里用来绘制音符或打击特效的函数
        for (const funcs of functions) {
            for (const func of funcs) {
                func();
            }
        }
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