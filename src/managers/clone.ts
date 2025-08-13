import { reactive } from "vue";
import { addBeats, Beats, isGreaterThanBeats, isLessThanBeats, subBeats } from "@/models/beats";
import store from "@/store";
import { Note } from "@/models/note";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
// export enum CloneValidStateCode {
//     OK,
//     Overlap,
//     TooFewJudgeLines,
// }
// interface CloneValidResult {
//     code: CloneValidStateCode;
//     message?: string;
// }
export default class CloneManager extends Manager {
    readonly options = reactive({
        targetJudgeLines: new Array<number>(),
        targetEventLayer: 0,
        timeDuration: [8, 0, 1] as Beats,
        timeDelta: [0, 1, 4] as Beats,
        // isContain: false
    })
    constructor() {
        super();
        globalEventEmitter.on("CLONE", () => {
            this.clone();
        })
        globalEventEmitter.on("REPEAT", () => {
            this.repeat();
        })
    }
    // checkIsValid(): CloneValidResult {
    //     const selectionManager = store.useManager("selectionManager");
    //     const chart = store.useChart();
    //     let beats: Beats = [0, 0, 1];
    //     let i = 0;
    //     const min = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
    //         if (isLessThanBeats(prev, curr.startTime) || curr instanceof Note) {
    //             return prev;
    //         }
    //         else {
    //             return curr.startTime;
    //         }
    //     }, [0, 0, 1]);
    //     const max = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
    //         if (isGreaterThanBeats(prev, curr.endTime) || curr instanceof Note) {
    //             return prev;
    //         }
    //         else {
    //             return curr.endTime;
    //         }
    //     }, [0, 0, 1]);
    //     const length = subBeats(max, min);
    //     const minCountOfJudgeLines = divide2Beats(length, this.options.timeDelta);
    //     if (this.options.targetJudgeLines.length < minCountOfJudgeLines) {
    //         return {
    //             code: CloneValidStateCode.TooFewJudgeLines,
    //             message: `选择的判定线太少，在当前配置下请至少选择${minCountOfJudgeLines}条判定线`
    //         };
    //     }
    //     while (isLessThanBeats(beats, this.options.timeDuration)) {
    //         const judgeLine = chart.judgeLineList[this.options.targetJudgeLines[i]];
    //         for (const element of selectionManager.selectedElements) {
    //             if (!(element instanceof Note)) {
    //                 const newStartTime = addBeats(element.startTime, beats);
    //                 const newEndTime = addBeats(element.endTime, beats);
    //                 const events = judgeLine.eventLayers[this.options.targetEventLayer].getEventsByType(element.type);
    //                 if (events.some((event) => {
    //                     const startTime1 = getBeatsValue(newStartTime);
    //                     const endTime1 = getBeatsValue(newEndTime);
    //                     const startTime2 = getBeatsValue(event.startTime);
    //                     const endTime2 = getBeatsValue(event.endTime);
    //                     return (
    //                         startTime1 < endTime2 && startTime2 < endTime1
    //                         && !selectionManager.isSelected(event)
    //                     );
    //                 })) {
    //                     return {
    //                         code: CloneValidStateCode.Overlap,
    //                         message: `生成的事件在${judgeLine.id}号判定线上将与原有事件重叠`
    //                     }
    //                 }
    //             }
    //         }
    //         beats = addBeats(beats, this.options.timeDelta);
    //         i = (i + 1) % this.options.targetJudgeLines.length;
    //     }
    //     return {
    //         code: CloneValidStateCode.OK
    //     };
    // }
    clone() {
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        let beats: Beats = [0, 0, 1];
        let i = 0;

        historyManager.group("克隆");
        while (isLessThanBeats(beats, this.options.timeDuration)) {
            for (const element of selectionManager.selectedElements) {
                if (element instanceof Note) {
                    const noteObject = element.toObject();
                    noteObject.startTime = addBeats(noteObject.startTime, beats);
                    noteObject.endTime = addBeats(noteObject.endTime, beats);
                    const newNote = store.addNote(noteObject, element.judgeLineNumber);
                    historyManager.recordAddNote(newNote.id);
                }
                else {
                    const eventObject = element.toObject();
                    eventObject.startTime = addBeats(eventObject.startTime, beats);
                    eventObject.endTime = addBeats(eventObject.endTime, beats);
                    const newEvent = store.addEvent(eventObject, element.type, element.eventLayerId, element.judgeLineNumber);
                    historyManager.recordAddEvent(newEvent.id);
                }
            }
            beats = addBeats(beats, this.options.timeDelta);
            i = (i + 1) % this.options.targetJudgeLines.length;
        }
        historyManager.ungroup();

        // 不保留源元素
        selectionManager.deleteSelection();
    }
    repeat() {
        // 把选中的元素复制一遍并粘贴（有bug，暂不使用）
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        if (selectionManager.selectedElements.length == 0) {
            throw new Error("请选择元素");
        }
        const minTime = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
            if (isLessThanBeats(prev, curr.startTime)) {
                return prev;
            }
            else {
                return curr.startTime;
            }
        }, [0, 0, 1]);
        const maxTime = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
            if (isGreaterThanBeats(prev, curr.endTime)) {
                return prev;
            }
            else {
                return curr.endTime;
            }
        }, [0, 0, 1]);
        const length = subBeats(maxTime, minTime);
        historyManager.group("重复");
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                const noteObject = element.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, length);
                noteObject.endTime = addBeats(noteObject.endTime, length);
                store.addNote(noteObject, element.judgeLineNumber);
                historyManager.recordAddNote(element.id);
            }
            else {
                const eventObject = element.toObject();
                eventObject.startTime = addBeats(eventObject.startTime, length);
                eventObject.endTime = addBeats(eventObject.endTime, length);
                store.addEvent(eventObject, element.type, element.eventLayerId, element.judgeLineNumber);
                historyManager.recordAddEvent(element.id);
            }
        }
        historyManager.ungroup();
    }
}