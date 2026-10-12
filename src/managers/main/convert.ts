/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * 把 Phigros Official（官方）谱面格式转换为 RPE 谱面格式。
 *
 * 单位换算的依据来自 Phira（prpr）的官方谱面解析器与 RPE 解析器：
 * 两种格式都会被转换到同一套内部表示，因此我们只要让转换后的 RPE 数据
 * 与官方数据的内部表示相等即可。
 *  - 官方谱面解析器：prpr/src/parse/pgr.rs
 *  - RPE 谱面解析器：prpr/src/parse/rpe.rs
 *
 * 关键结论（RPE 坐标系：x ∈ [-675, 675]，y ∈ [-450, 450]）：
 *  - 官方音符 positionX 的单位为「宽度单位」，1 宽度单位 = 0.05625 × 1350 = 75.9375 个 RPE 单位
 *  - 官方速度事件的值单位为「高度单位」，1 高度单位/秒 = 4.5 个 RPE 流速
 *  - 官方旋转事件与 RPE 旋转事件方向相反，需要取相反数
 *  - 官方透明度事件取值区间为 [0, 1]，RPE 为 [0, 255]
 */

import { IChart } from "@/models/rpe/chart";
import { IChartMeta } from "@/models/rpe/chartMeta";
import { Beats, beatsCompare, toBeats } from "@/models/rpe/beats";
import { IEvent } from "@/models/rpe/event";
import { EasingType } from "@/models/rpe/easing";
import { IJudgeLine, JudgeLineCover } from "@/models/rpe/judgeLine";
import { IBaseEventLayer } from "@/models/rpe/eventLayer";
import { INote, NoteAbove, NoteFake, NoteType } from "@/models/rpe/note";
import { OfficialChart } from "@/models/official/chart";
import { OfficialJudgeLine } from "@/models/official/judgeLine";
import { OfficialNote, OfficialNoteType } from "@/models/official/note";
import { OfficialEvent } from "@/models/official/event";

/**
 * 支持导入的谱面格式。
 * - `rpe`：Re:PhiEdit 谱面格式，直接按现有逻辑读取
 * - `official`：Phigros 官方谱面格式，需要先转谱为 RPE 再存储
 */
export type ChartFormat = "rpe" | "official";

/** RPE 坐标系中谱面的宽度与高度 */
export const RPE_WIDTH = 1350;
export const RPE_HEIGHT = 900;

/** 一分钟的秒数 */
const SECONDS_PER_MINUTE = 60;

/**
 * 官方谱面中的一个时间单位（128 分音符）等于 1.875 / bpm 秒，
 * 而 1.875 = 60 / 32，因此一个时间单位的秒数为 SECONDS_PER_MINUTE / OFFICIAL_UNITS_PER_MINUTE / bpm。
 */
const OFFICIAL_UNITS_PER_MINUTE = 32;

/** 官方音符 positionX 的单位是「宽度单位」，1 个宽度单位等于半个屏幕宽度的 9 / 160 */
const OFFICIAL_POSITION_X_NUMERATOR = 9;
const OFFICIAL_POSITION_X_DENOMINATOR = 160;

/** 1 个宽度单位对应的 RPE 坐标长度，等于 0.1125 */
const OFFICIAL_POSITION_X_UNIT = 2 * OFFICIAL_POSITION_X_NUMERATOR / OFFICIAL_POSITION_X_DENOMINATOR;

/** 官方音符 positionX 单位（宽度单位）→ RPE 坐标的缩放系数，等于 75.9375 */
const POSITION_X_SCALE = OFFICIAL_POSITION_X_UNIT * RPE_WIDTH / 2;

/** 官方速度事件的值 → RPE 流速的缩放系数 */
const SPEED_SCALE = 4.5;

/** formatVersion 为 1 时，移动事件坐标使用的是 880 × 520 的坐标系 */
const FORMAT_V1_WIDTH = 880;
const FORMAT_V1_HEIGHT = 520;

/** formatVersion 为 1 时移动事件的坐标缩放系数 */
const FORMAT_V1_X_SCALE = RPE_WIDTH / FORMAT_V1_WIDTH;
const FORMAT_V1_Y_SCALE = RPE_HEIGHT / FORMAT_V1_HEIGHT;

/** formatVersion 为 1 时，移动事件坐标被打包成整数，x 为前若干位、y 为后三位 */
const PACKED_COORDINATE_SCALE = 1000;

/** 一秒的毫秒数 */
const MILLISECONDS_PER_SECOND = 1000;

/** 官方音符类型 → RPE 音符类型 */
const NOTE_TYPE_MAP: Record<OfficialNoteType, NoteType> = {
    [OfficialNoteType.Tap]: NoteType.Tap,
    [OfficialNoteType.Drag]: NoteType.Drag,
    [OfficialNoteType.Hold]: NoteType.Hold,
    [OfficialNoteType.Flick]: NoteType.Flick
};

/** 没有速度事件时，为判定线补充的默认 RPE 流速（等价于官方的 1.0） */
const DEFAULT_SPEED = SPEED_SCALE;

/** 保留小数的位数，避免出现 0.30000000000000004 之类的值 */
const DECIMAL_PLACES = 6;

/** 官方谱面没有元数据，需要从压缩包的 info.txt / info.yml 中读取后传入 */
export interface OfficialMetaSource {
    name?: string;
    charter?: string;
    composer?: string;
    illustration?: string;
    level?: string;
}

export interface ConvertOptions {

    /** 本编辑器版本号，形如 "0.2.2"，会写入 RPE 的 META.RPEVersion */
    version: string;

    /** 谱面元数据 */
    meta?: OfficialMetaSource;
}

export interface ConvertResult {

    /** 转换后的 RPE 谱面（可直接 JSON.stringify 后存储） */
    chart: IChart;

    /** 转谱过程中出现的所有错误信息 */
    errorMessages: string[];
}

class ConvertManager {
    /** 官方一个时间单位（128 分音符）对应的秒数 */
    private officialSecondsPerUnit(bpm: number) {
        return SECONDS_PER_MINUTE / OFFICIAL_UNITS_PER_MINUTE / bpm;
    }

    /** 把数值四舍五入到 DECIMAL_PLACES 位小数，避免出现 0.30000000000000004 之类的值 */
    private round(value: number) {
        const factor = 10 ** DECIMAL_PLACES;
        return Math.round(value * factor) / factor;
    }

    /** 创建一个线性的 RPE 数值事件 */
    private createLinearEvent(startTime: Beats, endTime: Beats, start: number, end: number): IEvent<number> {
        return {
            bezier: 0,
            bezierPoints: [0, 0, 1, 1],
            easingLeft: 0,
            easingRight: 1,
            easingType: EasingType.Linear,
            start,
            end,
            startTime,
            endTime,
            linkgroup: 0,
            isDisabled: false
        };
    }

    /**
     * 把官方谱面的事件时间（单位 1.875 / bpm 秒）转换为 RPE 的拍。
     * @param time 官方时间
     * @param secondsPerUnit 官方一个时间单位对应的秒数
     * @param secondsToBeats 把秒转换为拍的函数
     */
    private convertTime(time: number, secondsPerUnit: number, secondsToBeats: (seconds: number) => number) {
        return toBeats(secondsToBeats(time * secondsPerUnit));
    }

    /**
     * 把官方的移动事件转换为 RPE 的 moveX / moveY 事件。
     *
     * formatVersion 为 1 时，start、end 是打包后的整数（x = (v - v % 1000) / 1000，y = v % 1000）；
     * formatVersion 为 3 时，start、end 是 x 坐标，start2、end2 是 y 坐标。
     */
    private convertMoveEvent(event: OfficialEvent, formatVersion: number) {
        let startX: number, startY: number, endX: number, endY: number;

        if (formatVersion === 1) {
            startX = (event.start - event.start % PACKED_COORDINATE_SCALE) / PACKED_COORDINATE_SCALE;
            startY = event.start % PACKED_COORDINATE_SCALE;
            endX = (event.end - event.end % PACKED_COORDINATE_SCALE) / PACKED_COORDINATE_SCALE;
            endY = event.end % PACKED_COORDINATE_SCALE;

            return {
                x: [startX * FORMAT_V1_X_SCALE - RPE_WIDTH / 2, endX * FORMAT_V1_X_SCALE - RPE_WIDTH / 2],
                y: [startY * FORMAT_V1_Y_SCALE - RPE_HEIGHT / 2, endY * FORMAT_V1_Y_SCALE - RPE_HEIGHT / 2]
            };
        }

        // formatVersion 为 3
        return {
            x: [event.start * RPE_WIDTH - RPE_WIDTH / 2, event.end * RPE_WIDTH - RPE_WIDTH / 2],
            y: [event.start2 * RPE_HEIGHT - RPE_HEIGHT / 2, event.end2 * RPE_HEIGHT - RPE_HEIGHT / 2]
        };
    }

    /** 把官方转速事件转换为 RPE 的 rotate 事件（方向相反） */
    private convertRotateEvent(event: OfficialEvent) {
        return { start: -event.start, end: -event.end };
    }

    /** 把官方透明度事件转换为 RPE 的 alpha 事件（0~1 → 0~255） */
    private convertAlphaEvent(event: OfficialEvent) {
        return { start: event.start * 255, end: event.end * 255 };
    }

    /** 把官方音符转换为 RPE 音符 */
    private convertNote(
        note: OfficialNote,
        above: NoteAbove,
        secondsPerUnit: number,
        secondsToBeats: (seconds: number) => number
    ): INote {
        return {
            above,
            alpha: 255,
            startTime: this.convertTime(note.time, secondsPerUnit, secondsToBeats),
            endTime: this.convertTime(note.time + note.holdTime, secondsPerUnit, secondsToBeats),
            type: NOTE_TYPE_MAP[note.type as OfficialNoteType] ?? NoteType.Tap,

            // 官方 Hold 的 speed 只作用于尾判、头部恒为 1，与 RPE 的语义不同，
            // 与 Phira 保持一致：Hold 的速度固定为 1，非 Hold 保留原速度
            speed: note.type === OfficialNoteType.Hold ? 1 : note.speed,
            isFake: NoteFake.Real,
            positionX: this.round(note.positionX * POSITION_X_SCALE),
            size: 1,
            yOffset: 0,
            visibleTime: 999999,
            judgeArea: 1
        };
    }

    /** 收集官方谱面里所有判定线的 bpm，取众数作为转换后的全局 BPM */
    pickGlobalBpm(chart: OfficialChart) {
        const counter = new Map<number, number>();
        for (const judgeLine of chart.judgeLineList) {
            counter.set(judgeLine.bpm, (counter.get(judgeLine.bpm) ?? 0) + 1);
        }

        let result = 120;
        let maxCount = 0;
        for (const [bpm, count] of counter) {
            if (count > maxCount) {
                maxCount = count;
                result = bpm;
            }
        }
        return result;
    }

    /** 构建 RPE 的判定线控制数组（本编辑器不使用，仅用于兼容 RPE） */
    private createDefaultControls() {
        const MAX = 999999;
        const E = EasingType.Linear;
        return {
            alphaControl: [{ easing: E, alpha: 1, x: 0 }, { easing: E, alpha: 1, x: MAX }],
            posControl: [{ easing: E, pos: 1, x: 0 }, { easing: E, pos: 1, x: MAX }],
            sizeControl: [{ easing: E, size: 1, x: 0 }, { easing: E, size: 1, x: MAX }],
            skewControl: [{ easing: E, skew: 1, x: 0 }, { easing: E, skew: 1, x: MAX }],
            yControl: [{ easing: E, y: 1, x: 0 }, { easing: E, y: 1, x: MAX }]
        };
    }

    /** 把官方的一条判定线转换为 RPE 判定线 */
    private convertJudgeLine(
        judgeLine: OfficialJudgeLine,
        globalBpm: number,
        formatVersion: number,
        errorMessages: string[]
    ): IJudgeLine {
        const context = `第${judgeLine.judgeLineNumber}号判定线`;
        const secondsPerUnit = this.officialSecondsPerUnit(judgeLine.bpm);

        // 官方时间先按自身 bpm 换算为秒，再按全局 BPM 换算为拍
        const secondsToBeats = (seconds: number) => seconds * globalBpm / SECONDS_PER_MINUTE;
        const timeToBeats = (time: number) => this.convertTime(time, secondsPerUnit, secondsToBeats);

        const eventLayer: IBaseEventLayer = {};

        // 速度事件
        const speedEvents: IEvent<number>[] = [];
        for (const event of judgeLine.speedEvents) {
            if (event.startTime > event.endTime) continue;
            speedEvents.push(this.createLinearEvent(
                timeToBeats(event.startTime),
                timeToBeats(event.endTime),
                this.round(event.value * SPEED_SCALE),
                this.round(event.value * SPEED_SCALE)
            ));
        }

        if (speedEvents.length === 0) {
            errorMessages.push(`${context}：官方谱面缺少速度事件，将会补充一个默认速度事件。`);
            speedEvents.push(this.createLinearEvent([0, 0, 1], [0, 0, 1], DEFAULT_SPEED, DEFAULT_SPEED));
        }
        eventLayer.speedEvents = speedEvents;

        // 移动事件
        const moveXEvents: IEvent<number>[] = [];
        const moveYEvents: IEvent<number>[] = [];
        for (const event of judgeLine.judgeLineMoveEvents) {
            if (event.startTime > event.endTime) continue;
            const { x, y } = this.convertMoveEvent(event, formatVersion);
            const startTime = timeToBeats(event.startTime);
            const endTime = timeToBeats(event.endTime);
            moveXEvents.push(this.createLinearEvent(startTime, endTime, this.round(x[0]), this.round(x[1])));
            moveYEvents.push(this.createLinearEvent(startTime, endTime, this.round(y[0]), this.round(y[1])));
        }
        if (moveXEvents.length > 0) eventLayer.moveXEvents = moveXEvents;
        if (moveYEvents.length > 0) eventLayer.moveYEvents = moveYEvents;

        // 旋转事件
        const rotateEvents: IEvent<number>[] = [];
        for (const event of judgeLine.judgeLineRotateEvents) {
            if (event.startTime > event.endTime) continue;
            const { start, end } = this.convertRotateEvent(event);
            rotateEvents.push(this.createLinearEvent(timeToBeats(event.startTime), timeToBeats(event.endTime), this.round(start), this.round(end)));
        }
        if (rotateEvents.length > 0) eventLayer.rotateEvents = rotateEvents;

        // 透明度事件
        const alphaEvents: IEvent<number>[] = [];
        for (const event of judgeLine.judgeLineDisappearEvents) {
            if (event.startTime > event.endTime) continue;
            const { start, end } = this.convertAlphaEvent(event);
            alphaEvents.push(this.createLinearEvent(timeToBeats(event.startTime), timeToBeats(event.endTime), this.round(start), this.round(end)));
        }
        if (alphaEvents.length > 0) eventLayer.alphaEvents = alphaEvents;

        // 音符
        const notes: INote[] = [];
        for (const note of judgeLine.notesAbove) {
            notes.push(this.convertNote(note, NoteAbove.Above, secondsPerUnit, secondsToBeats));
        }

        for (const note of judgeLine.notesBelow) {
            notes.push(this.convertNote(note, NoteAbove.Below, secondsPerUnit, secondsToBeats));
        }

        notes.sort((a, b) => beatsCompare(a.startTime, b.startTime));

        return {
            Group: 0,
            Name: "Untitled",
            Texture: "line.png",
            father: -1,
            isCover: JudgeLineCover.Cover,
            zOrder: 0,
            anchor: [0.5, 0.5],
            bpmfactor: 1,
            ...this.createDefaultControls(),
            eventLayers: [eventLayer],
            extended: {},
            notes,
            numOfNotes: notes.length
        };
    }

    /**
     * 把官方谱面 JSON 转换为 RPE 谱面 JSON。
     * @param chartContent 官方谱面的 JSON 内容（未解析的原始值或已解析的对象）
     * @param options 转换选项
     */
    convertOfficialToRpe(chartContent: unknown, options: ConvertOptions): ConvertResult {
        const officialChart = new OfficialChart(chartContent);
        const errorMessages: string[] = [...officialChart.errorMessages];

        const globalBpm = this.pickGlobalBpm(officialChart);
        const meta = options.meta ?? {};

        if (officialChart.judgeLineList.length === 0) {
            errorMessages.push("官方谱面中没有任何判定线，转换后的谱面将没有判定线。");
        }

        const judgeLineList = officialChart.judgeLineList.map(judgeLine =>
            this.convertJudgeLine(judgeLine, globalBpm, officialChart.formatVersion, errorMessages));

        const chartMeta: IChartMeta = {
            name: meta.name || "unknown",
            charter: meta.charter || "unknown",
            composer: meta.composer || "unknown",
            illustration: meta.illustration || "unknown",
            level: meta.level || "SP Lv.?",

            // 官方谱面的 offset 单位为秒，RPE 为毫秒。
            // 两种格式的正负号含义相同（正数都表示谱面相比音乐提前），因此只做单位换算，不取相反数。
            offset: this.round(officialChart.offset * MILLISECONDS_PER_SECOND),
            RPEVersion: parseInt(options.version.replaceAll(".", "")),
            is2573: true
        };

        const chart: IChart = {
            BPMList: [{ bpm: globalBpm, startTime: [0, 0, 1] }],
            META: chartMeta,
            judgeLineGroup: [],
            judgeLineList
        };

        return { chart, errorMessages };
    }
}
export default new ConvertManager();
