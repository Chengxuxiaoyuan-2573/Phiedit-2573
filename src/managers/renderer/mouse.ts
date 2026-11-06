/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isNoteLike, NoteAbove, NoteFake, NoteType } from "@/models/rpe/note";
import { Box, BoxWithData } from "@/tools/box";
import MathUtils from "@/tools/mathUtils";
import { AbstractEvent, Bezier, isEvent } from "@/models/rpe/event";
import { clamp, floor } from "lodash";
import Constants from "../../constants";
import globalEventEmitter from "@/eventEmitter";
import { EasingType } from "@/models/rpe/easing";
import Manager from "./abstract";
import store from "@/store";
import { addBeats, Beats, beatsToSeconds, getBeatsValue, isEqualBeats, isGreaterThanBeats, subBeats } from "@/models/rpe/beats";
import { findLastEventIndex } from "@/models/rpe/event";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/rpe/eventLayer";
import { ElMessage } from "element-plus";
import { VERTICAL_ZOOM_MAX, VERTICAL_ZOOM_MIN } from "./state";
import {
    SelectableElement,
    getElementEndTime,
    getElementStartTime,
    isActiveInterval,
    isBlockArea,
    isBlockAreaLike,
    makeSureElementTimeValid,
    setElementEndTime,
    setElementStartTime
} from "@/models/rpe/element";
import { BLOCK_AREA_EVENT_LAYER_ID, blockAreaEventTracks, getBlockAreaEventTypeOfTrack } from "@/models/rpe/blockArea";
export enum MouseMoveMode {
    None, Drag, DragEnd, Select,

    /** 拖动整个元素（噪域、激活区间这类没有“头尾”概念的元素） */
    DragWhole
}

/** 拖动开始时元素与鼠标的初始状态，用于按偏移量拖动整个元素 */
interface DragOrigin {

    /** 按下鼠标时的鼠标拍数 */
    mouseBeats: Beats

    /** 按下鼠标时的鼠标 x 坐标 */
    mouseX: number

    /** 按下鼠标时元素的起始拍数 */
    start: Beats

    /** 按下鼠标时元素的结束拍数 */
    end: Beats

    /** 按下鼠标时元素的 x 坐标（音符的 positionX 或噪域的 editorPositionX） */
    positionX: number
}
const MAX_WHEEL_VELOCITY = 100;

/** 新添加的激活区间的默认反应时长，单位为秒 */
const DEFAULT_ACTIVE_INTERVAL_READY_FLASH = 0.5;

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

    /** 拖动开始时的元素状态。没有在拖动元素时为 null */
    private dragOrigin: DragOrigin | null = null;

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

        // canvas 的 mouseup 只有在画布内松开时才会触发。
        // 如果拖动时把鼠标移到画布外再松开，拖动就永远不会结束，
        // 元素已经被移动却没有写入历史记录，之后撤销就会回到错误的状态。
        // 这里在 window 上再做一层兜底，保证任何位置松开鼠标都能结束拖动并记录历史
        window.addEventListener("mouseup", () => {
            this.mouseUp(false);
        });
        window.addEventListener("blur", () => {
            this.mouseUp(false);
        });
    }

    /**
     * 确保鼠标已经松开了，在其他管理器中调用
     * 为了防止鼠标还未松开时进行其他操作，而导致历史记录错乱的 bug
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
            const addedElement = this.addedElement;
            if (getBeatsValue(getElementStartTime(addedElement)) === getBeatsValue(getElementEndTime(addedElement))) {
                setElementEndTime(addedElement, addBeats(getElementStartTime(addedElement), [0, 1, stateManager.state.horizonalLineCount]));
            }
            makeSureElementTimeValid(addedElement);
            if (isNoteLike(addedElement)) {
                historyManager.recordAddNote(addedElement.id);
            }
            else if (isBlockArea(addedElement)) {
                const position = store.useChart().blockAreaList.indexOf(addedElement);
                if (position === -1) {
                    throw new Error(`新添加的噪域${addedElement.index}不在噪域列表中`);
                }
                historyManager.recordAddBlockArea(addedElement.toObject(), addedElement.index, position);
            }
            else if (isEvent(addedElement)) {
                // 确保没有与之重叠的事件
                const events = store.getSiblingEvents(addedElement);
                let isSucceeded = true;
                for (const event of events) {
                    if (event !== addedElement && addedElement.isOverlapped(event)) {
                        ElMessage.error("不能添加重叠的事件");
                        store.removeEvent(addedElement.id);
                        selectionManager.unselectAll();
                        isSucceeded = false;
                        break;
                    }
                }

                if (isSucceeded) {
                    historyManager.recordAddEvent(addedElement.id);
                }
            }
            this.addedElement = null;
        }
        else if (this.mouseMoveMode === MouseMoveMode.Drag || this.mouseMoveMode === MouseMoveMode.DragEnd || this.mouseMoveMode === MouseMoveMode.DragWhole) {
            if (firstElement) {
                makeSureElementTimeValid(firstElement);
            }

            // Skip modification recording for newly added elements
            if (this.addedElement === null && firstElement) {
                this.recordDrag(firstElement);
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
        this.dragOrigin = null;
        this.mousePressed = false;
    }

    /**
     * 把一次拖动写进历史记录。
     *
     * 规则：
     * 1. 一次拖动只产生一条历史记录（所有变化的属性放进同一个分组）；
     * 2. 只记录真正发生变化了的属性，单纯的点击不会产生历史记录；
     * 3. 旧值一律取按下鼠标时保存的 dragOrigin 快照。
     *    不能按“拖动头/拖动尾”来推断旧值：拖动过程中如果拖过了另一头，
     *    代码会交换头尾并切换拖动模式，此时按模式取旧值会记错。
     */
    private recordDrag(element: SelectableElement) {
        const historyManager = store.useManager("historyManager");
        const origin = this.dragOrigin;
        if (!origin) {
            return;
        }

        if (isNoteLike(element)) {
            const startTimeChanged = !isEqualBeats(element.startTime, origin.start);
            const endTimeChanged = !isEqualBeats(element.endTime, origin.end);
            const positionChanged = element.positionX !== origin.positionX;
            if (!startTimeChanged && !endTimeChanged && !positionChanged) {
                return;
            }

            historyManager.group(`拖动音符 ${element.id}`);
            try {
                if (startTimeChanged) {
                    historyManager.recordModifyNote(element.id, "startTime", element.startTime, origin.start);
                }

                if (endTimeChanged) {
                    historyManager.recordModifyNote(element.id, "endTime", element.endTime, origin.end);
                }

                if (positionChanged) {
                    historyManager.recordModifyNote(element.id, "positionX", element.positionX, origin.positionX);
                }
            }
            finally {
                historyManager.ungroup();
            }
        }
        else if (isEvent(element)) {
            const startTimeChanged = !isEqualBeats(element.startTime, origin.start);
            const endTimeChanged = !isEqualBeats(element.endTime, origin.end);
            if (!startTimeChanged && !endTimeChanged) {
                return;
            }

            historyManager.group(`拖动事件 ${element.id}`);
            try {
                if (startTimeChanged) {
                    historyManager.recordModifyEvent(element.id, "startTime", element.startTime, origin.start);
                }

                if (endTimeChanged) {
                    historyManager.recordModifyEvent(element.id, "endTime", element.endTime, origin.end);
                }
            }
            finally {
                historyManager.ungroup();
            }
        }
        else if (isBlockArea(element)) {
            const appearTimeChanged = !isEqualBeats(element.appearTime, origin.start);
            const disappearTimeChanged = !isEqualBeats(element.disappearTime, origin.end);
            const positionChanged = element.editorPositionX !== origin.positionX;
            if (!appearTimeChanged && !disappearTimeChanged && !positionChanged) {
                return;
            }

            historyManager.group(`拖动噪域 ${element.index}`);
            try {
                if (appearTimeChanged) {
                    historyManager.recordModifyBlockArea(element.index, "appearTime", element.appearTime, origin.start);
                }

                if (disappearTimeChanged) {
                    historyManager.recordModifyBlockArea(element.index, "disappearTime", element.disappearTime, origin.end);
                }

                if (positionChanged) {
                    historyManager.recordModifyBlockArea(element.index, "editorPositionX", element.editorPositionX, origin.positionX);
                }
            }
            finally {
                historyManager.ungroup();
            }
        }
        else if (isActiveInterval(element)) {
            const blockArea = element.owner;
            if (!blockArea) {
                return;
            }

            const intervalIndex = blockArea.activeIntervals.indexOf(element);
            if (intervalIndex === -1) {
                return;
            }

            const startTimeChanged = !isEqualBeats(element.startTime, origin.start);
            const endTimeChanged = !isEqualBeats(element.endTime, origin.end);
            if (!startTimeChanged && !endTimeChanged) {
                return;
            }

            historyManager.group("拖动激活区间");
            try {
                if (startTimeChanged) {
                    historyManager.recordModifyActiveInterval(blockArea.index, intervalIndex, "startTime", element.startTime, origin.start);
                }

                if (endTimeChanged) {
                    historyManager.recordModifyActiveInterval(blockArea.index, intervalIndex, "endTime", element.endTime, origin.end);
                }
            }
            finally {
                historyManager.ungroup();
            }
        }
    }
    mouseMove(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const judgeManager = store.useManager("judgeManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");
        if (stateManager.state.isPreviewing) {
            store.setCursor("default");
            judgeManager.move(coordinateManager.convertXToChart(x), coordinateManager.convertYToChart(y));
        }
        else {
            const firstElement = selectionManager.selectedElements[0];
            switch (this.mouseMoveMode) {
                case MouseMoveMode.Drag: {
                    if (!firstElement) {
                        break;
                    }

                    if (isNoteLike(firstElement) && firstElement.type !== NoteType.Hold) {
                        store.setCursor("move");
                    }
                    else {
                        store.setCursor("ns-resize");
                    }

                    const beats = coordinateManager.attatchY(y);
                    if (isNoteLike(firstElement)) {
                        firstElement.startTime = beats;
                        if (firstElement.type !== NoteType.Hold) {
                            firstElement.endTime = beats;
                        }
                        firstElement.positionX = coordinateManager.attatchX(x);
                    }
                    else if (isBlockAreaLike(firstElement)) {
                        setElementStartTime(firstElement, beats);
                        if (isGreaterThanBeats(getElementStartTime(firstElement), getElementEndTime(firstElement))) {
                            const startTime = getElementStartTime(firstElement);
                            setElementStartTime(firstElement, getElementEndTime(firstElement));
                            setElementEndTime(firstElement, startTime);
                            this.mouseMoveMode = MouseMoveMode.DragEnd;
                        }
                    }
                    else {
                        firstElement.startTime = beats;
                    }

                    if (isNoteLike(firstElement) || isEvent(firstElement)) {
                        if (isGreaterThanBeats(firstElement.startTime, firstElement.endTime)) {
                            [firstElement.startTime, firstElement.endTime] = [firstElement.endTime, firstElement.startTime];
                            this.mouseMoveMode = MouseMoveMode.DragEnd;
                        }
                    }
                    globalEventEmitter.emit("ELEMENT_DRAGGED");
                    break;
                }

                case MouseMoveMode.DragEnd: {
                    if (!firstElement) {
                        break;
                    }

                    if (isNoteLike(firstElement) && firstElement.type !== NoteType.Hold) {
                        store.setCursor("move");
                    }
                    else {
                        store.setCursor("ns-resize");
                    }

                    const beats = coordinateManager.attatchY(y);
                    if (isNoteLike(firstElement)) {
                        firstElement.endTime = beats;
                        if (firstElement.type !== NoteType.Hold) {
                            firstElement.startTime = beats;
                        }
                        firstElement.positionX = coordinateManager.attatchX(x);
                    }
                    else if (isBlockAreaLike(firstElement)) {
                        setElementEndTime(firstElement, beats);
                        if (isGreaterThanBeats(getElementStartTime(firstElement), getElementEndTime(firstElement))) {
                            const endTime = getElementEndTime(firstElement);
                            setElementEndTime(firstElement, getElementStartTime(firstElement));
                            setElementStartTime(firstElement, endTime);
                            this.mouseMoveMode = MouseMoveMode.Drag;
                        }
                    }
                    else {
                        firstElement.endTime = beats;
                    }

                    if (isNoteLike(firstElement) || isEvent(firstElement)) {
                        if (isGreaterThanBeats(firstElement.startTime, firstElement.endTime)) {
                            [firstElement.startTime, firstElement.endTime] = [firstElement.endTime, firstElement.startTime];
                            this.mouseMoveMode = MouseMoveMode.Drag;
                        }
                    }
                    globalEventEmitter.emit("ELEMENT_DRAGGED");
                    break;
                }

                case MouseMoveMode.DragWhole: {
                    if (!firstElement || !this.dragOrigin) {
                        break;
                    }

                    store.setCursor("move");
                    const beats = coordinateManager.attatchY(y);
                    const deltaBeats = subBeats(beats, this.dragOrigin.mouseBeats);
                    setElementStartTime(firstElement, addBeats(this.dragOrigin.start, deltaBeats));
                    setElementEndTime(firstElement, addBeats(this.dragOrigin.end, deltaBeats));

                    // 噪域的横向位置是 editorPositionX，按鼠标的横向位移换算
                    if (isBlockArea(firstElement)) {
                        const canvas = store.useCanvas();
                        const deltaX = (x - this.dragOrigin.mouseX) * canvas.width / Constants.EDITOR_VIEW_NOTES_VIEWBOX.width;
                        firstElement.editorPositionX = this.dragOrigin.positionX + deltaX;
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
        const judgeManager = store.useManager("judgeManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");

        if (stateManager.state.isPreviewing) {
            store.setCursor("default");
            judgeManager.click(coordinateManager.convertXToChart(x), coordinateManager.convertYToChart(y));
        }
        else {
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
                    // 拖动开始时元素的原始状态统一在 startDragging 里保存（dragOrigin），
                    // 记录历史时以它为旧值，保证每次拖动都有正确的旧值

                    // 点到噪域时，同时把它设为当前编辑的噪域
                    if (isBlockArea(clickedObject)) {
                        const position = store.useChart().blockAreaList.indexOf(clickedObject);
                        if (position !== -1) {
                            stateManager.state.currentBlockAreaNumber = position;
                        }
                    }

                    selectionManager.select([clickedObject]);
                    this.startDragging(clickedObject, clickedBox, x, y);
                }
            }

            // 如果没有点到任何元素，就认为用户是想拖拽选择框选择，设置状态为拖拽选择框选择，并初始化选择框位置
            else {
                this.mouseMoveMode = MouseMoveMode.Select;
                this.selectionBox = new Box(coordinateManager.absolute(y), coordinateManager.absolute(y), x, x);
            }
        }
        this.mousePressed = true;
    }

    /** 记录拖动开始时的状态，并根据点击位置决定拖动模式 */
    private startDragging(element: SelectableElement, box: BoxWithData<SelectableElement>, x: number, y: number) {
        const coordinateManager = store.useManager("coordinateManager");

        this.dragOrigin = {
            mouseBeats: coordinateManager.attatchY(y),
            mouseX: x,
            start: [...getElementStartTime(element)] as Beats,
            end: [...getElementEndTime(element)] as Beats,
            positionX: isBlockArea(element) ? element.editorPositionX : isNoteLike(element) ? element.positionX : 0
        };
        this.mouseMoveMode = MouseMoveMode.None;

        // 检测拖动头尾
        const startY = coordinateManager.relative(box.top);
        const endY = coordinateManager.relative(box.bottom);
        if (this.mouseY >= startY - Constants.EDITOR_VIEW_SELECT_PADDING && this.mouseY <= startY) {
            this.mouseMoveMode = MouseMoveMode.Drag;
        }
        else if (this.mouseY >= endY && this.mouseY <= endY + Constants.EDITOR_VIEW_SELECT_PADDING) {
            this.mouseMoveMode = MouseMoveMode.DragEnd;
        }
        else if (isBlockAreaLike(element)) {
            // 噪域、激活区间的方块比较大，拖动中间时整体移动
            this.mouseMoveMode = MouseMoveMode.DragWhole;
        }

        // 非Hold音符不能拖动尾部，改为拖动头部
        if (isNoteLike(element) && element.type !== NoteType.Hold && this.mouseMoveMode === MouseMoveMode.DragEnd) {
            this.mouseMoveMode = MouseMoveMode.Drag;
        }
    }
    mouseRight(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");

        // 禁止在预览谱面时点击canvas
        if (stateManager.state.isPreviewing) return;

        // 噪域编辑时，右键添加噪域、激活区间或噪域事件
        if (stateManager._state.isEditingBlockArea) {
            this.mouseRightInBlockAreaMode(x, y);
            this.mousePressed = true;
            return;
        }

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
                above: NoteAbove.Above,
                judgeArea: 1
            }, stateManager.state.currentJudgeLineNumber);
            this.addedElement = addedNote;
            selectionManager.select([addedNote]);
            if (stateManager.state.currentNoteType === NoteType.Hold) {
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
            const events = stateManager.currentEventLayer.getEventsByType(type);
            const lastEventIndex = findLastEventIndex<AbstractEvent>(events, timeSeconds);
            const lastEvent = events[lastEventIndex];
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
            this.mouseMoveMode = MouseMoveMode.DragEnd;
        }
        this.mousePressed = true;
    }

    /** 获取鼠标吸附后的噪域放置位置和默认起止时间 */
    getBlockAreaPlacement(x: number, y: number) {
        const coordinateManager = store.useManager("coordinateManager");
        const stateManager = store.useManager("stateManager");
        const appearTime = coordinateManager.attatchY(y);
        return {
            appearTime,
            disappearTime: addBeats(appearTime, [0, 1, stateManager.state.horizonalLineCount]),
            editorPositionX: coordinateManager.attatchX(x)
        };
    }

    private mouseRightInBlockAreaMode(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");
        const historyManager = store.useManager("historyManager");

        // 与添加音符一致：在左侧时间/音符区域右键，按鼠标位置创建噪域
        if (Constants.EDITOR_VIEW_NOTES_VIEWBOX.touch(x, y)) {
            const chart = store.useChart();
            const placement = this.getBlockAreaPlacement(x, y);
            const position = chart.blockAreaList.length;

            const blockArea = store.insertBlockArea({
                Name: `噪域${chart.nextBlockAreaIndex + 1}`,
                activeIntervals: [{
                    startTime: [...placement.appearTime],
                    endTime: placement.disappearTime,
                    readyFlash: DEFAULT_ACTIVE_INTERVAL_READY_FLASH
                }],
                ...placement,
                bottomLeft: { x: -300, y: -200 },
                topRight: { x: 300, y: 200 },
                isInvert: false,
                moveXEvents: [],
                moveYEvents: [],
                rotateEvents: [],
                scaleXEvents: [],
                scaleYEvents: []
            }, position);

            this.addedElement = blockArea;
            stateManager.notifyBlockAreaListChanged({ insertedPosition: position });
            stateManager.selectBlockArea(position);
            return;
        }

        if (!Constants.EDITOR_VIEW_EVENTS_VIEWBOX.touch(x, y)) {
            return;
        }

        const blockArea = stateManager.currentBlockArea;
        if (!blockArea) {
            ElMessage.warning("当前谱面没有噪域，无法添加噪域事件");
            return;
        }

        const chart = store.useChart();
        const time = coordinateManager.attatchY(y);
        const trackCount = blockAreaEventTracks.length;
        const column = floor((x - Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left) / Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * trackCount);
        const track = blockAreaEventTracks[column];
        const type = getBlockAreaEventTypeOfTrack(track);

        // 激活区间
        if (!type) {
            const interval = blockArea.addActiveInterval({
                startTime: [...time],
                endTime: addBeats(time, [0, 1, stateManager.state.horizonalLineCount]),
                readyFlash: DEFAULT_ACTIVE_INTERVAL_READY_FLASH
            });
            const position = blockArea.activeIntervals.indexOf(interval);
            historyManager.recordAddActiveInterval(blockArea.index, interval.toObject(), position);
            selectionManager.select([interval]);
            return;
        }

        // 普通事件，数值取上一个事件的结束值
        const seconds = beatsToSeconds(chart.BPMList, time);
        const events = blockArea.getEventsByType(type);
        const lastEventIndex = findLastEventIndex<AbstractEvent>(events, seconds);
        const lastEvent = events[lastEventIndex];
        const eventValue = lastEvent?.end ?? (type === "scaleX" || type === "scaleY" ? 1 : 0);
        const center = blockArea.getCenter();
        const addedEvent = store.addEvent({
            startTime: [...time],
            endTime: [...time],
            start: eventValue,
            end: eventValue,
            bezier: Bezier.Off,
            bezierPoints: [0, 0, 1, 1],
            easingLeft: 0,
            easingRight: 1,
            easingType: lastEvent?.easingType ?? EasingType.Linear,
            linkgroup: 0,
            isDisabled: false,

            // 噪域的缩放、旋转以噪域中心为支点（anchor 为 Point 格式 { x, y }）
            ...type === "scaleX" || type === "scaleY" || type === "rotate" ? { anchor: { x: center.x, y: center.y } } : {}
        }, type, BLOCK_AREA_EVENT_LAYER_ID, blockArea.index);
        this.addedElement = addedEvent;
        selectionManager.select([addedEvent]);
        this.mouseMoveMode = MouseMoveMode.DragEnd;
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
