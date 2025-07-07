import { isObject, isArray, isNumber, isString } from "lodash"
import { beatsToSeconds, BPM, getBeatsValue, IBPM } from "./beats"
import { ChartMeta, IChartMeta } from "./chartMeta"
import { IJudgeLine, JudgeLine } from "./judgeLine"
import { Note } from "./note"
import { BaseEvent, NumberEvent } from "./event"
import { markRaw, reactive } from "vue"
import { BaseEventLayer } from "./eventLayer"

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
    readonly BPMList: BPM[]
    readonly META: ChartMeta
    readonly judgeLineGroup: string[]
    readonly judgeLineList: JudgeLine[]
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
            events.push(...judgeLine.getAllEvents());
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
    calculateSeconds() {
        for (const note of this.getAllNotes()) {
            note.cachedStartSeconds = beatsToSeconds(this.BPMList, note.startTime);
            note.cachedEndSeconds = beatsToSeconds(this.BPMList, note.endTime);
        }
        for (const event of this.getAllEvents()) {
            event.cachedStartSeconds = beatsToSeconds(this.BPMList, event.startTime);
            event.cachedEndSeconds = beatsToSeconds(this.BPMList, event.endTime);
        }
    }
    constructor(chart: unknown) {
        this.BPMList = reactive([]);
        this.judgeLineGroup = [];
        this.judgeLineList = [];

        if (isObject(chart)) {

            if ("BPMList" in chart && isArray(chart.BPMList)) {
                for (const bpm of chart.BPMList) {
                    this.BPMList.push(new BPM(bpm));
                }
            }

            this.META = reactive(new ChartMeta("META" in chart ? chart.META : null));

            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) {
                for (const group of chart.judgeLineGroup) {
                    let formatedGroup = "default";
                    if (isString(group)) {
                        formatedGroup = group;
                    }
                    this.judgeLineGroup.push(formatedGroup);
                }
            }

            if ("judgeLineList" in chart && isArray(chart.judgeLineList)) {
                for (const [i, judgeLine] of chart.judgeLineList.entries()) {
                    this.judgeLineList.push(new JudgeLine(judgeLine, {
                        BPMList: this.BPMList,
                        judgeLineNumber: i
                    }));
                }
            }

        }
        else {
            this.META = reactive(new ChartMeta(null));
            if (isNumber(chart)) {
                for (let i = 0; i < chart; i++) {
                    this.addNewJudgeLine();
                }
            }
        }
        markRaw(this);
        this.highlightNotes();
    }
    addNewJudgeLine() {
        const judgeLineNumber = this.judgeLineList.length;
        const judgeLine = new JudgeLine(null, {
            BPMList: this.BPMList,
            judgeLineNumber
        });
        judgeLine.eventLayers.push(new BaseEventLayer({
            moveXEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 0,
                end: 0
            }, { judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'moveX', BPMList: this.BPMList })],
            moveYEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 0,
                end: 0
            }, { judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'moveY', BPMList: this.BPMList })],
            rotateEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 0,
                end: 0
            }, { judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'rotate', BPMList: this.BPMList })],
            alphaEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 0,
                end: 0
            }, { judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'alpha', BPMList: this.BPMList })],
            speedEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: 10,
                end: 10
            }, { judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'speed', BPMList: this.BPMList })]
        }, {
            judgeLineNumber,
            eventLayerNumber: 0,
            BPMList: this.BPMList
        }))
        this.judgeLineList.push(judgeLine);
    }
}