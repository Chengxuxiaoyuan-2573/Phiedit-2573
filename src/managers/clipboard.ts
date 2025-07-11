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
        globalEventEmitter.on("PASTE", createCatchErrorByMessage((time) => {
            this.paste(time);
        }, "粘贴"))
        globalEventEmitter.on("PASTE_MIRROR", createCatchErrorByMessage((time) => {
            this.pasteMirror(time);
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
        if(selectionManager.selectedElements.length == 0) return;
        this.clipboard = [...selectionManager.selectedElements];
    }
    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste(time?: Beats) {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const mouseManager = store.useManager("mouseManager");
        const historyManager = store.useManager("historyManager");
        const y = mouseManager.mouseY;
        const minStartTime = this.clipboard.reduce<Beats>((min, element) => {
            return getBeatsValue(min) < getBeatsValue(element.startTime) ? min : element.startTime;
        }, [Infinity, 0, 1]);
        const pasteTime = time ?? stateManager.attatchY(y);
        const delta = subBeats(pasteTime, minStartTime);
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
    pasteMirror(time?: Beats) {
        const selectionManager = store.useManager("selectionManager");
        this.paste(time);
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX = -element.positionX;
            }
            else {
                if (element.type == "moveX" || element.type == "moveY" || element.type == "rotate"){
                    element.start = -element.start;
                    element.end = -element.end;
                }
            }
        }
    }
}