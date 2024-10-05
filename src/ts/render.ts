/* eslint-able */
import { BaseEvent, Beats, BPM, Chart, NoteSource, Settings } from "./typeDefinitions";
import { easingFuncs } from "./easing";
export default async function renderChart(
    canvasJudgeLine: HTMLCanvasElement,
    canvasNote: HTMLCanvasElement,
    chart: Chart,
    seconds: number,
    settings: Settings,
    noteSource: NoteSource
): Promise<void> {
    const ctxJudgeLine = canvasJudgeLine.getContext("2d");
    const ctxNote = canvasNote.getContext("2d");
    seconds -= chart.META.offset / 1000;
    if (ctxJudgeLine) {
        ctxJudgeLine.clearRect(0, 0, 1350, 900);
        drawJudgeLines(ctxJudgeLine, chart, seconds, settings);
    }
    if (ctxNote) {
        ctxNote.clearRect(0, 0, 1350, 900);
        drawNotes(ctxNote, chart, seconds, settings, noteSource);
    }
}
function drawJudgeLines(ctx: CanvasRenderingContext2D, chart: Chart, seconds: number, settings: Settings): void {
    ctx.lineWidth = settings.lineWidth;
    chart.judgeLineList.sort((y, x) => x.zOrder - y.zOrder);
    for (let i = 0; i < chart.judgeLineList.length; i++) {
        const { x, y, angle, alpha } = getJudgeLineInfo(chart, i, seconds);
        if (alpha <= 0.004) continue;
        ctx.strokeStyle = "rgba(255, 255, 255, " + alpha / 255 + ")";
        const length = 2000;
        const radians = angle * (Math.PI / 180);
        const x1 = convertPositionX(x + length * Math.cos(radians));
        const y1 = convertPositionY(y + length * Math.sin(radians));
        const x2 = convertPositionX(x - length * Math.cos(radians));
        const y2 = convertPositionY(y - length * Math.sin(radians));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}
function getJudgeLineInfo(chart: Chart, lineNumber: number, seconds: number): { x: number, y: number, angle: number, alpha: number } {
    const judgeLine = chart.judgeLineList[lineNumber];
    let x, y, angle, alpha;
    if (judgeLine.father < 0 || judgeLine.father >= chart.judgeLineList.length) {
        x = 0; y = 0; angle = 0; alpha = 0;
    }
    else {
        ({ x, y, angle } = getJudgeLineInfo(chart, judgeLine.father, seconds));
        alpha = 0;
    }

    for (const layer of judgeLine.eventLayers) {
        x += interpolateEventValue(chart.BPMList, layer.moveXEvents, seconds);
        y += interpolateEventValue(chart.BPMList, layer.moveYEvents, seconds);
        angle += interpolateEventValue(chart.BPMList, layer.rotateEvents, seconds);
        alpha += interpolateEventValue(chart.BPMList, layer.alphaEvents, seconds);
    }
    return { x, y, angle, alpha };
}
function interpolateEventValue(BPMList: BPM[], events: BaseEvent[], seconds: number) {
    const nearestEvent = findNearestEvent(BPMList, events, seconds);
    const startSeconds = convertBeatsToSeconds(BPMList, nearestEvent.startTime);
    const endSeconds = convertBeatsToSeconds(BPMList, nearestEvent.endTime);
    const { start, end, easingType, easingLeft, easingRight } = nearestEvent;
    if (endSeconds <= seconds) {
        return nearestEvent.end;
    } else {
        const dx = endSeconds - startSeconds;
        const dy = end - start;
        const sx = seconds - startSeconds;
        const easingFunction = easingFuncs[easingType];
        const easingFactor = easingFunction(sx / dx * (easingRight - easingLeft) + easingLeft);
        return start + easingFactor * dy;
    }
}
function findNearestEvent(BPMList: BPM[], events: BaseEvent[], seconds: number) {
    let nearestEvent: BaseEvent = {
        "bezier": 0,
        "bezierPoints": [0, 0, 0, 0],
        "easingLeft": 0,
        "easingRight": 1,
        "easingType": 1,
        "end": 0,
        "endTime": [-1, 0, 1],
        "start": 0,
        "startTime": [0, 0, 1]
    }
    let smallestDifference = Infinity;
    events.forEach(event => {
        const startSeconds = convertBeatsToSeconds(BPMList, event.startTime);
        if (startSeconds <= seconds) {
            const difference = seconds - startSeconds;
            if (difference < smallestDifference) {
                smallestDifference = difference;
                nearestEvent = event;
            }
        }
    });
    return nearestEvent;
}
function drawNotes(ctx: CanvasRenderingContext2D, chart: Chart, seconds: number, _settings: Settings, noteSource: NoteSource) {
    for (let i = 0; i < chart.judgeLineList.length; i++) {
        const judgeLine = chart.judgeLineList[i];
        const { x, y, angle } = getJudgeLineInfo(chart, i, seconds);
        const radians = angle * (Math.PI / 180);
        for (const note of judgeLine.notes) {
            const noteStartSeconds = convertBeatsToSeconds(chart.BPMList, note.startTime);
            const noteEndSeconds = convertBeatsToSeconds(chart.BPMList, note.endTime);
            const { positionX, above, size, speed, yOffset, visibleTime, type } = note;
            if (noteStartSeconds - seconds > visibleTime) continue;
            if (noteEndSeconds < seconds) continue;
            let startPositionY = 0, endPositionY = 0;
            for (const eventLayer of judgeLine.eventLayers) {
                const speedEvents = eventLayer.speedEvents.sort((x, y) => convertBeatsToNumber(x.startTime) - convertBeatsToNumber(y.startTime));
                for (let i = 0; i < speedEvents.length; i++) {
                    const current = speedEvents[i];
                    const next = speedEvents[i + 1];
                    const currentStartSeconds = convertBeatsToSeconds(chart.BPMList, current.startTime);
                    const currentEndSeconds = convertBeatsToSeconds(chart.BPMList, current.endTime);
                    const currentStart = current.start;
                    const currentEnd = current.end;
                    const nextStartSeconds = i < speedEvents.length - 1 ? convertBeatsToSeconds(chart.BPMList, next.startTime) : Infinity;
                    if (currentStartSeconds <= seconds && seconds <= currentEndSeconds && currentEndSeconds <= noteEndSeconds) {
                        const h = currentEndSeconds - seconds;
                        const a = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (seconds - currentStartSeconds);
                        const b = currentEnd;
                        endPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (seconds <= currentStartSeconds && currentStartSeconds <= noteEndSeconds && noteEndSeconds <= currentEndSeconds) {
                        const h = noteEndSeconds - currentStartSeconds;
                        const a = currentStart;
                        const b = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (noteEndSeconds - currentStartSeconds);
                        endPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (seconds <= currentStartSeconds && currentEndSeconds <= noteEndSeconds) {
                        const h = currentEndSeconds - currentStartSeconds;
                        const a = currentStart;
                        const b = currentEnd;
                        endPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (currentStartSeconds <= seconds && noteEndSeconds <= currentEndSeconds) {
                        const h = noteEndSeconds - seconds;
                        const a = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (seconds - currentStartSeconds);
                        const b = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (noteEndSeconds - currentStartSeconds);
                        endPositionY += (a + b) * h / 2 * 120;
                    }

                    if (currentEndSeconds <= seconds && seconds <= nextStartSeconds && nextStartSeconds <= noteEndSeconds) {
                        const h = nextStartSeconds - seconds;
                        const a = currentEnd;
                        endPositionY += a * h * 120;
                    }
                    else if (seconds <= currentEndSeconds && nextStartSeconds <= noteEndSeconds) {
                        const h = nextStartSeconds - currentEndSeconds;
                        const a = currentEnd;
                        endPositionY += a * h * 120;
                    }
                    else if (seconds <= currentEndSeconds && currentEndSeconds <= noteEndSeconds && noteEndSeconds <= nextStartSeconds) {
                        const h = noteEndSeconds - currentEndSeconds;
                        const a = currentEnd;
                        endPositionY += a * h * 120;
                    }
                    else if (currentEndSeconds <= seconds && noteEndSeconds <= nextStartSeconds) {
                        const h = noteEndSeconds - seconds;
                        const a = currentEnd;
                        endPositionY += a * h * 120;
                    }
                    if (type == 2 && noteStartSeconds < seconds) {
                        continue;
                    }
                    if (currentStartSeconds <= seconds && seconds <= currentEndSeconds && currentEndSeconds <= noteStartSeconds) {
                        const h = currentEndSeconds - seconds;
                        const a = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (seconds - currentStartSeconds);
                        const b = currentEnd;
                        startPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (seconds <= currentStartSeconds && currentStartSeconds <= noteStartSeconds && noteStartSeconds <= currentEndSeconds) {
                        const h = noteStartSeconds - currentStartSeconds;
                        const a = currentStart;
                        const b = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (noteStartSeconds - currentStartSeconds);
                        startPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (seconds <= currentStartSeconds && currentEndSeconds <= noteStartSeconds) {
                        const h = currentEndSeconds - currentStartSeconds;
                        const a = currentStart;
                        const b = currentEnd;
                        startPositionY += (a + b) * h / 2 * 120;
                    }
                    else if (currentStartSeconds <= seconds && noteStartSeconds <= currentEndSeconds) {
                        const h = noteStartSeconds - seconds;
                        const a = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (seconds - currentStartSeconds);
                        const b = (currentEnd - currentStart) / (currentEndSeconds - currentStartSeconds) * (noteStartSeconds - currentStartSeconds);
                        startPositionY += (a + b) * h / 2 * 120;
                    }

                    if (currentEndSeconds <= seconds && seconds <= nextStartSeconds && nextStartSeconds <= noteStartSeconds) {
                        const h = nextStartSeconds - seconds;
                        const a = currentEnd;
                        startPositionY += a * h * 120;
                    }
                    else if (seconds <= currentEndSeconds && nextStartSeconds <= noteStartSeconds) {
                        const h = nextStartSeconds - currentEndSeconds;
                        const a = currentEnd;
                        startPositionY += a * h * 120;
                    }
                    else if (seconds <= currentEndSeconds && currentEndSeconds <= noteStartSeconds && noteStartSeconds <= nextStartSeconds) {
                        const h = noteStartSeconds - currentEndSeconds;
                        const a = currentEnd;
                        startPositionY += a * h * 120;
                    }
                    else if (currentEndSeconds <= seconds && noteStartSeconds <= nextStartSeconds) {
                        const h = noteStartSeconds - seconds;
                        const a = currentEnd;
                        startPositionY += a * h * 120;
                    }

                }
            }
            startPositionY = startPositionY * speed * (above == 1 ? 1 : -1) + yOffset;
            endPositionY = endPositionY * speed * (above == 1 ? 1 : -1) + yOffset;
            const { x: startX, y: startY } = moveAndRotate(x, y, angle, positionX, startPositionY);
            const { x: endX, y: endY } = moveAndRotate(x, y, angle, positionX, endPositionY);

            if (type == 2) {
                const canvasStartX = convertPositionX(startX), canvasStartY = convertPositionY(startY);
                const canvasEndX = convertPositionX(endX), canvasEndY = convertPositionY(endY);
                const noteWidth = size * 200;
                const noteHeight = endPositionY - startPositionY;
                const noteHeadHeight = noteSource.HoldHead.height / noteSource.HoldBody.width * noteWidth;
                const noteEndHeight = noteSource.HoldEnd.height / noteSource.HoldBody.width * noteWidth;
                ctx.save();
                ctx.translate(canvasStartX, canvasStartY);
                ctx.rotate(-radians);
                ctx.drawImage(noteSource.HoldBody,
                    0, 0, noteSource.HoldBody.width, noteSource.HoldBody.height,
                    -noteWidth / 2, -noteHeight, noteWidth, noteHeight);
                ctx.drawImage(noteSource.HoldHead,
                    0, 0, noteSource.HoldHead.width, noteSource.HoldHead.height,
                    -noteWidth / 2, 0, noteWidth, noteHeadHeight);
                ctx.restore();
                ctx.save();
                ctx.translate(canvasEndX, canvasEndY);
                ctx.rotate(-radians);
                ctx.drawImage(noteSource.HoldEnd,
                    0, 0, noteSource.HoldEnd.width, noteSource.HoldEnd.height,
                    -noteWidth / 2, -noteEndHeight, noteWidth, noteEndHeight);
                ctx.restore();
            }
            else {
                const noteImage = (type == 3 ? noteSource.Flick : type == 4 ? noteSource.Drag : noteSource.Tap);
                if (startX < -1000 || startX > 1000 || startY < -800 || startY > 800)
                    continue;
                const canvasStartX = convertPositionX(startX), canvasStartY = convertPositionY(startY);
                const noteWidth = size * 200;
                const noteHeight = noteImage.height / noteImage.width * 200;
                ctx.save();
                ctx.translate(canvasStartX, canvasStartY);
                ctx.rotate(-radians);
                ctx.drawImage(noteImage,
                    0, 0, noteImage.width, noteImage.height,
                    -noteWidth / 2, -noteHeight / 2, noteWidth, noteHeight);
                ctx.restore();
            }
        }
    }
}
function moveAndRotate(x1: number, y1: number, dir: number, x2: number, y2: number) {
    // 初始方向向量（单位向量）  
    const dx = Math.cos(dir * (Math.PI / 180)); // x方向分量  
    const dy = Math.sin(dir * (Math.PI / 180)); // y方向分量  
    // 计算初始移动后的坐标  
    const x2_new = x1 + x2 * dx;
    const y2_new = y1 + x2 * dy;
    // 左转90度后的新方向向量  
    const newDx = -dy; // 原来的y分量变成新的-x分量  
    const newDy = dx;  // 原来的x分量变成新的y分量  
    // 计算最终坐标  
    const x_final = x2_new + y2 * newDx;
    const y_final = y2_new + y2 * newDy;
    return { x: x_final, y: y_final };
}
function convertBeatsToSeconds(BPMList: BPM[], beats: Beats): number {
    let seconds: number = 0;
    BPMList.filter(bpm => convertBeatsToNumber(beats) > convertBeatsToNumber(bpm.startTime))
        .toSorted((x, y) => convertBeatsToNumber(x.startTime) - convertBeatsToNumber(y.startTime))
        .forEach((bpm, i, BPMList) => {
            if (i == BPMList.length - 1) {
                seconds += (convertBeatsToNumber(beats) - convertBeatsToNumber(bpm.startTime)) / bpm.bpm * 60;
            }
            else {
                seconds += (convertBeatsToNumber(BPMList[i + 1].startTime) - convertBeatsToNumber(bpm.startTime)) / bpm.bpm * 60;
            }
        })
    return seconds;
}
function convertBeatsToNumber(beats: Beats) {
    return beats[0] + beats[1] / beats[2];
}
function convertPositionX(x: number) {
    return x + 675;
}
function convertPositionY(y: number) {
    return 450 - y;
}