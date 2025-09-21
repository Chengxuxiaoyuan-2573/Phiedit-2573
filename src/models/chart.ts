import { isObject, isArray, isNumber, isString } from "lodash";
import { beatsToSeconds, BPM, getBeatsValue, IBPM } from "./beats";
import { ChartMeta, IChartMeta } from "./chartMeta";
import { IJudgeLine, JudgeLine } from "./judgeLine";
import { Note } from "./note";
import { AbstractEvent } from "./event";
import { markRaw, reactive } from "vue";
import ChartError from "./error";
import { SYMBOL_CHART_JSON_ERROR } from "./chartPackage";
import { IObjectizable } from "./objectizable";

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
export class Chart implements IChart, IObjectizable {
    readonly BPMList: BPM[];
    readonly META: ChartMeta;
    readonly judgeLineGroup: string[];
    readonly judgeLineList: JudgeLine[];
    readonly errors: ChartError[] = [];

    /** 把谱面转为JSON对象 */
    toObject(): IChart {
        return {
            BPMList: this.BPMList.map(bpm => bpm.toObject()),
            META: this.META.toObject(),
            judgeLineGroup: this.judgeLineGroup,
            judgeLineList: this.judgeLineList.map(judgeLine => judgeLine.toObject())
        };
    }
    getAllNotes() {
        const notes: Note[] = [];
        this.judgeLineList.forEach(judgeLine => {
            notes.push(...judgeLine.notes);
        });
        return notes.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
    }
    getAllEvents() {
        const events: AbstractEvent[] = [];
        this.judgeLineList.forEach(judgeLine => {
            events.push(...judgeLine.getAllEvents());
        });
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

    /** 把所有音符和事件的拍数转为秒数并缓存起来 */
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
            if (judgeLine.father === judgeLineNumber) judgeLine.father = -1;

            // 如果有以后面的判定线为父线的判定线，则将其父线减一
            // 因为删除了当前判定线，所以后面的判定线的线号会减一
            else if (judgeLine.father > judgeLineNumber) judgeLine.father--;
        });
        this.highlightNotes();
        this.calculateSeconds();
    }

    /**
     * 传入谱面对象，加载谱面。如果传入的是一个数字，则创建一个有对应数量判定线的谱面。
     */
    constructor(chart: unknown) {
        this.BPMList = reactive([]);
        this.judgeLineGroup = [];
        this.judgeLineList = [];

        if (isObject(chart)) {
            if ("BPMList" in chart && isArray(chart.BPMList)) {
                for (const bpm of chart.BPMList) {
                    const newBPM = new BPM(bpm);
                    this.BPMList.push(newBPM);
                    this.errors.push(...newBPM.errors);
                }
            }

            const newChartMeta = new ChartMeta("META" in chart ? chart.META : null);
            this.META = reactive(newChartMeta);
            this.errors.push(...newChartMeta.errors);

            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) {
                for (const group of chart.judgeLineGroup) {
                    let formatedGroup = "default";
                    if (isString(group)) {
                        formatedGroup = group;
                    }
                    else {
                        this.errors.push(new ChartError(
                            `chart.judgeLineGroup 属性必须是字符串，但读取到了 ${group}。将会替换为字符串 "default"。`,
                            "ChartReadError.TypeError"
                        ));
                    }
                    this.judgeLineGroup.push(formatedGroup);
                }
            }

            if ("judgeLineList" in chart && isArray(chart.judgeLineList)) {
                for (const [i, judgeLine] of chart.judgeLineList.entries()) {
                    const newJudgeLine = new JudgeLine(judgeLine, {
                        BPMList: this.BPMList,
                        judgeLineNumber: i
                    });
                    this.judgeLineList.push(newJudgeLine);
                    this.errors.push(...newJudgeLine.errors);
                }
            }
        }
        else {
            this.META = reactive(new ChartMeta(null));
            if (isNumber(chart)) {
                for (let i = 0; i < chart; i++) {
                    this.addNewJudgeLine();
                }
                this.errors.push(new ChartError(
                    `谱面文件必须是一个对象，但读取到了数字${chart}。将会创建一个包含${this.judgeLineList.length}条判定线的谱面。`,
                    "ChartReadError.TypeError",
                    "info"
                ));
            }
            else if (chart === SYMBOL_CHART_JSON_ERROR) {
                this.errors.push(new ChartError(
                    `谱面文件不存在或不能被 JSON 解析。请确保文件存在且格式正确。`,
                    "ChartReadError.FormatError"
                ));
            }
            else {
                this.errors.push(new ChartError(
                    `谱面文件必须是一个对象，但读取到了${chart}。将会被替换为空谱面。`,
                    "ChartReadError.TypeError"
                ));
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
        for (const eventLayer of judgeLine.eventLayers) {
            eventLayer.speedEvents[0].start = 10;
            eventLayer.speedEvents[0].end = 10;
        }
        this.judgeLineList.push(judgeLine);
        return judgeLine;
    }
}