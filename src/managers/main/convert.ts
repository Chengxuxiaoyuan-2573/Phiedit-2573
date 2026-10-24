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
import { IBlockArea } from "@/models/rpe/blockArea";
import { OfficialChart } from "@/models/official/chart";
import { OfficialJudgeLine } from "@/models/official/judgeLine";
import { OfficialNote, OfficialNoteType } from "@/models/official/note";
import { OfficialEvent } from "@/models/official/event";
import { OfficialBlockArea } from "@/models/official/blockArea";
import type { Point } from "@/tools/mathUtils";

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

/** 官方噪域激活之前的默认反应（闪烁）时长，单位为秒。与原版一致，谱面无法修改 */
const DEFAULT_BLOCK_AREA_READY_FLASH = 0.5;

/**
 * 官方噪域事件的 easeType 编号 → RPE 缓动类型。
 *
 * 官方声明的枚举名与实际曲线并不一致（例如 InSine 实际上是二次幂），
 * 因此下表按「实际曲线」映射到 RPE 中曲线相同的缓动，出处见官方文档：
 * https://teamflos.github.io/phira-docs/chart-standard/chart-format/phi/blockArea.html#easetype
 *
 * 官方缓动共 0 ~ 14 共 15 种：0 为线性，1 ~ 12 为幂函数缓动（指数 n = (type - 1) / 3 + 2）。
 * 其中 12（五次幂的缓入缓出，RPE 没有对应缓动）与 13、14 两种特殊缓动无法用本表表示，
 * 由 createBlockAreaEvents 单独处理。
 */
const OFFICIAL_EASING_TYPES: Record<number, EasingType> = {
    // Linear
    0: EasingType.Linear,

    // InSine / OutSine / InOutSine，实际曲线为二次幂
    1: EasingType.InQuad,
    2: EasingType.OutQuad,
    3: EasingType.IOQuad,

    // InQuad / OutQuad / InOutQuad，实际曲线为三次幂
    4: EasingType.InCubic,
    5: EasingType.OutCubic,
    6: EasingType.IOCubic,

    // InCubic / OutCubic / InOutCubic，实际曲线为四次幂
    7: EasingType.InQuart,
    8: EasingType.OutQuart,
    9: EasingType.IOQuart,

    // InQuart / OutQuart，实际曲线为五次幂
    10: EasingType.InQuint,
    11: EasingType.OutQuint
};

/** 官方噪域缓动 12（InOutQuart，实际曲线为五次幂的缓入缓出） */
const OFFICIAL_EASE_IN_OUT_QUINT = 12;

/** 官方噪域缓动 13（Zero）：曲线恒为 0，区间内保持上一个事件的值，到事件时间点才跳到目标值 */
const OFFICIAL_EASE_ZERO = 13;

/** 官方噪域缓动 14（One）：曲线恒为 1，区间开始时立即跳到目标值 */
const OFFICIAL_EASE_ONE = 14;

/**
 * 把缓动拆成两段时使用的比例，缓入缓出型缓动在正中间的位置刚好是一半。
 * 官方 12 号缓动在 p = 0.5 处的取值为 0.5，因此可以从正中间切开。
 */
const EASE_MIDDLE_RATIO = 0.5;

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

/** 官方噪域中某一个通道（如 moveX）上的一个关键帧，数值已换算为 RPE 单位 */
interface BlockAreaKeyframe {

    /** 事件的时间，单位为秒 */
    seconds: number;

    /** 事件的目标值 */
    value: number;

    /** 官方的缓动编号 */
    easeType: number;

    /** 该关键帧的锚点，即缩放 / 旋转的支点（RPE 坐标，Point 格式 { x, y }）。移动通道没有锚点，不填时事件上不写 anchor 字段 */
    anchor?: Point;
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

    /** 创建一个 RPE 数值事件。只有缩放 / 旋转事件需要锚点，其余事件不写 anchor 字段 */
    private createEvent(startTime: Beats, endTime: Beats, start: number, end: number, easingType: EasingType = EasingType.Linear, anchor?: Point): IEvent<number> {
        const event: IEvent<number> = {
            bezier: 0,
            bezierPoints: [0, 0, 1, 1],
            easingLeft: 0,
            easingRight: 1,
            easingType,
            start,
            end,
            startTime,
            endTime,
            linkgroup: 0,
            isDisabled: false
        };

        if (anchor) {
            event.anchor = { x: anchor.x, y: anchor.y };
        }
        return event;
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
            speedEvents.push(this.createEvent(
                timeToBeats(event.startTime),
                timeToBeats(event.endTime),
                this.round(event.value * SPEED_SCALE),
                this.round(event.value * SPEED_SCALE)
            ));
        }

        if (speedEvents.length === 0) {
            errorMessages.push(`${context}：官方谱面缺少速度事件，将会补充一个默认速度事件。`);
            speedEvents.push(this.createEvent([0, 0, 1], [0, 0, 1], DEFAULT_SPEED, DEFAULT_SPEED));
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
            moveXEvents.push(this.createEvent(startTime, endTime, this.round(x[0]), this.round(x[1])));
            moveYEvents.push(this.createEvent(startTime, endTime, this.round(y[0]), this.round(y[1])));
        }
        if (moveXEvents.length > 0) eventLayer.moveXEvents = moveXEvents;
        if (moveYEvents.length > 0) eventLayer.moveYEvents = moveYEvents;

        // 旋转事件
        const rotateEvents: IEvent<number>[] = [];
        for (const event of judgeLine.judgeLineRotateEvents) {
            if (event.startTime > event.endTime) continue;
            const { start, end } = this.convertRotateEvent(event);
            rotateEvents.push(this.createEvent(timeToBeats(event.startTime), timeToBeats(event.endTime), this.round(start), this.round(end)));
        }
        if (rotateEvents.length > 0) eventLayer.rotateEvents = rotateEvents;

        // 透明度事件
        const alphaEvents: IEvent<number>[] = [];
        for (const event of judgeLine.judgeLineDisappearEvents) {
            if (event.startTime > event.endTime) continue;
            const { start, end } = this.convertAlphaEvent(event);
            alphaEvents.push(this.createEvent(timeToBeats(event.startTime), timeToBeats(event.endTime), this.round(start), this.round(end)));
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
            rotateWithFather: false,
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
     * 创建一个由官方噪域的关键帧事件转换而来的 RPE 数值事件。
     * @param startTime 事件开始时间
     * @param endTime 事件结束时间
     * @param start 事件开始时的数值
     * @param end 事件结束时的数值
     * @param easingType 缓动类型
     */
    private createKeyframeEvent(
        startTime: Beats,
        endTime: Beats,
        start: number,
        end: number,
        easingType: EasingType,
        anchor?: Point
    ): IEvent<number> {
        // 起始时间不早于结束时间时退化为瞬时事件，避免出现 startTime 大于 endTime 的非法事件
        if (beatsCompare(startTime, endTime) >= 0) {
            return this.createEvent(endTime, endTime, this.round(end), this.round(end), easingType, anchor);
        }
        return this.createEvent(startTime, endTime, this.round(start), this.round(end), easingType, anchor);
    }

    /**
     * 取官方缓动编号对应的 RPE 缓动类型，遇到未知编号时退化为线性缓动并记录下来。
     * @param easeType 官方的缓动编号
     * @param unknownEasingTypes 用于收集未知缓动编号的集合
     */
    private getBlockAreaEasingType(easeType: number, unknownEasingTypes: Set<number>): EasingType {
        const easingType = OFFICIAL_EASING_TYPES[easeType];
        if (easingType === undefined) {
            unknownEasingTypes.add(easeType);
            return EasingType.Linear;
        }
        return easingType;
    }

    /**
     * 把官方噪域中某一个通道的关键帧序列转换为 RPE 的数值事件序列。
     *
     * 官方噪域的事件是「关键帧」形式：每一段连接相邻两个关键帧，
     * 段的缓动取该段**起始**关键帧的缓动编号（与 RPE Next 的实现一致；
     * 官方文档的措辞更像取结束关键帧，若游戏内表现不符只需交换这里的取值方向）。
     * 第一个关键帧之前数值保持默认值，到第一个关键帧的时间点才变为它的值。
     *
     * 官方有三种缓动无法直接用 RPE 的缓动函数表示，需要单独处理：
     *
     * 官方 12 号缓动是「五次幂的缓入缓出」，而 RPE 没有五次幂的缓入缓出。
     * 但缓入缓出型缓动在正中间的取值恰好是 0.5，因此可以从正中间把它切成两段，
     * 用 RPE 的五次幂缓入（InQuint）与缓出（OutQuint）精确表示。
     *
     * 官方的缓动 13（Zero）与 14（One）是两种特殊缓动：
     *  - Zero：曲线恒为 0，整段保持该关键帧的值，到下一个关键帧的时间点才跳到它的值。
     *    这里用一个数值恒定的区间事件表示「保持」，跳变则由下一段的起始值完成；
     *  - One：曲线恒为 1，该段一开始就跳到下一个关键帧的值并保持，
     *    用一个数值恒等于目标值的区间事件表示即可。
     *
     * 最后一个关键帧的时间点会补一个瞬时事件固定它的值，
     * 使链尾（包括 Zero / One 的跳变）之后的数值保持在最后一个关键帧的值上。
     *
     * @param keyframes 按时间升序排列的关键帧
     * @param toRpeTime 把官方噪域的时间（秒）转换为 RPE 拍数的函数
     * @param unknownEasingTypes 用于收集未知缓动编号的集合
     */
    private createBlockAreaEvents(
        keyframes: BlockAreaKeyframe[],
        toRpeTime: (seconds: number) => Beats,
        unknownEasingTypes: Set<number>
    ): IEvent<number>[] {
        const events: IEvent<number>[] = [];

        for (let i = 0; i < keyframes.length - 1; i++) {
            const keyframe = keyframes[i];
            const next = keyframes[i + 1];
            const startTime = toRpeTime(keyframe.seconds);
            const endTime = toRpeTime(next.seconds);
            const startValue = keyframe.value;
            const endValue = next.value;

            // 这一段使用起始关键帧的锚点，与 startValue 使用同一个关键帧。
            // 移动通道没有锚点，这里会是 undefined，事件上就不会写 anchor 字段
            const anchor = keyframe.anchor;

            if (keyframe.easeType === OFFICIAL_EASE_ZERO) {
                // 保持该关键帧的值，到下一个关键帧的时间点才跳到它的值
                events.push(this.createKeyframeEvent(startTime, endTime, startValue, startValue, EasingType.Linear, anchor));
            }
            else if (keyframe.easeType === OFFICIAL_EASE_ONE) {
                // 该段一开始就跳到下一个关键帧的值并保持
                events.push(this.createKeyframeEvent(startTime, endTime, endValue, endValue, EasingType.Linear, anchor));
            }
            else if (keyframe.easeType === OFFICIAL_EASE_IN_OUT_QUINT) {
                // 从正中间切成两段：前半段用五次幂缓入，后半段用五次幂缓出
                const middleSeconds = keyframe.seconds + (next.seconds - keyframe.seconds) * EASE_MIDDLE_RATIO;
                const middleTime = toRpeTime(middleSeconds);
                const middleValue = startValue + (endValue - startValue) * EASE_MIDDLE_RATIO;

                events.push(this.createKeyframeEvent(startTime, middleTime, startValue, middleValue, EasingType.InQuint, anchor));
                events.push(this.createKeyframeEvent(middleTime, endTime, middleValue, endValue, EasingType.OutQuint, anchor));
            }
            else {
                events.push(this.createKeyframeEvent(
                    startTime,
                    endTime,
                    startValue,
                    endValue,
                    this.getBlockAreaEasingType(keyframe.easeType, unknownEasingTypes),
                    anchor
                ));
            }
        }

        // 链尾：最后一个关键帧的时间点补一个瞬时事件固定它的值
        const last = keyframes[keyframes.length - 1];
        if (last !== undefined) {
            const lastTime = toRpeTime(last.seconds);
            events.push(this.createKeyframeEvent(lastTime, lastTime, last.value, last.value, EasingType.Linear, last.anchor));
        }

        return events;
    }

    /**
     * 把官方的一个噪域转换为 RPE 噪域。
     *
     * 官方噪域的坐标以渲染范围的左下角为原点、0.0 ~ 1.0 对应渲染范围，
     * 四个时间点与事件的 time 均为秒；转换后会变成 RPE 坐标（x ∈ [-675, 675]，y ∈ [-450, 450]）与拍数。
     *
     * 官方噪域在第一个事件之前，位置取方块中心、缩放取 (1, 1)、旋转取 0，与文档一致。
     *
     * 官方噪域的旋转 / 缩放事件带有各自的锚点（anchor），锚点与 bottomLeftPercentage / topRightPercentage
     * 使用同一套坐标（渲染范围归一化坐标），表示缩放 / 旋转的支点。
     * RPE 的事件同样自带 anchor 字段，因此这里把锚点换算为 RPE 坐标后直接写到对应事件的 anchor 上，
     * 由渲染器在缩放与旋转时以它为支点。移动事件没有支点，不写 anchor 字段（与标准谱面一致）。
     *
     * @param unknownEasingTypes 用于收集未知缓动编号的集合
     */
    private convertBlockArea(
        blockArea: OfficialBlockArea,
        globalBpm: number,
        index: number,
        unknownEasingTypes: Set<number>
    ): IBlockArea {
        const secondsToBeats = (seconds: number) => seconds * globalBpm / SECONDS_PER_MINUTE;
        const toRpeTime = (seconds: number) => toBeats(secondsToBeats(seconds));
        const toRpeX = (x: number) => x * RPE_WIDTH - RPE_WIDTH / 2;
        const toRpeY = (y: number) => y * RPE_HEIGHT - RPE_HEIGHT / 2;

        const bottomLeft = {
            x: this.round(toRpeX(blockArea.bottomLeftPercentage[0])),
            y: this.round(toRpeY(blockArea.bottomLeftPercentage[1]))
        };
        const topRight = {
            x: this.round(toRpeX(blockArea.topRightPercentage[0])),
            y: this.round(toRpeY(blockArea.topRightPercentage[1]))
        };

        // 官方噪域的关键帧事件按时间顺序排列，但为了稳妥，转换前先按时间排序
        const byTime = <T extends { time: number }>(events: T[]) => [...events].sort((a, b) => a.time - b.time);

        // 移动事件 → moveX / moveY
        const moveEvents = byTime(blockArea.moveEvents);
        const moveXEvents = this.createBlockAreaEvents(
            moveEvents.map(event => ({ seconds: event.time, value: toRpeX(event.endPosition[0]), easeType: event.easeTypeX })),
            toRpeTime, unknownEasingTypes
        );
        const moveYEvents = this.createBlockAreaEvents(
            moveEvents.map(event => ({ seconds: event.time, value: toRpeY(event.endPosition[1]), easeType: event.easeTypeY })),
            toRpeTime, unknownEasingTypes
        );

        // 缩放事件 → scaleX / scaleY（每个关键帧带上自己的缩放中心）
        const scaleEvents = byTime(blockArea.scaleEvents);
        const scaleXEvents = this.createBlockAreaEvents(
            scaleEvents.map(event => ({
                seconds: event.time,
                value: event.scale[0],
                easeType: event.easeTypeX,
                anchor: { x: toRpeX(event.anchor[0]), y: toRpeY(event.anchor[1]) }
            })),
            toRpeTime, unknownEasingTypes
        );
        const scaleYEvents = this.createBlockAreaEvents(
            scaleEvents.map(event => ({
                seconds: event.time,
                value: event.scale[1],
                easeType: event.easeTypeY,
                anchor: { x: toRpeX(event.anchor[0]), y: toRpeY(event.anchor[1]) }
            })),
            toRpeTime, unknownEasingTypes
        );

        // 旋转事件 → rotate（官方与 RPE 的旋转方向相反，需要取相反数，与判定线一致）
        const rotateKeyframes = byTime(blockArea.rotateEvents);
        const rotateEvents = this.createBlockAreaEvents(
            rotateKeyframes.map(event => ({
                seconds: event.time,
                value: -event.rotation,
                easeType: event.easeType,
                anchor: { x: toRpeX(event.anchor[0]), y: toRpeY(event.anchor[1]) }
            })),
            toRpeTime, unknownEasingTypes
        );

        return {
            Name: `噪域${index + 1}`,
            activeIntervals: [{
                startTime: toRpeTime(blockArea.enableTime),
                endTime: toRpeTime(blockArea.disableTime),
                readyFlash: DEFAULT_BLOCK_AREA_READY_FLASH
            }],
            appearTime: toRpeTime(blockArea.appearTime),
            bottomLeft,
            disappearTime: toRpeTime(blockArea.disappearTime),
            editorPositionX: 0,
            isInvert: blockArea.isSubtract,
            moveXEvents,
            moveYEvents,
            rotateEvents,
            scaleXEvents,
            scaleYEvents,
            topRight
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

        const blockAreaUnknownEasingTypes = new Set<number>();
        const blockAreaList = officialChart.blockAreaList.map((blockArea, i) =>
            this.convertBlockArea(blockArea, globalBpm, i, blockAreaUnknownEasingTypes));

        if (blockAreaUnknownEasingTypes.size > 0) {
            errorMessages.push(`噪域中出现了未知的缓动编号：${[...blockAreaUnknownEasingTypes].join("、")}。这些缓动将会退化为线性缓动。`);
        }

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
            judgeLineList,
            blockAreaList
        };

        return { chart, errorMessages };
    }
}
export default new ConvertManager();
