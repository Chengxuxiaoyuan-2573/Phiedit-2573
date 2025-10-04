/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isNoteLike, NoteAbove, NoteFake, NoteType } from "@/models/note";
import { Box, BoxWithData } from "@/tools/box";
import MathUtils from "@/tools/mathUtils";
import { Bezier } from "@/models/event";
import { clamp, floor } from "lodash";
import Constants from "../../constants";
import globalEventEmitter from "@/eventEmitter";
import { EasingType } from "@/models/easing";
import Manager from "./abstract";
import store from "@/store";
import { addBeats, Beats, beatsToSeconds, getBeatsValue, isGreaterThanBeats } from "@/models/beats";
import { findLastEvent } from "@/models/event";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/eventLayer";
import { ElMessage } from "element-plus";
import { VERTICAL_ZOOM_MAX, VERTICAL_ZOOM_MIN } from "./state";
import { FullEvent, SelectableElement } from "@/models/element";
export enum MouseMoveMode {
    None, Drag, DragEnd, Select
}
const MAX_WHEEL_VELOCITY = 100;

// 滚轮缩放的敏感度
const WHEEL_ZOOM_SENSITIVITY = -0.05;
export default class MouseManager extends Manager {
    /** 鼠标的x坐标 */
    mouseX = 0;

    /** 鼠标的y坐标 */
    mouseY = 0;

    /** 鼠标是否被按下 */
    mousePressed = false;

    /** 鼠标移动时做的行为 */
    mouseMoveMode = MouseMoveMode.None;

    /** 鼠标拖拽选择框的碰撞箱，使用绝对坐标 */
    selectionBox: Box | null = null;

    private oldTime: Beats = [0, 0, 1];
    private oldPositionX: number = 0;

    // 已被添加还没有被记录的元素
    private addedElement: SelectableElement | null = null;
    private wheelVelocity: number = 0;
    isHovering = false;
    constructor() {
        super();
        globalEventEmitter.on("MOUSE_LEFT_CLICK", (x, y, options) => {
            this.mouseLeft(x, y, options.ctrl);
        });
        globalEventEmitter.on("MOUSE_RIGHT_CLICK", (x, y) => {
            this.mouseRight(x, y);
        });
        globalEventEmitter.on("MOUSE_MOVE", (x, y) => {
            this.mouseMove(x, y);
        });
        globalEventEmitter.on("MOUSE_UP", (x, y, options) => {
            this.mouseUp(options.ctrl);
        });
        globalEventEmitter.on("MOUSE_ENTER", () => {
            this.mouseEnter();
        });
        globalEventEmitter.on("MOUSE_LEAVE", () => {
            this.mouseLeave();
        });
        globalEventEmitter.on("WHEEL", (deltaY) => {
            this.wheel(deltaY);
        });
        globalEventEmitter.on("CTRL_WHEEL", (deltaY) => {
            this.ctrlWheel(deltaY);
        });
        globalEventEmitter.on("RENDER_FRAME", () => {
            this.updateWheelVelocity();
        });
    }

    /**
     * 确保鼠标已经松开了，在其他管理器中调用
     * 为了防止鼠标还未松开时进行其他操作，而导致的一些历史记录的bug
     */
    checkMouseUp() {
        this.mouseUp(false);
    }
    mouseUp(mutiple: boolean) {
        if (!this.mousePressed) {
            return;
        }

        const selectionManager = store.useManager("selectionManager");
        const boxesManager = store.useManager("boxesManager");
        const historyManager = store.useManager("historyManager");
        const stateManager = store.useManager("stateManager");
        const firstElement = selectionManager.selectedElements[0];

        if (this.addedElement) {
            if (getBeatsValue(this.addedElement.startTime) === getBeatsValue(this.addedElement.endTime)) {
                this.addedElement.endTime = addBeats(this.addedElement.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            }
            this.addedElement.makeSureTimeValid();
            if (isNoteLike(this.addedElement)) {
                historyManager.recordAddNote(this.addedElement.id);
            }
            else {
                // 确保没有与之重叠的事件
                const events = store.getJudgeLineById(this.addedElement.judgeLineNumber)
                    .getEventLayerById(this.addedElement.eventLayerId)
                    .getEventsByType(this.addedElement.type);
                let isSucceeded = true;
                for (const event of events) {
                    if (event !== this.addedElement && this.addedElement.isOverlapped(event)) {
                        ElMessage.error("不能添加重叠的事件");
                        store.removeEvent(this.addedElement.id);
                        selectionManager.unselectAll();
                        isSucceeded = false;
                        break;
                    }
                }

                if (isSucceeded) {
                    historyManager.recordAddEvent(this.addedElement.id);
                }
            }
            this.addedElement = null;
        }
        else if (this.mouseMoveMode === MouseMoveMode.Drag || this.mouseMoveMode === MouseMoveMode.DragEnd) {
            firstElement.makeSureTimeValid();

            // Skip modification recording for newly added elements
            if (this.addedElement === null) {
                if (this.mouseMoveMode === MouseMoveMode.Drag) {
                    if (isNoteLike(firstElement)) {
                        historyManager.recordModifyNote(firstElement.id, "startTime", firstElement.startTime, this.oldTime);
                        historyManager.recordModifyNote(firstElement.id, "positionX", firstElement.positionX, this.oldPositionX);
                    }
                    else {
                        historyManager.recordModifyEvent(firstElement.id, "startTime", firstElement.startTime, this.oldTime);
                    }
                }
                else {
                    if (isNoteLike(firstElement)) {
                        historyManager.recordModifyNote(firstElement.id, "endTime", firstElement.endTime, this.oldTime);
                        historyManager.recordModifyNote(firstElement.id, "positionX", firstElement.positionX, this.oldPositionX);
                    }
                    else {
                        historyManager.recordModifyEvent(firstElement.id, "endTime", firstElement.endTime, this.oldTime);
                    }
                }
            }
        }
        else if (this.mouseMoveMode === MouseMoveMode.Select) {
            if (this.selectionBox) {
                const selectedElements = [];
                for (const box of boxesManager.calculateBoxes()) {
                    if (box.overlap(this.selectionBox)) {
                        selectedElements.push(box.data);
                    }
                }

                if (selectedElements.length > 0) {
                    if (!mutiple) {
                        selectionManager.select(selectedElements);
                    }
                    selectionManager.addToSelection(selectedElements);
                }
                this.selectionBox = null;
            }
        }
        this.mouseMoveMode = MouseMoveMode.None;
        this.mousePressed = false;
    }
    mouseMove(x: number, y: number) {
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");
        const firstElement = selectionManager.selectedElements[0];
        switch (this.mouseMoveMode) {
            case MouseMoveMode.Drag: {
                if (isNoteLike(firstElement) && firstElement.type !== NoteType.Hold) {
                    store.setCursor("move");
                }
                else {
                    store.setCursor("ns-resize");
                }

                const beats = coordinateManager.attatchY(y);
                if (isNoteLike(firstElement)) {
                    firstElement.startTime = beats;
                    firstElement.positionX = coordinateManager.attatchX(x);
                }
                else {
                    firstElement.startTime = beats;
                }

                if (isGreaterThanBeats(firstElement.startTime, firstElement.endTime)) {
                    [firstElement.startTime, firstElement.endTime] = [firstElement.endTime, firstElement.startTime];
                    this.mouseMoveMode = MouseMoveMode.DragEnd;
                }
                globalEventEmitter.emit("ELEMENT_DRAGGED");
                break;
            }

            case MouseMoveMode.DragEnd: {
                if (isNoteLike(firstElement) && firstElement.type !== NoteType.Hold) {
                    store.setCursor("move");
                }
                else {
                    store.setCursor("ns-resize");
                }

                const beats = coordinateManager.attatchY(y);
                if (isNoteLike(firstElement)) {
                    firstElement.endTime = beats;
                    firstElement.positionX = coordinateManager.attatchX(x);
                }
                else {
                    firstElement.endTime = beats;
                }

                if (isGreaterThanBeats(firstElement.startTime, firstElement.endTime)) {
                    [firstElement.startTime, firstElement.endTime] = [firstElement.endTime, firstElement.startTime];
                    this.mouseMoveMode = MouseMoveMode.Drag;
                }
                globalEventEmitter.emit("ELEMENT_DRAGGED");
                break;
            }

            case MouseMoveMode.Select: {
                if (!this.selectionBox) {
                    break;
                }
                this.selectionBox.right = x;
                this.selectionBox.bottom = coordinateManager.absolute(y);
                store.setCursor("crosshair");
                break;
            }

            default: {
                const clickedBox = this.getClickedBox(x, y);
                const clickedObject = clickedBox ? clickedBox.data : null;
                if (isNoteLike(clickedObject) && clickedObject.type !== NoteType.Hold) {
                    store.setCursor("default");
                    break;
                }

                if (clickedBox) {
                    const startY = coordinateManager.relative(clickedBox.top);
                    const endY = coordinateManager.relative(clickedBox.bottom);
                    if (this.mouseY >= startY - Constants.EDITOR_VIEW_SELECT_PADDING && this.mouseY <= startY) {
                        store.setCursor("ns-resize");
                    }
                    else if (this.mouseY >= endY && this.mouseY <= endY + Constants.EDITOR_VIEW_SELECT_PADDING) {
                        store.setCursor("ns-resize");
                    }
                    else {
                        store.setCursor("default");
                    }
                }
                else {
                    store.setCursor("default");
                }
                break;
            }
        }
        this.mouseX = x;
        this.mouseY = y;
    }
    private getClickedBox(x: number, y: number) {
        const boxesManager = store.useManager("boxesManager");
        const coordinateManager = store.useManager("coordinateManager");
        const boxes = boxesManager.calculateBoxes();
        let minDistance = Infinity;
        let clickedBox: BoxWithData<SelectableElement> | null = null;
        for (const box of boxes) {
            if (box.touch(x, coordinateManager.absolute(y))) {
                const distance = MathUtils.distance(x, y, box.middleX, box.middleY);
                if (distance < minDistance) {
                    minDistance = distance;
                    clickedBox = box;
                }
            }
        }
        return clickedBox;
    }
    mouseLeft(x: number, y: number, mutiple: boolean) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");

        // 禁止在预览谱面时点击canvas
        if (stateManager.state.isPreviewing) return;

        const clickedBox = this.getClickedBox(x, y);

        const clickedObject = clickedBox ? clickedBox.data : null;

        // 如果点到某个元素了，就选择这个元素
        if (clickedObject && clickedBox) {
            if (mutiple) {
                // 如果是多选，且已经选择的话就取消选择，未选择就选择这个元素
                if (selectionManager.selectedElements.includes(clickedObject)) {
                    selectionManager.removeFromSelection([clickedObject]);
                }
                else {
                    selectionManager.addToSelection([clickedObject]);
                }
            }
            else {
                // 如果是单选，就取消选择所有，只选择这个元素
                if (selectionManager.selectedElements.includes(clickedObject)) {
                    this.oldTime = clickedObject.startTime;
                    if (isNoteLike(clickedObject)) {
                        this.oldPositionX = clickedObject.positionX;
                    }
                }
                selectionManager.select([clickedObject]);

                // 检测拖动头尾
                const startY = coordinateManager.relative(clickedBox.top);
                const endY = coordinateManager.relative(clickedBox.bottom);
                if (this.mouseY >= startY - Constants.EDITOR_VIEW_SELECT_PADDING && this.mouseY <= startY) {
                    this.mouseMoveMode = MouseMoveMode.Drag;
                }
                else if (this.mouseY >= endY && this.mouseY <= endY + Constants.EDITOR_VIEW_SELECT_PADDING) {
                    this.mouseMoveMode = MouseMoveMode.DragEnd;
                }

                // 非Hold音符不能拖动尾部，改为拖动头部
                if (isNoteLike(clickedObject) && clickedObject.type !== NoteType.Hold && this.mouseMoveMode === MouseMoveMode.DragEnd) {
                    this.mouseMoveMode = MouseMoveMode.Drag;
                }
            }
        }

        // 如果没有点到任何元素，就认为用户是想拖拽选择框选择，设置状态为拖拽选择框选择，并初始化选择框位置
        else {
            this.mouseMoveMode = MouseMoveMode.Select;
            this.selectionBox = new Box(coordinateManager.absolute(y), coordinateManager.absolute(y), x, x);
        }
        this.mousePressed = true;
    }
    mouseRight(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");

        // 禁止在预览谱面时点击canvas
        if (stateManager.state.isPreviewing) return;

        // const clickedBox = this.getClickedBox(x, y);

        // const clickedObject = clickedBox ? clickedBox.data : null;
        if (Constants.EDITOR_VIEW_NOTES_VIEWBOX.touch(x, y)) {
            const time = coordinateManager.attatchY(y);
            const positionX = coordinateManager.attatchX(x);
            const addedNote = store.addNote({
                startTime: [...time],
                endTime: [...time],
                positionX,
                type: stateManager.state.currentNoteType,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: NoteFake.Real,
                above: NoteAbove.Above
            }, stateManager.state.currentJudgeLineNumber);
            this.addedElement = addedNote;
            selectionManager.select([addedNote]);
            if (stateManager.state.currentNoteType === NoteType.Hold) {
                this.oldTime = addedNote.endTime;
                this.oldPositionX = addedNote.positionX;
                this.mouseMoveMode = MouseMoveMode.DragEnd;
            }
        }
        else if (Constants.EDITOR_VIEW_EVENTS_VIEWBOX.touch(x, y)) {
            const chart = store.useChart();
            const time = coordinateManager.attatchY(y);
            const types = (() => {
                const eventLayer = stateManager.currentEventLayer;
                if (eventLayer instanceof BaseEventLayer) {
                    return baseEventTypes;
                }
                else {
                    return extendedEventTypes;
                }
            })();
            const track = floor((x - Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left) / (Constants.EDITOR_VIEW_EVENTS_VIEWBOX.right - Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left) * types.length);
            const type = types[track];
            const timeSeconds = beatsToSeconds(chart.BPMList, time);
            const lastEvent = findLastEvent<FullEvent>(stateManager.currentEventLayer.getEventsByType(type), timeSeconds);
            const eventValue = lastEvent?.end ?? (() => {
                if (type === "scaleX" || type === "scaleY") {
                    return 1;
                }
                else if (type === "color") {
                    return [255, 255, 255];
                }
                else if (type === "text") {
                    return "";
                }
                else {
                    return 0;
                }
            })();
            const addedEvent = store.addEvent({
                startTime: [...time],
                endTime: [...time],
                start: eventValue,
                end: eventValue,
                bezier: Bezier.Off,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 0,
                easingType: lastEvent?.easingType ?? EasingType.Linear,
                linkgroup: 0,
                isDisabled: false,
            }, type, stateManager.state.currentEventLayerId, stateManager.state.currentJudgeLineNumber);
            this.addedElement = addedEvent;
            selectionManager.select([addedEvent]);
            this.oldTime = addedEvent.endTime;
            this.mouseMoveMode = MouseMoveMode.DragEnd;
        }
        this.mousePressed = true;
    }
    mouseEnter() {
        this.isHovering = true;
    }
    mouseLeave() {
        this.isHovering = false;
    }
    wheel(deltaY: number) {
        const settingsManager = store.useManager("settingsManager");
        const audio = store.useAudio();
        this.wheelVelocity += deltaY * settingsManager.settings.wheelSpeed;
        this.wheelVelocity = clamp(this.wheelVelocity, -MAX_WHEEL_VELOCITY, MAX_WHEEL_VELOCITY);

        // 如果是在音乐播放时滚动滚轮，则暂停音乐
        if (!audio.paused) {
            audio.pause();
        }
    }
    ctrlWheel(deltaY: number) {
        const stateManager = store.useManager("stateManager");
        const scale = (stateManager.state.verticalZoom + deltaY * WHEEL_ZOOM_SENSITIVITY) / stateManager.state.verticalZoom;
        stateManager.state.verticalZoom = clamp(
            stateManager.state.verticalZoom + deltaY * WHEEL_ZOOM_SENSITIVITY,
            VERTICAL_ZOOM_MIN,
            VERTICAL_ZOOM_MAX
        );
        if (this.selectionBox) {
            this.selectionBox.bottom = this.selectionBox.bottom * scale;
            this.selectionBox.top = this.selectionBox.top * scale;
        }
    }
    private updateWheelVelocity() {
        const stateManager = store.useManager("stateManager");
        const audio = store.useAudio();
        if (!audio.paused) {
            this.wheelVelocity = 0;
            return;
        }
        audio.currentTime += this.wheelVelocity / -stateManager.state.verticalZoom;
        this.wheelVelocity *= 0.9;
        if (Math.abs(this.wheelVelocity) < 1) {
            this.wheelVelocity = 0;
        }
    }
}