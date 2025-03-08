import { Beats, getBeatsValue, subBeats, addBeats } from "@/classes/beats";
import { NumberEvent } from "@/classes/event";
import { Note } from "@/classes/note";
import { SelectedElement } from "@/types";
import selectionManager from "./selection";
import store from "@/store";
import stateManager from "./state";
import mouseManager from "./mouse";
import globalEventEmitter from "@/eventEmitter";

class ClipboardManager {
    clipboard: SelectedElement[] = []
    constructor() {
        globalEventEmitter.on("CUT", () => {
            this.cut();
        })
        globalEventEmitter.on("COPY", () => {
            this.copy();
        })
        globalEventEmitter.on("PASTE", () => {
            this.paste();
        })
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
        const chart = store.useChart();
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
                const note = new Note(noteObject, chart.BPMList);
                stateManager.currentJudgeLine.notes.push(note);
                elements.push(note);
            }
            else {
                const eventObject = element.toObject();
                eventObject.startTime = addBeats(eventObject.startTime, delta);
                eventObject.endTime = addBeats(eventObject.endTime, delta);
                switch (element.type) {
                    case 'moveX': {
                        const event = new NumberEvent(eventObject, chart.BPMList, 'moveX');
                        stateManager.currentEventLayer.moveXEvents.push(event);
                        elements.push(event);
                        break;
                    }
                    case 'moveY': {
                        const event = new NumberEvent(eventObject, chart.BPMList, 'moveY');
                        stateManager.currentEventLayer.moveYEvents.push(event);
                        elements.push(event);
                        break;
                    }
                    case 'rotate': {
                        const event = new NumberEvent(eventObject, chart.BPMList, 'rotate');
                        stateManager.currentEventLayer.rotateEvents.push(event);
                        elements.push(event);
                        break;
                    }
                    case 'alpha': {
                        const event = new NumberEvent(eventObject, chart.BPMList, 'alpha');
                        stateManager.currentEventLayer.alphaEvents.push(event);
                        elements.push(event);
                        break;
                    }
                    case 'speed': {
                        const event = new NumberEvent(eventObject, chart.BPMList, 'speed');
                        stateManager.currentEventLayer.speedEvents.push(event);
                        elements.push(event);
                        break;
                    }
                }
            }
        }
        selectionManager.unselectAll();
        selectionManager.select(...elements);
    }
}
export default new ClipboardManager();