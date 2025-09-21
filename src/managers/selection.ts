import { NoteOrEvent } from "@/models/event";
import { reactive } from "vue";
import globalEventEmitter from "@/eventEmitter";
import { Note } from "@/models/note";
import store from "@/store";
import Manager from "./abstract";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/eventLayer";
import { createCatchErrorByMessage } from "@/tools/catchError";

export default class SelectionManager extends Manager {
    /** 被选中的元素。有时也用“selection”来代替“selectedElements”。 */
    readonly selectedElements: NoteOrEvent[] = reactive([]);
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
    select(elements: NoteOrEvent[]) {
        this.selectedElements.splice(0);
        this.selectedElements.push(...elements);
        globalEventEmitter.emit("SELECTION_UPDATE");
    }

    /** 在原有选择的基础上添加元素 */
    addToSelection(elements: NoteOrEvent[]) {
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
    removeFromSelection(elements: NoteOrEvent[]) {
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
    isSelected(element: NoteOrEvent) {
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
        mouseManager.checkMouseUp();
        historyManager.group("删除");
        for (const element of this.selectedElements) {
            if (element instanceof Note) {
                store.removeNote(element.id);
                historyManager.recordRemoveNote(element.toObject(), element.judgeLineNumber, element.id);
            }
            else {
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