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
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
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
        mouseManager.checkMouseUp();
        const y = mouseManager.mouseY;
        const minStartTime = this.clipboard.reduce<Beats>((min, element) => {
            return getBeatsValue(min) < getBeatsValue(element.startTime) ? min : element.startTime;
        }, [Infinity, 0, 1]);
        const pasteTime = time ?? stateManager.attatchY(y);
        const delta = subBeats(pasteTime, minStartTime);
        const elements = new Array<SelectedElement>();

        historyManager.group("粘贴");
        for (const element of this.clipboard) {
            if (element instanceof Note) {
                const noteObject = element.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, delta);
                noteObject.endTime = addBeats(noteObject.endTime, delta);
                const note = store.addNote(noteObject, stateManager.state.currentJudgeLineNumber);
                historyManager.recordAddNote(note.id);
                elements.push(note);
            }
            else {
                const eventObject = element.toObject();
                eventObject.startTime = addBeats(eventObject.startTime, delta);
                eventObject.endTime = addBeats(eventObject.endTime, delta);
                const event = store.addEvent(eventObject, element.type, element.eventLayerId, stateManager.state.currentJudgeLineNumber)
                historyManager.recordAddEvent(event.id);
                elements.push(event);
            }
        }
        historyManager.ungroup();

        selectionManager.unselectAll();
        selectionManager.select(...elements);
    }
    pasteMirror(time?: Beats) {
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        this.paste(time);
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                historyManager.recordModifyNote(element.id, "positionX", -element.positionX, element.positionX);
                element.positionX = -element.positionX;
            }
            else {
                if (element.type == "moveX" || element.type == "moveY" || element.type == "rotate"){
                    historyManager.recordModifyEvent(element.id, "start", -element.start, element.start);
                    historyManager.recordModifyEvent(element.id, "end", -element.end, element.end);
                    element.start = -element.start;
                    element.end = -element.end;
                }
            }
        }
    }
}