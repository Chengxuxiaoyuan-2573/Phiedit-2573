import { Ref, ref } from "vue";
import { ChartPackage } from "./models/chartPackage";
import { ResourcePackage } from "./models/resourcePackage";
import { INote } from "./models/note";
import { IEvent, NumberEvent } from "./models/event";
import type { useRoute } from "vue-router";
import globalEventEmitter from "./eventEmitter";
import ChartRenderer from "./managers/render/chartRenderer";
import EditorRenderer from "./managers/render/editorRenderer";
import ClipboardManager from "./managers/clipboard";
import CloneManager from "./managers/clone";
import HistoryManager from "./managers/history";
import MouseManager from "./managers/mouse";
import MoveManager from "./managers/move";
import SaveManager from "./managers/save";
import SelectionManager from "./managers/selection";
import SettingsManager from "./managers/settings";
import StateManager from "./managers/state";
import ParagraphRepeater from "./managers/paragraphRepeater";
import ExportManager from "./managers/export";
import EventAbillitiesManager from "./managers/eventAbillities";
import BoxesManager from "./managers/boxes";
import NoteFiller from "./managers/noteFiller";

/** 数据集中管理的对象 */
class Store {
    chartPackageRef: Ref<ChartPackage | null>;
    resourcePackageRef: Ref<ResourcePackage | null>;
    canvasRef: Ref<HTMLCanvasElement | null>;
    audioRef: Ref<HTMLAudioElement | null>;
    route: ReturnType<typeof useRoute> | null;

    managers: {
        chartRenderer: ChartRenderer | null
        editorRenderer: EditorRenderer | null
        clipboardManager: ClipboardManager | null
        cloneManager: CloneManager | null
        historyManager: HistoryManager | null
        mouseManager: MouseManager | null
        moveManager: MoveManager | null
        saveManager: SaveManager | null
        selectionManager: SelectionManager | null
        settingsManager: SettingsManager | null
        stateManager: StateManager | null
        paragraphRepeater: ParagraphRepeater | null
        exportManager: ExportManager | null
        eventAbillitiesManager: EventAbillitiesManager | null
        boxesManager: BoxesManager | null
        noteFiller: NoteFiller | null
    } = {
            chartRenderer: null,
            editorRenderer: null,
            clipboardManager: null,
            cloneManager: null,
            historyManager: null,
            mouseManager: null,
            moveManager: null,
            saveManager: null,
            selectionManager: null,
            settingsManager: null,
            stateManager: null,
            paragraphRepeater: null,
            exportManager: null,
            eventAbillitiesManager: null,
            boxesManager: null,
            noteFiller: null,
        }
    constructor() {
        this.chartPackageRef = ref(null);
        this.resourcePackageRef = ref(null);
        this.canvasRef = ref(null);
        this.audioRef = ref(null);
        this.route = null;
        globalEventEmitter.on("EXIT", () => {
            this.chartPackageRef.value = null;
            this.resourcePackageRef.value = null;
            this.canvasRef.value = null;
            this.audioRef.value = null;
            this.route = null;
        })
    }

    /** 获取管理器 */
    useManager<T extends keyof typeof this.managers>(name: T): NonNullable<typeof this.managers[T]> {
        const manager = this.managers[name];
        if (manager == null) {
            throw new Error(`${name}没有初始化`);
        }
        return manager;
    }

    /** 设置管理器 */
    setManager<T extends keyof typeof this.managers>(name: T, manager: NonNullable<typeof this.managers[T]>) {
        this.managers[name] = manager;
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
    getChartId() {
        if (!this.route) {
            throw new Error("route is not defined");
        }
        const chartId = this.route.query.chartId;
        if (!chartId) {
            throw new Error("chartId is not defined");
        }
        return Array.isArray(chartId)
            ? chartId[0] ?? ''
            : String(chartId);
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
        const judgeLine = this.getJudgeLineById(judgeLineNumber);
        return judgeLine.addNote(noteObject, id);
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