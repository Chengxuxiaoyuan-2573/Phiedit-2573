import { Beats, getBeatsValue, subBeats, addBeats } from "@/models/beats";
import { Note } from "@/models/note";
import { SelectedElement } from "@/types";
import selectionManager from "./selection";
import stateManager from "./state";
import mouseManager from "./mouse";
import historyManager from "./history";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";

class ClipboardManager {
    clipboard: SelectedElement[] = []
    constructor() {
        globalEventEmitter.on("CUT", createCatchErrorByMessage(() => {
            this.cut();
        }, "剪切"))
        globalEventEmitter.on("COPY", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制"))
        globalEventEmitter.on("PASTE", createCatchErrorByMessage(() => {
            this.paste();
        }, "粘贴"))
    }
    /**
     * 剪切选中的元素
     */
    cut() {
        this.copy();
        selectionManager.deleteSelection();
    }
    /**
     * 复制选中的元素
     */
    copy() {
        this.clipboard = [...selectionManager.selectedElements];
    }
    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste() {
        const y = mouseManager.mouseY;
        const minStartTime = this.clipboard.reduce<Beats>((min, element) => {
            return getBeatsValue(min) < getBeatsValue(element.startTime) ? min : element.startTime;
        }, [Infinity, 0, 1]);
        const mouseTime = stateManager.attatchY(y);
        const delta = subBeats(mouseTime, minStartTime);
        const elements = new Array<SelectedElement>();
        for (const element of this.clipboard) {
            if (element instanceof Note) {
                const noteObject = element.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, delta);
                noteObject.endTime = addBeats(noteObject.endTime, delta);
                const note = historyManager.addNote(noteObject, stateManager.state.currentJudgeLineNumber);
                elements.push(note);
            }
            else {
                const eventObject = element.toObject();
                eventObject.startTime = addBeats(eventObject.startTime, delta);
                eventObject.endTime = addBeats(eventObject.endTime, delta);
                const event = historyManager.addEvent(eventObject, element.type, element.eventLayerId, stateManager.state.currentJudgeLineNumber)
                elements.push(event);
            }
        }
        selectionManager.unselectAll();
        selectionManager.select(...elements);
    }
}
export default new ClipboardManager();