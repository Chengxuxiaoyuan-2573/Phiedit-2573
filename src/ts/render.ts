import { LeftState, MainState, NoteType, RightState, TopState } from "./typeDefinitions";
import easingFuncs, { EasingType } from "./easing";
import { moveAndRotate, convertDegreesToRadians, getContext, drawLine, cubicBezierEase } from "./tools";
import { TaskQueue } from "./classes/taskQueue";
import { NumberEvent, ColorEvent, TextEvent, BaseEvent } from "./classes/event";
import { Box } from "./classes/box";
import { colorToString, RGBAcolor, RGBcolor } from "./classes/color";
import { Note } from "./classes/note";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";
import DefaultChartPackageURL from "@/assets/DefaultChartPackage.zip";
import DefaultResourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import { removeLoadingText, setLoadingText } from "./components/loadingText";
import { beatsToSeconds, getBeatsValue } from "./classes/beats";
import { reactive } from "vue";
const lineWidth = 5,
    horzionalMainLineColor: RGBAcolor = [255, 255, 255, 0.5],
    horzionalLineColor: RGBAcolor = [255, 255, 255, 0.2],
    verticalMainLineColor: RGBAcolor = [255, 255, 255, 0.5],
    verticalLineColor: RGBAcolor = [255, 255, 255, 0.2],
    judgeLineColor: RGBcolor = [255, 255, 0],
    backgroundColor: RGBcolor = [30, 30, 30],
    selectionColor: RGBcolor = [70, 100, 255],
    top = 0,
    bottom = 900,
    left1 = 50,
    right1 = 650,
    width = right1 - left1,
    right2 = 1300,
    left2 = right2 - width,
    height = bottom - top,
    eventSpace = 20,
    selectPadding = 10;
let boxes: Box<ObjectCanBeEdited>[] = [];
let _axisX: number, _axisY: number, _spaceX: number, _spaceY: number;
let canvas: HTMLCanvasElement;
type ChartSettings = {
    backgroundDarkness: number,
    lineWidth: number,
    lineLength: number,
    textSize: number,
    chartSpeed: number,
    noteSize: number,
    viewWidth: number,
    viewHeight: number
}
type UI = {
    /** 主界面（canvas）的状态 */
    main: MainState,
    /** 顶部工具栏的状态 */
    top: TopState,
    /** 右侧菜单栏的状态 */
    right: RightState,
    /** 左侧菜单栏的状态 */
    left: LeftState,
    /** 横线数（即一拍分成几份） */
    segmentsPerBeat: number,
    /** 每两条竖线之间的间隔（可以间接算出来竖线数） */
    trackSpace: number,
    /** 纵向拉伸（一秒的时间在编辑器里时间轴上是多少像素） */
    pxPerSecond: number,
    /** 选中的判定线号 */
    currentJudgeLineNumber: number,
    /** 选中的事件层级编号 */
    currentEventLayerNumber: number,
    /** 选中的所有note和事件 */
    selection: ObjectCanBeEdited[],
    /** 滚轮速度 */
    wheelSpeed: number,
    /** 正在放置的note类型 */
    currentNoteType: NoteType,
}
type ChartData = {
    chartPackage: ChartPackage,
    resourcePackage: ResourcePackage,
    chartSettings: ChartSettings,
    ui: UI
}

type ObjectCanBeEdited = Note | NumberEvent;
export const data: ChartData = {
    chartPackage: await fetch(DefaultChartPackageURL)
        .then(response => response.blob())
        .then(blob => ChartPackage.load(blob, setLoadingText)),
    resourcePackage: reactive(await fetch(DefaultResourcePackageURL)
        .then(response => response.blob())
        .then(blob => ResourcePackage.load(blob, setLoadingText))),
    chartSettings: reactive({
        backgroundDarkness: 90,
        lineWidth: 5,
        lineLength: 2000,
        textSize: 50,
        chartSpeed: 120,
        noteSize: 200,
        viewWidth: 1350,
        viewHeight: 900
    }),
    ui: reactive({
        main: MainState.Playing,
        right: RightState.Default,
        left: LeftState.Default,
        top: TopState.Default,
        pxPerSecond: 300,
        segmentsPerBeat: 4,
        trackSpace: 50,
        currentJudgeLineNumber: 0,
        currentEventLayerNumber: 0,
        selection: [],
        wheelSpeed: 1,
        currentNoteType: NoteType.Tap
    })
}

removeLoadingText();
export function setCanvas(_canvas: HTMLCanvasElement) {
    canvas = _canvas;
    canvas.onmousedown = canvasOnMouseDown;
    canvas.onmousemove = canvasOnMouseMove;
}
export function setChartPackage(chartPackage: ChartPackage) {
    data.chartPackage = chartPackage;
}
export function setResourcePackage(resourcePackage: ResourcePackage) {
    data.resourcePackage = resourcePackage;
}
/**
 * 把用户点击坐标转换成canvas坐标系下的坐标。
 */
function clickPosition(x: number, y: number) {
    const innerWidthCanvasPixels = canvas.width;
    const innerHeightCanvasPixels = canvas.height;
    const innerRatio = innerWidthCanvasPixels / innerHeightCanvasPixels;
    const { width: outerWidthBrowserPixels, height: outerHeightBrowserPixels } = canvas.getBoundingClientRect();
    const outerRatio = outerWidthBrowserPixels / outerHeightBrowserPixels;
    const { browserToCanvasRatio, padding } = (() => {
        if (innerRatio > outerRatio) {
            const width = outerWidthBrowserPixels;
            const height = width / innerRatio;
            const padding = (outerHeightBrowserPixels - height) / 2;
            return { padding, browserToCanvasRatio: innerWidthCanvasPixels / width };
        }
        else {
            const height = outerHeightBrowserPixels;
            const width = height * innerRatio;
            const padding = (outerWidthBrowserPixels - width) / 2;
            return { padding, browserToCanvasRatio: innerHeightCanvasPixels / height };
        }
    })();
    if (innerRatio > outerRatio) {
        return { x: x * browserToCanvasRatio, y: (y - padding) * browserToCanvasRatio };
    }
    else {
        return { y: y * browserToCanvasRatio, x: (x - padding) * browserToCanvasRatio };
    }
}
function canvasOnMouseMove() {
    // there is nothing
}

function canvasOnMouseDown(e: MouseEvent) {
    if (data.ui.main == MainState.Editing) {
        switch (e.button) {
            case 0:
                canvasOnLeftClick(e);
                return;
            case 2:
                canvasOnRightClick(e);
                return;
        }
    }
}
function canvasOnRightClick(e: MouseEvent) {
    const { x, y } = clickPosition(e.offsetX, e.offsetY);
    const a = Math.round((x - _axisY) / _spaceY);
    const b = -Math.round((y - _axisX) / (_spaceX / data.ui.segmentsPerBeat));
    const judgeLine = data.chartPackage.chart.judgeLineList[data.ui.currentJudgeLineNumber];
    const addedNote = new Note({
        startTime: [Math.floor(b / data.ui.segmentsPerBeat), b % data.ui.segmentsPerBeat, data.ui.segmentsPerBeat],
        positionX: a * data.ui.trackSpace,
        type: data.ui.currentNoteType
    });
    judgeLine.notes.push(addedNote);
    data.ui.selection = [addedNote];
    data.ui.right = RightState.Editing;
}
function canvasOnLeftClick(e: MouseEvent) {
    const { x, y } = clickPosition(e.offsetX, e.offsetY);
    const { ctrlKey: ctrl } = e;
    function _select<T>(boxes: Box<T>[]) {
        for (const box of boxes) {
            if (box.touch(x, y)) {
                return box.data;
            }
        }
        return null;
    }
    const editedObject = _select(boxes);
    if (!ctrl) data.ui.selection = [];
    if (editedObject) {
        if (ctrl && data.ui.selection.includes(editedObject))
            data.ui.selection = data.ui.selection.filter(obj => obj != editedObject);
        else
            data.ui.selection.push(editedObject);
    }
    if (data.ui.selection.length > 0) {
        data.ui.right = RightState.Editing;
    }
    else {
        data.ui.right = RightState.Default;
    }
}
export default function render(seconds: number) {
    if (!canvas || !data.ui) return;
    if (data.ui.main == MainState.Editing) {
        renderEditorUI(seconds);
    }
    else {
        renderChart(seconds);
    }
}
function renderEditorUI(seconds: number) {
    const { chartPackage, resourcePackage, chartSettings } = data;
    if (!chartPackage || !resourcePackage) return;
    const { chart } = chartPackage;
    chart.highlightNotes();
    seconds -= chart.META.offset / 1000;
    const ctx = getContext(canvas);
    ctx.reset();
    ctx.fillStyle = colorToString(backgroundColor);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 1;
    const offsetY = data.ui.pxPerSecond * seconds;
    function _position(s: number) {
        return bottom - (s * data.ui.pxPerSecond - offsetY);
    }
    // axisX: 第0拍的横线位置
    // axisY: X坐标为0的竖线位置
    // spaceX: 相邻两拍的间隔
    // spaceY: 相邻两条竖线的间隔
    const axisY = left1 + (right1 - left1) / 2;
    const spaceY = data.ui.trackSpace / canvas.width * width;
    const axisX = _position(beatsToSeconds(chart.BPMList, [0, 0, 1]));
    const spaceX = axisX - _position(beatsToSeconds(chart.BPMList, [1, 0, 1]));
    [_axisX, _axisY, _spaceX, _spaceY] = [axisX, axisY, spaceX, spaceY];

    function drawGrid() {
        if (!chartPackage || !resourcePackage) return;
        ctx.fillStyle = "white";
        ctx.font = "20px PhiFont";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let beats = 0;
        for (let i = axisX; i >= top; i -= spaceX) {
            for (let j = 0; j < data.ui.segmentsPerBeat; j++) {
                const pos = i - spaceX / data.ui.segmentsPerBeat * j;
                if (j == 0) {
                    ctx.strokeStyle = ctx.fillStyle = colorToString(horzionalMainLineColor);
                    ctx.fillText(beats.toString(), (left2 + right1) / 2, pos);
                }
                else {
                    ctx.strokeStyle = ctx.fillStyle = colorToString(horzionalLineColor);
                    ctx.fillText(j.toString(), (left2 + right1) / 2, pos);
                }
                drawLine(ctx, left1, pos, right1, pos);
                drawLine(ctx, left2, pos, right2, pos);
            }
            beats++;
        }
        ctx.strokeStyle = colorToString(verticalMainLineColor);
        drawLine(ctx, axisY, top, axisY, bottom);
        ctx.strokeStyle = colorToString(verticalLineColor);
        for (let i = axisY + spaceY; i <= right1; i += spaceY) {
            drawLine(ctx, i, top, i, bottom);
        }
        for (let i = axisY - spaceY; i >= left1; i -= spaceY) {
            drawLine(ctx, i, top, i, bottom);
        }
        ctx.strokeStyle = colorToString(verticalMainLineColor);
        for (let i = 1; i < 5; i++) {
            drawLine(ctx, width * i / 5 + left2, top, width * i / 5 + left2, bottom);
        }
        ctx.strokeStyle = colorToString(judgeLineColor);
        ctx.strokeRect(left1, top, width, height);
        ctx.strokeRect(left2, top, width, height);
    }
    const judgeLine = chart.judgeLineList[data.ui.currentJudgeLineNumber];
    const eventLayer = judgeLine.eventLayers[data.ui.currentEventLayerNumber];
    function drawNotes() {
        if (!chartPackage || !resourcePackage) return [];
        const noteBoxes: Box<Note>[] = [];
        for (const note of judgeLine.notes) {
            if (note._willBeDeleted) judgeLine.notes = judgeLine.notes.filter(x => x != note);
            const { startSeconds: noteStartSeconds, endSeconds: noteEndSeconds } = note.caculateSeconds(chart.BPMList);
            if (seconds >= noteStartSeconds && note.hitSeconds == undefined && !note.isFake) {
                note.hitSeconds = noteStartSeconds; // You should use this instead of that ↓
                // note.hitSeconds = seconds; // If you use this, Mr.Autoplay may be good or bad
                resourcePackage.playSound(note.type);
            }
            if (note.hitSeconds && seconds < note.hitSeconds) {
                note.hitSeconds = undefined;
            }
            // ctx.globalAlpha = note.alpha / 255;
            if (note.type == NoteType.Hold) {
                const noteX = note.positionX * (width / chartSettings.viewWidth) + left1 + width / 2;
                const noteStartY = _position(noteStartSeconds);
                const noteEndY = _position(noteEndSeconds);
                const noteWidth = (() => {
                    let size = width / chartSettings.viewWidth * chartSettings.noteSize * note.size;
                    if (note.highlight) size *= resourcePackage.holdHLBody.width / resourcePackage.holdBody.width;
                    return size;
                })()
                const noteHeight = noteStartY - noteEndY;
                const { head, body, end } = resourcePackage.getSkin(note.type, note.highlight);
                const noteHeadHeight = head.height / body.width * noteWidth;
                const noteEndHeight = end.height / body.width * noteWidth;
                ctx.drawImage(head, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
                ctx.drawImage(body, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
                ctx.drawImage(end, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
                if (data.ui.selection.includes(note)) {
                    ctx.fillStyle = colorToString([selectionColor[0], selectionColor[1], selectionColor[2], 0.6]);
                    ctx.fillRect(noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight + noteHeight + noteHeadHeight);
                }
                noteBoxes.push(new Box(
                    noteEndY - selectPadding,
                    noteStartY + selectPadding,
                    noteX - noteWidth / 2 - selectPadding,
                    noteX + noteWidth / 2 + selectPadding,
                    note
                ));
            }
            else {
                const noteImage = resourcePackage.getSkin(note.type, note.highlight);
                const baseSize = width / chartSettings.viewWidth * chartSettings.noteSize;
                const noteWidth = (() => {
                    let size = baseSize * note.size;
                    if (note.highlight) {
                        size *= (() => {
                            switch (note.type) {
                                case NoteType.Drag: return resourcePackage.dragHL.width / resourcePackage.drag.width;
                                case NoteType.Flick: return resourcePackage.flickHL.width / resourcePackage.flick.width;
                                default: return resourcePackage.tapHL.width / resourcePackage.tap.width;
                            }
                        })();
                    }
                    return size;
                })();
                const noteHeight = noteImage.height / noteImage.width * baseSize;
                //const noteHeight = noteImage.height / noteImage.width * noteWidth;
                const noteX = note.positionX * (width / chartSettings.viewWidth) + left1 + width / 2;
                const noteY = _position(noteStartSeconds);
                ctx.drawImage(noteImage, noteX - noteWidth / 2, noteY - noteHeight / 2, noteWidth, noteHeight);
                if (data.ui.selection.includes(note)) {
                    ctx.fillStyle = colorToString([selectionColor[0], selectionColor[1], selectionColor[2], 0.6]);
                    ctx.fillRect(noteX - noteWidth / 2, noteY - noteHeight / 2, noteWidth, noteHeight);
                }
                const box = new Box(
                    noteY - selectPadding,
                    noteY + selectPadding,
                    noteX - noteWidth / 2 - selectPadding,
                    noteX + noteWidth / 2 + selectPadding,
                    note
                );
                noteBoxes.push(box);
            }
        }
        return noteBoxes;
    }
    function drawEvents<T extends Exclude<ObjectCanBeEdited, Note>>(events: T[], column: 0 | 1 | 2 | 3 | 4) {
        if (!chartPackage || !resourcePackage) return [];
        const eventWidth = width / 5 - 2 * eventSpace;
        const boxes: Box<T>[] = [];
        for (const event of events) {
            if (event._willBeDeleted) events = events.filter(x => x != event);
            if (data.ui.selection.includes(event))
                ctx.fillStyle = colorToString(selectionColor);
            else
                ctx.fillStyle = "#fff";
            const { startSeconds, endSeconds } = event.caculateSeconds(chart.BPMList);
            const eventStartY = _position(startSeconds);
            const eventEndY = _position(endSeconds);
            const eventHeight = eventStartY - eventEndY;
            ctx.fillRect(width * column / 5 + eventSpace + left2, eventEndY, eventWidth, eventHeight);
            const box = new Box(
                eventEndY,
                eventStartY,
                width * column / 5 + eventSpace + left2,
                width * (column + 1) / 5 - eventSpace + left2,
                event
            );
            boxes.push(box);
        }
        return boxes;
    }
    drawGrid();
    boxes = [
        ...drawNotes(),
        ...drawEvents(eventLayer.moveXEvents, 0),
        ...drawEvents(eventLayer.moveYEvents, 1),
        ...drawEvents(eventLayer.rotateEvents, 2),
        ...drawEvents(eventLayer.alphaEvents, 3),
        ...drawEvents(eventLayer.speedEvents, 4)
    ]
    /*
    data.ui.attatch = (x, y) => {
        if (x >= left1 && x <= right1 && y > top && y <= bottom) {
            
        }
        else if (x >= left2 && x <= right2 && y > top && y <= bottom) {

        }
        else {
            return null;
        }
    }
        */
}
function renderChart(seconds: number) {
    const { chartPackage, resourcePackage, chartSettings } = data;
    if (!chartPackage || !resourcePackage) return;
    const { chart, background, textures } = chartPackage;
    const ctx = getContext(canvas);
    seconds -= chart.META.offset / 1000;
    ctx.reset();
    drawBackground();
    drawJudgeLines();
    chart.highlightNotes();
    drawNotes();

    ///////////////////////////////////////////////////////////

    function drawBackground() {
        const ctx = getContext(canvas);
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
        ctx.fillStyle = "black";
        ctx.globalAlpha = chartSettings.backgroundDarkness / 100;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    function drawJudgeLines() {
        const taskQueue = new TaskQueue<void>();
        chart.judgeLineList.forEach((judgeLine, i) => taskQueue.addTask(() => {
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
            const radians = convertDegreesToRadians(angle);
            ctx.save();
            ctx.translate(convertXToCanvas(x), convertYToCanvas(y));
            ctx.rotate(radians);
            ctx.scale(scaleX, scaleY);
            ctx.globalAlpha = alpha / 255;
            if (judgeLine.Texture in textures) {
                const image = textures[judgeLine.Texture];
                ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
            }
            else if (text == undefined) {
                ctx.lineWidth = chartSettings.lineWidth;
                ctx.strokeStyle = colorToString(color);
                drawLine(ctx, -chartSettings.lineLength, 0, chartSettings.lineLength, 0);
            }
            else {
                ctx.font = chartSettings.textSize + "px PhiFont";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = colorToString(color);
                ctx.fillText(text, 0, 0);
            }
            ctx.restore();
        }, judgeLine.zOrder));
        taskQueue.run();
    }
    function getJudgeLineInfo(lineNumber: number, seconds: number, {
        getX = false, getY = false, getAngle = false, getAlpha = false, getSpeed = false,
        getScaleX = false, getScaleY = false, getColor = false, getPaint = false, getText = false
    } = {
            getX: true, getY: true, getAngle: true, getAlpha: true, getSpeed: true,
            getScaleX: true, getScaleY: true, getColor: true, getPaint: true, getText: true
        }, visited: number[] = []) {
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
            const { x: newX, y: newY } = moveAndRotate(fatherX, fatherY, fatherAngle, x, y);
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
    /**
     * interpolateColorEventValue和interpolateTextValue都要用这个函数
     */
    function interpolateNumberEventValue(event: NumberEvent | null, seconds: number) {
        const { startSeconds = 0, endSeconds = 0 } = event?.caculateSeconds(chart.BPMList) ?? {};
        const { bezier = false, bezierPoints = [0, 0, 1, 1], start = 0, end = 0, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1 } = event ?? {};
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
    // 线变绿色：获取判定线属性时误将getColor设置为false时的默认颜色
    // 线变白色：没有颜色事件时的默认颜色（正常现象，可改为以good/bad/miss个数动态设置颜色）
    // 线变蓝色：创建事件start/end值设置错误，未覆盖掉默认值
    function interpolateColorEventValue(event: ColorEvent | null, seconds: number): RGBcolor {
        const { endSeconds = 0 } = event?.caculateSeconds(chart.BPMList) ?? {};
        const { start = [255, 255, 255], end = [255, 255, 255], easingType = EasingType.Linear, easingLeft = 0, easingRight = 1 } = event ?? {};
        function _interpolate(part: 0 | 1 | 2) {
            if (!event) return 127;
            const e = new NumberEvent({
                start: start[part],
                end: end[part],
                easingType,
                easingLeft,
                easingRight,
                startTime: event.startTime,
                endTime: event.endTime
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
    function interpolateTextEventValue(event: TextEvent | null, seconds: number) {
        const { /*startSeconds = 0,*/ endSeconds = 0 } = event?.caculateSeconds(chart.BPMList) ?? {};
        const { start = undefined, end = undefined/*, easingType = EasingType.Linear, easingLeft = 0, easingRight = 1*/ } = event ?? {};
        if (endSeconds <= seconds) {
            return end;
        } else {
            if (start == undefined || end == undefined || event == null) return undefined;
            if (start.startsWith(end) || end.startsWith(start)) {
                const lengthStart = start.length;
                const lengthEnd = end.length;
                const e = new NumberEvent({
                    startTime: event.startTime,
                    endTime: event.endTime,
                    easingType: event.easingType,
                    easingLeft: event.easingLeft,
                    easingRight: event.easingRight,
                    bezier: event.bezier,
                    bezierPoints: event.bezierPoints,
                    start: lengthStart,
                    end: lengthEnd
                });
                const length = Math.round(interpolateNumberEventValue(e, seconds));
                return start.length > end.length ? start.slice(0, length) : end.slice(0, length);
            }
            return start;
        }
    }

    function findLastEvent<T extends BaseEvent<unknown>>(events: T[], seconds: number) {
        let lastEvent: T | null = null;
        let smallestDifference = Infinity;
        events.forEach(event => {
            const { startSeconds } = event.caculateSeconds(chart.BPMList);
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
    function drawNotes() {
        if (!chartPackage || !resourcePackage) return;
        const taskQueue = new TaskQueue<void>();
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
                if (note._willBeDeleted) judgeLine.notes = judgeLine.notes.filter(x => x != note);
                const noteInfo = getNoteInfo(judgeLineNumber, noteNumber, seconds, judgeLineInfo);
                const radians = convertDegreesToRadians(noteInfo.angle);
                const missSeconds = note.type == NoteType.Tap ? Note.TAP_BAD : note.type == NoteType.Hold ? Note.HOLD_BAD : Note.DRAGFLICK_PERFECT;
                if (seconds >= noteInfo.startSeconds && note.hitSeconds == undefined && !note.isFake) {
                    note.hitSeconds = noteInfo.startSeconds; // You should use this instead of that ↓
                    // note.hitSeconds = seconds; // If you use this, Mr.Autoplay may be good or bad
                    resourcePackage.playSound(note.type);
                }
                if (note.hitSeconds && seconds < note.hitSeconds) {
                    note.hitSeconds = undefined;
                }
                if (!note.isFake && note.hitSeconds && seconds < (() => {
                    if (note.type == NoteType.Hold)
                        return Math.floor((noteInfo.endSeconds - note.hitSeconds) / resourcePackage.hitFxFrequency)
                            * resourcePackage.hitFxFrequency + note.hitSeconds;
                    else
                        return noteInfo.endSeconds;
                })() + resourcePackage.hitFxDuration) {
                    const hitSeconds = note.hitSeconds;
                    taskQueue.addTask(() => {
                        ctx.globalAlpha = 1;
                        const { x, y, angle } = getJudgeLineInfo(judgeLineNumber, hitSeconds, {
                            getX: true,
                            getY: true,
                            getAngle: true
                        });
                        function _showPerfectHitFx(frameNumber: number, x: number, y: number, angle: number) {
                            if (!chartPackage || !resourcePackage) return;
                            const frame = resourcePackage.perfectHitFxFrames[frameNumber];
                            const noteHittedPosition = moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                            const canvasX = convertXToCanvas(noteHittedPosition.x);
                            const canvasY = convertYToCanvas(noteHittedPosition.y);
                            const radians = convertDegreesToRadians(angle);
                            ctx.translate(canvasX, canvasY);
                            if (resourcePackage.hitFxRotate) ctx.rotate(radians);
                            ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                            ctx.resetTransform();
                        }
                        function _showGoodHitFx(frameNumber: number, x: number, y: number, angle: number) {
                            if (!chartPackage || !resourcePackage) return;
                            const frame = resourcePackage.goodHitFxFrames[frameNumber];
                            const noteHittedPosition = moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                            const canvasX = convertXToCanvas(noteHittedPosition.x);
                            const canvasY = convertYToCanvas(noteHittedPosition.y);
                            const radians = convertDegreesToRadians(angle);
                            ctx.translate(canvasX, canvasY);
                            if (resourcePackage.hitFxRotate) ctx.rotate(radians);
                            ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
                            ctx.resetTransform();
                        }
                        if (note.getJudgement(chart.BPMList) == 'perfect') {
                            if (note.type == NoteType.Hold) {
                                for (let s = hitSeconds; s <= seconds && s < noteInfo.endSeconds; s += resourcePackage.hitFxFrequency) {
                                    const { x, y, angle } = getJudgeLineInfo(judgeLineNumber, s, {
                                        getX: true,
                                        getY: true,
                                        getAngle: true
                                    });
                                    const frameNumber = Math.floor(
                                        (seconds - s)
                                        / resourcePackage.hitFxDuration
                                        * resourcePackage.perfectHitFxFrames.length
                                    );
                                    if (frameNumber < resourcePackage.perfectHitFxFrames.length)
                                        _showPerfectHitFx(frameNumber, x, y, angle);
                                }
                            }
                            else {
                                const frameNumber = Math.floor(
                                    (seconds - hitSeconds)
                                    / resourcePackage.hitFxDuration
                                    * resourcePackage.perfectHitFxFrames.length
                                )
                                _showPerfectHitFx(frameNumber, x, y, angle);
                            }
                        }
                        if (note.getJudgement(chart.BPMList) == 'good') {
                            if (note.type == NoteType.Hold) {
                                for (let s = hitSeconds; s <= seconds && s < noteInfo.endSeconds; s += resourcePackage.hitFxFrequency) {
                                    const { x, y, angle } = getJudgeLineInfo(judgeLineNumber, s, {
                                        getX: true,
                                        getY: true,
                                        getAngle: true
                                    });
                                    const frameNumber = Math.floor(
                                        (seconds - s)
                                        / resourcePackage.hitFxDuration
                                        * resourcePackage.goodHitFxFrames.length
                                    );
                                    if (frameNumber < resourcePackage.goodHitFxFrames.length)
                                        _showGoodHitFx(frameNumber, x, y, angle);
                                }
                            }
                            else {
                                const frameNumber = Math.floor(
                                    (seconds - hitSeconds)
                                    / resourcePackage.hitFxDuration
                                    * resourcePackage.goodHitFxFrames.length
                                )
                                _showGoodHitFx(frameNumber, x, y, angle);
                            }
                        }
                    }, 5);
                }
                if (seconds >= noteInfo.endSeconds && note.hitSeconds) continue; // 已经打了
                if (noteInfo.isCovered) continue; // note在线下面
                if (noteInfo.startSeconds - seconds > note.visibleTime) continue; // note不在可见时间内
                if (judgeLineInfo.alpha < 0) continue; // 线的透明度是负数把note给隐藏了

                if (note.type == NoteType.Hold) {
                    if (seconds >= noteInfo.endSeconds) continue;
                    taskQueue.addTask(() => {
                        ctx.globalAlpha = note.alpha / 255;
                        // 以判定线为坐标系
                        ctx.save();
                        ctx.translate(convertXToCanvas(judgeLineInfo.x), convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        if (noteInfo.startPositionY > noteInfo.endPositionY) {
                            ctx.scale(1, -1);
                            noteInfo.startPositionY = -noteInfo.startPositionY;
                            noteInfo.endPositionY = -noteInfo.endPositionY;
                            /*
                            startPositionY ==> sy
                            endPositionY ==> ey
                            positionX ==> x
                            以下是一个例子，A是正打，B是倒打
                            左列是不反转的Y坐标
                            右列是反转后的Y坐标
                            判定线上的是X坐标
                            +6   _____               -6
                            +5  /     \  A.x  = -6   -5
                            +4  |  A  |  A.sy = 2    -4
                            +3  |     |  A.ey = 5    -3
                            +2  \_____/  A.sy < A.ey -2
                            +1                       -1
                            0y----x6543210123456x----y0
                            -1               _____   +1
                            -2  B.x  = 6    /     \  +2
                            -3  B.sy = -2   |  B  |  +3
                            -4  B.ey = -5   |     |  +4
                            -5  B.sy > B.ey \_____/  +5
     
                            上下翻转之后，y坐标再变相反数，可以正确显示倒打长条
                            */
                        }
                        const noteHeight = noteInfo.endPositionY - noteInfo.startPositionY;
                        const holdHead = note.highlight ? resourcePackage.holdHLHead : resourcePackage.holdHead;
                        const holdBody = note.highlight ? resourcePackage.holdHLBody : resourcePackage.holdBody;
                        const holdEnd = note.highlight ? resourcePackage.holdHLEnd : resourcePackage.holdEnd;
                        const noteWidth = note.highlight ?
                            note.size * chartSettings.noteSize * (resourcePackage.holdHLBody.width / resourcePackage.holdBody.width) :
                            note.size * chartSettings.noteSize;
                        const noteHeadHeight = holdHead.height / holdBody.width * noteWidth;
                        const noteEndHeight = holdEnd.height / holdBody.width * noteWidth;
                        // 显示主体
                        if (resourcePackage.holdRepeat) {
                            const step = holdBody.height / holdBody.width * noteWidth;
                            for (let i = noteHeight; i >= 0; i -= step) {
                                if (i < step) {
                                    ctx.drawImage(holdBody,
                                        0, 0, holdBody.width, holdBody.height * (i / step),
                                        note.positionX - noteWidth / 2, -noteInfo.startPositionY - i, noteWidth, i);
                                }
                                else {
                                    ctx.drawImage(holdBody, note.positionX - noteWidth / 2, -noteInfo.startPositionY - i, noteWidth, step);
                                }
                            }
                        }
                        else {
                            ctx.drawImage(holdBody, note.positionX - noteWidth / 2, -noteInfo.startPositionY - noteHeight, noteWidth, noteHeight);
                        }
                        // 显示头部
                        if (seconds < noteInfo.startSeconds || resourcePackage.holdKeepHead) {
                            ctx.drawImage(holdHead, note.positionX - noteWidth / 2, -noteInfo.startPositionY, noteWidth, noteHeadHeight);
                        }
                        // 显示尾部
                        ctx.drawImage(holdEnd, note.positionX - noteWidth / 2, -noteInfo.endPositionY - noteEndHeight, noteWidth, noteEndHeight);

                        ctx.restore();
                    }, 1);
                }
                else {
                    taskQueue.addTask(() => {
                        ctx.globalAlpha = note.alpha / 255;
                        if (seconds >= noteInfo.startSeconds) {
                            ctx.globalAlpha = Math.max(0, 1 - (seconds - noteInfo.startSeconds) / missSeconds);
                        }
                        const noteImage = (() => {
                            switch (note.type) {
                                case NoteType.Flick:
                                    if (note.highlight)
                                        return resourcePackage.flickHL;
                                    else
                                        return resourcePackage.flick;
                                case NoteType.Drag:
                                    if (note.highlight)
                                        return resourcePackage.dragHL;
                                    else
                                        return resourcePackage.drag;
                                default:
                                    if (note.highlight)
                                        return resourcePackage.tapHL;
                                    else
                                        return resourcePackage.tap;
                            }
                        })();
                        const noteWidth = (() => {
                            let size = note.size * chartSettings.noteSize;
                            if (note.highlight) {
                                size *= (() => {
                                    switch (note.type) {
                                        case NoteType.Drag: return resourcePackage.dragHL.width / resourcePackage.drag.width;
                                        case NoteType.Flick: return resourcePackage.flickHL.width / resourcePackage.flick.width;
                                        default: return resourcePackage.tapHL.width / resourcePackage.tap.width;
                                    }
                                })();
                            }
                            return size;
                        })();
                        const noteHeight = noteImage.height / noteImage.width * chartSettings.noteSize;
                        //const noteHeight = noteImage.height / noteImage.width * noteWidth;
                        ctx.save();
                        ctx.translate(convertXToCanvas(judgeLineInfo.x), convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        ctx.drawImage(noteImage,
                            0, 0, noteImage.width, noteImage.height,
                            note.positionX - noteWidth / 2, -noteInfo.startPositionY - noteHeight / 2, noteWidth, noteHeight);
                        ctx.restore();
                    }, note.type == NoteType.Drag ? 2 : note.type == NoteType.Tap ? 3 : 4);
                }
            }
        }
        // 叠放顺序从下到上： Hold < Drag < Tap < Flick < 打击特效
        taskQueue.run();
    }
    function getNoteInfo(lineNumber: number, noteNumber: number, seconds: number, judgeLineInfo: { x: number, y: number, angle: number }) {
        const judgeLine = chart.judgeLineList[lineNumber];
        const note = judgeLine.notes[noteNumber];
        const { startSeconds: noteStartSeconds, endSeconds: noteEndSeconds } = note.caculateSeconds(chart.BPMList);
        const { angle: lineAngle } = judgeLineInfo;
        const { above, speed, yOffset, type } = note;
        let startPositionY = 0, endPositionY = 0;
        for (const eventLayer of judgeLine.eventLayers) {
            const speedEvents = eventLayer.speedEvents.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
            for (let i = 0; i < speedEvents.length; i++) {
                const current = speedEvents[i];
                const next = speedEvents[i + 1];
                const { startSeconds: currentStartSeconds, endSeconds: currentEndSeconds } = current.caculateSeconds(chart.BPMList);
                const currentStart = current.start;
                const currentEnd = current.end;
                const nextStartSeconds = (() => {
                    if (i < speedEvents.length - 1)
                        return next.caculateSeconds(chart.BPMList).startSeconds;
                    else
                        return Infinity;
                })();
                const
                    l1 = Math.min(seconds, noteStartSeconds), l2 = Math.min(seconds, noteEndSeconds),
                    r1 = Math.max(seconds, noteStartSeconds), r2 = Math.max(seconds, noteEndSeconds);

                if (currentStartSeconds <= l2 && l2 <= currentEndSeconds && currentEndSeconds <= r2) {
                    const h = currentEndSeconds - l2;
                    const a = interpolateNumberEventValue(current, l2);
                    const b = currentEnd;
                    endPositionY += (a + b) * h / 2;
                }
                else if (l2 <= currentStartSeconds && currentStartSeconds <= r2 && r2 <= currentEndSeconds) {
                    const h = r2 - currentStartSeconds;
                    const a = currentStart;
                    const b = interpolateNumberEventValue(current, r2);
                    endPositionY += (a + b) * h / 2;
                }
                else if (l2 <= currentStartSeconds && currentEndSeconds <= r2) {
                    const h = currentEndSeconds - currentStartSeconds;
                    const a = currentStart;
                    const b = currentEnd;
                    endPositionY += (a + b) * h / 2;
                }
                else if (currentStartSeconds <= l2 && r2 <= currentEndSeconds) {
                    const h = r2 - l2;
                    const a = interpolateNumberEventValue(current, l2);
                    const b = interpolateNumberEventValue(current, r2);
                    endPositionY += (a + b) * h / 2;
                }

                if (currentEndSeconds <= l2 && l2 <= nextStartSeconds && nextStartSeconds <= r2) {
                    const h = nextStartSeconds - l2;
                    const a = currentEnd;
                    endPositionY += a * h;
                }
                else if (l2 <= currentEndSeconds && nextStartSeconds <= r2) {
                    const h = nextStartSeconds - currentEndSeconds;
                    const a = currentEnd;
                    endPositionY += a * h;
                }
                else if (l2 <= currentEndSeconds && currentEndSeconds <= r2 && r2 <= nextStartSeconds) {
                    const h = r2 - currentEndSeconds;
                    const a = currentEnd;
                    endPositionY += a * h;
                }
                else if (currentEndSeconds <= l2 && r2 <= nextStartSeconds) {
                    const h = r2 - l2;
                    const a = currentEnd;
                    endPositionY += a * h;
                }
                if (type == 2 && noteStartSeconds < seconds) {
                    continue;
                }
                if (currentStartSeconds <= l1 && l1 <= currentEndSeconds && currentEndSeconds <= r1) {
                    const h = currentEndSeconds - l1;
                    const a = interpolateNumberEventValue(current, l1);
                    const b = currentEnd;
                    startPositionY += (a + b) * h / 2;
                }
                else if (l1 <= currentStartSeconds && currentStartSeconds <= r1 && r1 <= currentEndSeconds) {
                    const h = r1 - currentStartSeconds;
                    const a = currentStart;
                    const b = interpolateNumberEventValue(current, r1);
                    startPositionY += (a + b) * h / 2;
                }
                else if (l1 <= currentStartSeconds && currentEndSeconds <= r1) {
                    const h = currentEndSeconds - currentStartSeconds;
                    const a = currentStart;
                    const b = currentEnd;
                    startPositionY += (a + b) * h / 2;
                }
                else if (currentStartSeconds <= l1 && r1 <= currentEndSeconds) {
                    const h = r1 - l1;
                    const a = interpolateNumberEventValue(current, l1);
                    const b = interpolateNumberEventValue(current, r1);
                    startPositionY += (a + b) * h / 2;
                }

                if (currentEndSeconds <= l1 && l1 <= nextStartSeconds && nextStartSeconds <= r1) {
                    const h = nextStartSeconds - l1;
                    const a = currentEnd;
                    startPositionY += a * h;
                }
                else if (l1 <= currentEndSeconds && nextStartSeconds <= r1) {
                    const h = nextStartSeconds - currentEndSeconds;
                    const a = currentEnd;
                    startPositionY += a * h;
                }
                else if (l1 <= currentEndSeconds && currentEndSeconds <= r1 && r1 <= nextStartSeconds) {
                    const h = r1 - currentEndSeconds;
                    const a = currentEnd;
                    startPositionY += a * h;
                }
                else if (currentEndSeconds <= l1 && r1 <= nextStartSeconds) {
                    const h = r1 - l1;
                    const a = currentEnd;
                    startPositionY += a * h;
                }
            }
        }
        startPositionY *= chartSettings.chartSpeed;
        endPositionY *= chartSettings.chartSpeed;
        if (seconds >= noteStartSeconds) startPositionY = -startPositionY;// 已经过了那个时间就求相反数
        if (seconds >= noteEndSeconds) endPositionY = -endPositionY;
        const isCovered = endPositionY < 0 && judgeLine.isCover && seconds < noteEndSeconds;
        startPositionY = startPositionY * speed * (above ? 1 : -1) + yOffset;
        endPositionY = endPositionY * speed * (above ? 1 : -1) + yOffset;
        return {
            angle: lineAngle, startSeconds: noteStartSeconds, endSeconds: noteEndSeconds,
            startPositionY, endPositionY, isCovered
        };
    }
}

/**
 * 根据谱面坐标系中的X坐标计算Canvas坐标系中的X坐标。
 */
function convertXToCanvas(x: number) {
    return x + (data.chartSettings.viewWidth / 2);
}
/**
 * 根据谱面坐标系中的Y坐标计算Canvas坐标系中的Y坐标。
 */
function convertYToCanvas(y: number) {
    return (data.chartSettings.viewHeight / 2) - y;
}