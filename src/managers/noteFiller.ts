import { addBeats, Beats, beatsToSeconds, getBeatsValue } from "@/models/beats";
import { EasingType, getEasingValue } from "@/models/easing";
import { Note, NoteAbove, NoteFake, NoteType } from "@/models/note";
import store from "@/store";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";

export default class NoteFiller extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("FILL_NOTES", (type, easingType, density) => {
            this.fill(type, easingType, density);
        })
    }
    get startNote() {
        const selectionManager = store.useManager("selectionManager");
        const selectedNotes = selectionManager.selectedElements.filter(e => e instanceof Note);
        if (selectedNotes.length === 0) return null;
        // 取时间较小的音符作为起始音符
        return selectedNotes.reduce((prev, curr) => {
            return prev.startTime < curr.startTime ? prev : curr;
        });
    }
    get endNote() {
        const selectionManager = store.useManager("selectionManager");
        const selectedNotes = selectionManager.selectedElements.filter(e => e instanceof Note);
        if (selectedNotes.length === 0) return null;
        // 取时间较大的音符作为结束音符
        return selectedNotes.reduce((prev, curr) => {
            return prev.startTime > curr.startTime ? prev : curr;
        });
    }
    fill(type: NoteType, easingType: EasingType, density: number) {
        const stateManager = store.useManager("stateManager");
        const historyManager = store.useManager("historyManager");
        const chart = store.useChart();
        const startNote = this.startNote;
        const endNote = this.endNote;
        if (!startNote || !endNote) {
            throw new Error("请先选择起始和结束音符"); 
        }
        if (startNote.startTime >= endNote.startTime) {
            throw new Error("起始音符必须在结束音符之前");
        }
        const startTime = startNote.startTime;
        const endTime = endNote.startTime;
        const startSeconds = beatsToSeconds(chart.BPMList, startTime);
        const endSeconds = beatsToSeconds(chart.BPMList, endTime);
        const step: Beats = [0, 1, density];
        historyManager.group("曲线填充音符");
        for (let time = addBeats(startTime, step); getBeatsValue(time) < getBeatsValue(endTime); time = addBeats(time, step)) {
            const currentSeconds = beatsToSeconds(chart.BPMList, time);
            const noteObject = {
                startTime: time,
                endTime: type == NoteType.Hold ? addBeats(time, step) : time,
                type: type,
                alpha: startNote.alpha,
                speed: 1,
                positionX: getEasingValue(easingType, startSeconds, endSeconds, startNote.positionX, endNote.positionX, currentSeconds),
                above: NoteAbove.Above,
                isFake: NoteFake.Real,
                size: 1,
                yOffset: 0,
                visibleTime: 999999
            }
            historyManager.addNote(noteObject, stateManager._state.currentJudgeLineNumber);
        }
        historyManager.ungroup();
    }
}