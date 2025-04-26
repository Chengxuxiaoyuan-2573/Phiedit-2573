import { Ref, ref } from "vue";
import { ChartPackage } from "./models/chartPackage";
import { ResourcePackage } from "./models/resourcePackage";
import { INote, Note } from "./models/note";
import { IEvent, NumberEvent } from "./models/event";

class Store {
    chartPackageRef: Ref<ChartPackage | null>;
    resourcePackageRef: Ref<ResourcePackage | null>;
    canvasRef: Ref<HTMLCanvasElement | null>;
    audioRef: Ref<HTMLAudioElement | null>;
    constructor() {
        this.chartPackageRef = ref(null);
        this.resourcePackageRef = ref(null);
        this.canvasRef = ref(null);
        this.audioRef = ref(null);
    }
    useChartPackage() {
        const chartPackage = this.chartPackageRef.value;
        if (!chartPackage)
            throw new Error("Chart package is not loaded");
        return chartPackage;
    }
    useChart() {
        const chartPackage = this.chartPackageRef.value;
        if (!chartPackage)
            throw new Error("Chart package is not loaded");
        return chartPackage.chart;
    }
    useResourcePackage() {
        const resourcePackage = this.resourcePackageRef.value;
        if (!resourcePackage)
            throw new Error("Resource package is not loaded");
        return resourcePackage;
    }
    useCanvas() {
        const canvas = this.canvasRef.value;
        if (!canvas)
            throw new Error("Canvas is not loaded");
        return canvas;
    }
    useAudio() {
        const audio = this.audioRef.value;
        if (!audio)
            throw new Error("Audio is not loaded");
        return audio;
    }
    getSeconds() {
        return this.useAudio().currentTime - this.useChart().META.offset / 1000;
    }
    // 音符id的格式：0-note-0
    // 事件id的格式：0-0-moveX-0
    //              0-X-scaleX-0
    getJudgeLineById(id: number) {
        const chart = this.useChart();
        const judgeLine = chart.judgeLineList[id];
        if (!judgeLine) {
            throw new Error(`Judge line ${id} is not found`);
        }
        return judgeLine;
    }
    parseNoteId(id: string) {
        const split = id.split("-");
        if (split.length != 3) throw new Error(`Invalid note id: ${id}, because it has ${split.length} parts`);
        return {
            judgeLineNumber: parseInt(split[0], 10),
            noteNumber: parseInt(split[2], 10)
        };
    }
    parseEventId(id: string) {
        const split = id.split("-");
        if (split.length != 4) throw new Error(`Invalid event id: ${id}, because it has ${split.length} parts`);
        return {
            judgeLineNumber: parseInt(split[0], 10),
            eventLayerId: split[1],
            eventType: split[2],
            eventNumber: parseInt(split[3], 10)
        };
    }
    getNoteById(id: string) {
        const chart = this.useChart();
        const { judgeLineNumber } = this.parseNoteId(id);
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        return judgeLine.notes.find(note => note.id === id) ?? null;
    }

    getEventById(id: string) {
        const chart = this.useChart();
        const { judgeLineNumber, eventLayerId, eventType } = this.parseEventId(id);
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        const eventLayer = eventLayerId == "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        return eventLayer.getEventsByType(eventType).find(event => event.id == id) ?? null;
    }
    addNote(noteObject: INote, judgeLineNumber: number, id?: string) {
        const chart = this.useChart();
        const judgeLine = this.getJudgeLineById(judgeLineNumber);
        const note = new Note(noteObject, {
            judgeLineNumber,
            BPMList: chart.BPMList,
            id
        })
        if(noteObject.startTime == noteObject.endTime) alert("a");
        judgeLine.notes.push(note);
        return note;
    }
    removeNote(id: string) {
        const parsedId = this.parseNoteId(id);
        const judgeLine = this.getJudgeLineById(parsedId.judgeLineNumber);
        const noteIndex = judgeLine.notes.findIndex(note => note.id === id);
        judgeLine.notes.splice(noteIndex, 1);
    }
    addEvent(eventObject: IEvent<unknown>, eventType: string, eventLayerId: string, judgeLineNumber: number, id?: string) {
        const judgeLine = this.getJudgeLineById(judgeLineNumber);
        const eventLayer = eventLayerId == "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        return eventLayer.addEvent(eventObject, eventType, id) as NumberEvent;
    }
    removeEvent(id: string) {
        const parsedId = this.parseEventId(id);
        const judgeLine = this.getJudgeLineById(parsedId.judgeLineNumber);
        const eventLayer = parsedId.eventLayerId == "X" ? judgeLine.extended : judgeLine.eventLayers[+parsedId.eventLayerId];
        const events = eventLayer.getEventsByType(parsedId.eventType);
        const eventIndex = events.findIndex(event => event.id === id);
        events.splice(eventIndex, 1);
    }
}
const store = new Store();
export default store;
const { chartPackageRef, resourcePackageRef, audioRef, canvasRef } = store;
export {
    chartPackageRef,
    resourcePackageRef,
    audioRef,
    canvasRef
}