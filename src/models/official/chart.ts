/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * Phigros Official（官方）谱面格式的根对象。
 * 参考文档：https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/root.html
 */

import { isObject } from "lodash";
import { IObjectizable } from "../objectizable";
import { asRecord, readArrayField, readRequiredNumber } from "./helpers";
import { OfficialJudgeLine, IOfficialJudgeLine } from "./judgeLine";
import { OfficialBlockArea, IOfficialBlockArea } from "./blockArea";

/** Phigros Official 格式的谱面根对象 */
export interface IOfficialChart {

    /**
     * 谱面格式版本，影响判定线移动事件的解析方式。
     * 目前已知的取值为 1 或 3。
     */
    formatVersion: number

    /** 谱面的延迟，单位为秒。为正数时谱面比音乐快 */
    offset: number

    /** 判定线列表 */
    judgeLineList: IOfficialJudgeLine[]

    /** 噪域列表（Phigros 4.0.0 新增） */
    blockAreaList: IOfficialBlockArea[]
}

/** 已知且支持的 formatVersion */
export const SUPPORTED_FORMAT_VERSIONS = [1, 3] as const;

const DEFAULT_FORMAT_VERSION = 3;
const DEFAULT_OFFSET = 0;

export class OfficialChart implements IOfficialChart, IObjectizable<IOfficialChart> {
    formatVersion = DEFAULT_FORMAT_VERSION;
    offset = DEFAULT_OFFSET;
    judgeLineList: OfficialJudgeLine[] = [];
    blockAreaList: OfficialBlockArea[] = [];

    /** 本谱面自身以及其所有子对象产生的错误信息 */
    readonly errorMessages: string[] = [];

    toObject(): IOfficialChart {
        return {
            formatVersion: this.formatVersion,
            offset: this.offset,
            judgeLineList: this.judgeLineList.map(judgeLine => judgeLine.toObject()),
            blockAreaList: this.blockAreaList.map(blockArea => blockArea.toObject())
        };
    }

    constructor(chart: unknown) {
        const context = "官方谱面";

        if (!isObject(chart)) {
            this.errorMessages.push(`${context}：官方谱面必须是一个对象，但读取到了 ${chart}。将会被视为一个空谱面。`);
            return;
        }

        const source = asRecord(chart)!;

        // formatVersion
        this.formatVersion = readRequiredNumber(source, "formatVersion", DEFAULT_FORMAT_VERSION, this.errorMessages, context, "官方谱面");
        if (!(SUPPORTED_FORMAT_VERSIONS as readonly number[]).includes(this.formatVersion)) {
            this.errorMessages.push(`${context}：不支持的 formatVersion：${this.formatVersion}。已知的支持 ${SUPPORTED_FORMAT_VERSIONS.join("、")}，将会按 ${DEFAULT_FORMAT_VERSION} 解析移动事件。`);
            this.formatVersion = DEFAULT_FORMAT_VERSION;
        }

        // offset
        this.offset = readRequiredNumber(source, "offset", DEFAULT_OFFSET, this.errorMessages, context, "官方谱面");

        // judgeLineList
        const judgeLineList = readArrayField(source, "judgeLineList", this.errorMessages, context, "官方谱面");
        if (judgeLineList) {
            judgeLineList.forEach((judgeLine, i) => {
                const newJudgeLine = new OfficialJudgeLine(judgeLine, i);
                this.judgeLineList.push(newJudgeLine);
                this.errorMessages.push(...newJudgeLine.errorMessages);
            });
        }

        // blockAreaList
        const blockAreaList = readArrayField(source, "blockAreaList", this.errorMessages, context, "官方谱面");
        if (blockAreaList) {
            blockAreaList.forEach((blockArea, i) => {
                const newBlockArea = new OfficialBlockArea(blockArea, `第${i}个噪域`);
                this.blockAreaList.push(newBlockArea);
                this.errorMessages.push(...newBlockArea.errorMessages);
            });
        }
    }
}
