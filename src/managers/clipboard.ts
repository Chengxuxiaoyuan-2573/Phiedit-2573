import { Beats, getBeatsValue, subBeats, addBeats } from "@/models/beats";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import store from "@/store";
import Manager from "./abstract";
import { reactive } from "vue";
import { isEventLike, isNumberEventLike } from "@/models/event";
import { SelectableElement } from "@/models/element";
import { isNoteLike } from "@/models/note";

export default class ClipboardManager extends Manager {
    readonly clipboard: SelectableElement[] = reactive([]);
    constructor() {
        super();
        globalEventEmitter.on("CUT", createCatchErrorByMessage(() => {
            this.cut();
        }, "剪切"));
        globalEventEmitter.on("COPY", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制"));
        globalEventEmitter.on("PASTE", createCatchErrorByMessage((time) => {
            this.paste(time);
        }, "粘贴"));
        globalEventEmitter.on("PASTE_MIRROR", createCatchErrorByMessage((time) => {
            this.pasteMirror(time);
        }, "镜像粘贴"));
    }

    /**
     * 剪切选中的元素
     */
    cut() {
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const selectionManager = store.useManager("selectionManager");
        if (selectionManager.selectedElements.length === 0) {
            throw new Error("未选择任何元素");
        }
        this.copy();
        selectionManager.deleteSelection();
    }

    /**
     * 复制选中的元素
     */
    copy() {
        const selectionManager = store.useManager("selectionManager");
        if (selectionManager.selectedElements.length === 0) {
            throw new Error("未选择任何元素");
        }
        this.clipboard.length = 0;
        this.clipboard.push(...selectionManager.selectedElements);
    }

    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste(time?: Beats) {
        if (this.clipboard.length === 0) {
            throw new Error("剪切板为空");
        }

        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const mouseManager = store.useManager("mouseManager");
        const historyManager = store.useManager("historyManager");
        const coordinateManager = store.useManager("coordinateManager");
        mouseManager.checkMouseUp();
        const y = mouseManager.mouseY;
        const minStartTime = this.clipboard.reduce<Beats>((min, element) => {
            return getBeatsValue(min) < getBeatsValue(element.startTime) ? min : element.startTime;
        }, [Infinity, 0, 1]);
        const pasteTime = time ?? coordinateManager.attatchY(y);
        const delta = subBeats(pasteTime, minStartTime);
        const elements = new Array<SelectableElement>();
        const isSameBaseEventLayer = (() => {
            let event = null;
            for (const element of this.clipboard) {
                if (isEventLike(element)) {
                    if (event !== null && element.eventLayerId !== event.eventLayerId || element.eventLayerId === "X") {
                        return false;
                    }
                    event = element;
                }
            }
            return true;
        })();
        historyManager.group("粘贴");
        for (const element of this.clipboard) {
            if (isNoteLike(element)) {
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
                const event = store.addEvent(eventObject, element.type, isSameBaseEventLayer ? stateManager._state.currentEventLayerId : element.eventLayerId, stateManager.state.currentJudgeLineNumber);
                historyManager.recordAddEvent(event.id);
                elements.push(event);
            }
        }
        historyManager.ungroup();

        selectionManager.select(elements);
    }
    pasteMirror(time?: Beats) {
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        this.paste(time);
        for (const element of selectionManager.selectedElements) {
            if (isNoteLike(element)) {
                historyManager.recordModifyNote(element.id, "positionX", -element.positionX, element.positionX);
                element.positionX = -element.positionX;
            }
            else {
                if (isNumberEventLike(element) && (element.type === "moveX" || element.type === "moveY" || element.type === "rotate")) {
                    historyManager.recordModifyEvent(element.id, "start", -element.start, element.start);
                    historyManager.recordModifyEvent(element.id, "end", -element.end, element.end);
                    element.start = -element.start;
                    element.end = -element.end;
                }
            }
        }
    }
}