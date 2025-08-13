import { NoteType } from "@/models/note";
import { RightPanelState } from "@/types";
import { Beats, secondsToBeats } from "@/models/beats";
import { round, floor } from "lodash";
import Constants from "../constants";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import { reactive } from "vue";
import Manager from "./abstract";
import { EasingType } from "@/models/easing";
export type NoteNumberAttrs = "size" | "alpha" | "speed" | "positionX" | "yOffset" | "visibleTime";
export type EventNumberAttrs = "start" | "end";
export default class StateManager extends Manager {
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
        pxPerSecond: 300,
        /** 选中的判定线号 */
        currentJudgeLineNumber: 0,
        /** 选中的事件层级编号 */
        currentEventLayerNumber: 0,
        /** 正在放置的note类型 */
        currentNoteType: NoteType.Tap
    }
    readonly state = reactive(this._state)
    readonly cache = reactive({
        mutipleEdit: {
            type: "note" as "note" | "event",
            eventType: "moveX",
            attributeNote: "positionX" as NoteNumberAttrs | "isFake" | "above" | "type",
            attributeEvent: "both" as EventNumberAttrs | "both" | "easingType",
            mode: "to" as "to" | "by" | "times" | "invert",
            isDynamic: false,
            param: 0,
            paramStart: 0,
            paramEnd: 0,
            paramBoolean: false,
            paramEasing: EasingType.Linear,
            paramNoteType: NoteType.Drag,
        },
        noteFill: {
            type: NoteType.Drag,
            easingType: EasingType.Linear,
            density: 4
        },
        eventFill: {
            startTime: undefined,
            endTime: undefined,
            density: 16,
            code:`\
// 请使用Javascript代码编写出动画效果，下面仅为示例
const x = Math.sin(t * Math.PI * 2) * 400;
const y = Math.cos(t * Math.PI * 2) * 400;
const angle = t * 360;
return {
    x: x,
    y: y,
    angle: angle
};`,
        }
    })
    constructor() {
        super();
        globalEventEmitter.on("PREVIOUS_JUDGE_LINE", () => {
            if (this.state.currentJudgeLineNumber > 0) {
                this.state.currentJudgeLineNumber--;
            }
        })
        globalEventEmitter.on("NEXT_JUDGE_LINE", () => {
            const chart = store.useChart();
            if (this.state.currentJudgeLineNumber < chart.judgeLineList.length - 1) {
                this.state.currentJudgeLineNumber++;
            }
        })
        globalEventEmitter.on("CHANGE_JUDGE_LINE", (num) => {
            const chart = store.useChart();
            if (num >= 0 && num < chart.judgeLineList.length) {
                this.state.currentJudgeLineNumber = num;
            }
        })
        globalEventEmitter.on("CHANGE_TYPE", (type) => {
            this.state.currentNoteType = type;
        })
        globalEventEmitter.on("PREVIEW", () => {
            const audio = store.useAudio();
            this.state.isPreviewing = true;
            audio.play();
        })
        globalEventEmitter.on("STOP_PREVIEW", () => {
            const audio = store.useAudio();
            this.state.isPreviewing = false;
            audio.pause();
        })
    }
    get currentJudgeLine() {
        const chart = store.useChart();
        if (this._state.currentJudgeLineNumber < 0 || this._state.currentJudgeLineNumber >= this.judgeLinesCount) {
            console.error("Invalid current judge line number, returning the first judge line.");
            this._state.currentJudgeLineNumber = 0; // Reset to a valid state
        }
        return chart.judgeLineList[this._state.currentJudgeLineNumber];
    }
    get currentEventLayer() {
        if (this._state.currentEventLayerNumber < 0 || this._state.currentEventLayerNumber >= this.eventLayersCount) {
            console.error("Invalid current event layer number, returning the first event layer.");
            this._state.currentEventLayerNumber = 0; // Reset to a valid state
        }
        return this.currentJudgeLine.eventLayers[this._state.currentEventLayerNumber];
    }
    get judgeLinesCount() {
        const chart = store.useChart();
        return chart.judgeLineList.length;
    }
    get eventLayersCount() {
        return this.currentJudgeLine.eventLayers.length;
    }
    get verticalLineSpace() {
        return Constants.notesViewBox.width / (this._state.verticalLineCount - 1);
    }
    get offsetY() {
        const seconds = store.getSeconds();
        return this._state.pxPerSecond * seconds;
    }
    getAbsolutePositionYOfSeconds(sec: number) {
        return sec * this._state.pxPerSecond;
    }
    getRelativePositionYOfSeconds(sec: number) {
        return this.relative(this.getAbsolutePositionYOfSeconds(sec));
    }
    attatchX(x: number) {
        const canvas = store.useCanvas();
        if (this._state.verticalLineCount <= 1) {
            // 如果竖线数量不合法，就直接返回x
            return (x - Constants.notesViewBox.middleX) * canvas.width / Constants.notesViewBox.width;
        }
        else {
            // 如果有竖线，就吸附
            return round((x - Constants.notesViewBox.middleX) / this.verticalLineSpace) * canvas.width / (this._state.verticalLineCount - 1);
        }
    }
    /** 
     * 把鼠标点击的y坐标吸附到离鼠标最近的横线上并返回所代表的拍数
     * @param {number} y 鼠标点击的y坐标
     */
    attatchY(y: number): Beats {
        const beats = this.getBeatsOfRelativePositionY(y);

        const int = floor(beats);
        const decimal = beats - int;

        const fenzi = round(decimal * this._state.horizonalLineCount);
        const fenmu = this._state.horizonalLineCount;
        return [int, fenzi, fenmu];
    }
    private getSecondsOfAbsolutePositionY(y: number) {
        return y / this._state.pxPerSecond;
    }
    getSecondsOfRelativePositionY(y: number) {
        return this.getSecondsOfAbsolutePositionY(this.absolute(y));
    }
    private getBeatsOfAbsolutePositionY(y: number) {
        const seconds = this.getSecondsOfAbsolutePositionY(y);
        const chart = store.useChart();
        const beats = secondsToBeats(chart.BPMList, seconds);
        return beats;
    }
    getBeatsOfRelativePositionY(y: number) {
        const seconds = this.getSecondsOfRelativePositionY(y);
        const chart = store.useChart();
        const beats = secondsToBeats(chart.BPMList, seconds);
        return beats;
    }
    absolute(relativeY: number) {
        return Constants.notesViewBox.bottom - relativeY + this.offsetY;
    }
    relative(absoluteY: number) {
        return Constants.notesViewBox.bottom - absoluteY + this.offsetY;
    }
    getCurrentBeats(): Beats {
        const chart = store.useChart();
        const seconds = store.getSeconds();
        const beatsValue = secondsToBeats(chart.BPMList, seconds);
        const int = Math.floor(beatsValue);
        const decimal = beatsValue - int;
        const fenmu = this._state.horizonalLineCount;
        const fenzi = Math.floor(decimal * fenmu);
        return [int, fenzi, fenmu];
    }
}