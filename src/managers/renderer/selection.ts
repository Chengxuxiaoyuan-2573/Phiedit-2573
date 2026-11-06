/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { reactive, toRaw } from "vue";
import globalEventEmitter from "@/eventEmitter";
import { isNoteLike } from "@/models/rpe/note";
import store from "@/store";
import Manager from "./abstract";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/rpe/eventLayer";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { SelectableElement, isActiveInterval, isBlockArea } from "@/models/rpe/element";
import { isEvent } from "@/models/rpe/event";
import { BLOCK_AREA_EVENT_LAYER_ID } from "@/models/rpe/blockArea";

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

    /** 删除所有选中元素，或删除面板明确指定的元素 */
    deleteSelection(elements?: SelectableElement[]) {
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        const stateManager = store.useManager("stateManager");
        const chart = store.useChart();
        mouseManager.checkMouseUp();

        // 谱面中的噪域和激活区间使用原始对象，按引用删除前先取出 Vue 代理中的原始对象
        const selected = [...new Set((elements ?? this.selectedElements).map(element => toRaw(element)))];
        if (selected.length === 0) {
            throw new Error("未选择任何元素");
        }

        // 删除噪域的记录已经包含它的激活区间和事件
        const removedBlockAreaIds = new Set(selected.filter(isBlockArea).map(area => area.index));
        let currentPosition = stateManager.state.currentBlockAreaNumber;
        const rollback: Array<() => void> = [];
        const rememberRemoval = (list: SelectableElement[], element: SelectableElement) => {
            const position = list.findIndex(item => toRaw(item) === element);
            if (position === -1) {
                throw new Error("选中的元素已不在谱面中");
            }

            // 保留原对象和位置，失败时可原样恢复选区引用和列表顺序
            const original = list[position];
            rollback.push(() => {
                if (!list.includes(original)) {
                    list.splice(position, 0, original);
                }
            });
            return position;
        };

        try {
            historyManager.recordGroup("删除", () => {
                for (const element of selected) {
                    if (isNoteLike(element)) {
                        rememberRemoval(store.getJudgeLineById(element.judgeLineNumber).notes, element);
                        historyManager.recordRemoveNote(element.toObject(), element.judgeLineNumber, element.id);
                        store.removeNote(element.id);
                    }
                    else if (isBlockArea(element)) {
                        const position = rememberRemoval(chart.blockAreaList, element);
                        historyManager.recordRemoveBlockArea(element.toObject(), element.index, position);
                        store.removeBlockArea(element);
                        if (position < currentPosition) {
                            currentPosition--;
                        }
                    }
                    else if (isActiveInterval(element)) {
                        const blockArea = element.owner;
                        if (!blockArea) {
                            throw new Error("激活区间没有所属的噪域，无法删除");
                        }

                        if (removedBlockAreaIds.has(blockArea.index)) {
                            continue;
                        }

                        if (!chart.blockAreaList.includes(blockArea)) {
                            throw new Error("激活区间所属的噪域已不在谱面中");
                        }

                        const position = rememberRemoval(blockArea.activeIntervals, element);
                        historyManager.recordRemoveActiveInterval(blockArea.index, element.toObject(), position);
                        rollback.push(() => {
                            element.owner = blockArea;
                        });
                        blockArea.removeActiveInterval(element);
                    }
                    else if (isEvent(element)) {
                        if (element.eventLayerId === BLOCK_AREA_EVENT_LAYER_ID && removedBlockAreaIds.has(element.judgeLineNumber)) {
                            continue;
                        }
                        rememberRemoval(store.getSiblingEvents(element), element);
                        historyManager.recordRemoveEvent(element.toObject(), element.type, element.eventLayerId, element.judgeLineNumber, element.id);
                        store.removeEvent(element.id);
                    }
                }
            });
        }
        catch (error) {
            for (const restore of rollback.reverse()) {
                restore();
            }
            throw error;
        }

        if (removedBlockAreaIds.size > 0) {
            stateManager.state.currentBlockAreaNumber = currentPosition;
            stateManager.notifyBlockAreaListChanged();
        }
        this.unselectAll();
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
