import { addBeats, subBeats } from "@/models/beats";
import { NumberEvent } from "@/models/event";
import { Note } from "@/models/note";
import { SelectedElement } from "@/types";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";

export default class MoveManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("MOVE_LEFT", () => {
            this.moveLeft();
        })
        globalEventEmitter.on("MOVE_RIGHT", () => {
            this.moveRight();
        })
        globalEventEmitter.on("MOVE_UP", () => {
            this.moveUp();
        })
        globalEventEmitter.on("MOVE_DOWN", () => {
            this.moveDown();
        })
        globalEventEmitter.on("MOVE_TO_JUDGE_LINE", (targetJudgeLineNumber) => {
            this.moveToJudgeLine(targetJudgeLineNumber);
        })
    }
    /**
     * 左移
     */
    moveLeft() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const canvas = store.useCanvas();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX -= canvas.width / (stateManager.state.verticalLineCount - 1);
            }
        }
    }
    /**
     * 右移
     */
    moveRight() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const canvas = store.useCanvas();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX += canvas.width / (stateManager.state.verticalLineCount - 1);
            }
        }
    }
    /**
     * 上移
     */
    moveUp() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        for (const element of selectionManager.selectedElements) {
            element.startTime = addBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            element.endTime = addBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]);
        }
    }
    /**
     * 下移
     */
    moveDown() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        for (const element of selectionManager.selectedElements) {
            element.startTime = subBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            element.endTime = subBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]);
        }
    }

    moveToJudgeLine(targetJudgeLineNumber: number) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const elements = new Array<SelectedElement>();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                const note = historyManager.addNote(element.toObject(), targetJudgeLineNumber);
                elements.push(note);
            }
            else if (element instanceof NumberEvent) {
                const event = historyManager.addEvent(element.toObject(), element.type, element.eventLayerId, targetJudgeLineNumber)
                elements.push(event);
            }
        }
        selectionManager.deleteSelection();
        stateManager.state.currentJudgeLineNumber = targetJudgeLineNumber;
        selectionManager.select(...elements);
    }
}