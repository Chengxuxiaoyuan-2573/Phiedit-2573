import { isObject, isArray, isNumber, isString } from "lodash"
import { beatsToSeconds, BPM, getBeatsValue, IBPM } from "./beats"
import { ChartMeta, IChartMeta } from "./chartMeta"
import { IJudgeLine, JudgeLine } from "./judgeLine"
import { Note } from "./note"
import { BaseEvent } from "./event"
import { markRaw, reactive } from "vue"

export interface IChart {
    /** BPM列表，控制曲谱的BPM */
    BPMList: IBPM[]
    /** 存储谱面的名称、谱师、曲师等元数据 */
    META: IChartMeta
    /** 没用的属性，可以不用 */
    judgeLineGroup: string[]
    /** 判定线列表 */
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
    deleteJudgeLine(judgeLineNumber: number) {
        if (judgeLineNumber < 0 || judgeLineNumber >= this.judgeLineList.length) {
            throw new Error(`第${judgeLineNumber}号判定线不存在`);
        }
        this.judgeLineList.splice(judgeLineNumber, 1);
        this.judgeLineList.forEach((judgeLine, index) => {
            judgeLine.id = index;
            // 如果有以这条线为父线的判定线，则将其父线清空
            if (judgeLine.father == judgeLineNumber) judgeLine.father = -1;
            // 如果有以后面的判定线为父线的判定线，则将其父线减一
            // 因为删除了当前判定线，所以后面的判定线的线号会减一
            else if (judgeLine.father > judgeLineNumber) judgeLine.father--;

        });
        this.highlightNotes();
        this.calculateSeconds();
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
        judgeLine.initializeEvents();
        this.judgeLineList.push(judgeLine);
        return judgeLine;
    }
}