import { reactive } from "vue";
import { addBeats, Beats, divide2Beats, getBeatsValue, isGreaterThanBeats, isLessThanBeats, subBeats } from "@/models/beats";
import store from "@/store";
import { Note } from "@/models/note";
import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
export enum CloneValidStateCode {
    OK,
    Overlap,
    TooFewJudgeLines,
}
interface CloneValidResult {
    code: CloneValidStateCode;
    message?: string;
}
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
    }
    checkIsValid(): CloneValidResult {
        const selectionManager = store.useManager("selectionManager");
        const chart = store.useChart();
        let beats: Beats = [0, 0, 1];
        let i = 0;
        const min = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
            if (isLessThanBeats(prev, curr.startTime) || curr instanceof Note) {
                return prev;
            }
            else {
                return curr.startTime;
            }
        }, [0, 0, 1]);
        const max = selectionManager.selectedElements.reduce<Beats>((prev, curr) => {
            if (isGreaterThanBeats(prev, curr.endTime) || curr instanceof Note) {
                return prev;
            }
            else {
                return curr.endTime;
            }
        }, [0, 0, 1]);
        const length = subBeats(max, min);
        const minCountOfJudgeLines = divide2Beats(length, this.options.timeDelta);
        if (this.options.targetJudgeLines.length < minCountOfJudgeLines) {
            return {
                code: CloneValidStateCode.TooFewJudgeLines,
                message: `选择的判定线太少，在当前配置下请至少选择${minCountOfJudgeLines}条判定线`
            };
        }
        while (isLessThanBeats(beats, this.options.timeDuration)) {
            const judgeLine = chart.judgeLineList[this.options.targetJudgeLines[i]];
            for (const element of selectionManager.selectedElements) {
                if (!(element instanceof Note)) {
                    const newStartTime = addBeats(element.startTime, beats);
                    const newEndTime = addBeats(element.endTime, beats);
                    const events = judgeLine.eventLayers[this.options.targetEventLayer].getEventsByType(element.type);
                    if (events.some((event) => {
                        const startTime1 = getBeatsValue(newStartTime);
                        const endTime1 = getBeatsValue(newEndTime);
                        const startTime2 = getBeatsValue(event.startTime);
                        const endTime2 = getBeatsValue(event.endTime);
                        return (
                            startTime1 < endTime2 && startTime2 < endTime1
                            && !selectionManager.isSelected(event)
                        );
                    })) {
                        return {
                            code: CloneValidStateCode.Overlap,
                            message: `生成的事件在${judgeLine.id}号判定线上将与原有事件重叠`
                        }
                    }
                }
            }
            beats = addBeats(beats, this.options.timeDelta);
            i = (i + 1) % this.options.targetJudgeLines.length;
        }
        return {
            code: CloneValidStateCode.OK
        };
    }
    clone() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        const chart = store.useChart();
        let beats: Beats = [0, 0, 1];
        let i = 0;
        while (isLessThanBeats(beats, this.options.timeDuration)) {
            const num = this.options.targetJudgeLines[i];
            const judgeLine = chart.judgeLineList[num];
            for (const element of selectionManager.selectedElements) {
                if (element instanceof Note) {
                    const newNote = historyManager.addNote(element.toObject(), stateManager.state.currentJudgeLineNumber);
                    newNote.startTime = addBeats(newNote.startTime, beats);
                    newNote.endTime = addBeats(newNote.endTime, beats);
                    judgeLine.notes.push(newNote);
                }
                else {
                    const newEvent = historyManager.addEvent(element.toObject(), element.type, element.eventLayerId, stateManager.state.currentJudgeLineNumber);
                    newEvent.startTime = addBeats(newEvent.startTime, beats);
                    newEvent.endTime = addBeats(newEvent.endTime, beats);
                }
            }
            beats = addBeats(beats, this.options.timeDelta);
            i = (i + 1) % this.options.targetJudgeLines.length;
        }
        // 不保留源元素
        selectionManager.deleteSelection();
    }
}