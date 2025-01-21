import { getBeatsValue } from "./classes/beats";
import { Box } from "./classes/box";
import { CanvasState, Editor, RightState } from "./classes/editor";
import { Note, NoteAbove, NoteType } from "./classes/note";
import { NumberEvent } from "./classes/event";
import { floor, round } from "lodash";
import { Chart } from "./classes/chart";
import { Cache } from "./store";
export default class EventListener {
    canvas: HTMLCanvasElement;
    editor: Editor;
    audio: HTMLAudioElement;
    canvasOuterWidth = 0;
    canvasOuterHeight = 0;
    isAddingHold = false;
    isDragging = false;
    chart: Chart;
    cache: Cache;
    constructor(options: {
        editor: Editor,
        chart: Chart,
        canvas: HTMLCanvasElement,
        audio: HTMLAudioElement,
        cache: Cache
    }) {
        this.canvas = options.canvas;
        this.editor = options.editor;
        this.chart = options.chart;
        this.audio = options.audio;
        this.cache = options.cache;
        this.windowResize();
    }
    pressSpace() {
        if (this.audio.paused) {
            this.audio.play();
        }
        else {
            this.audio.pause();
        }
    }
    pressEscape() {
        this.editor.selection = [];
        this.editor.rightState = RightState.Default;
    }
    pressDelete() {
        this.editor.selection.forEach(x => x.delete());
        this.editor.selection = [];
    }
    wheel(e: WheelEvent) {
        this.audio.currentTime += e.deltaY * this.editor.wheelSpeed * -0.005;
    }
    mouseUp() {
        if (this.isAddingHold) {
            this.isAddingHold = false;
            const obj = this.editor.selection[0];
            if (getBeatsValue(obj.startTime) > getBeatsValue(obj.endTime)) {
                // 避免开始时间大于结束时间
                [obj.startTime, obj.endTime] = [obj.endTime, obj.startTime]
            }
            else if (getBeatsValue(obj.startTime) == getBeatsValue(obj.endTime)) {
                this.editor.selection[0].delete();
            }
        }
        if (this.isDragging) {
            this.isDragging = false;
        }
    }
    mouseMove(e: MouseEvent) {
        const seconds = this.audio.currentTime - this.chart.META.offset / 1000;
        const { altKey: alt } = e;
        const { x, y } = this.getClickedPosition(e);
        if (this.isAddingHold) {
            this.editor.selection[0].endTime = this.editor.attatch(this.chart.BPMList, seconds, y);
        }
        else if (this.isDragging) {
            if (alt) {
                this.editor.selection[0].endTime = this.editor.attatch(this.chart.BPMList, seconds, y);
            }
            else {
                this.editor.selection[0].startTime = this.editor.attatch(this.chart.BPMList, seconds, y);
            }
            if (this.editor.selection[0] instanceof Note) {
                const positionX = round((x - this.editor.notesViewBox.middleX) / this.editor.verticalLineSpace) * this.canvas.width / (this.editor.verticalLineCount - 1);
                this.editor.selection[0].positionX = positionX;
            }
        }
        this.editor.mouseX = x;
        this.editor.mouseY = y;
    }
    mouseDown(e: MouseEvent) {
        if (this.editor.canvasState == CanvasState.Editing) {
            switch (e.button) {
                case 0:
                    this.leftClick(e);
                    return;
                case 2:
                    this.rightClick(e);
                    return;
            }
        }
    }
    windowResize() {
        const canvas = this.canvas;
        const rect = canvas.getBoundingClientRect();
        this.canvasOuterWidth = rect.width;
        this.canvasOuterHeight = rect.height;
    }
    private rightClick(e: MouseEvent) {
        const seconds = this.audio.currentTime - this.chart.META.offset / 1000;
        const { x, y } = this.getClickedPosition(e);
        const judgeLine = this.chart.judgeLineList[this.editor.currentJudgeLineNumber];
        if (this.editor.notesViewBox.touch(x, y)) {
            const time = this.editor.attatch(this.chart.BPMList, seconds, y);
            const positionX = round((x - this.editor.notesViewBox.middleX) / this.editor.verticalLineSpace) * this.canvas.width / (this.editor.verticalLineCount - 1);
            const addedNote = new Note({
                startTime: time,
                endTime: time,
                positionX,
                type: this.editor.currentNoteType,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: 0,
                above: NoteAbove.Above
            });
            judgeLine.notes.push(addedNote);
            this.editor.selection = [addedNote];
            this.editor.rightState = RightState.Editing;
            if (this.editor.currentNoteType == NoteType.Hold) this.isAddingHold = true;
        }
        else if (this.editor.eventsViewBox.touch(x, y)) {
            const eventLayer = judgeLine.eventLayers[this.editor.currentEventLayerNumber];
            const time = this.editor.attatch(this.chart.BPMList, seconds, y);
            const track = floor((x - this.editor.eventsViewBox.left) / (this.editor.eventsViewBox.right - this.editor.eventsViewBox.left) * 5);
            switch (track) {
                case 0: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, 'moveX');
                    eventLayer.moveXEvents.push(addedEvent);
                    this.editor.selection = [addedEvent];
                    break;
                }
                case 1: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, 'moveY');
                    eventLayer.moveYEvents.push(addedEvent);
                    this.editor.selection = [addedEvent];
                    break;
                }
                case 2: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, 'rotate');
                    eventLayer.rotateEvents.push(addedEvent);
                    this.editor.selection = [addedEvent];
                    break;
                }
                case 3: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, 'alpha');
                    eventLayer.alphaEvents.push(addedEvent);
                    this.editor.selection = [addedEvent];
                    break;
                }
                case 4: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, 'speed');
                    eventLayer.speedEvents.push(addedEvent);
                    this.editor.selection = [addedEvent];
                    break;
                }
            }
            this.editor.rightState = RightState.Editing;
            this.isAddingHold = true;
        }
    }

    private leftClick(e: MouseEvent) {
        const { x, y } = this.getClickedPosition(e);
        const { ctrlKey: ctrl } = e;
        function _select<T>(boxes: Box<T>[]) {
            for (const box of boxes) {
                if (box.touch(x, y)) {
                    return box.data;
                }
            }
            return null;
        }
        const selectedObject = _select(this.cache.boxes);
        if (selectedObject == this.editor.selection[0] && selectedObject != null) {
            this.isDragging = true;
        }
        if (!ctrl) this.editor.selection = [];
        if (selectedObject) {
            if (ctrl && this.editor.selection.includes(selectedObject))
                this.editor.selection = this.editor.selection.filter(obj => obj != selectedObject);
            else
                this.editor.selection.push(selectedObject);
        }
        if (this.editor.selection.length > 0) {
            this.editor.rightState = RightState.Editing;
        }
        else {
            this.editor.rightState = RightState.Default;
        }
    }
    private getClickedPosition({ offsetX: x, offsetY: y }: MouseEvent) {
        /** canvas的内宽度（单位为canvas绘制上下文的像素） */
        const innerWidthCanvasPixels = this.canvas.width;
        /** canvas的内高度（单位为canvas绘制上下文的像素） */
        const innerHeightCanvasPixels = this.canvas.height;
        /** canvas内部的宽高比 */
        const innerRatio = innerWidthCanvasPixels / innerHeightCanvasPixels;
        /** canvas的外宽度（单位为浏览器像素） */
        const outerWidthBrowserPixels = this.canvasOuterWidth;
        /** canvas的外高度（单位为浏览器像素） */
        const outerHeightBrowserPixels = this.canvasOuterHeight;
        /** canvas外部的宽高比 */
        const outerRatio = outerWidthBrowserPixels / outerHeightBrowserPixels;
        /** canvas的缩放比和单边边距 */
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
}