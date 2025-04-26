import { SelectedElement } from "@/types";
import { reactive } from "vue";
import stateManager from "./state";
import globalEventEmitter from "@/eventEmitter";
import historyManager from "./history";
import { Note } from "@/models/note";

class SelectionManager {
    readonly selectedElements: SelectedElement[] = reactive([]);
    constructor() {
        globalEventEmitter.on("DELETE", () => {
            this.deleteSelection();
        })
        globalEventEmitter.on("SELECT_ALL", () => {
            this.selectAll();
        })
        globalEventEmitter.on("UNSELECT_ALL", () => {
            this.unselectAll();
        })
    }
    select(...elements: SelectedElement[]) {
        this.selectedElements.push(...elements);
    }
    unselect(...elements: SelectedElement[]) {
        for (const element of elements) {
            const index = this.selectedElements.indexOf(element);
            if (index !== -1) {
                this.selectedElements.splice(index, 1);
            }
            else {
                console.warn("SelectionManager: unselect failed");
            }
        }
    }
    isSelected(element: SelectedElement) {
        return this.selectedElements.includes(element);
    }
    /** 取消所有选中元素 */
    unselectAll() {
        this.selectedElements.splice(0);
    }

    deleteSelection() {
        for (const element of this.selectedElements) {
            if (element instanceof Note) {
                historyManager.removeNote(element.id);
            }
            else {
                historyManager.removeEvent(element.id);
            }
        }
        this.unselectAll();
    }
    /**
     * 全选
     */
    selectAll() {
        this.unselectAll();
        for (const element of stateManager.currentJudgeLine.notes) {
            this.selectedElements.push(element);
        }
        for (const element of stateManager.currentEventLayer.moveXEvents) {
            this.selectedElements.push(element);
        }
        for (const element of stateManager.currentEventLayer.moveYEvents) {
            this.selectedElements.push(element);
        }
        for (const element of stateManager.currentEventLayer.rotateEvents) {
            this.selectedElements.push(element);
        }
        for (const element of stateManager.currentEventLayer.alphaEvents) {
            this.selectedElements.push(element);
        }
        for (const element of stateManager.currentEventLayer.speedEvents) {
            this.selectedElements.push(element);
        }
    }
}
export default new SelectionManager();