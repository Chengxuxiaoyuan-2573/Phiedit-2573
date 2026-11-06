/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { reactive } from "vue";
import globalEventEmitter from "@/eventEmitter";
import { isNoteLike } from "@/models/rpe/note";
import store from "@/store";
import Manager from "./abstract";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/rpe/eventLayer";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { SelectableElement, isActiveInterval, isBlockArea } from "@/models/rpe/element";
import { isEvent } from "@/models/rpe/event";

export default class SelectionManager extends Manager {
    /** 被选中的元素。有时也用“selection”来代替“selectedElements”。 */
    readonly selectedElements: SelectableElement[] = reactive([]);
    constructor() {
        super();
        globalEventEmitter.on("DELETE", createCatchErrorByMessage(() => {
            this.deleteSelection();
        }, "删除"));
        globalEventEmitter.on("SELECT_ALL", createCatchErrorByMessage(() => {
            this.selectAll();
        }, "全选", false));
        globalEventEmitter.on("UNSELECT_ALL", createCatchErrorByMessage(() => {
            this.unselectAll();
        }, "取消选择", false));

        // 在撤消重做时，取消所有选中元素，以免 selectedElements 依赖旧的元素而出现 bug
        globalEventEmitter.on("HISTORY_UPDATE", (type) => {
            if (type === "UNDO" || type === "REDO") {
                this.unselectAll();
            }
        });
    }

    /** 取消选择所有元素，并选择指定的元素 */
    select(elements: SelectableElement[]) {
        this.selectedElements.splice(0);
        this.selectedElements.push(...elements);
        globalEventEmitter.emit("SELECTION_UPDATE");
    }

    /** 在原有选择的基础上添加元素 */
    addToSelection(elements: SelectableElement[]) {
        let selectionIsChanged = false;
        for (const element of elements) {
            if (!this.selectedElements.includes(element)) {
                this.selectedElements.push(element);
                selectionIsChanged = true;
            }
        }

        if (selectionIsChanged) {
            globalEventEmitter.emit("SELECTION_UPDATE");
        }
    }

    /** 在原有选择的基础上移除元素 */
    removeFromSelection(elements: SelectableElement[]) {
        let selectionIsChanged = false;
        for (const element of elements) {
            const index = this.selectedElements.indexOf(element);
            if (index !== -1) {
                this.selectedElements.splice(index, 1);
                selectionIsChanged = true;
            }
            else {
                console.error("取消选择的元素不存在：", element);
            }
        }

        if (selectionIsChanged) {
            globalEventEmitter.emit("SELECTION_UPDATE");
        }
    }
    isSelected(element: SelectableElement) {
        return this.selectedElements.includes(element);
    }

    /** 取消所有选中元素 */
    unselectAll() {
        this.selectedElements.splice(0);
        globalEventEmitter.emit("SELECTION_UPDATE");
    }

    /** 删除所有选中元素 */
    deleteSelection() {
        if (this.selectedElements.length === 0) {
            throw new Error("未选择任何元素");
        }

        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        const stateManager = store.useManager("stateManager");
        const chart = store.useChart();
        mouseManager.checkMouseUp();
        historyManager.group("删除");

        // 复制一份：删除噪域时可能会调整当前噪域编号，遍历过程中不能依赖原数组
        for (const element of [...this.selectedElements]) {
            if (isNoteLike(element)) {
                store.removeNote(element.id);
                historyManager.recordRemoveNote(element.toObject(), element.judgeLineNumber, element.id);
            }
            else if (isBlockArea(element)) {
                const position = chart.blockAreaList.indexOf(element);
                const blockAreaObject = element.toObject();
                store.removeBlockArea(element);
                historyManager.recordRemoveBlockArea(blockAreaObject, element.index, position);
                stateManager.notifyBlockAreaListChanged({ removedPosition: position });
            }
            else if (isActiveInterval(element)) {
                const blockArea = element.owner;
                if (!blockArea) {
                    throw new Error("激活区间没有所属的噪域，无法删除");
                }

                const position = blockArea.activeIntervals.indexOf(element);
                const intervalObject = element.toObject();
                blockArea.removeActiveInterval(element);
                historyManager.recordRemoveActiveInterval(blockArea.index, intervalObject, position);
            }
            else if (isEvent(element)) {
                store.removeEvent(element.id);
                historyManager.recordRemoveEvent(element.toObject(), element.type, element.eventLayerId, element.judgeLineNumber, element.id);
            }
        }
        historyManager.ungroup();
        this.selectedElements.splice(0);
        globalEventEmitter.emit("SELECTION_UPDATE");
    }

    /** 全选 */
    selectAll() {
        const stateManager = store.useManager("stateManager");
        this.unselectAll();

        // 噪域编辑时只选中当前噪域的所有事件
        if (stateManager._state.isEditingBlockArea) {
            const blockArea = stateManager.currentBlockArea;
            if (blockArea) {
                this.selectedElements.push(...blockArea.getAllEvents());
            }
            globalEventEmitter.emit("SELECTION_UPDATE");
            return;
        }

        for (const element of stateManager.currentJudgeLine.notes) {
            this.selectedElements.push(element);
        }

        const eventLayer = stateManager.currentEventLayer;
        if (eventLayer instanceof BaseEventLayer) {
            for (const type of baseEventTypes) {
                const events = eventLayer.getEventsByType(type);
                this.selectedElements.push(...events);
            }
        }
        else {
            for (const type of extendedEventTypes) {
                const events = eventLayer.getEventsByType(type);
                this.selectedElements.push(...events);
            }
        }
        globalEventEmitter.emit("SELECTION_UPDATE");
    }
}