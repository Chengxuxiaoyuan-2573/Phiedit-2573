import { Note, NoteAbove, NoteType } from "@/models/note";
import { Box, BoxWithData } from "@/tools/box";
import MathUtils from "@/tools/mathUtils";
import { MouseMoveMode, SelectedElement } from "@/types";
import { floor } from "lodash";
import Constants from "../constants";
import selectionManager from "./selection";
import stateManager from "./state";
import globalEventEmitter from "@/eventEmitter";
import historyManager from "./history";
import { EasingType } from "@/models/easing";

class MouseManager {
    /** 鼠标的x坐标 */
    mouseX = 0
    /** 鼠标的y坐标 */
    mouseY = 0
    /** 鼠标移动时做的行为 */
    mouseMoveMode = MouseMoveMode.None
    /** 鼠标拖拽选择框的碰撞箱，使用绝对坐标 */
    selectionBox: Box | null = null;
    constructor() {
        globalEventEmitter.on("MOUSE_LEFT_CLICK", (x, y, options) => {
            this.mouseLeft(x, y, options.ctrl);
        })
        globalEventEmitter.on("MOUSE_RIGHT_CLICK", (x, y) => {
            this.mouseRight(x, y);
        })
        globalEventEmitter.on("MOUSE_MOVE", (x, y, options) => {
            this.mouseMove(x, y, options.alt);
        })
        globalEventEmitter.on("MOUSE_UP", () => {
            this.mouseUp();
        })
    }
    mouseUp() {
        if (this.mouseMoveMode == MouseMoveMode.AddHold) {
            selectionManager.selectedElements[0].validateTime();
        }
        else if (this.mouseMoveMode == MouseMoveMode.Select) {
            this.selectionBox = null;
        }
        this.mouseMoveMode = MouseMoveMode.None;
    }
    mouseMove(x: number, y: number, dragEnd: boolean) {
        switch (this.mouseMoveMode) {
            case MouseMoveMode.AddHold:
                selectionManager.selectedElements[0].endTime = stateManager.attatchY(y);
                break;

            case MouseMoveMode.Drag: {
                const beats = stateManager.attatchY(y);
                if (dragEnd) {
                    selectionManager.selectedElements[0].endTime = beats;
                }
                else {
                    selectionManager.selectedElements[0].startTime = beats;
                }
                if (selectionManager.selectedElements[0] instanceof Note) {
                    selectionManager.selectedElements[0].positionX = stateManager.attatchX(x);
                }
                break;
            }

            case MouseMoveMode.Select:
                if (!this.selectionBox) {
                    break;
                }
                this.selectionBox.right = x;
                this.selectionBox.bottom = stateManager.absolute(y);
                selectionManager.unselectAll();
                for (const box of stateManager.calculateBoxes()) {
                    if (box.overlap(this.selectionBox)) {
                        selectionManager.select(box.data);
                    }
                }
                break;

        }
        this.mouseX = x;
        this.mouseY = y;
    }
    mouseLeft(x: number, y: number, mutiple: boolean) {
        if(stateManager.state.isPreviewing) return;
        const boxes = stateManager.calculateBoxes();
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
    }
    mouseRight(x: number, y: number) {
        if (Constants.notesViewBox.touch(x, y)) {
            const time = stateManager.attatchY(y);
            const positionX = stateManager.attatchX(x);
            const addedNote = historyManager.addNote({
                startTime: [...time],
                endTime: [...time],
                positionX,
                type: stateManager.state.currentNoteType,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: 0,
                above: NoteAbove.Above
            }, stateManager.state.currentJudgeLineNumber);
            selectionManager.unselectAll();
            selectionManager.select(addedNote);
            if (stateManager.state.currentNoteType == NoteType.Hold)
                this.mouseMoveMode = MouseMoveMode.AddHold;
        }
        else if (Constants.eventsViewBox.touch(x, y)) {
            const time = stateManager.attatchY(y);
            const track = floor((x - Constants.eventsViewBox.left) / (Constants.eventsViewBox.right - Constants.eventsViewBox.left) * 5);
            const type = ["moveX", "moveY", "rotate", "alpha", "speed"][track];
            const addedEvent = historyManager.addEvent({
                startTime: [...time],
                endTime: [...time],
                start: 0,
                end: 0,
                bezier: 0,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 0,
                easingType: EasingType.Linear
            }, type, stateManager.state.currentEventLayerNumber.toString(), stateManager.state.currentJudgeLineNumber);
            selectionManager.unselectAll();
            selectionManager.select(addedEvent);
            this.mouseMoveMode = MouseMoveMode.AddHold;
        }
    }
}
export default new MouseManager();