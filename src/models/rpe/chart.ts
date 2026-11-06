/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isObject, isArray, isNumber, isString, clamp } from "lodash";
import { beatsToSeconds, BPM, getBeatsValue, IBPM } from "./beats";
import { ChartMeta, IChartMeta } from "./chartMeta";
import { IJudgeLine, JudgeLine } from "./judgeLine";
import { Note } from "./note";
import { AbstractEvent } from "./event";
import { markRaw, reactive } from "vue";
import { SYMBOL_CHART_JSON_ERROR } from "./chartPackage";
import { IObjectizable } from "../objectizable";
import { BlockArea, BlockAreaEventState, IBlockArea } from "./blockArea";

/** RPEJSON 格式谱面 */
export interface IChart {

    /** BPM 列表，控制曲谱的 BPM */
    BPMList: IBPM[]

    /** 存储谱面的名称、谱师、曲师等元数据 */
    META: IChartMeta

    /** 判定线组，暂时无用 */
    judgeLineGroup: string[]

    /** 判定线列表 */
    judgeLineList: IJudgeLine[]

    /** 噪域列表（Phigros 4.0.0 新增的噪域功能） */
    blockAreaList: IBlockArea[]
}

export class Chart implements IChart, IObjectizable {
    readonly BPMList: BPM[];
    readonly META: ChartMeta;
    readonly judgeLineGroup: string[];
    readonly judgeLineList: JudgeLine[];
    readonly blockAreaList: BlockArea[] = [];
    private nextBlockAreaId = 0;
    readonly errorMessages: string[] = [];

    /** 把谱面转为JSON对象 */
    toObject(): IChart {
        return {
            BPMList: this.BPMList.map(bpm => bpm.toObject()),
            META: this.META.toObject(),
            judgeLineGroup: this.judgeLineGroup,
            judgeLineList: this.judgeLineList.map(judgeLine => judgeLine.toObject()),
            blockAreaList: this.blockAreaList.map(blockArea => blockArea.toObject())
        };
    }
    getAllNotes() {
        let notes: Note[] = [];
        this.judgeLineList.forEach(judgeLine => {
            notes = notes.concat(judgeLine.notes);
        });
        return notes.sort((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime));
    }
    getAllEvents() {
        let events: AbstractEvent[] = [];
        this.judgeLineList.forEach(judgeLine => {
            events = events.concat(judgeLine.getAllEvents());
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

        for (const blockArea of this.blockAreaList) {
            blockArea.calculateSeconds();

            for (const event of blockArea.getAllEvents()) {
                event.cachedStartSeconds = beatsToSeconds(this.BPMList, event.startTime);
                event.cachedEndSeconds = beatsToSeconds(this.BPMList, event.endTime);
            }

            for (const interval of blockArea.activeIntervals) {
                interval.calculateSeconds();
            }
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
     * 噪域编号的下一个可用值。
     *
     * 噪域编号用于生成噪域事件的 id，删除噪域时不会重新编号，所以新噪域必须取一个没用过的编号。
     */
    get nextBlockAreaIndex() {
        return this.nextBlockAreaId;
    }

    /** 删除一个噪域 */
    removeBlockArea(blockArea: BlockArea) {
        const index = this.blockAreaList.indexOf(blockArea);
        if (index === -1) {
            throw new Error(`谱面中不存在噪域“${blockArea.Name}”`);
        }
        this.blockAreaList.splice(index, 1);
    }

    /** 在指定位置插入一个噪域（撤销删除时使用），返回被插入的噪域 */
    insertBlockArea(blockAreaObject: IBlockArea, position: number, index?: number, eventState?: BlockAreaEventState) {
        const newBlockArea = new BlockArea(blockAreaObject, {
            BPMList: this.BPMList,
            index: index ?? this.nextBlockAreaIndex,
            eventState
        });
        this.blockAreaList.splice(clamp(position, 0, this.blockAreaList.length), 0, newBlockArea);
        this.nextBlockAreaId = Math.max(this.nextBlockAreaId, newBlockArea.index + 1);
        this.errorMessages.push(...newBlockArea.errorMessages);
        this.calculateSeconds();
        return newBlockArea;
    }

    /**
     * 传入谱面对象，加载谱面。如果传入的是一个数字，则创建一个有对应数量判定线的谱面。
     */
    constructor(chart: unknown, version: string) {
        this.BPMList = reactive([]);
        this.judgeLineGroup = [];
        this.judgeLineList = [];

        if (isObject(chart)) {
            if ("BPMList" in chart && isArray(chart.BPMList)) {
                for (const bpm of chart.BPMList) {
                    const newBPM = new BPM(bpm);
                    this.BPMList.push(newBPM);
                    this.errorMessages = this.errorMessages.concat(newBPM.errorMessages);
                }

                // 拍数转秒数依赖 BPM 列表按时间有序，谱面文件里的列表不保证有序，加载后统一排序
                this.BPMList.sort((a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime));
            }

            const newChartMeta = new ChartMeta("META" in chart ? chart.META : null, version);
            this.META = reactive(newChartMeta);
            this.errorMessages = this.errorMessages.concat(newChartMeta.errorMessages);

            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) {
                for (const group of chart.judgeLineGroup) {
                    let formatedGroup = "default";
                    if (isString(group)) {
                        formatedGroup = group;
                    }
                    else {
                        this.errorMessages.push(`chart.judgeLineGroup 属性必须是字符串，但读取到了 ${group}。将会替换为字符串 "default"。`,);
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
                    this.errorMessages = this.errorMessages.concat(newJudgeLine.errorMessages);
                }
            }

            if ("blockAreaList" in chart && isArray(chart.blockAreaList)) {
                for (const [i, blockArea] of chart.blockAreaList.entries()) {
                    const newBlockArea = new BlockArea(blockArea, {
                        BPMList: this.BPMList,
                        index: i
                    });
                    this.blockAreaList.push(newBlockArea);
                    this.errorMessages = this.errorMessages.concat(newBlockArea.errorMessages);
                }
                this.nextBlockAreaId = this.blockAreaList.length;
            }
        }
        else {
            this.META = reactive(new ChartMeta(null, version));
            if (isNumber(chart)) {
                for (let i = 0; i < chart; i++) {
                    this.addNewJudgeLine();
                }
                this.errorMessages.push(`谱面文件必须是一个对象，但读取到了数字${chart}。将会创建一个包含${this.judgeLineList.length}条判定线的谱面。`);
            }
            else if (chart === SYMBOL_CHART_JSON_ERROR) {
                this.errorMessages.push(`谱面文件不存在或不能被 JSON 解析。请确保文件存在且格式正确。`);
            }
            else {
                this.errorMessages.push(`谱面文件必须是一个对象，但读取到了${chart}。将会被替换为空谱面。`);
            }
        }

        if (this.judgeLineList.length === 0) {
            this.addNewJudgeLine();
            this.errorMessages.push(`谱面没有任何判定线，将增加一条判定线。`);
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
        judgeLine.eventLayers[0].speedEvents[0].start = 10;
        judgeLine.eventLayers[0].speedEvents[0].end = 10;

        // 把其他事件层级上的速度事件删掉
        for (let i = 1; i < judgeLine.eventLayers.length - 1; i++) {
            judgeLine.eventLayers[i].speedEvents = [];
        }
        this.judgeLineList.push(judgeLine);
        return judgeLine;
    }
}
