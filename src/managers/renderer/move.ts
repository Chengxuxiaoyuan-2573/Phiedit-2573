/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { addBeats, Beats, subBeats } from "@/models/rpe/beats";
import { isNoteLike } from "@/models/rpe/note";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { ElMessageBox } from "element-plus";
import {
    SelectableElement,
    getElementEndTime,
    getElementStartTime,
    isActiveInterval,
    isBlockArea,
    setElementEndTime,
    setElementStartTime
} from "@/models/rpe/element";
import { isEvent } from "@/models/rpe/event";

export default class MoveManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("MOVE_LEFT", () => {
            this.moveLeft();
        });
        globalEventEmitter.on("MOVE_RIGHT", () => {
            this.moveRight();
        });
        globalEventEmitter.on("MOVE_UP", createCatchErrorByMessage(() => {
            this.moveUp();
        }, "上移", false));
        globalEventEmitter.on("MOVE_DOWN", createCatchErrorByMessage(() => {
            this.moveDown();
        }, "下移", false));
        globalEventEmitter.on("MOVE_TO_JUDGE_LINE", (num) => {
            this.moveToJudgeLine(num);
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
        this.moveHorizontally(-1);
    }

    /**
     * 右移
     */
    moveRight() {
        this.moveHorizontally(1);
    }

    /**
     * 横向移动选中的元素。
     *
     * 音符改 positionX，噪域改 editorPositionX；激活区间没有横向位置，会被跳过。
     */
    private moveHorizontally(direction: 1 | -1) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const canvas = store.useCanvas();
        const gridIntervals = stateManager.state.verticalLineCount - 1;

        // 关闭竖线吸附时，每次按键横移一个谱面坐标单位
        const step = (gridIntervals > 0 ?
            canvas.width / gridIntervals :
            1) * direction;
        historyManager.group(direction === 1 ? "右移" : "左移");
        for (const element of selectionManager.selectedElements) {
            if (isNoteLike(element)) {
                historyManager.recordModifyNote(element.id, "positionX", element.positionX + step, element.positionX);
                element.positionX += step;
            }
            else if (isBlockArea(element)) {
                historyManager.recordModifyBlockArea(element.index, "editorPositionX", element.editorPositionX + step, element.editorPositionX);
                element.editorPositionX += step;
            }
        }
        historyManager.ungroup();
    }

    /**
     * 上移
     */
    moveUp() {
        this.moveVertically(1);
    }

    /**
     * 下移
     */
    moveDown() {
        this.moveVertically(-1);
    }

    /**
     * 纵向移动选中的元素，单位为一条横线
     */
    private moveVertically(direction: 1 | -1) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const step: Beats = [0, 1, stateManager.state.horizonalLineCount];
        const shift = (beats: Beats) => direction === 1 ? addBeats(beats, step) : subBeats(beats, step);
        store.validateBlockAreaEventTimes(selectionManager.selectedElements.filter(isEvent).map(event => ({
            event,
            startTime: shift(event.startTime),
            endTime: shift(event.endTime)
        })));
        historyManager.group(direction === 1 ? "上移" : "下移");
        for (const element of selectionManager.selectedElements) {
            this.moveElement(element, shift(getElementStartTime(element)), shift(getElementEndTime(element)));
        }
        historyManager.ungroup();
    }

    /** 沿时间轴移动元素并记录移动 */
    private moveElement(element: SelectableElement, newStartTime: Beats, newEndTime: Beats) {
        const historyManager = store.useManager("historyManager");
        const startTime = getElementStartTime(element);
        const endTime = getElementEndTime(element);

        if (isNoteLike(element)) {
            historyManager.recordModifyNote(element.id, "startTime", newStartTime, startTime);
            historyManager.recordModifyNote(element.id, "endTime", newEndTime, endTime);
        }
        else if (isBlockArea(element)) {
            historyManager.recordModifyBlockArea(element.index, "appearTime", newStartTime, startTime);
            historyManager.recordModifyBlockArea(element.index, "disappearTime", newEndTime, endTime);
        }
        else if (isActiveInterval(element)) {
            const blockArea = element.owner;
            if (!blockArea) {
                return;
            }

            const intervals = blockArea.activeIntervals;
            const position = intervals.indexOf(element);
            if (position === -1) {
                return;
            }

            element.startTime = newStartTime;
            element.endTime = newEndTime;
            historyManager.recordModifyActiveInterval(blockArea.index, {
                position,
                startTime,
                endTime
            }, {
                position: intervals.indexOf(element),
                startTime: element.startTime,
                endTime: element.endTime
            });
            return;
        }
        else if (isEvent(element)) {
            historyManager.recordModifyEvent(element.id, "startTime", newStartTime, startTime);
            historyManager.recordModifyEvent(element.id, "endTime", newEndTime, endTime);
        }
        setElementStartTime(element, newStartTime);
        setElementEndTime(element, newEndTime);
    }

    async moveToJudgeLine(targetJudgeLineNumber?: number) {
        const stateManager = store.useManager("stateManager");
        if (stateManager._state.isEditingBlockArea) {
            throw new Error("噪域编辑时不能把元素移动到其他判定线");
        }

        if (targetJudgeLineNumber === undefined) {
            targetJudgeLineNumber = await ElMessageBox.prompt("请输入要移动到的判定线编号", "移动判定线").then(res => +res.value) as number;
        }

        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const elements = new Array<SelectableElement>();
        historyManager.group(`移到${targetJudgeLineNumber}号判定线`);
        try {
            for (const element of selectionManager.selectedElements) {
                if (isNoteLike(element)) {
                    const note = store.addNote(element.toObject(), targetJudgeLineNumber);
                    elements.push(note);

                    // 必须记录新音符的 id：撤销时要删掉的是新加的音符，
                    // 记录旧元素 id 的话撤销会找不到元素或删错元素
                    historyManager.recordAddNote(note.id);
                }
                else if (isEvent(element)) {
                    const event = store.addEvent(element.toObject(), element.type, element.eventLayerId, targetJudgeLineNumber);
                    elements.push(event);
                    historyManager.recordAddEvent(event.id);
                }
            }

            // 删除原元素也要放在同一个分组里，这样新增和删除才能在一次撤销中一起回退
            selectionManager.deleteSelection();
        }
        finally {
            historyManager.ungroup();
        }
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
