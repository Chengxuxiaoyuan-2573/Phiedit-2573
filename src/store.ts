import { Ref, ref } from "vue";
import { ChartPackage } from "./models/chartPackage";
import { ResourcePackage } from "./models/resourcePackage";
import { INote } from "./models/note";
import { IEvent } from "./models/event";
import type { useRoute } from "vue-router";
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
import EventFiller from "./managers/eventFiller";
import LineBinder from "./managers/lineBinder";
import AutoplayManager from "./managers/autoplay";
import ErrorManager from "./managers/error";
import CoordinateManager from "./managers/coordinate";
import MutipleEditManager from "./managers/mutipleEdit";

import { Beats, beatsToSeconds, secondsToBeats } from "./models/beats";
import { ArrayedObject } from "./tools/algorithm";
import { SEC_TO_MS } from "./tools/mathUtils";
import MediaUtils from "./tools/mediaUtils";

/**
 * 用来存储 managers 的构造函数
 * 导入的 managers 只能在这里使用，不要直接调用构造函数！
 */
export const managersMap = {
    chartRenderer: ChartRenderer,
    editorRenderer: EditorRenderer,
    clipboardManager: ClipboardManager,
    cloneManager: CloneManager,
    historyManager: HistoryManager,
    mouseManager: MouseManager,
    moveManager: MoveManager,
    saveManager: SaveManager,
    selectionManager: SelectionManager,
    settingsManager: SettingsManager,
    stateManager: StateManager,
    paragraphRepeater: ParagraphRepeater,
    exportManager: ExportManager,
    eventAbillitiesManager: EventAbillitiesManager,
    boxesManager: BoxesManager,
    noteFiller: NoteFiller,
    eventFiller: EventFiller,
    lineBinder: LineBinder,
    autoplayManager: AutoplayManager,
    errorManager: ErrorManager,
    coordinateManager: CoordinateManager,
    mutipleEditManager: MutipleEditManager,
} as const;

export type ManagersMap = {
    -readonly [K in keyof typeof managersMap]: InstanceType<typeof managersMap[K]>
};

/** 数据集中管理的对象 */
class Store {
    chartPackageRef: Ref<ChartPackage | null>;
    resourcePackageRef: Ref<ResourcePackage | null>;
    canvasRef: Ref<HTMLCanvasElement | null>;
    audioRef: Ref<HTMLAudioElement | null>;
    route: ReturnType<typeof useRoute> | null;

    managers: {
        [key in keyof ManagersMap]: ManagersMap[key] | null;
    } = new ArrayedObject(managersMap).map(() => null).toObject();
    constructor() {
        this.chartPackageRef = ref(null);
        this.resourcePackageRef = ref(null);
        this.canvasRef = ref(null);
        this.audioRef = ref(null);
        this.route = null;
    }

    /** 获取管理器 */
    useManager<T extends keyof typeof this.managers>(name: T): NonNullable<typeof this.managers[T]> {
        const manager = this.managers[name];
        if (manager === null) {
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
        if (!chartPackage) {
            throw new Error("Chart package is not loaded");
        }
        return chartPackage;
    }
    useChart() {
        const chartPackage = this.chartPackageRef.value;
        if (!chartPackage) {
            throw new Error("Chart package is not loaded");
        }
        return chartPackage.chart;
    }
    useExtra() {
        const chartPackage = this.chartPackageRef.value;
        if (!chartPackage) {
            throw new Error("Chart package is not loaded");
        }
        return chartPackage.extra;
    }
    useResourcePackage() {
        const resourcePackage = this.resourcePackageRef.value;
        if (!resourcePackage) {
            throw new Error("Resource package is not loaded");
        }
        return resourcePackage;
    }
    useCanvas() {
        const canvas = this.canvasRef.value;
        if (!canvas) {
            throw new Error("Canvas is not loaded");
        }
        return canvas;
    }
    useAudio() {
        const audio = this.audioRef.value;
        if (!audio) {
            throw new Error("Audio is not loaded");
        }
        return audio;
    }
    playAudio() {
        const audio = this.useAudio();
        audio.play();
    }
    pauseAudio() {
        const audio = this.useAudio();
        audio.pause();
    }
    togglePlay() {
        const audio = store.useAudio();
        MediaUtils.togglePlay(audio);
    }
    setTime(time: number) {
        const audio = this.useAudio();
        audio.currentTime = time;
    }

    /**
     * 获取秒数，秒数不完全等于音乐的时间，还要减去offset
     * 所以不管offset是多少，第0拍都是第0秒
     */
    getSeconds() {
        return this.useAudio().currentTime - this.useChart().META.offset / SEC_TO_MS;
    }
    setSeconds(seconds: number) {
        if (isNaN(seconds)) {
            return;
        }
        this.useAudio().currentTime = seconds + this.useChart().META.offset / SEC_TO_MS;
    }
    getCurrentBeatsValue() {
        const chart = store.useChart();
        const seconds = store.getSeconds();
        const beatsValue = secondsToBeats(chart.BPMList, seconds);
        return beatsValue;
    }
    gotoBeats(beats: Beats) {
        const chart = store.useChart();
        const seconds = beatsToSeconds(chart.BPMList, beats);
        this.setSeconds(seconds);
    }
    setCursor(type: "pointer" | "default" | "ew-resize" | "ns-resize" | "move" | "crosshair") {
        const canvas = this.useCanvas();
        canvas.style.cursor = type;
    }
    getChartId() {
        if (!this.route) {
            throw new Error("route is not defined");
        }

        const chartId = this.route.query.chartId;
        if (!chartId) {
            throw new Error("chartId is not defined");
        }
        return Array.isArray(chartId) ?
            chartId[0] ?? "" :
            String(chartId);
    }

    /**
     * 根据id获取判定线
     * 判定线id是一个数字，就是判定线的编号
     */
    getJudgeLineById(id: number) {
        const chart = this.useChart();
        const judgeLine = chart.judgeLineList[id];
        if (!judgeLine) {
            throw new Error(`${id}号判定线不存在`);
        }
        return judgeLine;
    }
    parseNoteId(id: string) {
        const split = id.split("-");
        if (split.length !== NOTE_ID_PARTS) throw new Error(`Invalid note id: ${id}, because it has ${split.length} parts`);
        return {
            judgeLineNumber: parseInt(split[0], 10),
            noteNumber: parseInt(split[2], 10)
        };
    }
    parseEventId(id: string) {
        const split = id.split("-");
        if (split.length !== EVENT_ID_PARTS) throw new Error(`Invalid event id: ${id}, because it has ${split.length} parts`);
        return {
            judgeLineNumber: parseInt(split[0], 10),
            eventLayerId: split[1],
            eventType: split[2],
            eventNumber: parseInt(split[3], 10)
        };
    }

    /**
     * 根据id获取音符
     * 音符id的格式为 <判定线编号>-note-<音符编号>
     */
    getNoteById(id: string) {
        const chart = this.useChart();
        const { judgeLineNumber } = this.parseNoteId(id);
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        return judgeLine.notes.find(note => note.id === id) ?? null;
    }

    /**
     * 根据id获取事件
     * 事件id的格式为 <判定线编号>-<事件层级编号>-<事件种类>-<事件编号>
     */
    getEventById(id: string) {
        const chart = this.useChart();
        const { judgeLineNumber, eventLayerId, eventType } = this.parseEventId(id);
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        const eventLayer = eventLayerId === "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        return eventLayer.getEventsByType(eventType).find(event => event.id === id) ?? null;
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
        const eventLayer = eventLayerId === "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        if (!eventLayer) {
            throw new Error(`不存在编号为${eventLayerId}的事件层`);
        }
        return eventLayer.addEvent(eventObject, eventType, id);
    }
    removeEvent(id: string) {
        const parsedId = this.parseEventId(id);
        const judgeLine = this.getJudgeLineById(parsedId.judgeLineNumber);
        const eventLayer = parsedId.eventLayerId === "X" ? judgeLine.extended : judgeLine.eventLayers[+parsedId.eventLayerId];
        const events = eventLayer.getEventsByType(parsedId.eventType);
        const eventIndex = events.findIndex(event => event.id === id);
        events.splice(eventIndex, 1);
    }
}

const NOTE_ID_PARTS = 3;
const EVENT_ID_PARTS = 4;

const store = new Store();
export default store;
const { chartPackageRef, resourcePackageRef, audioRef, canvasRef } = store;
export {
    chartPackageRef,
    resourcePackageRef,
    audioRef,
    canvasRef
};