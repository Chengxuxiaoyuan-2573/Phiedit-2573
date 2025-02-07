import { ceil, floor, round } from "lodash";
import { addBeats, Beats, beatsToSeconds, getBeatsValue, secondsToBeats, subBeats } from "./classes/beats";
import { Box, BoxWithData } from "./tools/box";
import { RGBAcolor, RGBcolor } from "./tools/color";
import { NumberEvent } from "./classes/event";
import { Note, NoteAbove, NoteType } from "./classes/note";
import eventEmitter from "@/eventEmitter";
import canvasUtils from "./tools/canvasUtils";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";
import { reactive } from "vue";
import { audioRef, canvasRef } from "./store";
import math from "./tools/math";
export enum CanvasState {
    Playing, Editing
}
export enum RightState {
    Default, Settings, Editing, BPMList, Meta, JudgeLine
}
enum MouseMoveMode {
    None, AddHold, Drag, Select
}
type SelectedElement = Note | NumberEvent;
export class Editor {
    readonly chartPackage: ChartPackage
    readonly resourcePackage: ResourcePackage
    clipboard: SelectedElement[] = []
    get chart() {
        return this.chartPackage.chart;
    }
    readonly state = reactive({
        /** 主界面（canvas）的状态 */
        canvas: CanvasState.Playing,
        /** 右侧菜单栏的状态 */
        right: RightState.Default
    })
    /** 横线数 */
    horizonalLineCount = 4
    /** 竖线数，包括左右两端的竖线 */
    verticalLineCount = 21
    /** 纵向拉伸（一秒的时间在编辑器时间轴上是多少像素） */
    pxPerSecond = 300
    /** 选中的判定线号 */
    currentJudgeLineNumber = 0
    /** 选中的事件层级编号 */
    currentEventLayerNumber = 0
    /** 正在放置的note类型 */
    currentNoteType = NoteType.Tap
    /** 鼠标的x坐标 */
    mouseX = 0
    /** 鼠标的y坐标 */
    mouseY = 0
    /** 鼠标移动时做的行为 */
    mouseMoveMode = MouseMoveMode.None
    /** 缓存的note和事件的碰撞箱 */
    cachedBoxes: BoxWithData<SelectedElement>[] = []
    get currentJudgeLine() {
        return this.chart.judgeLineList[this.currentJudgeLineNumber];
    }
    get currentEventLayer() {
        return this.currentJudgeLine.eventLayers[this.currentEventLayerNumber];
    }
    readonly lineWidth = 5
    readonly horzionalMainLineColor: RGBAcolor = [255, 255, 255, 0.5] as const
    readonly horzionalLineColor: RGBAcolor = [255, 255, 255, 0.2] as const
    readonly verticalMainLineColor: RGBAcolor = [255, 255, 255, 0.5] as const
    readonly verticalLineColor: RGBAcolor = [255, 255, 255, 0.2] as const
    readonly borderColor: RGBcolor = [255, 255, 0] as const
    readonly backgroundColor: RGBcolor = [30, 30, 30] as const
    readonly selectionColor: RGBAcolor = [70, 100, 255, 0.6] as const
    readonly mainViewBox = new Box(0, 900, 0, 1350)
    readonly notesViewBox = new Box(0, 900, 50, 650)
    readonly eventsViewBox = new Box(0, 900, 700, 1300)
    readonly eventWidth = 80
    readonly selectPadding = 10
    get seconds() {
        const audio = audioRef.value;
        if (!audio) return 0;
        return audio.currentTime - this.chart.META.offset / 1000;
    }
    get verticalLineSpace() {
        return this.notesViewBox.width / (this.verticalLineCount - 1);
    }
    get offsetY() {
        return this.pxPerSecond * this.seconds;
    }
    /** 获取一个时间点在网格中的y坐标 */
    getPositionYOfSeconds(sec: number) {
        return this.notesViewBox.bottom - (sec * this.pxPerSecond - this.offsetY);
    }
    /** 把鼠标点击的x坐标吸附到离鼠标最近的竖线上并返回所代表的X坐标 */
    attatchX(x: number) {
        if (this.verticalLineCount <= 1) {
            return (x - this.notesViewBox.middleX) * this.mainViewBox.width / this.notesViewBox.width;
        }
        else {
            return round((x - this.notesViewBox.middleX) / this.verticalLineSpace) * this.mainViewBox.width / (this.verticalLineCount - 1);
        }
    }
    /** 
     * 把鼠标点击的y坐标吸附到离鼠标最近的横线上并返回所代表的拍数
     * @param {number} y 鼠标点击的y坐标
     */
    attatchY(y: number): Beats {
        const beats = this.getBeatsOfPositionY(y);

        const int = floor(beats);
        const decimal = beats - int;

        const fenzi = round(decimal * this.horizonalLineCount);
        const fenmu = this.horizonalLineCount;
        return [int, fenzi, fenmu];
    }
    /** 获取点击的位置在第几拍 */
    getBeatsOfPositionY(y: number) {
        const seconds = this.getSecondsOfPositionY(y);
        /** 点击的位置在第几拍 */
        const beats = secondsToBeats(this.chart.BPMList, seconds);
        return beats;
    }
    getSecondsOfPositionY(y: number) {
        /** 第seconds秒的时候，网格已经移动了多少像素了 */
        const offset = this.seconds * this.pxPerSecond;
        /** 点击的位置离第0拍的横线有多远 */
        const distanceToZero = offset + (this.notesViewBox.bottom - y);
        /** 点击的位置在第几秒 */
        const seconds = distanceToZero / this.pxPerSecond;
        return seconds;
    }
    switchMainState() {
        if (this.state.canvas == CanvasState.Editing) {
            this.state.canvas = CanvasState.Playing;
        }
        else {
            this.state.canvas = CanvasState.Editing;
        }
    }
    /** 存储被选中的元素 */
    selectedElements: SelectedElement[] = reactive([]);
    /** 选择框的碰撞箱，使用绝对坐标 */
    selectionBox: Box | null = null;

    selectElement(element: SelectedElement) {
        this.selectedElements.push(element);
        this.updateRightState();
    }

    deselectElement(element: SelectedElement) {
        if (!this.isSelected(element)) return;
        this.selectedElements.splice(this.selectedElements.indexOf(element), 1);
        this.updateRightState();
    }

    isSelected(element: SelectedElement): boolean {
        return this.selectedElements.includes(element);
    }

    unselectAll() {
        this.selectedElements.splice(0, this.selectedElements.length);
        this.updateRightState();
    }

    updateRightState() {
        if (this.selectedElements.length > 0) {
            this.state.right = RightState.Editing;
        } else {
            this.state.right = RightState.Default;
        }
    }
    deleteSelection() {
        this.currentJudgeLine.notes = this.currentJudgeLine.notes.filter(note => !this.isSelected(note));
        this.currentEventLayer.moveXEvents = this.currentEventLayer.moveXEvents.filter(event => !this.isSelected(event));
        this.currentEventLayer.moveYEvents = this.currentEventLayer.moveYEvents.filter(event => !this.isSelected(event));
        this.currentEventLayer.rotateEvents = this.currentEventLayer.rotateEvents.filter(event => !this.isSelected(event));
        this.currentEventLayer.alphaEvents = this.currentEventLayer.alphaEvents.filter(event => !this.isSelected(event));
        this.currentEventLayer.speedEvents = this.currentEventLayer.speedEvents.filter(event => !this.isSelected(event));
    }
    /**
     * 复制选中的元素
     */
    copy() {
        this.clipboard = [...this.selectedElements];
    }
    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste() {
        const minStartTime = this.clipboard.reduce<Beats>((min, element) => {
            return getBeatsValue(min) < getBeatsValue(element.startTime) ? min : element.startTime;
        }, [Infinity, 0, 1]);
        const mouseTime = this.attatchY(this.mouseY);
        const delta = subBeats(mouseTime, minStartTime);

        for (const element of this.clipboard) {
            if (element instanceof Note) {
                const note = element.toObject();
                note.startTime = addBeats(note.startTime, delta);
                note.endTime = addBeats(note.endTime, delta);
                this.currentJudgeLine.notes.push(new Note(note, this.chart.BPMList));
            }
            else {
                const event = element.toObject();
                event.startTime = addBeats(event.startTime, delta);
                event.endTime = addBeats(event.endTime, delta);
                switch (element.type) {
                    case 'moveX':
                        this.currentEventLayer.moveXEvents.push(new NumberEvent(event, this.chart.BPMList, 'moveX'));
                        break;
                    case 'moveY':
                        this.currentEventLayer.moveYEvents.push(new NumberEvent(event, this.chart.BPMList, 'moveY'));
                        break;
                    case 'rotate':
                        this.currentEventLayer.rotateEvents.push(new NumberEvent(event, this.chart.BPMList, 'rotate'));
                        break;
                    case 'alpha':
                        this.currentEventLayer.alphaEvents.push(new NumberEvent(event, this.chart.BPMList, 'alpha'));
                        break;
                    case 'speed':
                        this.currentEventLayer.speedEvents.push(new NumberEvent(event, this.chart.BPMList, 'speed'));
                        break;
                }
            }
        }
    }
    copyToJudgeLine(targetJudgeLineNumber: number) {
        const targetJudgeLine = this.chart.judgeLineList[targetJudgeLineNumber];
        for (const element of this.selectedElements) {
            if (element instanceof Note) {
                targetJudgeLine.notes.push(new Note(element, this.chart.BPMList));
            }
            else if (element instanceof NumberEvent) {
                switch (element.type) {
                    case 'moveX':
                        targetJudgeLine.eventLayers[0].moveXEvents.push(new NumberEvent(element, this.chart.BPMList, 'moveX'));
                        break;
                    case 'moveY':
                        targetJudgeLine.eventLayers[0].moveYEvents.push(new NumberEvent(element, this.chart.BPMList, 'moveY'));
                        break;
                    case 'rotate':
                        targetJudgeLine.eventLayers[0].rotateEvents.push(new NumberEvent(element, this.chart.BPMList, 'rotate'));
                        break;
                    case 'alpha':
                        targetJudgeLine.eventLayers[0].alphaEvents.push(new NumberEvent(element, this.chart.BPMList, 'alpha'));
                        break;
                    case 'speed':
                        targetJudgeLine.eventLayers[0].speedEvents.push(new NumberEvent(element, this.chart.BPMList, 'speed'));
                        break;
                }
            }
        }
        this.unselectAll();
    }
    changeType(type: keyof typeof NoteType) {
        this.currentNoteType = NoteType[type];
    }
    constructor(chartPackage: ChartPackage, resourcePackage: ResourcePackage) {
        this.chartPackage = chartPackage;
        this.resourcePackage = resourcePackage;
        eventEmitter.on("MOUSE_LEFT_CLICK", (x, y, options) => {
            if (this.state.canvas == CanvasState.Editing) {
                this.mouseLeft(x, y, options.ctrl);
            }
        })
        eventEmitter.on("MOUSE_RIGHT_CLICK", (x, y) => {
            if (this.state.canvas == CanvasState.Editing) {
                this.mouseRight(x, y);
            }
        })
        eventEmitter.on("MOUSE_MOVE", (x, y, options) => {
            if (this.state.canvas == CanvasState.Editing) {
                this.mouseMove(x, y, options.alt);
            }
        })
        eventEmitter.on("MOUSE_UP", () => {
            this.mouseUp();
        })
    }
    mouseUp() {
        if (this.mouseMoveMode == MouseMoveMode.AddHold) {
            const obj = this.selectedElements[0];
            obj.validateTime();
        }
        else if (this.mouseMoveMode == MouseMoveMode.Select) {
            this.selectionBox = null;
        }
        this.mouseMoveMode = MouseMoveMode.None;
    }
    mouseMove(x: number, y: number, dragEnd: boolean) {
        if (this.mouseMoveMode == MouseMoveMode.AddHold) {
            this.selectedElements[0].endTime = this.attatchY(y);
        }
        else if (this.mouseMoveMode == MouseMoveMode.Drag) {
            if (dragEnd) {
                this.selectedElements[0].endTime = this.attatchY(y);
            }
            else {
                this.selectedElements[0].startTime = this.attatchY(y);
            }
            if (this.selectedElements[0] instanceof Note) {
                this.selectedElements[0].positionX = this.attatchX(x);
            }
        }
        else if (this.mouseMoveMode == MouseMoveMode.Select) {
            if (!this.selectionBox) {
                throw new Error("");
            }
            this.selectionBox.right = x;
            this.selectionBox.bottom = this.notesViewBox.bottom - y + this.offsetY;
            this.unselectAll();
            for (const box of this.cachedBoxes) {
                const absoluteBox = new Box(
                    this.notesViewBox.bottom - box.top + this.offsetY,
                    this.notesViewBox.bottom - box.bottom + this.offsetY,
                    box.left,
                    box.right);
                if (absoluteBox.overlap(this.selectionBox)) {
                    this.selectElement(box.data);
                }
            }
        }
        this.mouseX = x;
        this.mouseY = y;
    }
    mouseLeft(x: number, y: number, mutiple: boolean) {
        function getClickedObject<T>(boxes: BoxWithData<T>[]) {
            let minDistance = Infinity;
            let nearestBox: BoxWithData<T> | null = null;
            for (const box of boxes) {
                if (box.touch(x, y)) {
                    const distance = math.distance(x, y, box.middleX, box.middleY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestBox = box;
                    }
                }
            }
            return nearestBox ? nearestBox.data : undefined;
        }
        const clickedObject = getClickedObject(this.cachedBoxes);
        if (clickedObject != undefined && this.isSelected(clickedObject)) {
            this.mouseMoveMode = MouseMoveMode.Drag;
        }
        if (clickedObject) {
            if (mutiple) {
                if (this.isSelected(clickedObject)) {
                    this.deselectElement(clickedObject);
                }
                else {
                    this.selectElement(clickedObject);
                }
            }
            else {
                this.unselectAll();
                this.selectElement(clickedObject);
            }
        }
        else {
            this.unselectAll();
        }
        if (this.selectedElements.length > 0) {
            this.state.right = RightState.Editing;
        }
        else {
            this.state.right = RightState.Default;
            this.mouseMoveMode = MouseMoveMode.Select;
            this.selectionBox = new Box(this.notesViewBox.bottom - y + this.offsetY,
                this.notesViewBox.bottom - y + this.offsetY,
                x,
                x);
        }
    }
    mouseRight(x: number, y: number) {
        const judgeLine = this.chart.judgeLineList[this.currentJudgeLineNumber];
        console.log(x, y);
        if (this.notesViewBox.touch(x, y)) {
            const time = this.attatchY(y);
            const positionX = this.attatchX(x);
            const addedNote = new Note({
                startTime: time,
                endTime: time,
                positionX,
                type: this.currentNoteType,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: 0,
                above: NoteAbove.Above
            }, this.chart.BPMList);
            judgeLine.notes.push(addedNote);
            this.unselectAll();
            this.selectElement(addedNote);
            this.state.right = RightState.Editing;
            if (this.currentNoteType == NoteType.Hold)
                this.mouseMoveMode = MouseMoveMode.AddHold;
        }
        else if (this.eventsViewBox.touch(x, y)) {
            const eventLayer = judgeLine.eventLayers[this.currentEventLayerNumber];
            const time = this.attatchY(y);
            const track = floor((x - this.eventsViewBox.left) / (this.eventsViewBox.right - this.eventsViewBox.left) * 5);
            switch (track) {
                case 0: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, this.chart.BPMList, 'moveX');
                    eventLayer.moveXEvents.push(addedEvent);
                    this.unselectAll();
                    this.selectElement(addedEvent);
                    break;
                }
                case 1: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, this.chart.BPMList, 'moveY');
                    eventLayer.moveYEvents.push(addedEvent);
                    this.unselectAll();
                    this.selectElement(addedEvent);
                    break;
                }
                case 2: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, this.chart.BPMList, 'rotate');
                    eventLayer.rotateEvents.push(addedEvent);
                    this.unselectAll();
                    this.selectElement(addedEvent);
                    break;
                }
                case 3: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, this.chart.BPMList, 'alpha');
                    eventLayer.alphaEvents.push(addedEvent);
                    this.unselectAll();
                    this.selectElement(addedEvent);
                    break;
                }
                case 4: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, this.chart.BPMList, 'speed');
                    eventLayer.speedEvents.push(addedEvent);
                    this.unselectAll();
                    this.selectElement(addedEvent);
                    break;
                }
            }
            this.state.right = RightState.Editing;
            this.mouseMoveMode = MouseMoveMode.AddHold;
        }
    }

    /** 显示编辑器界面到canvas上 */
    render() {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvasUtils.getContext(canvas);
        const judgeLine = this.chart.judgeLineList[this.currentJudgeLineNumber];
        const eventLayer = judgeLine.eventLayers[this.currentEventLayerNumber];

        ctx.reset();
        this.renderBackground();
        this.renderGrid();
        this.renderSelection();
        this.cachedBoxes = [
            ...this.renderNotes(),
            ...this.renderEvents(eventLayer.moveXEvents, 'moveX'),
            ...this.renderEvents(eventLayer.moveYEvents, 'moveY'),
            ...this.renderEvents(eventLayer.rotateEvents, 'rotate'),
            ...this.renderEvents(eventLayer.alphaEvents, 'alpha'),
            ...this.renderEvents(eventLayer.speedEvents, 'speed')
        ]
    }
    /** 显示选择框 */
    renderSelection() {
        if (!this.selectionBox) return;
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(this.selectionBox.left,
            this.notesViewBox.bottom - (this.selectionBox.top - this.offsetY),
            this.selectionBox.width,
            -this.selectionBox.height,
            this.selectionColor,
            true);
    }
    /** 显示背景 */
    renderBackground() {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(0, 0, canvas.width, canvas.height, this.backgroundColor, true);
    }
    /** 显示网格 */
    renderGrid() {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvasUtils.getContext(canvas);
        const drawLine = canvasUtils.drawLine.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        // 显示横线
        const min = floor(this.getBeatsOfPositionY(this.notesViewBox.bottom));
        const max = ceil(this.getBeatsOfPositionY(this.notesViewBox.top));
        for (let i = min; i <= max; i++) {
            for (let j = 0; j < this.horizonalLineCount; j++) {
                const beats: Beats = [i, j, this.horizonalLineCount];
                const pos = this.getPositionYOfSeconds(beatsToSeconds(this.chart.BPMList, beats));
                if (j == 0) {
                    writeText(i.toString(),
                        (this.eventsViewBox.left + this.notesViewBox.right) / 2,
                        pos,
                        20,
                        this.horzionalMainLineColor);
                    drawLine(this.notesViewBox.left,
                        pos, this.notesViewBox.right,
                        pos,
                        this.horzionalMainLineColor);
                    drawLine(this.eventsViewBox.left,
                        pos,
                        this.eventsViewBox.right,
                        pos,
                        this.horzionalMainLineColor);
                }
                else {
                    writeText(j.toString(),
                        (this.eventsViewBox.left + this.notesViewBox.right) / 2,
                        pos,
                        20,
                        this.horzionalLineColor);
                    drawLine(this.notesViewBox.left,
                        pos, this.notesViewBox.right,
                        pos,
                        this.horzionalLineColor);
                    drawLine(this.eventsViewBox.left,
                        pos, this.eventsViewBox.right,
                        pos,
                        this.horzionalLineColor);
                }
            }
        }
        // 显示竖线
        if (this.verticalLineCount > 1) {
            drawLine(
                this.notesViewBox.middleX,
                this.notesViewBox.top,
                this.notesViewBox.middleX,
                this.notesViewBox.bottom,
                this.verticalMainLineColor);

            for (let i = this.notesViewBox.middleX + this.verticalLineSpace;
                i <= this.notesViewBox.right;
                i += this.verticalLineSpace)
                drawLine(i,
                    this.notesViewBox.top,
                    i, this.notesViewBox.bottom,
                    this.verticalLineColor);

            for (let i = this.notesViewBox.middleX - this.verticalLineSpace;
                i >= this.notesViewBox.left;
                i -= this.verticalLineSpace)
                drawLine(i,
                    this.notesViewBox.top,
                    i,
                    this.notesViewBox.bottom,
                    this.verticalLineColor);
        }
        // 显示事件中间的分隔线
        for (let i = 1; i < 5; i++)
            drawLine(this.eventsViewBox.width * i / 5 + this.eventsViewBox.left,
                this.eventsViewBox.top,
                this.eventsViewBox.width * i / 5 + this.eventsViewBox.left,
                this.notesViewBox.bottom,
                this.verticalMainLineColor);
        // 显示边框
        drawRect(this.notesViewBox.left,
            this.notesViewBox.top,
            this.notesViewBox.width,
            this.notesViewBox.height,
            this.borderColor);
        drawRect(this.eventsViewBox.left,
            this.eventsViewBox.top,
            this.eventsViewBox.width,
            this.eventsViewBox.height,
            this.borderColor);
    }
    /** 显示note */
    renderNotes() {
        const canvas = canvasRef.value;
        if (!canvas) return [];
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const judgeLine = this.chart.judgeLineList[this.currentJudgeLineNumber];
        const noteBoxes: BoxWithData<Note>[] = [];
        const a = this.attatchY(this.mouseY);
        const imaginaryNote = new Note({
            startTime: a,
            endTime: a,
            positionX: this.attatchX(this.mouseX),
            type: this.currentNoteType
        }, this.chart.BPMList);
        const hideImaginaryNote = this.mouseMoveMode != MouseMoveMode.None || !this.notesViewBox.touch(this.mouseX, this.mouseY);
        const notes = hideImaginaryNote ? judgeLine.notes : [imaginaryNote, ...judgeLine.notes];
        for (const note of notes) {
            const noteStartSeconds = note.cachedStartSeconds;
            const noteEndSeconds = note.cachedEndSeconds;
            if (this.seconds >= noteStartSeconds && note.hitSeconds == undefined && !note.isFake) {
                note.hitSeconds = noteStartSeconds;
                this.resourcePackage.playSound(note.type);
            }
            if (note.hitSeconds && this.seconds < note.hitSeconds) {
                note.hitSeconds = undefined;
            }
            ctx.globalAlpha = note == imaginaryNote ? 0.5 : 1;
            if (note.type == NoteType.Hold) {
                const { head, body, end } = this.resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = this.notesViewBox.width / canvas.width * this.chartPackage.config.noteSize;
                const noteWidth = baseSize * note.size
                    * this.resourcePackage.getSkin(note.type, note.highlight).body.width
                    / this.resourcePackage.getSkin(note.type, false).body.width;

                const noteX = note.positionX * (this.notesViewBox.width / canvas.width) + this.notesViewBox.left + this.notesViewBox.width / 2;
                const noteStartY = this.getPositionYOfSeconds(noteStartSeconds);
                const noteEndY = this.getPositionYOfSeconds(noteEndSeconds);
                const noteHeight = noteStartY - noteEndY;
                const noteHeadHeight = head.height / body.width * noteWidth;
                const noteEndHeight = end.height / body.width * noteWidth;

                ctx.drawImage(head, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
                ctx.drawImage(body, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
                ctx.drawImage(end, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
                if (this.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteEndY - noteEndHeight,
                        noteWidth,
                        noteEndHeight + noteHeight + noteHeadHeight,
                        this.selectionColor,
                        true);
                }
                if (note != imaginaryNote) {
                    noteBoxes.push(new BoxWithData(
                        noteEndY - this.selectPadding,
                        noteStartY + this.selectPadding,
                        noteX - noteWidth / 2 - this.selectPadding,
                        noteX + noteWidth / 2 + this.selectPadding,
                        note
                    ));
                }
            }
            else {
                const noteImage = this.resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = this.notesViewBox.width / canvas.width * this.chartPackage.config.noteSize;
                const noteWidth = baseSize * note.size
                    * this.resourcePackage.getSkin(note.type, note.highlight).width
                    / this.resourcePackage.getSkin(note.type, false).width;

                const noteHeight = noteImage.height / noteImage.width * baseSize;
                const noteX = note.positionX * (this.notesViewBox.width / canvas.width) + this.notesViewBox.left + this.notesViewBox.width / 2;
                const noteY = this.getPositionYOfSeconds(noteStartSeconds);

                ctx.drawImage(
                    noteImage,
                    noteX - noteWidth / 2,
                    noteY - noteHeight / 2,
                    noteWidth,
                    noteHeight);
                if (this.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteY - noteHeight / 2,
                        noteWidth,
                        noteHeight,
                        this.selectionColor,
                        true);
                }
                if (note != imaginaryNote) {
                    noteBoxes.push(new BoxWithData(
                        noteY - this.selectPadding,
                        noteY + this.selectPadding,
                        noteX - noteWidth / 2 - this.selectPadding,
                        noteX + noteWidth / 2 + this.selectPadding,
                        note
                    ));
                }
            }
        }
        return noteBoxes;
    }
    /** 显示事件 */
    renderEvents<T extends NumberEvent>(events: T[], type: 'moveX' | 'moveY' | 'rotate' | 'alpha' | 'speed') {
        const canvas = canvasRef.value;
        if (!canvas) return [];
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const boxes: BoxWithData<T>[] = [];
        const column = {
            moveX: 0,
            moveY: 1,
            rotate: 2,
            alpha: 3,
            speed: 4
        }[type];
        const eventX = this.eventsViewBox.width * (column + 0.5) / 5 + this.eventsViewBox.left;
        for (const event of events) {
            const startSeconds = event.cachedStartSeconds;
            const endSeconds = event.cachedEndSeconds;
            const eventStartY = this.getPositionYOfSeconds(startSeconds);
            const eventEndY = this.getPositionYOfSeconds(endSeconds);
            const eventHeight = eventStartY - eventEndY;
            drawRect(
                eventX - this.eventWidth / 2,
                eventEndY,
                this.eventWidth,
                eventHeight,
                "white",
                true);
            if (this.isSelected(event)) {
                drawRect(
                    eventX - this.eventWidth / 2,
                    eventEndY,
                    this.eventWidth,
                    eventHeight,
                    this.selectionColor,
                    true);
            }
            writeText(event.start.toFixed(2),
                eventX,
                eventStartY - 1,
                30,
                "orange");
            writeText(event.end.toFixed(2),
                eventX,
                eventEndY,
                30,
                "orange");
            const box = new BoxWithData(
                eventEndY - this.selectPadding,
                eventStartY + this.selectPadding,
                eventX - this.eventWidth / 2 - this.selectPadding,
                eventX + this.eventWidth / 2 + this.selectPadding,
                event);
            boxes.push(box);
        }
        /*
        const currentEventValue = this.interpolateNumberEventValue(this.findLastEvent(events, seconds), seconds);
        writeText(currentEventValue.toFixed(2), eventX, this.eventsViewBox.bottom - 20, 30, "white", false);
        writeText(currentEventValue.toFixed(2), eventX, this.eventsViewBox.bottom - 20, 30, "blue", true);
        */
        return boxes;
    }
}