import globalEventEmitter from "@/eventEmitter";
import { addBeats, Beats, getBeatsValue, subBeats } from "@/models/beats";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
export enum FlipOptions {
    None,
    Horizontal,
    Vertical,
    Both,
}
export default class ParagraphRepeater {
    startTime: Beats = [0, 0, 1];
    endTime: Beats = [0, 0, 1];
    targetTime: Beats = [0, 0, 1];
    flip: FlipOptions = FlipOptions.None;
    constructor() {
        globalEventEmitter.on("REPEAT_PARAGRAPH", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制段落"));
    }
    copy() {
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const beats = subBeats(this.targetTime, this.startTime);
        const chart = store.useChart();
        historyManager.group("复制段落");
        for (const judgeLine of chart.judgeLineList) {
            for (const eventLayer of judgeLine.eventLayers) {
                for (const type of ["moveX", "moveY", "rotate", "alpha", "speed"]) {
                    const events = eventLayer.getEventsByType(type);

                    // 找到位于startTime和endTime之间的事件
                    const filteredEvents = events.filter(event => {
                        return getBeatsValue(event.endTime) >= getBeatsValue(this.startTime) &&
                            getBeatsValue(event.startTime) <= getBeatsValue(this.endTime);
                    });
                    for (const event of filteredEvents) {
                        const eventObject = event.toObject();
                        eventObject.startTime = addBeats(eventObject.startTime, beats);
                        eventObject.endTime = addBeats(eventObject.endTime, beats);
                        if ((this.flip === FlipOptions.Horizontal || this.flip === FlipOptions.Both) && type === "moveX") {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if ((this.flip === FlipOptions.Vertical || this.flip === FlipOptions.Both) && type === "moveY") {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Horizontal) {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Vertical) {
                            eventObject.start = 180 - eventObject.start;
                            eventObject.end = 180 - eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Both) {
                            eventObject.start = 180 + eventObject.start;
                            eventObject.end = 180 + eventObject.end;
                        }

                        const newEvent = store.addEvent(eventObject, type, event.eventLayerId, event.judgeLineNumber);
                        historyManager.recordAddEvent(newEvent.id);
                    }
                }
            }

            const notes = judgeLine.notes;
            const filteredNotes = notes.filter(note => {
                return getBeatsValue(note.endTime) >= getBeatsValue(this.startTime) &&
                    getBeatsValue(note.startTime) <= getBeatsValue(this.endTime);
            });
            for (const note of filteredNotes) {
                const noteObject = note.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, beats);
                noteObject.endTime = addBeats(noteObject.endTime, beats);
                if (this.flip === FlipOptions.Horizontal || this.flip === FlipOptions.Vertical) {
                    noteObject.positionX = -noteObject.positionX;
                }

                const newNote = store.addNote(noteObject, judgeLine.id);
                historyManager.recordAddNote(newNote.id);
            }
        }
        historyManager.ungroup();
    }
}