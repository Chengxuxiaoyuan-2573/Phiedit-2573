import { floor, round } from "lodash";
import { Beats, BPM, secondsToBeats } from "./beats";
import { Box } from "./box";
import { RGBAcolor, RGBcolor } from "./color";
import { NumberEvent } from "./event";
import { Note, NoteType } from "./note";

export interface IEditor {
    /** 主界面（canvas）的状态 */
    canvasState: CanvasState,
    /** 顶部工具栏的状态 */
    topState: TopState,
    /** 右侧菜单栏的状态 */
    rightState: RightState,
    /** 左侧菜单栏的状态 */
    leftState: LeftState,
    /** 横线数 */
    horizonalLineCount: number,
    /** 竖线数，包括左右两端的竖线 */
    verticalLineCount: number,
    /** 纵向拉伸（一秒的时间在编辑器时间轴上是多少像素） */
    pxPerSecond: number,
    /** 选中的判定线号 */
    currentJudgeLineNumber: number,
    /** 选中的事件层级编号 */
    currentEventLayerNumber: number,
    /** 选中的所有note和事件 */
    selection: (Note | NumberEvent)[],
    /** 滚轮速度 */
    wheelSpeed: number,
    /** 正在放置的note类型 */
    currentNoteType: NoteType,
    /** 鼠标的x坐标 */
    mouseX: number,
    /** 鼠标的y坐标 */
    mouseY: number
}
export enum CanvasState {
    Playing, Editing
}
export enum TopState {
    Default
}
export enum RightState {
    Default, Settings, Editing, BPMList
}
export enum LeftState {
    Default
}
export class Editor implements IEditor {
    canvasState: CanvasState;
    topState: TopState;
    rightState: RightState;
    leftState: LeftState;
    horizonalLineCount: number;
    verticalLineCount: number;
    pxPerSecond: number;
    currentJudgeLineNumber: number;
    currentEventLayerNumber: number;
    selection: (NumberEvent | Note)[];
    wheelSpeed: number;
    currentNoteType: NoteType;
    lineWidth = 5;
    horzionalMainLineColor: RGBAcolor = [255, 255, 255, 0.5];
    horzionalLineColor: RGBAcolor = [255, 255, 255, 0.2];
    verticalMainLineColor: RGBAcolor = [255, 255, 255, 0.5];
    verticalLineColor: RGBAcolor = [255, 255, 255, 0.2];
    borderColor: RGBcolor = [255, 255, 0];
    backgroundColor: RGBcolor = [30, 30, 30];
    selectionColor: RGBcolor = [70, 100, 255];
    notesViewBox = new Box(0, 900, 50, 650);
    eventsViewBox = new Box(0, 900, 700, 1300);
    eventWidth = 80;
    selectPadding = 10;
    mouseX = 0;
    mouseY = 0;
    get verticalLineSpace() {
        return (this.notesViewBox.right - this.notesViewBox.left) / (this.verticalLineCount - 1);
    }
    getPositionYOfSeconds(currentSeconds: number, seconds: number) {
        const offsetY = this.pxPerSecond * currentSeconds;
        return this.notesViewBox.bottom - (seconds * this.pxPerSecond - offsetY);
    }
    switchMainState() {
        if (this.canvasState == CanvasState.Editing) {
            this.canvasState = CanvasState.Playing;
        }
        else {
            this.canvasState = CanvasState.Editing;
        }
    }
    /** 
     * 在第seconds秒的时候，把鼠标点击的y坐标吸附到离鼠标最近的横线上并返回所代表的拍数
     * @param {number} seconds 当前的时间秒数
     * @param {number} y 鼠标点击的y坐标
     */
    attatch(BPMList: BPM[], seconds: number, y: number): Beats {
        const beats = this.getBeats(BPMList, seconds, y);

        const int = floor(beats);
        const decimal = beats - int;

        const fenzi = round(decimal * this.horizonalLineCount);
        const fenmu = this.horizonalLineCount;
        return [int, fenzi, fenmu];
    }
    getBeats(BPMList: BPM[], seconds: number, y: number) {
        /** 第seconds秒的时候，网格已经移动了多少像素了 */
        const offset = seconds * this.pxPerSecond;
        /** 点击的位置离第0拍的横线有多远 */
        const distanceToZero = offset + (this.notesViewBox.bottom - y);
        /** 点击的位置在第几秒 */
        const secondsClick = distanceToZero / this.pxPerSecond;
        /** 点击的位置在第几拍 */
        const beats = secondsToBeats(BPMList, secondsClick);
        return beats;
    }
    constructor() {
        this.canvasState = CanvasState.Playing
        this.rightState = RightState.Default
        this.leftState = LeftState.Default
        this.topState = TopState.Default
        this.pxPerSecond = 300
        this.horizonalLineCount = 4
        this.verticalLineCount = 21
        this.currentJudgeLineNumber = 0
        this.currentEventLayerNumber = 0
        this.selection = []
        this.wheelSpeed = 1
        this.currentNoteType = NoteType.Tap
    }
}