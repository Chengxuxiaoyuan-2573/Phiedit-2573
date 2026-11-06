/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Ref, ref } from "vue";
import { ChartPackage } from "./models/rpe/chartPackage";
import { ResourcePackage } from "./models/rpe/resourcePackage";
import { INote } from "./models/rpe/note";
import { AbstractEvent, IEvent } from "./models/rpe/event";
import type { useRoute } from "vue-router";
import ChartRenderer from "./managers/renderer/chartRenderer";
import EditorRenderer from "./managers/renderer/editorRenderer";
import ClipboardManager from "./managers/renderer/clipboard";
import CloneManager from "./managers/renderer/clone";
import HistoryManager from "./managers/renderer/history";
import MouseManager from "./managers/renderer/mouse";
import MoveManager from "./managers/renderer/move";
import SaveManager from "./managers/renderer/save";
import SelectionManager from "./managers/renderer/selection";
import SettingsManager from "./managers/renderer/settings";
import StateManager from "./managers/renderer/state";
import ParagraphRepeater from "./managers/renderer/paragraphRepeater";
import ExportManager from "./managers/renderer/export";
import EventAbillitiesManager from "./managers/renderer/eventAbillities";
import BoxesManager from "./managers/renderer/boxes";
import NoteFiller from "./managers/renderer/noteFiller";
import EventFiller from "./managers/renderer/eventFiller";
import LineBinder from "./managers/renderer/lineBinder";
import AutoplayManager from "./managers/renderer/autoplay";
import ErrorManager from "./managers/renderer/error";
import CoordinateManager from "./managers/renderer/coordinate";
import MutipleEditManager from "./managers/renderer/mutipleEdit";
import ChartPackageLoader from "./managers/renderer/chartPackageLoader";
import ResourcePackageLoader from "./managers/renderer/resourcePackageLoader";

import { Beats, beatsCompare, beatsToSeconds, secondsToBeats } from "./models/rpe/beats";
import { ArrayedObject } from "./tools/algorithm";
import { SEC_TO_MS } from "./tools/mathUtils";
import MediaUtils from "./tools/mediaUtils";
import JudgeManager from "./managers/renderer/judge";
import { BLOCK_AREA_EVENT_LAYER_ID, BlockArea, BlockAreaEventState, BlockAreaEventType, IBlockArea } from "./models/rpe/blockArea";

/**
 * 用来存储 managers 的构造函数
 * 导入的 managers 只能在这里使用，不要直接在本文件中调用构造函数！
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
    judgeManager: JudgeManager
} as const;

export type ManagersMap = {
    -readonly [K in keyof typeof managersMap]: InstanceType<typeof managersMap[K]>
};

/** 数据集中管理的对象 */
class Store {
    readonly chartPackageRef: Ref<ChartPackage | null>;
    readonly resourcePackageRef: Ref<ResourcePackage | null>;
    readonly canvasRef: Ref<HTMLCanvasElement | null>;
    readonly audioRef: Ref<HTMLAudioElement | null>;
    route: ReturnType<typeof useRoute> | null;
    readonly isRenderingVideo = ref(false);

    /** 音频上下文（全局可用） */
    readonly audioContext = new AudioContext();

    /**
     * 非全局管理器，生命周期为从进入谱面开始，到退出谱面结束。
     *
     * 不在生命周期内时，他们会为 `null`。
     */
    readonly managers: {
        [key in keyof ManagersMap]: ManagersMap[key] | null;
    } = new ArrayedObject(managersMap)
            .map(() => null)
            .toObject();

    /**
     * 全局管理器，与非全局管理器不同，它们是全局可用的，永远不会为 `null`。
     *
     * 这些管理器不依赖于具体的谱面数据，所以不必在每次进入谱面时都实例化，在整个应用的生命周期中仅创建一次。
    */
    readonly globalManagers = {
        chartPackageLoader: new ChartPackageLoader(),
        resourcePackageLoader: new ResourcePackageLoader(),
    };

    readonly pressedKeys = new Set<string>();

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
            throw new Error(`${name} 没有初始化`);
        }
        return manager;
    }

    /** 设置管理器 */
    setManager<T extends keyof typeof this.managers>(name: T, manager: NonNullable<typeof this.managers[T]>) {
        this.managers[name] = manager;
    }

    /** 获取全局管理器 */
    useGlobalManager<T extends keyof typeof this.globalManagers>(name: T) {
        return this.globalManagers[name];
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
        if (split.length !== NOTE_ID_PARTS) {
            throw new Error(`音符 id 错误：${id}`);
        }
        return {
            judgeLineNumber: parseInt(split[0], 10),
            noteNumber: parseInt(split[2], 10)
        };
    }
    parseEventId(id: string) {
        const split = id.split("-");
        if (split.length !== EVENT_ID_PARTS) {
            throw new Error(`事件 id 错误：${id}`);
        }
        return {
            judgeLineNumber: parseInt(split[0], 10),
            eventLayerId: split[1],
            eventType: split[2],
            eventNumber: parseInt(split[3], 10)
        };
    }

    /**
     * 根据 id 获取音符
     * 音符 id 的格式为：<判定线编号>-note-<音符编号>
     */
    getNoteById(id: string) {
        const chart = this.useChart();
        const { judgeLineNumber } = this.parseNoteId(id);
        const judgeLine = chart.judgeLineList[judgeLineNumber];
        return judgeLine.notes.find(note => note.id === id) ?? null;
    }

    /**
     * 根据 id 获取事件
     * 事件 id 的格式为：<判定线编号>-<事件层级编号>-<事件种类>-<事件编号>
     * 噪域事件的 id 格式为：<噪域编号>-blockArea-<事件种类>-<事件编号>
     */
    getEventById(id: string) {
        const { judgeLineNumber, eventLayerId, eventType } = this.parseEventId(id);
        const events = this.getEventList(judgeLineNumber, eventLayerId, eventType);
        return events.find(event => event.id === id) ?? null;
    }

    /**
     * 按“判定线编号 + 事件层 + 事件类型”取到存有这些事件的列表。
     *
     * 噪域的事件层标识是 "blockArea"，此时 judgeLineNumber 实际上是噪域编号。
     */
    getEventList(judgeLineNumber: number, eventLayerId: string, eventType: string) {
        if (eventLayerId === BLOCK_AREA_EVENT_LAYER_ID) {
            const blockArea = this.getBlockAreaById(judgeLineNumber);
            return blockArea.getEventsByType(eventType as BlockAreaEventType);
        }

        const judgeLine = this.getJudgeLineById(judgeLineNumber);
        const eventLayer = eventLayerId === "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        if (!eventLayer) {
            throw new Error(`不存在编号为${eventLayerId}的事件层`);
        }
        return eventLayer.getEventsByType(eventType);
    }

    /** 获取与指定事件处于同一个列表的所有事件（同一判定线、同一事件层、同一类型，或同一噪域、同一类型） */
    getSiblingEvents(event: Pick<AbstractEvent, "judgeLineNumber" | "eventLayerId" | "type">) {
        return this.getEventList(event.judgeLineNumber, event.eventLayerId, event.type);
    }

    /** 在改动前检查每个受影响的噪域事件栏，批量移动按所有事件的新位置检查 */
    validateBlockAreaEventTimes(changes: {
        event: Pick<AbstractEvent, "id" | "judgeLineNumber" | "eventLayerId" | "type">
        startTime: Beats
        endTime: Beats
        insertInto?: number
    }[]) {
        const tracks = new Map<AbstractEvent[], typeof changes>();
        for (const change of changes) {
            const { event, insertInto } = change;
            if (event.eventLayerId !== BLOCK_AREA_EVENT_LAYER_ID) {
                continue;
            }

            const track = this.getEventList(insertInto ?? event.judgeLineNumber, event.eventLayerId, event.type);
            const pending = tracks.get(track) ?? [];
            pending.push(change);
            tracks.set(track, pending);
        }

        for (const [track, pending] of tracks) {
            const replaced = new Set(pending.filter(change => change.insertInto === undefined).map(change => change.event.id));
            const unaffected = track.filter(event => !replaced.has(event.id));
            for (const [index, change] of pending.entries()) {
                if (beatsCompare(change.startTime, change.endTime) > 0) {
                    throw new Error("噪域事件的开始时间不能晚于结束时间");
                }

                const overlaps = (other: Pick<AbstractEvent, "startTime" | "endTime">) =>
                    beatsCompare(change.startTime, other.endTime) < 0 && beatsCompare(change.endTime, other.startTime) > 0;
                if (unaffected.some(overlaps) || pending.slice(0, index).some(overlaps)) {
                    throw new Error("同栏噪域事件不能重叠");
                }
            }
        }
    }

    /** 根据编号获取噪域。注意这里的编号是噪域的稳定编号，不是它在 blockAreaList 中的下标 */
    getBlockAreaById(index: number) {
        const chart = this.useChart();
        const blockArea = chart.blockAreaList.find(blockArea => blockArea.index === index);
        if (!blockArea) {
            throw new Error(`${index}号噪域不存在`);
        }
        return blockArea;
    }

    /** 根据噪域在 blockAreaList 中的下标获取噪域 */
    getBlockAreaByPosition(position: number) {
        const chart = this.useChart();
        const blockArea = chart.blockAreaList[position];
        if (!blockArea) {
            throw new Error(`第${position}个噪域不存在`);
        }
        return blockArea;
    }

    /** 删除一个噪域 */
    removeBlockArea(blockArea: BlockArea) {
        this.useChart().removeBlockArea(blockArea);
    }

    /** 在指定位置插入一个噪域，返回被插入的噪域 */
    insertBlockArea(blockAreaObject: IBlockArea, position: number, index?: number, eventState?: BlockAreaEventState) {
        return this.useChart().insertBlockArea(blockAreaObject, position, index, eventState);
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
        if (eventLayerId === BLOCK_AREA_EVENT_LAYER_ID) {
            const blockArea = this.getBlockAreaById(judgeLineNumber);
            return blockArea.addEvent(eventObject, eventType as BlockAreaEventType, id);
        }

        const judgeLine = this.getJudgeLineById(judgeLineNumber);
        const eventLayer = eventLayerId === "X" ? judgeLine.extended : judgeLine.eventLayers[+eventLayerId];
        if (!eventLayer) {
            throw new Error(`不存在编号为${eventLayerId}的事件层`);
        }
        return eventLayer.addEvent(eventObject, eventType, id);
    }
    removeEvent(id: string) {
        const parsedId = this.parseEventId(id);
        const events = this.getEventList(parsedId.judgeLineNumber, parsedId.eventLayerId, parsedId.eventType);
        const eventIndex = events.findIndex(event => event.id === id);
        if (eventIndex === -1) {
            throw new Error(`事件${id}不存在`);
        }
        events.splice(eventIndex, 1);
    }
}

const NOTE_ID_PARTS = 3;
const EVENT_ID_PARTS = 4;

const store = new Store();
export default store;
