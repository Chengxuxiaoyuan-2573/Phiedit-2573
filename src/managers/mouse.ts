import { Note, NoteAbove, NoteFake, NoteType } from "@/models/note";
import { Box, BoxWithData } from "@/tools/box";
import MathUtils from "@/tools/mathUtils";
import { MouseMoveMode, SelectedElement } from "@/types";
import { floor } from "lodash";
import Constants from "../constants";
import globalEventEmitter from "@/eventEmitter";
import { EasingType } from "@/models/easing";
import Manager from "./abstract";
import store from "@/store";
import { addBeats, Beats, beatsToSeconds, getBeatsValue } from "@/models/beats";
import { findLastEvent } from "@/models/event";
export default class MouseManager extends Manager {
    /** 鼠标的x坐标 */
    mouseX = 0
    /** 鼠标的y坐标 */
    mouseY = 0
    /** 鼠标是否被按下 */
    mousePressed = false
    /** 鼠标移动时做的行为 */
    mouseMoveMode = MouseMoveMode.None
    /** 鼠标拖拽选择框的碰撞箱，使用绝对坐标 */
    selectionBox: Box | null = null;

    private oldTime: Beats = [0, 0, 1];
    private oldPositionX: number = 0;
    // 已被添加还没有被记录的元素
    private addedElement: SelectedElement | null = null;
    constructor() {
        super();
        globalEventEmitter.on("MOUSE_LEFT_CLICK", (x, y, options) => {
            this.mouseLeft(x, y, options.ctrl);
        })
        globalEventEmitter.on("MOUSE_RIGHT_CLICK", (x, y) => {
            this.mouseRight(x, y);
        })
        globalEventEmitter.on("MOUSE_MOVE", (x, y) => {
            this.mouseMove(x, y);
        })
        globalEventEmitter.on("MOUSE_UP", (x, y, options) => {
            this.mouseUp(options.ctrl);
        })
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
            if (getBeatsValue(this.addedElement.startTime) == getBeatsValue(this.addedElement.endTime)) {
                this.addedElement.endTime = addBeats(this.addedElement.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            }
            this.addedElement.validateTime();
            if (this.addedElement instanceof Note) {
                historyManager.recordAddNote(this.addedElement.id);
            }
            else {
                historyManager.recordAddEvent(this.addedElement.id);
            }
            this.addedElement = null;
        }
        else if (this.mouseMoveMode == MouseMoveMode.Drag || this.mouseMoveMode == MouseMoveMode.DragEnd) {
            firstElement.validateTime();
            // Skip modification recording for newly added elements
            if (this.addedElement === null) {
                if (this.mouseMoveMode == MouseMoveMode.Drag) {
                    if (firstElement instanceof Note) {
                        historyManager.recordModifyNote(firstElement.id, "startTime", firstElement.startTime, this.oldTime);
                        historyManager.recordModifyNote(firstElement.id, "positionX", firstElement.positionX, this.oldPositionX);
                    }
                    else {
                        historyManager.recordModifyEvent(firstElement.id, "startTime", firstElement.startTime, this.oldTime);
                    }
                }
                else {
                    if (firstElement instanceof Note) {
                        historyManager.recordModifyNote(firstElement.id, "endTime", firstElement.endTime, this.oldTime);
                        historyManager.recordModifyNote(firstElement.id, "positionX", firstElement.positionX, this.oldPositionX);
                    }
                    else {
                        historyManager.recordModifyEvent(firstElement.id, "endTime", firstElement.endTime, this.oldTime);
                    }
                }
            }
        }
        else if (this.mouseMoveMode == MouseMoveMode.Select) {
            if (!this.selectionBox) {
                return;
            }
            if (!mutiple) {
                selectionManager.unselectAll();
            }
            for (const box of boxesManager.calculateBoxes()) {
                if (box.overlap(this.selectionBox) && !selectionManager.isSelected(box.data)) {
                    selectionManager.select(box.data);
                }
            }
            this.selectionBox = null;
        }
        this.mouseMoveMode = MouseMoveMode.None;
        this.mousePressed = false;
    }
    mouseMove(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const firstElement = selectionManager.selectedElements[0];
        switch (this.mouseMoveMode) {

            case MouseMoveMode.Drag: {
                const beats = stateManager.attatchY(y);
                if (firstElement instanceof Note) {
                    firstElement.startTime = beats;
                    firstElement.positionX = stateManager.attatchX(x);
                }
                else {
                    firstElement.startTime = beats;
                }
                break;
            }

            case MouseMoveMode.DragEnd: {
                const beats = stateManager.attatchY(y);
                if (firstElement instanceof Note) {
                    firstElement.endTime = beats;
                    firstElement.positionX = stateManager.attatchX(x);
                }
                else {
                    firstElement.endTime = beats;
                }
                break;
            }

            case MouseMoveMode.Select:
                if (!this.selectionBox) {
                    break;
                }
                this.selectionBox.right = x;
                this.selectionBox.bottom = stateManager.absolute(y);

                break;

        }
        this.mouseX = x;
        this.mouseY = y;
    }
    private getClickedBox(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const boxesManager = store.useManager("boxesManager");
        const boxes = boxesManager.calculateBoxes();
        let minDistance = Infinity;
        let clickedBox: BoxWithData<SelectedElement> | null = null;
        for (const box of boxes) {
            if (box.touch(x, stateManager.absolute(y))) {
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
        if (stateManager.state.isPreviewing) return;

        const clickedBox = this.getClickedBox(x, y);

        const clickedObject = clickedBox ? clickedBox.data : null;
        // 如果点到某个元素了，就选择这个元素
        if (clickedObject) {
            if (mutiple) {
                // 如果是多选，且已经选择的话就取消选择，未选择就选择这个元素
                if (selectionManager.selectedElements.includes(clickedObject)) {
                    selectionManager.unselect(clickedObject);
                }
                else {
                    selectionManager.select(clickedObject);
                }
            }
            else {
                // 如果是单选，就取消选择所有，只选择这个元素
                if (selectionManager.selectedElements.includes(clickedObject)) {
                    this.oldTime = clickedObject.startTime;
                    if (clickedObject instanceof Note) {
                        this.oldPositionX = clickedObject.positionX;
                    }
                    this.mouseMoveMode = MouseMoveMode.Drag;
                }
                selectionManager.unselectAll();
                selectionManager.select(clickedObject);
            }
        }
        // 如果没有点到任何元素，就认为用户是想拖拽选择框选择，设置状态为拖拽选择框选择，并初始化选择框位置
        else {
            this.mouseMoveMode = MouseMoveMode.Select;
            this.selectionBox = new Box(stateManager.absolute(y), stateManager.absolute(y), x, x);
        }
        this.mousePressed = true;
    }
    mouseRight(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        if (stateManager.state.isPreviewing) return;

        const clickedBox = this.getClickedBox(x, y);

        const clickedObject = clickedBox ? clickedBox.data : null;
        if (clickedObject && (selectionManager.isSelected(clickedObject) || true)) {
            selectionManager.unselectAll();
            selectionManager.select(clickedObject);
            this.oldTime = clickedObject.endTime;
            if (clickedObject instanceof Note) {
                this.oldPositionX = clickedObject.positionX;
            }
            this.mouseMoveMode = MouseMoveMode.DragEnd;
        }
        else if (Constants.notesViewBox.touch(x, y)) {
            const time = stateManager.attatchY(y);
            const positionX = stateManager.attatchX(x);
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
            this.addedElement = addedNote; // Mark as unrecorded
            selectionManager.unselectAll();
            selectionManager.select(addedNote);
            if (stateManager.state.currentNoteType == NoteType.Hold) {
                this.oldTime = addedNote.endTime;
                this.oldPositionX = addedNote.positionX;
                this.mouseMoveMode = MouseMoveMode.DragEnd;
            }
        }
        else if (Constants.eventsViewBox.touch(x, y)) {
            const chart = store.useChart();
            const time = stateManager.attatchY(y);
            const track = floor((x - Constants.eventsViewBox.left) / (Constants.eventsViewBox.right - Constants.eventsViewBox.left) * 5);
            const type = (["moveX", "moveY", "rotate", "alpha", "speed"] as const)[track];
            const timeSeconds = beatsToSeconds(chart.BPMList, time);
            const lastEvent = findLastEvent(stateManager.currentEventLayer[`${type}Events`], timeSeconds);
            const addedEvent = store.addEvent({
                startTime: [...time],
                endTime: [...time],
                start: lastEvent?.end ?? 0,
                end: lastEvent?.end ?? 0,
                bezier: 0,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 0,
                easingType: lastEvent?.easingType ?? EasingType.Linear,
                linkgroup: 0,
                isDisabled: false,
            }, type, stateManager.state.currentEventLayerNumber.toString(), stateManager.state.currentJudgeLineNumber);
            this.addedElement = addedEvent; // Mark as unrecorded
            selectionManager.unselectAll();
            selectionManager.select(addedEvent);
            this.oldTime = addedEvent.endTime;
            this.mouseMoveMode = MouseMoveMode.DragEnd;
        }
        this.mousePressed = true;
    }
}