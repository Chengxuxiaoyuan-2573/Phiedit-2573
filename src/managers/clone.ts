import { addBeats, Beats, beatsToSeconds, isGreaterThanBeats, isLessThanBeats, MAX_BEATS, MIN_BEATS, subBeats } from "@/models/beats";
import store from "@/store";
import { isNoteLike } from "@/models/note";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import { createCatchErrorByMessage } from "@/tools/catchError";
import MathUtils from "@/tools/mathUtils";
import Constants from "@/constants";
import { SelectableElement } from "@/models/element";
export default class CloneManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("CLONE", createCatchErrorByMessage(() => {
            this.clone();
        }, "克隆"));
        globalEventEmitter.on("REPEAT", createCatchErrorByMessage(() => {
            this.repeat();
        }, "连续粘贴"));
    }
    clone() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        let beats: Beats = [0, 0, 1];
        let i = 0;
        if (stateManager.cache.clone.targetJudgeLines.length === 0) {
            throw new Error("请选择要克隆的目标判定线");
        }
        historyManager.group("克隆");
        while (isLessThanBeats(beats, stateManager.cache.clone.timeDuration)) {
            for (const element of selectionManager.selectedElements) {
                if (isNoteLike(element)) {
                    const noteObject = element.toObject();
                    noteObject.startTime = addBeats(noteObject.startTime, beats);
                    noteObject.endTime = addBeats(noteObject.endTime, beats);
                    const newNote = store.addNote(noteObject, stateManager.cache.clone.targetJudgeLines[i]);
                    historyManager.recordAddNote(newNote.id);
                }
                else {
                    const eventObject = element.toObject();
                    eventObject.startTime = addBeats(eventObject.startTime, beats);
                    eventObject.endTime = addBeats(eventObject.endTime, beats);
                    const newEvent = store.addEvent(eventObject, element.type, element.eventLayerId, stateManager.cache.clone.targetJudgeLines[i]);
                    historyManager.recordAddEvent(newEvent.id);
                }
            }
            beats = addBeats(beats, stateManager.cache.clone.timeDelta);
            i = (i + 1) % stateManager.cache.clone.targetJudgeLines.length;
        }

        // 不保留源元素
        selectionManager.deleteSelection();
        historyManager.ungroup();
    }
    repeat() {
        // 把选中的元素复制一遍并粘贴
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const coordinateManager = store.useManager("coordinateManager");
        const chart = store.useChart();
        if (selectionManager.selectedElements.length === 0) {
            throw new Error("请选择元素");
        }

        let minTime: Beats = [...MAX_BEATS];
        let maxTime: Beats = [...MIN_BEATS];
        for (let i = 0; i < selectionManager.selectedElements.length; i++) {
            const element = selectionManager.selectedElements[i];
            if (isLessThanBeats(element.startTime, minTime)) {
                minTime = element.startTime;
            }

            if (isGreaterThanBeats(element.endTime, maxTime)) {
                maxTime = element.endTime;
            }
        }

        const length = subBeats(maxTime, minTime);
        historyManager.group("连续粘贴");
        const elements: SelectableElement[] = [];
        for (const element of selectionManager.selectedElements) {
            if (isNoteLike(element)) {
                const noteObject = element.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, length);
                noteObject.endTime = addBeats(noteObject.endTime, length);
                const note = store.addNote(noteObject, element.judgeLineNumber);
                historyManager.recordAddNote(note.id);
                elements.push(note);
            }
            else {
                const eventObject = element.toObject();
                eventObject.startTime = addBeats(eventObject.startTime, length);
                eventObject.endTime = addBeats(eventObject.endTime, length);
                const event = store.addEvent(eventObject, element.type, element.eventLayerId, element.judgeLineNumber);
                historyManager.recordAddEvent(event.id);
                elements.push(event);
            }
        }
        historyManager.ungroup();
        selectionManager.select(elements);
        const seconds = beatsToSeconds(chart.BPMList, maxTime);
        if (!MathUtils.between(coordinateManager.getRelativePositionYOfSeconds(seconds), Constants.EDITOR_VIEW_NOTES_VIEWBOX.top, Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom)) {
            store.setSeconds(seconds);
        }
    }
}