import { addBeats, subBeats } from "@/models/beats";
import { NumberEvent } from "@/models/event";
import { Note } from "@/models/note";
import { NoteOrEvent } from "@/models/event";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { ElMessageBox } from "element-plus";

export default class MoveManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("MOVE_LEFT", () => {
            this.moveLeft();
        });
        globalEventEmitter.on("MOVE_RIGHT", () => {
            this.moveRight();
        });
        globalEventEmitter.on("MOVE_UP", () => {
            this.moveUp();
        });
        globalEventEmitter.on("MOVE_DOWN", () => {
            this.moveDown();
        });
        globalEventEmitter.on("MOVE_TO_JUDGE_LINE", () => {
            this.moveToJudgeLine();
        });
        globalEventEmitter.on("MOVE_TO_PREVIOUS_JUDGE_LINE", createCatchErrorByMessage(() => {
            this.moveToPreviousJudgeLine();
        }, "移动"));
        globalEventEmitter.on("MOVE_TO_NEXT_JUDGE_LINE", createCatchErrorByMessage(() => {
            this.moveToNextJudgeLine();
        }, "移动"));
    }

    /**
     * 左移
     */
    moveLeft() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const canvas = store.useCanvas();
        historyManager.group("左移");
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                historyManager.recordModifyNote(element.id, "positionX", element.positionX - canvas.width / (stateManager.state.verticalLineCount - 1), element.positionX);
                element.positionX -= canvas.width / (stateManager.state.verticalLineCount - 1);
            }
        }
        historyManager.ungroup();
    }

    /**
     * 右移
     */
    moveRight() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const canvas = store.useCanvas();
        historyManager.group("右移");
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                historyManager.recordModifyNote(element.id, "positionX", element.positionX + canvas.width / (stateManager.state.verticalLineCount - 1), element.positionX);
                element.positionX += canvas.width / (stateManager.state.verticalLineCount - 1);
            }
        }
        historyManager.ungroup();
    }

    /**
     * 上移
     */
    moveUp() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        historyManager.group("上移");
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                historyManager.recordModifyNote(element.id, "startTime", addBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]), element.startTime);
                historyManager.recordModifyNote(element.id, "endTime", addBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]), element.endTime);
            }
            else {
                historyManager.recordModifyEvent(element.id, "startTime", addBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]), element.startTime);
                historyManager.recordModifyEvent(element.id, "endTime", addBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]), element.endTime);
            }
            element.startTime = addBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            element.endTime = addBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]);
        }
        historyManager.ungroup();
    }

    /**
     * 下移
     */
    moveDown() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        historyManager.group("下移");
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                historyManager.recordModifyNote(element.id, "startTime", subBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]), element.startTime);
                historyManager.recordModifyNote(element.id, "endTime", subBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]), element.endTime);
            }
            else {
                historyManager.recordModifyEvent(element.id, "startTime", subBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]), element.startTime);
                historyManager.recordModifyEvent(element.id, "endTime", subBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]), element.endTime);
            }
            element.startTime = subBeats(element.startTime, [0, 1, stateManager.state.horizonalLineCount]);
            element.endTime = subBeats(element.endTime, [0, 1, stateManager.state.horizonalLineCount]);
        }
        historyManager.ungroup();
    }

    async moveToJudgeLine(targetJudgeLineNumber?: number) {
        if (targetJudgeLineNumber === undefined) {
            targetJudgeLineNumber = await ElMessageBox.prompt("请输入要移动到的判定线编号", "移动判定线").then(res => +res.value) as number;
        }

        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const elements = new Array<NoteOrEvent>();
        historyManager.group(`移到${targetJudgeLineNumber}号判定线`);
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                const note = store.addNote(element.toObject(), targetJudgeLineNumber);
                elements.push(note);
                historyManager.recordAddNote(element.id);
            }
            else if (element instanceof NumberEvent) {
                const event = store.addEvent(element.toObject(), element.type, element.eventLayerId, targetJudgeLineNumber);
                elements.push(event);
                historyManager.recordAddEvent(element.id);
            }
        }
        historyManager.ungroup();
        selectionManager.deleteSelection();
        stateManager.state.currentJudgeLineNumber = targetJudgeLineNumber;
        selectionManager.addToSelection(elements);
    }
    moveToPreviousJudgeLine() {
        const stateManager = store.useManager("stateManager");
        if (stateManager.state.currentJudgeLineNumber === 0) {
            throw new Error("当前为第一条判定线，无法移动");
        }
        this.moveToJudgeLine(stateManager.state.currentJudgeLineNumber - 1);
    }
    moveToNextJudgeLine() {
        const stateManager = store.useManager("stateManager");
        if (stateManager.state.currentJudgeLineNumber === stateManager.judgeLinesCount - 1) {
            throw new Error("当前为最后一条判定线，无法移动");
        }
        this.moveToJudgeLine(stateManager.state.currentJudgeLineNumber + 1);
    }
}