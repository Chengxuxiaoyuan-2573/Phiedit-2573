/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { defaultJudgementRule, NoteType } from "@/models/rpe/note";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import { reactive } from "vue";
import Manager from "./abstract";
import { EasingType } from "@/models/rpe/easing";
import { ElMessageBox } from "element-plus";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { RGBcolor } from "@/tools/color";
import { Beats } from "@/models/rpe/beats";
import { blockAreaEventTracks } from "@/models/rpe/blockArea";
import { baseEventTypes, extendedEventTypes, isBaseEventLayer } from "@/models/rpe/eventLayer";
import { clamp } from "lodash";

/** 音符的属性中，类型为数字的属性 */
export type NoteNumberAttrs = "size" | "alpha" | "speed" | "positionX" | "yOffset" | "visibleTime" | "judgeArea";
export enum RightPanelState {
    Default, Clipboard, Settings, BPMList, Meta, JudgeLine, History, Calculator, NoteFill, EventFill, FastBind, Error, Shader
}

export const
    VERTICAL_ZOOM_MIN = 1,
    VERTICAL_ZOOM_MAX = 1000;

/** 存储当前的状态和缓存 */
export default class StateManager extends Manager {
    /** 状态对象，非响应式 */
    readonly _state = {
        /** 右侧菜单栏的状态 */
        right: RightPanelState.Default,

        /** 是否正在预览谱面 */
        isPreviewing: false,

        /** 横线数 */
        horizonalLineCount: 4,

        /** 竖线数，包括左右两端的竖线 */
        verticalLineCount: 21,

        /** 纵向拉伸（一秒的时间在编辑器时间轴上是多少像素） */
        verticalZoom: 300,

        /** 选中的判定线号 */
        currentJudgeLineNumber: 0,

        /** 当前编辑的是判定线还是噪域。true 表示正在编辑噪域，false 表示正在编辑判定线 */
        isEditingBlockArea: false,

        /** 当前编辑的噪域编号（噪域在 blockAreaList 中的下标） */
        currentBlockAreaNumber: 0,

        /** 噪域列表的版本号。噪域列表本身不是响应式的，增删噪域时靠它通知界面刷新 */
        blockAreaListVersion: 0,

        /** 选中的事件层级编号 */
        currentEventLayerId: "0",

        /** 正在放置的note类型 */
        currentNoteType: NoteType.Tap,

        /** 是否为自动播放 */
        autoplay: true,

        /** 判定规则 */
        judgementRule: structuredClone(defaultJudgementRule),

        /** 当前是否处于全屏状态 */
        isFullscreen: false
    };

    /** 状态对象，响应式 */
    readonly state = reactive(this._state);

    /* eslint-disable no-magic-numbers */
    readonly cache = reactive({
        mutipleEdit: {
            /** 要编辑的是音符还是事件 */
            type: "note" as "note" | "event",

            /** 要编辑哪些类型的事件。空数组表示"所有种类的事件" */
            eventTypes: [] as string[],

            /** 要编辑音符的哪个属性 */
            attributeNote: "positionX" as NoteNumberAttrs | "isFake" | "above" | "type" | "startTime" | "endTime" | "bothTime" | "tint" | "tintHitEffects" | "hitsound",

            /** 要编辑事件的哪个属性 */
            attributeEvent: "both" as "start" | "end" | "both" | "easingType" | "startTime" | "endTime" | "bothTime",

            /** 要怎么修改原来的值 */
            mode: "to" as "to" | "by" | "times" | "invert",

            /** 修改的参数值会不会变化 */
            isDynamic: false,

            /** 修改的参数值要不要加上一个随机数 */
            isRandom: false,

            /** 修改的参数值是多少 */
            param: 0,

            /** 修改的拍数值是多少 */
            paramBeats: [1, 0, 1] as Beats,

            /** 修改的参数值从多少开始变化 */
            paramStart: 0,

            /** 修改的参数值变化到多少结束 */
            paramEnd: 0,

            /** 修改的参数是什么颜色 */
            paramColor: [255, 255, 255] as RGBcolor,

            /** 修改的颜色参数值从多少开始变化 */
            paramStartColor: [255, 255, 255] as RGBcolor,

            /** 修改的颜色参数值变化到多少结束 */
            paramEndColor: [255, 255, 255] as RGBcolor,

            /** 修改的字符串参数是什么 */
            paramText: "",

            /** 修改的参数值加上的随机数在正负多少的范围内 */
            paramRandom: 0,

            /** 修改的参数值是真还是假 */
            paramBoolean: false,

            /** 修改的缓动是什么 */
            paramEasing: EasingType.Linear,

            /** 修改的音符类型是什么 */
            paramNoteType: NoteType.Drag,
        },
        noteFill: {
            /** 曲线填充使用的音符类型 */
            type: NoteType.Drag,

            /** 曲线的缓动类型 */
            easingType: EasingType.Linear,

            /** 填充密度 */
            density: 4
        },
        eventFill: {
            startTime: undefined,
            endTime: undefined,
            density: 16,
            code: `\
// 示例代码：旋转圆动效
const turns = 1;
const radius = 400;
const easing = Linear;
return {
    x: Math.sin(easing(t) * Math.PI * 2 * turns) * radius,
    y: Math.cos(easing(t) * Math.PI * 2 * turns) * radius,
    angle: easing(t) * 360 * turns
};`,
        },
        error: {
            errorType: "All",
        },
        clone: {
            targetJudgeLines: new Array<number>(),
            targetEventLayer: 0,
            timeDuration: [8, 0, 1] as Beats,
            timeDelta: [0, 1, 4] as Beats,
        },
        fastBind: {
            eventLength: [4, 0, 1] as Beats,
            precision: 16,
            judgeLinesIsSelected: Array(this.judgeLinesCount).fill(false),
        }
    });
    /* eslint-enable no-magic-numbers */

    constructor() {
        super();
        globalEventEmitter.on("PREVIOUS_JUDGE_LINE", () => {
            if (this.state.currentJudgeLineNumber > 0) {
                this.state.currentJudgeLineNumber--;
            }
        });
        globalEventEmitter.on("NEXT_JUDGE_LINE", () => {
            const chart = store.useChart();
            if (this.state.currentJudgeLineNumber < chart.judgeLineList.length - 1) {
                this.state.currentJudgeLineNumber++;
            }
        });
        globalEventEmitter.on("CHANGE_JUDGE_LINE", createCatchErrorByMessage(async () => {
            const num = parseInt((await ElMessageBox.prompt("请输入要切换的判定线编号", "切换判定线")).value);
            const chart = store.useChart();
            if (isNaN(num)) {
                throw new Error("请输入数字");
            }

            if (num >= 0 && num < chart.judgeLineList.length) {
                this.state.currentJudgeLineNumber = num;
            }
            else {
                throw new Error(`判定线编号超出0~${chart.judgeLineList.length - 1}的范围：${num}`);
            }
        }, "切换判定线"));
        globalEventEmitter.on("CHANGE_TYPE", (type) => {
            this.state.currentNoteType = type;
        });
        globalEventEmitter.on("PREVIEW", (goBack) => {
            const audio = store.useAudio();
            const time = audio.currentTime;
            this.state.isPreviewing = true;
            audio.play();
            const handler = () => {
                const audio = store.useAudio();
                this.state.isPreviewing = false;
                audio.pause();
                if (goBack) {
                    audio.currentTime = time;
                }
                globalEventEmitter.off("STOP_PREVIEW", handler);
            };
            globalEventEmitter.on("STOP_PREVIEW", handler);
        });
        globalEventEmitter.on("TOGGLE_PREVIEW", () => {
            const audio = store.useAudio();
            if (this.state.isPreviewing) {
                this.state.isPreviewing = false;
                audio.pause();
            }
            else {
                this.state.isPreviewing = true;
                audio.play();
            }
        });
        globalEventEmitter.on("TOGGLE_PLAY", () => {
            store.togglePlay();
        });
        globalEventEmitter.on("ADD_JUDGE_LINE", () => {
            const chart = store.useChart();
            chart.addNewJudgeLine();
            globalEventEmitter.emit("JUDGE_LINE_COUNT_CHANGED", this.judgeLinesCount);
        });
        globalEventEmitter.on("DELETE_JUDGE_LINE", (num) => {
            const chart = store.useChart();
            chart.deleteJudgeLine(num);
            globalEventEmitter.emit("JUDGE_LINE_COUNT_CHANGED", this.judgeLinesCount);
        });
    }
    get currentJudgeLine() {
        return store.getJudgeLineById(this._state.currentJudgeLineNumber);
    }
    get currentEventLayer() {
        return this.currentJudgeLine.getEventLayerById(this._state.currentEventLayerId);
    }

    /** 当前编辑的噪域。没有噪域时返回 null */
    get currentBlockArea() {
        const chart = store.useChart();

        // 这里读取响应式的 state 而不是 _state，面板中的 computed 才能跟着噪域编号变化。
        // blockAreaListVersion 用于在噪域增删后通知界面刷新（噪域列表本身不是响应式的）。
        void this.state.blockAreaListVersion;
        return chart.blockAreaList[this.state.currentBlockAreaNumber] ?? null;
    }

    /** 噪域的数量 */
    get blockAreasCount() {
        void this.state.blockAreaListVersion;
        return store.useChart().blockAreaList.length;
    }

    /**
     * 通知界面：噪域列表发生了增删。
     *
     * 删除 / 插入噪域后，后面噪域的下标会变化，这里顺便把当前噪域编号挪到正确的位置上。
     */
    notifyBlockAreaListChanged(options?: { removedPosition?: number, insertedPosition?: number }) {
        this.state.blockAreaListVersion++;
        const count = store.useChart().blockAreaList.length;
        let current = this._state.currentBlockAreaNumber;
        if (options?.removedPosition !== undefined && options.removedPosition < current) {
            current--;
        }

        if (options?.insertedPosition !== undefined && options.insertedPosition <= current) {
            current++;
        }
        this.state.currentBlockAreaNumber = count === 0 ? 0 : clamp(current, 0, count - 1);
    }

    /**
     * 编辑器右侧事件编辑区中的事件栏名称。
     *
     * 编辑判定线时是判定线的事件类型，编辑噪域时是噪域的 6 栏事件。
     */
    get eventTracks(): readonly string[] {
        if (this._state.isEditingBlockArea) {
            return blockAreaEventTracks;
        }

        const eventLayer = this.currentEventLayer;
        return isBaseEventLayer(eventLayer) ? baseEventTypes : extendedEventTypes;
    }

    /** 打开或关闭噪域编辑 */
    setBlockAreaEditing(isEditing: boolean) {
        this.state.isEditingBlockArea = isEditing;
        if (isEditing) {
            this.state.currentBlockAreaNumber = this.blockAreasCount === 0 ?
                0 :
                clamp(this._state.currentBlockAreaNumber, 0, this.blockAreasCount - 1);
        }
        store.useManager("selectionManager").unselectAll();
    }

    /** 切换到指定的噪域，并把该噪域设为选中元素 */
    selectBlockArea(index: number) {
        if (index < 0 || index >= this.blockAreasCount) {
            return;
        }
        this.state.isEditingBlockArea = true;
        this.state.currentBlockAreaNumber = index;
        store.useManager("selectionManager").select([this.currentBlockArea!]);
    }
    get judgeLinesCount() {
        const chart = store.useChart();
        return chart.judgeLineList.length;
    }
    get eventLayersCount() {
        return this.currentJudgeLine.eventLayers.length;
    }
}