import { NoteType } from "@/models/note";
import { RightPanelState, SelectedElement } from "@/types";
import { Beats, secondsToBeats } from "@/models/beats";
import { round, floor } from "lodash";
import Constants from "../constants";
import store from "@/store";
import { BoxWithData } from "@/tools/box";
import globalEventEmitter from "@/eventEmitter";
import { reactive } from "vue";
import Manager from "./abstract";
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
            this.state.currentNoteType = NoteType[type];
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
    calculateBoxes(): BoxWithData<SelectedElement>[] {
        const settingsManager = store.useManager("settingsManager");
        const boxes = [];
        const canvas = store.useCanvas();
        const resourcePackage = store.useResourcePackage();

        const baseNoteSize = Constants.notesViewBox.width / canvas.width * settingsManager.noteSize;

        for (const note of this.currentJudgeLine.notes) {
            const noteX = note.positionX * (Constants.notesViewBox.width / canvas.width) + Constants.notesViewBox.left + Constants.notesViewBox.width / 2;
            if (note.type == NoteType.Hold) {
                const noteSkin = resourcePackage.getSkin(note.type, note.highlight);
                const noteScale = baseNoteSize / resourcePackage.getSkin(note.type, false).body.width;
                const noteWidth = noteSkin.body.width * note.size * noteScale;
                const noteStartY = this.getAbsolutePositionYOfSeconds(note.cachedStartSeconds);
                const noteEndY = this.getAbsolutePositionYOfSeconds(note.cachedEndSeconds);
                const box = new BoxWithData(noteEndY + noteSkin.end.height * noteScale, noteStartY - noteSkin.head.height * noteScale, noteX - noteWidth / 2, noteX + noteWidth / 2, note);
                boxes.push(box);
            }
            else {
                const noteSkin = resourcePackage.getSkin(note.type, note.highlight);
                const noteY = this.getAbsolutePositionYOfSeconds(note.cachedStartSeconds);
                const noteScale = baseNoteSize / resourcePackage.getSkin(note.type, false).width;
                const noteWidth = noteSkin.width * note.size * noteScale;
                const box = new BoxWithData(noteY + noteSkin.height * noteScale / 2, noteY - noteSkin.height * noteScale / 2, noteX - noteWidth / 2, noteX + noteWidth / 2, note);
                boxes.push(box);
            }
        }
        const types = ["moveX", "moveY", "rotate", "alpha", "speed"] as const;
        for (const [column, type] of Object.entries(types)) {
            const attrName = `${type}Events` as const;
            const events = this.currentEventLayer[attrName];
            const eventX = Constants.eventsViewBox.width * (+column + 0.5) / 5 + Constants.eventsViewBox.left;
            for (const event of events) {
                const eventStartY = this.getRelativePositionYOfSeconds(event.cachedStartSeconds);
                const eventEndY = this.getRelativePositionYOfSeconds(event.cachedEndSeconds);
                boxes.push(new BoxWithData(
                    this.absolute(eventEndY - Constants.selectPadding),
                    this.absolute(eventStartY + Constants.selectPadding),
                    eventX - Constants.eventWidth / 2 - Constants.selectPadding,
                    eventX + Constants.eventWidth / 2 + Constants.selectPadding,
                    event));
            }
        }
        return boxes;
    }
    get currentJudgeLine() {
        const chart = store.useChart();
        return chart.judgeLineList[this._state.currentJudgeLineNumber];
    }
    get currentEventLayer() {
        return this.currentJudgeLine.eventLayers[this._state.currentEventLayerNumber];
    }
    get verticalLineSpace() {
        return Constants.notesViewBox.width / (this._state.verticalLineCount - 1);
    }
    get offsetY() {
        const seconds = store.getSeconds();
        return this._state.pxPerSecond * seconds;
    }
    private getAbsolutePositionYOfSeconds(sec: number) {
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