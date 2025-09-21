import { addBeats, Beats, beatsToSeconds, getBeatsValue } from "@/models/beats";
import { getEasingValue } from "@/models/easing";
import { Note, NoteAbove, NoteFake, NoteType } from "@/models/note";
import store from "@/store";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";

export default class NoteFiller extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("FILL_NOTES", createCatchErrorByMessage(() => {
            this.fill();
        }, "填充"));
    }
    get startNote() {
        const selectionManager = store.useManager("selectionManager");
        const selectedNotes = selectionManager.selectedElements.filter(e => e instanceof Note);
        if (selectedNotes.length === 0) return null;

        // 取时间较小的音符作为起始音符
        return selectedNotes.reduce((prev, curr) => {
            return getBeatsValue(prev.startTime) < getBeatsValue(curr.startTime) ? prev : curr;
        });
    }
    get endNote() {
        const selectionManager = store.useManager("selectionManager");
        const selectedNotes = selectionManager.selectedElements.filter(e => e instanceof Note);
        if (selectedNotes.length === 0) return null;

        // 取时间较大的音符作为结束音符
        return selectedNotes.reduce((prev, curr) => {
            return getBeatsValue(prev.startTime) > getBeatsValue(curr.startTime) ? prev : curr;
        });
    }
    fill() {
        const stateManager = store.useManager("stateManager");
        const historyManager = store.useManager("historyManager");
        const selectionManager = store.useManager("selectionManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const notes = selectionManager.selectedElements.filter(element => element instanceof Note).length;
        if (notes !== 2) {
            throw new Error(`请选择两个音符，当前选中了${notes}个音符`);
        }

        const chart = store.useChart();
        const startNote = this.startNote;
        const endNote = this.endNote;
        if (!startNote || !endNote) {
            throw new Error("请先选择起始和结束音符");
        }

        const startTime = startNote.startTime;
        const endTime = endNote.startTime;
        if (getBeatsValue(startTime) > getBeatsValue(endTime)) {
            throw new Error("起始音符必须在结束音符之前");
        }

        if (startNote.judgeLineNumber !== stateManager._state.currentJudgeLineNumber || endNote.judgeLineNumber !== stateManager._state.currentJudgeLineNumber) {
            throw new Error("起始音符和结束音符必须都在当前判定线上");
        }

        const startSeconds = beatsToSeconds(chart.BPMList, startTime);
        const endSeconds = beatsToSeconds(chart.BPMList, endTime);
        const step: Beats = [0, 1, stateManager.cache.noteFill.density];
        historyManager.group("曲线填充音符");
        for (let time = addBeats(startTime, step); getBeatsValue(time) < getBeatsValue(endTime); time = addBeats(time, step)) {
            const currentSeconds = beatsToSeconds(chart.BPMList, time);
            const noteObject = {
                startTime: time,
                endTime: stateManager.cache.noteFill.type === NoteType.Hold ? addBeats(time, step) : time,
                type: stateManager.cache.noteFill.type,
                alpha: startNote.alpha,
                speed: 1,
                positionX: getEasingValue(stateManager.cache.noteFill.easingType, startSeconds, endSeconds, startNote.positionX, endNote.positionX, currentSeconds),
                above: NoteAbove.Above,
                isFake: NoteFake.Real,
                size: 1,
                yOffset: 0,
                visibleTime: 999999
            };
            const note = store.addNote(noteObject, stateManager._state.currentJudgeLineNumber);
            historyManager.recordAddNote(note.id);
        }
        historyManager.ungroup();
    }
}