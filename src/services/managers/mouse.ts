import { NumberEvent } from "@/classes/event";
import { Note, NoteAbove, NoteType } from "@/classes/note";
import { Box, BoxWithData } from "@/tools/box";
import MathUtils from "@/tools/math";
import { MouseMoveMode, SelectedElement } from "@/types";
import { floor } from "lodash";
import Constants from "../constants";
import selectionManager from "./selection";
import stateManager from "./state";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";

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
        const boxes = stateManager.calculateBoxes();
        const getClickedBox = () => {
            let minDistance = Infinity;
            let nearestBox: BoxWithData<SelectedElement> | null = null;
            for (const box of boxes) {
                if (box.touch(x, stateManager.absolute(y))) {
                    const distance = MathUtils.distance(x, y, box.middleX, box.middleY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestBox = box;
                    }
                }
            }
            return nearestBox;
        }
        const clickedBox = getClickedBox();
        const clickedObject = clickedBox ? clickedBox.data : undefined;
        if (clickedObject && clickedBox && selectionManager.selectedElements.includes(clickedObject)) {
            this.mouseMoveMode = MouseMoveMode.Drag;
        }
        if (clickedObject) {
            if (mutiple) {
                if (selectionManager.selectedElements.includes(clickedObject)) {
                    selectionManager.unselect(clickedObject);
                }
                else {
                    selectionManager.select(clickedObject);
                }
            }
            else {
                selectionManager.unselectAll()
                selectionManager.select(clickedObject);
            }
        }
        else {
            selectionManager.unselectAll();
        }
        if (selectionManager.selectedElements.length == 0) {
            this.mouseMoveMode = MouseMoveMode.Select;
            this.selectionBox = new Box(stateManager.absolute(y), stateManager.absolute(y), x, x);
        }
    }
    mouseRight(x: number, y: number) {
        const judgeLine = stateManager.currentJudgeLine;
        const chart = store.useChart();
        console.log(x, y);
        if (Constants.notesViewBox.touch(x, y)) {
            const time = stateManager.attatchY(y);
            const positionX = stateManager.attatchX(x);
            const addedNote = new Note({
                startTime: time,
                endTime: time,
                positionX,
                type: stateManager.currentNoteType,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: 0,
                above: NoteAbove.Above
            }, chart.BPMList);
            judgeLine.notes.push(addedNote);
            selectionManager.unselectAll();
            selectionManager.select(addedNote);
            if (stateManager.currentNoteType == NoteType.Hold)
                this.mouseMoveMode = MouseMoveMode.AddHold;
        }
        else if (Constants.eventsViewBox.touch(x, y)) {
            const eventLayer = stateManager.currentEventLayer;
            const time = stateManager.attatchY(y);
            const track = floor((x - Constants.eventsViewBox.left) / (Constants.eventsViewBox.right - Constants.eventsViewBox.left) * 5);
            switch (track) {
                case 0: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, chart.BPMList, 'moveX');
                    eventLayer.moveXEvents.push(addedEvent);
                    selectionManager.unselectAll();
                    selectionManager.select(addedEvent);
                    break;
                }
                case 1: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, chart.BPMList, 'moveY');
                    eventLayer.moveYEvents.push(addedEvent);
                    selectionManager.unselectAll();
                    selectionManager.select(addedEvent);
                    break;
                }
                case 2: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, chart.BPMList, 'rotate');
                    eventLayer.rotateEvents.push(addedEvent);
                    selectionManager.unselectAll();
                    selectionManager.select(addedEvent);
                    break;
                }
                case 3: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, chart.BPMList, 'alpha');
                    eventLayer.alphaEvents.push(addedEvent);
                    selectionManager.unselectAll();
                    selectionManager.select(addedEvent);
                    break;
                }
                case 4: {
                    const addedEvent = new NumberEvent({
                        startTime: time
                    }, chart.BPMList, 'speed');
                    eventLayer.speedEvents.push(addedEvent);
                    selectionManager.unselectAll();
                    selectionManager.select(addedEvent);
                    break;
                }
            }
            this.mouseMoveMode = MouseMoveMode.AddHold;
        }
    }
}
export default new MouseManager();