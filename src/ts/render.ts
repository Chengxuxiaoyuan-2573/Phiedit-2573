import { BPM, Chart, ChartData, NumberEvent, TextEvent, ColorEvent, RGBcolor, Note, NoteType, HitState, ImageSource } from "./typeDefinitions";
import { easingFuncs } from "./easing";
import { EditableImage } from "./EditableImage";
import { getBeatsValue, convertPositionX, convertPositionY, convertBeatsToSeconds, moveAndRotate, playSound, mod } from "./tools";
import TaskQueue from "./taskQueue";
export default function renderChart(canvas: HTMLCanvasElement, chartData: ChartData, seconds: number) {
    const { chartPackage } = chartData;
    const { chart, background } = chartPackage;
    const ctx = canvas.getContext("2d")!;
    seconds -= chart.META.offset / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(canvas, chartData, background);
    drawJudgeLines(ctx, chartData, seconds);
    highlightNotes(chart);
    drawNotes(ctx, chartData, seconds);
}
function drawBackground(canvas: HTMLCanvasElement, chartData: ChartData, background: ImageSource) {
    const ctx = canvas.getContext("2d")!;
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
    ctx.fillStyle = "#000";
    ctx.globalAlpha = chartData.backgroundDarkness;
    ctx.fillRect(0, 0, 1350, 900);
}
function highlightNotes(chart: Chart) {
    if (!chart._highlighted) {
        const allNotes = new Map<number, Note>();
        for (const judgeLine of chart.judgeLineList) {
            for (const note of judgeLine.notes) {
                const anotherNote = allNotes.get(getBeatsValue(note.startTime));
                if (anotherNote) {
                    anotherNote._highlight = true;
                    note._highlight = true;
                }
                else {
                    allNotes.set(getBeatsValue(note.startTime), note);
                    note._highlight = false;
                }
            }
        }
        chart._highlighted = true;
    }
}
function drawJudgeLines(ctx: CanvasRenderingContext2D, chartData: ChartData, seconds: number) {
    const { chartPackage } = chartData;
    const { chart, textures } = chartPackage;
    chart.judgeLineList.sort((y, x) => x.zOrder - y.zOrder);
    for (let i = 0; i < chart.judgeLineList.length; i++) {
        const { x, y, angle, alpha, scaleX, scaleY, color, text } = getJudgeLineInfo(chart, i, seconds, {
            getX: true,
            getY: true,
            getAngle: true,
            getAlpha: true,
            getScaleX: true,
            getScaleY: true,
            getColor: true,
            getText: true
        });
        const judgeLine = chart.judgeLineList[i];
        if (alpha <= 0.01) continue;
        const length = 2000;
        const radians = angle * (Math.PI / 180);
        ctx.translate(convertPositionX(x), convertPositionY(y));
        ctx.rotate(radians);
        ctx.globalAlpha = alpha / 255;
        if (judgeLine.Texture in textures) {
            const image = textures[judgeLine.Texture];
            ctx.drawImage(
                image, 0, 0, image.width, image.height,
                -image.width / 2 * scaleX, -image.height / 2 * scaleY,
                image.width * scaleX, image.height * scaleY
            );
        }
        else if (text == undefined) {
            ctx.strokeStyle = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
            ctx.lineWidth = chartData.lineWidth * scaleY;
            ctx.beginPath();
            ctx.moveTo(-length * scaleX, 0);
            ctx.lineTo(length * scaleX, 0);
            ctx.stroke();
        }
        else {
            const { canvas: textImage } = EditableImage.text(text, "PhiFont,sans-serif", chartData.textSize, color)
                .stretchScale(scaleX, scaleY);
            if (textImage.width > 0 && textImage.height > 0)
                ctx.drawImage(textImage, -textImage.width / 2, -textImage.height / 2);
        }
        ctx.resetTransform();
    }
}
function getJudgeLineInfo(chart: Chart, lineNumber: number, seconds: number, {
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
} = {
        getX: true,
        getY: true,
        getAngle: true,
        getAlpha: true,
        getSpeed: true,
        getScaleX: true,
        getScaleY: true,
        getColor: true,
        getPaint: true,
        getText: true
    }, visited: Record<number, boolean> = {}) {
    if (visited[lineNumber]) {
        throw new Error("Circular inheriting");
    }
    visited[lineNumber] = true;
    const judgeLine = chart.judgeLineList[lineNumber];
    let x = 0, y = 0, angle = 0, alpha = 0, speed = 0;
    for (const layer of judgeLine.eventLayers) {
        if (getX) x += interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, layer.moveXEvents, seconds), seconds);
        if (getY) y += interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, layer.moveYEvents, seconds), seconds);
        if (getAngle) angle += interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, layer.rotateEvents, seconds), seconds);
        if (getAlpha) alpha += interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, layer.alphaEvents, seconds), seconds);
        if (getSpeed) speed += interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, layer.speedEvents, seconds), seconds);
    }
    if (judgeLine.father >= 0 && judgeLine.father < chart.judgeLineList.length) {
        const { x: fatherX, y: fatherY, angle: fatherAngle } = getJudgeLineInfo(chart, judgeLine.father, seconds, {
            getX: true,
            getY: true,
            getAngle: true
        }, visited);
        const { x: newX, y: newY } = moveAndRotate(fatherX, fatherY, fatherAngle, x, y);
        const newAngle = angle;
        x = newX;
        y = newY;
        angle = newAngle;
    }
    const scaleX = getScaleX ? interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, judgeLine.extended.scaleXEvents, seconds), seconds) || 1 : 1;
    const scaleY = getScaleY ? interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, judgeLine.extended.scaleYEvents, seconds), seconds) || 1 : 1;
    const color = getColor ? interpolateColorEventValue(chart.BPMList, findLastEvent(chart.BPMList, judgeLine.extended.colorEvents, seconds), seconds) : [255, 255, 255] as RGBcolor;
    const paint = getPaint ? interpolateNumberEventValue(chart.BPMList, findLastEvent(chart.BPMList, judgeLine.extended.paintEvents, seconds), seconds) : 0;
    const text = getText ? interpolateTextEventValue(chart.BPMList, findLastEvent(chart.BPMList, judgeLine.extended.textEvents, seconds), seconds) : '';
    return { x, y, angle, alpha, speed, scaleX, scaleY, color, paint, text };
}
function interpolateNumberEventValue(BPMList: BPM[], event: NumberEvent | null, seconds: number) {
    const startSeconds = event == null ? 0 : convertBeatsToSeconds(BPMList, event.startTime);
    const endSeconds = event == null ? 0 : convertBeatsToSeconds(BPMList, event.endTime);
    const { start = 0, end = 0, easingType = 1, easingLeft = 0, easingRight = 1 } = event ?? {};
    if (endSeconds <= seconds) {
        return end;
    } else {
        const dx = endSeconds - startSeconds;
        const dy = end - start;
        const sx = seconds - startSeconds;
        const easingFunction = easingFuncs[easingType];
        const easingFactor = easingFunction(sx / dx * (easingRight - easingLeft) + easingLeft);
        return start + easingFactor * dy;
    }
}
function interpolateColorEventValue(BPMList: BPM[], event: ColorEvent | null, seconds: number) {
    const startSeconds = event == null ? 0 : convertBeatsToSeconds(BPMList, event.startTime);
    const endSeconds = event == null ? 0 : convertBeatsToSeconds(BPMList, event.endTime);
    const { start = [255, 255, 255], end = [255, 255, 255], easingType = 1, easingLeft = 0, easingRight = 1 } = event ?? {};
    if (endSeconds <= seconds) {
        return end;
    } else {
        const color: RGBcolor = [255, 255, 255];
        for (let i = 0; i < 3; i++) {
            const dx = endSeconds - startSeconds;
            const dy = end[i] - start[i];
            const sx = seconds - startSeconds;
            const easingFunction = easingFuncs[easingType];
            const easingFactor = easingFunction(sx / dx * (easingRight - easingLeft) + easingLeft);
            color[i] = start[i] + easingFactor * dy;
        }
        return color;
    }
}
function interpolateTextEventValue(BPMList: BPM[], event: TextEvent | null, seconds: number) {
    //const startSeconds = nearestEvent == null ? 0 : convertBeatsToSeconds(BPMList, nearestEvent.startTime);
    const endSeconds = event == null ? 0 : convertBeatsToSeconds(BPMList, event.endTime);
    const { start = undefined, end = undefined/*, easingType = 1, easingLeft = 0, easingRight = 1*/ } = event ?? {};
    if (endSeconds <= seconds) {
        return end;
    } else {
        if (start == undefined || end == undefined || event == null) return undefined;
        if (start.startsWith(end) || end.startsWith(start)) {
            const lengthStart = start.length;
            const lengthEnd = end.length;
            const e: NumberEvent = {
                startTime: event.startTime,
                endTime: event.endTime,
                easingType: event.easingType,
                easingLeft: event.easingLeft,
                easingRight: event.easingRight,
                bezier: event.bezier,
                bezierPoints: event.bezierPoints,
                start: lengthStart,
                end: lengthEnd
            };
            const length = Math.round(interpolateNumberEventValue(BPMList, e, seconds));
            return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
        }
        return start;
    }
}

function findLastEvent<T extends NumberEvent | ColorEvent | TextEvent>(BPMList: BPM[], events: T[], seconds: number): T | null {
    let lastEvent: T | null = null;
    let smallestDifference = Infinity;
    events.forEach(event => {
        const startSeconds = convertBeatsToSeconds(BPMList, event.startTime);
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
function drawNotes(ctx: CanvasRenderingContext2D, chartData: ChartData, seconds: number) {
    const { chartPackage, resourcePackage } = chartData;
    const { chart } = chartPackage;
    const taskQueue = new TaskQueue<void>();
    for (let judgeLineNumber = 0; judgeLineNumber < chart.judgeLineList.length; judgeLineNumber++) {
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        const judgeLineInfo = getJudgeLineInfo(chart, judgeLineNumber, seconds, {
            getX: true,
            getY: true,
            getAngle: true,
            getAlpha: true
        });
        for (let noteNumber = 0; noteNumber < judgeLine.notes.length; noteNumber++) {
            const note = judgeLine.notes[noteNumber];
            const noteInfo = getNoteInfo(chart, judgeLineNumber, noteNumber, seconds, judgeLineInfo, chartData);
            const radians = noteInfo.angle * (Math.PI / 180);
            const missSeconds = note.type == NoteType.Tap ? chartData.judgement.tap.bad :
                note.type == NoteType.Drag ? chartData.judgement.drag.perfect : chartData.judgement.flick.perfect;
            if (chartData.autoplay && seconds >= noteInfo.startSeconds &&
                note._hitState == HitState.NotHitted && !note.isFake) {
                if (note.type == NoteType.Hold)
                    if (seconds >= noteInfo.endSeconds) {
                        note._hitState = HitState.Perfect;
                    }
                    else {
                        note._hitState = HitState.HoldingPerfect;
                    }
                else {
                    note._hitState = HitState.Perfect;
                }
                note._hitSeconds = seconds;
                const audioBuffer =
                    note.type == NoteType.Drag ? chartData.resourcePackage.dragSound :
                        note.type == NoteType.Flick ? chartData.resourcePackage.flickSound :
                            note.type == NoteType.Tap ? chartData.resourcePackage.tapSound : chartData.resourcePackage.tapSound;
                playSound(chartData.resourcePackage.audioContext, audioBuffer);
            }
            if (seconds < note._hitSeconds) {
                note._hitState = HitState.NotHitted;
                note._hitSeconds = Infinity;
            }
            if (!chartData.autoplay && note._hitState == HitState.NotHitted && !note.isFake && seconds > noteInfo.startSeconds + missSeconds) {
                note._hitState = HitState.Miss;
                note._hitSeconds = Infinity;
            }
            if (!note.isFake && (note.type == NoteType.Hold
                ?
                note._hitState >= HitState.HoldingPerfect &&
                seconds < note._hitSeconds + chartData.resourcePackage.hitFxDuration * (
                    1 + Math.floor((noteInfo.endSeconds - note._hitSeconds) / chartData.resourcePackage.hitFxDuration)
                )
                :
                note._hitState >= HitState.Perfect &&
                seconds < note._hitSeconds + chartData.resourcePackage.hitFxDuration)
            ) {
                taskQueue.addTask(() => {
                    ctx.globalAlpha = 1;
                    const frameNumber = mod(
                        Math.floor(
                            (seconds - note._hitSeconds)
                            / chartData.resourcePackage.hitFxDuration
                            * chartData.resourcePackage.hitFxFrameNumber
                        ), chartData.resourcePackage.hitFxFrameNumber
                    );
                    const { x, y, angle } = note.type==NoteType.Hold ? judgeLineInfo : getJudgeLineInfo(chart, judgeLineNumber, note._hitSeconds, {
                        getX: true,
                        getY: true,
                        getAngle: true
                    });
                    if (note._hitState == HitState.Perfect || note._hitState == HitState.HoldingPerfect) {
                        const frame = chartData.resourcePackage.perfectHitFxFrames[frameNumber];
                        const noteHittedPosition = moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                        const canvasX = convertPositionX(noteHittedPosition.x);
                        const canvasY = convertPositionY(noteHittedPosition.y);
                        ctx.translate(canvasX, canvasY);
                        if (chartData.resourcePackage.hitFxRotate) ctx.rotate(radians);
                        ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                    }
                    ctx.resetTransform();
                }, 5);
                if (note._hitState >= HitState.Perfect)
                    continue;
            }
            if (noteInfo.isCovered) continue;
            if (noteInfo.startSeconds - seconds > note.visibleTime) continue; // note is not in visible time
            if (judgeLineInfo.alpha < 0) continue; // note is hided
            if (note.type == NoteType.Hold) {
                if (seconds >= noteInfo.endSeconds) continue;
                taskQueue.addTask(() => {
                    ctx.globalAlpha = note.alpha / 255;
                    if (note._hitState == HitState.Miss) ctx.globalAlpha /= 2;
                    const canvasStartX = convertPositionX(noteInfo.startX), canvasStartY = convertPositionY(noteInfo.startY);
                    const canvasEndX = convertPositionX(noteInfo.endX), canvasEndY = convertPositionY(noteInfo.endY);
                    const noteWidth = note._highlight ?
                        note.size * 200 * (resourcePackage.holdHLBody.width / resourcePackage.holdBody.width) :
                        note.size * 200;
                    const noteHeight = Math.abs(noteInfo.endPositionY - noteInfo.startPositionY);
                    const holdHead = note._highlight ? resourcePackage.holdHLHead : resourcePackage.holdHead;
                    const holdBody = note._highlight ? resourcePackage.holdHLBody : resourcePackage.holdBody;
                    const holdEnd = note._highlight ? resourcePackage.holdHLEnd : resourcePackage.holdEnd;
                    const noteHeadHeight = holdHead.height / holdBody.width * noteWidth;
                    const noteEndHeight = holdEnd.height / holdBody.width * noteWidth;
                    if (noteInfo.endPositionY > noteInfo.startPositionY) {
                        ctx.translate(canvasStartX, canvasStartY);
                        ctx.rotate(radians);
                        ctx.drawImage(holdBody,
                            0, 0, holdBody.width, holdBody.height,
                            -noteWidth / 2, -noteHeight, noteWidth, noteHeight);
                    }
                    else {
                        ctx.translate(canvasStartX, canvasStartY);
                        ctx.rotate(radians + Math.PI);
                        ctx.drawImage(holdBody,
                            0, 0, holdBody.width, holdBody.height,
                            -noteWidth / 2, -noteHeight, noteWidth, noteHeight);
                    }
                    ctx.resetTransform();
                    if (seconds < noteInfo.startSeconds) {
                        ctx.translate(canvasStartX, canvasStartY);
                        if (noteInfo.startPositionY < 0) {
                            ctx.rotate(radians + Math.PI);
                        }
                        else {
                            ctx.rotate(radians);
                        }
                        ctx.drawImage(holdHead,
                            0, 0, holdHead.width, holdHead.height,
                            -noteWidth / 2, 0, noteWidth, noteHeadHeight);
                    }
                    ctx.resetTransform();
                    ctx.translate(canvasEndX, canvasEndY);
                    ctx.rotate(radians);
                    if (noteInfo.endPositionY < 0) {
                        ctx.rotate(Math.PI);
                    }
                    ctx.drawImage(holdEnd,
                        0, 0, holdEnd.width, holdEnd.height,
                        -noteWidth / 2, -noteEndHeight, noteWidth, noteEndHeight);
                    ctx.resetTransform();
                }, 1);
            }
            else {
                taskQueue.addTask(() => {
                    ctx.globalAlpha = note.alpha / 255;
                    if (seconds >= noteInfo.startSeconds) {
                        ctx.globalAlpha = Math.max(0, 1 - (seconds - noteInfo.startSeconds) / missSeconds);
                    }
                    const noteImage =
                        note.type == NoteType.Flick ? note._highlight ? resourcePackage.flickHL : resourcePackage.flick :
                            note.type == NoteType.Drag ? note._highlight ? resourcePackage.dragHL : resourcePackage.drag :
                                note._highlight ? resourcePackage.tapHL : resourcePackage.tap;
                    const canvasStartX = convertPositionX(noteInfo.startX), canvasStartY = convertPositionY(noteInfo.startY);
                    const noteWidth = note._highlight ? note.size * 200 * (
                        (
                            note.type == NoteType.Drag ? chartData.resourcePackage.dragHL :
                                note.type == NoteType.Flick ? chartData.resourcePackage.flickHL :
                                    chartData.resourcePackage.tapHL
                        ).width /
                        (
                            note.type == NoteType.Drag ? chartData.resourcePackage.drag :
                                note.type == NoteType.Flick ? chartData.resourcePackage.flick :
                                    chartData.resourcePackage.tap
                        ).width
                    ) : note.size * 200;
                    const noteHeight = noteImage.height / noteImage.width * noteWidth;
                    ctx.translate(canvasStartX, canvasStartY);
                    ctx.rotate(radians);
                    ctx.drawImage(noteImage,
                        0, 0, noteImage.width, noteImage.height,
                        -noteWidth / 2, -noteHeight / 2, noteWidth, noteHeight);
                    ctx.resetTransform();
                }, note.type == NoteType.Drag ? 2 : note.type == NoteType.Tap ? 3 : 4);
            }
        }
    }
    // 叠放顺序从下到上： Hold < Drag < Tap < Flick < 打击特效
    taskQueue.run();
}
function getNoteInfo(chart: Chart, lineNumber: number, noteNumber: number, seconds: number, judgeLineInfo: { x: number, y: number, angle: number }, chartData: ChartData) {
    const judgeLine = chart.judgeLineList[lineNumber];
    const note = judgeLine.notes[noteNumber];
    const noteStartSeconds = note._startSeconds || (note._startSeconds = convertBeatsToSeconds(chart.BPMList, note.startTime));
    const noteEndSeconds = note._endSeconds || (note._endSeconds = convertBeatsToSeconds(chart.BPMList, note.endTime));
    const { x: lineX, y: lineY, angle: lineAngle } = judgeLineInfo;
    const { positionX, above, speed, yOffset, type } = note;
    let startPositionY = 0, endPositionY = 0;
    for (const eventLayer of judgeLine.eventLayers) {
        const speedEvents = eventLayer.speedEvents.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
        for (let i = 0; i < speedEvents.length; i++) {
            const current = speedEvents[i];
            const next = speedEvents[i + 1];
            const currentStartSeconds = convertBeatsToSeconds(chart.BPMList, current.startTime);
            const currentEndSeconds = convertBeatsToSeconds(chart.BPMList, current.endTime);
            const currentStart = current.start;
            const currentEnd = current.end;
            const nextStartSeconds = i < speedEvents.length - 1 ? convertBeatsToSeconds(chart.BPMList, next.startTime) : Infinity;
            const
                l1 = Math.min(seconds, noteStartSeconds), l2 = Math.min(seconds, noteEndSeconds),
                r1 = Math.max(seconds, noteStartSeconds), r2 = Math.max(seconds, noteEndSeconds);

            if (currentStartSeconds <= l2 && l2 <= currentEndSeconds && currentEndSeconds <= r2) {
                const h = currentEndSeconds - l2;
                const a = interpolateNumberEventValue(chart.BPMList, current, l2);
                const b = currentEnd;
                endPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (l2 <= currentStartSeconds && currentStartSeconds <= r2 && r2 <= currentEndSeconds) {
                const h = r2 - currentStartSeconds;
                const a = currentStart;
                const b = interpolateNumberEventValue(chart.BPMList, current, r2);
                endPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (l2 <= currentStartSeconds && currentEndSeconds <= r2) {
                const h = currentEndSeconds - currentStartSeconds;
                const a = currentStart;
                const b = currentEnd;
                endPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (currentStartSeconds <= l2 && r2 <= currentEndSeconds) {
                const h = r2 - l2;
                const a = interpolateNumberEventValue(chart.BPMList, current, l2);
                const b = interpolateNumberEventValue(chart.BPMList, current, r2);
                endPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }

            if (currentEndSeconds <= l2 && l2 <= nextStartSeconds && nextStartSeconds <= r2) {
                const h = nextStartSeconds - l2;
                const a = currentEnd;
                endPositionY += a * h * chartData.chartSpeed;
            }
            else if (l2 <= currentEndSeconds && nextStartSeconds <= r2) {
                const h = nextStartSeconds - currentEndSeconds;
                const a = currentEnd;
                endPositionY += a * h * chartData.chartSpeed;
            }
            else if (l2 <= currentEndSeconds && currentEndSeconds <= r2 && r2 <= nextStartSeconds) {
                const h = r2 - currentEndSeconds;
                const a = currentEnd;
                endPositionY += a * h * chartData.chartSpeed;
            }
            else if (currentEndSeconds <= l2 && r2 <= nextStartSeconds) {
                const h = r2 - l2;
                const a = currentEnd;
                endPositionY += a * h * chartData.chartSpeed;
            }
            if (type == 2 && noteStartSeconds < seconds) {
                continue;
            }
            if (currentStartSeconds <= l1 && l1 <= currentEndSeconds && currentEndSeconds <= r1) {
                const h = currentEndSeconds - l1;
                const a = interpolateNumberEventValue(chart.BPMList, current, l1);
                const b = currentEnd;
                startPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (l1 <= currentStartSeconds && currentStartSeconds <= r1 && r1 <= currentEndSeconds) {
                const h = r1 - currentStartSeconds;
                const a = currentStart;
                const b = interpolateNumberEventValue(chart.BPMList, current, r1);
                startPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (l1 <= currentStartSeconds && currentEndSeconds <= r1) {
                const h = currentEndSeconds - currentStartSeconds;
                const a = currentStart;
                const b = currentEnd;
                startPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }
            else if (currentStartSeconds <= l1 && r1 <= currentEndSeconds) {
                const h = r1 - l1;
                const a = interpolateNumberEventValue(chart.BPMList, current, l1);
                const b = interpolateNumberEventValue(chart.BPMList, current, r1);
                startPositionY += (a + b) * h / 2 * chartData.chartSpeed;
            }

            if (currentEndSeconds <= l1 && l1 <= nextStartSeconds && nextStartSeconds <= r1) {
                const h = nextStartSeconds - l1;
                const a = currentEnd;
                startPositionY += a * h * chartData.chartSpeed;
            }
            else if (l1 <= currentEndSeconds && nextStartSeconds <= r1) {
                const h = nextStartSeconds - currentEndSeconds;
                const a = currentEnd;
                startPositionY += a * h * chartData.chartSpeed;
            }
            else if (l1 <= currentEndSeconds && currentEndSeconds <= r1 && r1 <= nextStartSeconds) {
                const h = r1 - currentEndSeconds;
                const a = currentEnd;
                startPositionY += a * h * chartData.chartSpeed;
            }
            else if (currentEndSeconds <= l1 && r1 <= nextStartSeconds) {
                const h = r1 - l1;
                const a = currentEnd;
                startPositionY += a * h * chartData.chartSpeed;
            }
        }
    }
    if (seconds >= noteStartSeconds) startPositionY = - startPositionY;
    if (seconds >= noteEndSeconds) endPositionY = - endPositionY;
    const isCovered = endPositionY < 0 && judgeLine.isCover == 1 && seconds < noteEndSeconds;
    startPositionY = startPositionY * speed * (above == 1 ? 1 : -1) + yOffset;
    endPositionY = endPositionY * speed * (above == 1 ? 1 : -1) + yOffset;
    const { x: startX, y: startY } = moveAndRotate(lineX, lineY, lineAngle, positionX, startPositionY);
    const { x: endX, y: endY } = moveAndRotate(lineX, lineY, lineAngle, positionX, endPositionY);
    return {
        startX, startY, endX, endY, angle: lineAngle, startSeconds: noteStartSeconds, endSeconds: noteEndSeconds,
        startPositionY, endPositionY, isCovered
    };
}
