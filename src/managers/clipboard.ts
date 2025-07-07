import { Beats, getBeatsValue, subBeats, addBeats } from "@/models/beats";
import { Note } from "@/models/note";
import { SelectedElement } from "@/types";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import store from "@/store";
import Manager from "./abstract";

export default class ClipboardManager extends Manager {
    clipboard: SelectedElement[] = []
    constructor() {
        super();
        globalEventEmitter.on("CUT", createCatchErrorByMessage(() => {
            this.cut();
        }, "剪切"))
        globalEventEmitter.on("COPY", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制"))
        globalEventEmitter.on("PASTE", createCatchErrorByMessage(() => {
            this.paste();
        }, "粘贴"))
        globalEventEmitter.on("PASTE_MIRROR", createCatchErrorByMessage(() => {
            this.pasteMirror();
        }, "镜像粘贴"))
    }
    /**
     * 剪切选中的元素
     */
    cut() {
        const selectionManager = store.useManager("selectionManager");
        this.copy();
        selectionManager.deleteSelection();
    }
    /**
     * 复制选中的元素
     */
    copy() {
        const selectionManager = store.useManager("selectionManager");
        this.clipboard = [...selectionManager.selectedElements];
    }
    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const mouseManager = store.useManager("mouseManager");
        const historyManager = store.useManager("historyManager");
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
    pasteMirror() {
        const selectionManager = store.useManager("selectionManager");
        this.paste();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX = -element.positionX;
            }
            else {
                if (element.type == "moveX" || element.type == "moveY" || element.type == "rotate")
                    element.start = -element.start;
                element.end = -element.end;
            }
        }
    }
}