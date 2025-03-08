import { NoteType } from "@/classes/note";
import { RightPanelState, SelectedElement } from "@/types";
import { Beats, secondsToBeats } from "@/classes/beats";
import { round, floor } from "lodash";
import Constants from "../constants";
import store from "@/store";
import { BoxWithData } from "@/tools/box";
import globalEventEmitter from "@/eventEmitter";
import { shallowReactive } from "vue";

class StateManager {
    /** 右侧菜单栏的状态 */
    right = RightPanelState.Default
    /** 是否正在预览谱面 */
    isPreviewing = false
    /** 横线数 */
    horizonalLineCount = 4
    /** 竖线数，包括左右两端的竖线 */
    verticalLineCount = 21
    /** 纵向拉伸（一秒的时间在编辑器时间轴上是多少像素） */
    pxPerSecond = 300
    /** 选中的判定线号 */
    currentJudgeLineNumber = 0
    /** 选中的事件层级编号 */
    currentEventLayerNumber = 0
    /** 正在放置的note类型 */
    currentNoteType = NoteType.Tap
    constructor() {
        globalEventEmitter.on("PREVIOUS_JUDGE_LINE", () => {
            if (this.currentJudgeLineNumber > 0) {
                this.currentJudgeLineNumber--;
            }
        })
        globalEventEmitter.on("NEXT_JUDGE_LINE", () => {
            if (this.currentJudgeLineNumber < this.horizonalLineCount - 1) {
                this.currentJudgeLineNumber++;
            }
        })
        globalEventEmitter.on("CHANGE_JUDGE_LINE", (num) => {
            const chart = store.useChart();
            if (num >= 0 && num < chart.judgeLineList.length) {
                this.currentJudgeLineNumber = num;
            }
        })
        globalEventEmitter.on("CHANGE_TYPE", (type) => {
            this.currentNoteType = NoteType[type];
        })
        globalEventEmitter.on("PREVIEW", ()=>{
            const audio = store.useAudio();
            this.isPreviewing = true;
            audio.play();
        })
        globalEventEmitter.on("STOP_PREVIEW", ()=>{
            const audio = store.useAudio();
            this.isPreviewing = false;
            audio.pause();
        })
    }
    calculateBoxes(): BoxWithData<SelectedElement>[] {
        const boxes = [];
        const canvas = store.useCanvas();
        const chartPackage = store.useChartPackage();
        const resourcePackage = store.useResourcePackage();

        const baseNoteSize = Constants.notesViewBox.width / canvas.width * chartPackage.config.noteSize;

        for (const note of this.currentJudgeLine.notes) {
            if (note.type == NoteType.Hold) {
                const noteX = note.positionX * (Constants.notesViewBox.width / canvas.width) + Constants.notesViewBox.left + Constants.notesViewBox.width / 2;
                const noteWidth = baseNoteSize * note.size
                    * resourcePackage.getSkin(note.type, note.highlight).body.width
                    / resourcePackage.getSkin(note.type, false).body.width;
                const noteStartY = this.getRelativePositionYOfSeconds(note.cachedStartSeconds);
                const noteEndY = this.getRelativePositionYOfSeconds(note.cachedEndSeconds);
                boxes.push(new BoxWithData(
                    noteEndY - Constants.selectPadding,
                    noteStartY + Constants.selectPadding,
                    noteX - noteWidth / 2 - Constants.selectPadding,
                    noteX + noteWidth / 2 + Constants.selectPadding,
                    note
                ));
            }
            else {
                const noteX = note.positionX * (Constants.notesViewBox.width / canvas.width) + Constants.notesViewBox.left + Constants.notesViewBox.width / 2;
                const noteY = this.getRelativePositionYOfSeconds(note.cachedStartSeconds);
                const noteWidth = baseNoteSize * note.size
                    * resourcePackage.getSkin(note.type, note.highlight).width
                    / resourcePackage.getSkin(note.type, false).width;
                boxes.push(new BoxWithData(
                    this.absolute(noteY - Constants.selectPadding),
                    this.absolute(noteY + Constants.selectPadding),
                    noteX - noteWidth / 2 - Constants.selectPadding,
                    noteX + noteWidth / 2 + Constants.selectPadding,
                    note
                ));
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
        return chart.judgeLineList[this.currentJudgeLineNumber];
    }
    get currentEventLayer() {
        return this.currentJudgeLine.eventLayers[this.currentEventLayerNumber];
    }
    get verticalLineSpace() {
        return Constants.notesViewBox.width / (this.verticalLineCount - 1);
    }
    get offsetY() {
        const seconds = store.getSeconds();
        return this.pxPerSecond * seconds;
    }
    /*
    概念
    绝对坐标：相对于编辑器坐标系的坐标，不会因为时间轴的滚动而改变
    相对坐标：相对于画布左上角的坐标，会因为时间轴的滚动而改变
    */
    getAbsolutePositionYOfSeconds(sec: number) {
        return sec * this.pxPerSecond;
    }
    getRelativePositionYOfSeconds(sec: number) {
        return this.relative(this.getAbsolutePositionYOfSeconds(sec));
    }
    attatchX(x: number) {
        if (this.verticalLineCount <= 1) {
            // 如果竖线数量不合法，就直接返回x
            return (x - Constants.notesViewBox.middleX) * Constants.mainViewBox.width / Constants.notesViewBox.width;
        }
        else {
            // 如果有竖线，就吸附
            return round((x - Constants.notesViewBox.middleX) / this.verticalLineSpace) * Constants.mainViewBox.width / (this.verticalLineCount - 1);
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

        const fenzi = round(decimal * this.horizonalLineCount);
        const fenmu = this.horizonalLineCount;
        return [int, fenzi, fenmu];
    }
    getSecondsOfAbsolutePositionY(y: number) {
        return y / this.pxPerSecond;
    }
    getSecondsOfRelativePositionY(y: number) {
        return this.getSecondsOfAbsolutePositionY(this.absolute(y));
    }
    getBeatsOfAbsolutePositionY(y: number) {
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
        const fenmu = this.horizonalLineCount;
        const fenzi = Math.floor(decimal * fenmu);
        return [int, fenzi, fenmu];
    }
}
export default shallowReactive(new StateManager());