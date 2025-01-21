import { isObject, isArray, isNumber, isString } from "lodash"
import { BPM, getBeatsValue, IBPM } from "./beats"
import { ChartMeta, IChartMeta } from "./chartMeta"
import { IJudgeLine, JudgeLine } from "./judgeLine"
import { Note } from "./note"
import { BaseEvent } from "./event"
import { markRaw } from "vue"

export interface IChart {
    /** BPM列表，控制曲谱的BPM */
    BPMList: IBPM[]
    /** 存储谱面的名称、谱师、曲师等元数据 */
    META: IChartMeta
    /** 没用的属性，可以不用 */
    judgeLineGroup: string[]
    /** 判定线列表， */
    judgeLineList: IJudgeLine[]
}
export class Chart implements IChart {
    BPMList: BPM[]
    META: ChartMeta
    judgeLineGroup: string[]
    judgeLineList: JudgeLine[]
    /** 把谱面转为JSON对象 */
    toObject(): IChart {
        return {
            BPMList: this.BPMList.map(bpm => bpm.toObject()),
            META: this.META.toObject(),
            judgeLineGroup: this.judgeLineGroup,
            judgeLineList: this.judgeLineList.map(judgeLine => judgeLine.toObject())
        }
    }
    getAllNotes() {
        const notes: Note[] = [];
        this.judgeLineList.forEach(judgeLine => {
            notes.push(...judgeLine.notes);
        })
        return notes.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
    }
    getAllEvents() {
        const events: BaseEvent[] = [];
        this.judgeLineList.forEach(judgeLine => {
            judgeLine.eventLayers.forEach(eventLayer => {
                events.push(
                    ...eventLayer.moveXEvents,
                    ...eventLayer.moveYEvents,
                    ...eventLayer.rotateEvents,
                    ...eventLayer.alphaEvents,
                    ...eventLayer.speedEvents
                )
            })
            events.push(
                ...judgeLine.extended.scaleXEvents,
                ...judgeLine.extended.scaleYEvents,
                ...judgeLine.extended.colorEvents,
                ...judgeLine.extended.paintEvents,
                ...judgeLine.extended.textEvents
            )
        })
        return events.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
    }

    highlightNotes() {
        const allNotes = new Map<number, Note>();
        for (const note of this.getAllNotes()) {
            const anotherNote = allNotes.get(getBeatsValue(note.startTime));
            if (anotherNote) {
                anotherNote.highlight = true;
                note.highlight = true;
            }
            else {
                allNotes.set(getBeatsValue(note.startTime), note);
                note.highlight = false;
            }
        }
    }
    deleteNotesAndEvents() {
        for (const judgeline of this.judgeLineList) {
            judgeline.notes = judgeline.notes.filter(note => !note._willBeDeleted);
            for (const eventLayer of judgeline.eventLayers) {
                eventLayer.moveXEvents = eventLayer.moveXEvents.filter(event => !event._willBeDeleted);
                eventLayer.moveYEvents = eventLayer.moveYEvents.filter(event => !event._willBeDeleted);
                eventLayer.rotateEvents = eventLayer.rotateEvents.filter(event => !event._willBeDeleted);
                eventLayer.alphaEvents = eventLayer.alphaEvents.filter(event => !event._willBeDeleted);
                eventLayer.speedEvents = eventLayer.speedEvents.filter(event => !event._willBeDeleted);
            }
            judgeline.extended.scaleXEvents = judgeline.extended.scaleXEvents.filter(event => !event._willBeDeleted);
            judgeline.extended.scaleYEvents = judgeline.extended.scaleYEvents.filter(event => !event._willBeDeleted);
            judgeline.extended.colorEvents = judgeline.extended.colorEvents.filter(event => !event._willBeDeleted);
            judgeline.extended.paintEvents = judgeline.extended.paintEvents.filter(event => !event._willBeDeleted);
            judgeline.extended.textEvents = judgeline.extended.textEvents.filter(event => !event._willBeDeleted);
        }
    }
    update() {
        this.deleteNotesAndEvents();
    }
    constructor(chart: unknown) {
        this.BPMList = [];
        this.judgeLineGroup = [];
        this.judgeLineList = [];

        if (isObject(chart)) {
            if ("BPMList" in chart && isArray(chart.BPMList)) for (const bpm of chart.BPMList) {
                this.BPMList.push(new BPM(bpm));
            }
            if ("META" in chart) {
                this.META = new ChartMeta(chart.META);
            }
            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) for (const group of chart.judgeLineGroup) {
                let formatedGroup = "default";
                if (isString(group)) {
                    formatedGroup = group;
                }
                this.judgeLineGroup.push(formatedGroup);
            }
            if ("judgeLineList" in chart && isArray(chart.judgeLineList)) for (const [i, judgeLine] of chart.judgeLineList.entries()) {
                this.judgeLineList.push(new JudgeLine(judgeLine, i));
            }
        }
        else if (isNumber(chart)) {
            for (let i = 0; i < chart; i++) {
                this.judgeLineList.push(new JudgeLine(null, i));
            }
        }
        this.META ??= new ChartMeta(null);
        markRaw(this);
        this.BPMList.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
        this.highlightNotes();
    }
}