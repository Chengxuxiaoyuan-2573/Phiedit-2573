import { isObject, isNumber, isString, isArray } from "lodash";
import { calculateDisplacement, EasingType } from "./easing";
import { BaseEventLayer, baseEventTypes, ExtendedEventLayer, extendedEventTypes, IBaseEventLayer, IExtendedEventLayer } from "./eventLayer";
import { INote, Note } from "./note";
import { AbstractEvent, getEasingFunctionOfNumberEvent, NumberEvent } from "./event";
import { beatsCompare, BPM } from "./beats";
import ChartError from "./error";
import { isArrayOfNumbers } from "@/tools/typeTools";
import { IObjectizable } from "./objectizable";
export interface JudgeLineExtendedOptions {
    BPMList: BPM[],
    judgeLineNumber: number
}
export enum JudgeLineCover {
    Uncover = 0,
    Cover = 1
}
export interface IJudgeLine {

    /** 判定线分组，不知道有啥用 */
    Group: number

    /** 判定线名称，不知道有啥用 */
    Name: string

    /** 判定线贴图，如果有贴图会为贴图的文件名 */
    Texture: string

    /** 基本事件，是分层的，每一层在某个时间点都能通过算法得到一个值，把所有层的值加起来就是最终值 */
    eventLayers: IBaseEventLayer[]

    /** 特殊事件，只有一层，每一层在某个时间点都能通过算法得到一个值，把所有层的值加起来就是最终值 */
    extended: IExtendedEventLayer

    /** 父线线号，会从父线继承X、Y坐标并以父线方向为坐标轴方向叠加上自己的坐标 */
    father: number

    /** 判定线是否遮罩 */
    isCover: JudgeLineCover

    /** 音符的数量 */
    numOfNotes?: number,

    /** 该判定线的所有note */
    notes: INote[]

    /** 显示的层号，越大越靠前 */
    zOrder: number,

    /** bpm的倍率 */
    bpmfactor: number,

    /** 判定线锚点的位置 */
    anchor: [number, number],

    /** 绑定UI，若不绑定则没有该属性 */
    attachUI?: "none" | "pause" | "combonumber" | "combo" | "score" | "bar" | "name" | "level"

    /** 不支持此属性，也不知道啥意思 */
    alphaControl: {
        alpha: number,
        easing: EasingType,
        x: number
    }[]

    /** 不支持此属性，也不知道啥意思 */
    posControl: {
        easing: EasingType,
        pos: number,
        x: number
    }[]

    /** 不支持此属性，也不知道啥意思 */
    sizeControl: {
        easing: EasingType,
        size: number,
        x: number
    }[]

    /** 不支持此属性，也不知道啥意思 */
    skewControl: {
        easing: EasingType,
        skew: number,
        x: number
    }[]

    /** 不支持此属性，也不知道啥意思 */
    yControl: {
        easing: EasingType,
        x: number,
        y: number
    }[]
}

// Default constants
const DEFAULT_GROUP = 0;
const DEFAULT_NAME = "Untitled";
const DEFAULT_TEXTURE = "line.png";
const DEFAULT_BPMFACTOR = 1;
const DEFAULT_ANCHOR: [number, number] = [0.5, 0.5];
const DEFAULT_FATHER = -1;
const DEFAULT_IS_COVER = JudgeLineCover.Cover;
const DEFAULT_Z_ORDER = 0;

// Default control values
const DEFAULT_EASING_TYPE = EasingType.Linear;
const DEFAULT_ALPHA = 1;
const DEFAULT_POS = 1;
const DEFAULT_SIZE = 1;
const DEFAULT_SKEW = 1;
const DEFAULT_Y = 1;
const DEFAULT_X_MAX = 999999;
const DEFAULT_X_MIN = 0;

const MAX_EVENT_LAYERS = 4;
const SPEED_RATIO = 120;

export class JudgeLine implements IJudgeLine, IObjectizable<IJudgeLine> {
    Group = DEFAULT_GROUP;
    Name = DEFAULT_NAME;
    Texture = DEFAULT_TEXTURE;
    bpmfactor = DEFAULT_BPMFACTOR;
    anchor: [number, number] = DEFAULT_ANCHOR;
    eventLayers: BaseEventLayer[] = [];
    readonly extended: ExtendedEventLayer;
    father = DEFAULT_FATHER;
    isCover = DEFAULT_IS_COVER;
    notes: Note[] = [];
    get numOfNotes() {
        return this.notes.length;
    }
    get numOfEvents() {
        let result = 0;
        for (const eventLayer of this.eventLayers) {
            for (const type of baseEventTypes) {
                result += eventLayer.getEventsByType(type).length;
            }
        }

        for (const type of extendedEventTypes) {
            result += this.extended.getEventsByType(type).length;
        }
        return result;
    }
    alphaControl = [{
        easing: DEFAULT_EASING_TYPE,
        alpha: DEFAULT_ALPHA,
        x: DEFAULT_X_MAX
    }, {
        easing: DEFAULT_EASING_TYPE,
        alpha: DEFAULT_ALPHA,
        x: DEFAULT_X_MIN
    }];
    posControl = [{
        easing: DEFAULT_EASING_TYPE,
        pos: DEFAULT_POS,
        x: DEFAULT_X_MAX
    }, {
        easing: DEFAULT_EASING_TYPE,
        pos: DEFAULT_POS,
        x: DEFAULT_X_MIN
    }];
    sizeControl = [{
        easing: DEFAULT_EASING_TYPE,
        size: DEFAULT_SIZE,
        x: DEFAULT_X_MAX
    }, {
        easing: DEFAULT_EASING_TYPE,
        size: DEFAULT_SIZE,
        x: DEFAULT_X_MIN
    }];
    skewControl = [{
        easing: DEFAULT_EASING_TYPE,
        skew: DEFAULT_SKEW,
        x: DEFAULT_X_MAX
    }, {
        easing: DEFAULT_EASING_TYPE,
        skew: DEFAULT_SKEW,
        x: DEFAULT_X_MIN
    }];
    yControl = [{
        easing: DEFAULT_EASING_TYPE,
        y: DEFAULT_Y,
        x: DEFAULT_X_MAX,
    }, {
        easing: DEFAULT_EASING_TYPE,
        y: DEFAULT_Y,
        x: DEFAULT_X_MIN
    }];
    zOrder: number = DEFAULT_Z_ORDER;
    attachUI: "none" | "pause" | "combonumber" | "combo" | "score" | "bar" | "name" | "level" = "none";
    id: number;

    /** 当前的音符编号排到第几号了，表示下一个被添加的音符的noteNumber */
    private noteNumber = 0;
    readonly errors: ChartError[] = [];
    getAllEvents() {
        const events: AbstractEvent[] = [];
        this.eventLayers.forEach(eventLayer => {
            events.push(
                ...eventLayer.moveXEvents,
                ...eventLayer.moveYEvents,
                ...eventLayer.rotateEvents,
                ...eventLayer.alphaEvents,
                ...eventLayer.speedEvents
            );
        });
        events.push(
            ...this.extended.scaleXEvents,
            ...this.extended.scaleYEvents,
            ...this.extended.colorEvents,
            ...this.extended.paintEvents,
            ...this.extended.textEvents
        );
        return events;
    }

    toObject(): IJudgeLine {
        const judgeLineObject: IJudgeLine = {
            Group: this.Group,
            Name: this.Name,
            Texture: this.Texture,
            father: this.father,
            isCover: this.isCover,
            zOrder: this.zOrder,
            anchor: this.anchor,
            alphaControl: this.alphaControl,
            posControl: this.posControl,
            sizeControl: this.sizeControl,
            skewControl: this.skewControl,
            yControl: this.yControl,
            bpmfactor: this.bpmfactor,
            eventLayers: this.eventLayers.map(eventLayer => eventLayer.toObject()),
            extended: this.extended.toObject(),
            notes: this.notes.map(note => note.toObject()),
            numOfNotes: this.notes.length,
        };
        if (this.attachUI !== "none" && this.attachUI !== undefined) {
            judgeLineObject.attachUI = this.attachUI;
        }
        return judgeLineObject;
    }
    addNote(note: unknown, id?: string) {
        const newNote = new Note(note, {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            noteNumber: this.noteNumber++,
            id
        });
        this.notes.push(newNote);
        this.errors.push(...newNote.errors);
        return newNote;
    }
    addEventLayer() {
        if (this.eventLayers.length >= MAX_EVENT_LAYERS) {
            throw new Error("最多只能有4个事件层级");
        }

        const newEventLayer = this.createAnInitializedEventLayer(0, 0, 0, 0, 0);
        this.eventLayers.push(newEventLayer);
        return newEventLayer;
    }
    createAnInitializedEventLayer(x = 0, y = 0, angle = 0, alpha = 0, speed = 0) {
        return new BaseEventLayer({
            moveXEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: x,
                end: x
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: "0", eventNumber: 0, type: "moveX", BPMList: this.options.BPMList })],
            moveYEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: y,
                end: y
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: "0", eventNumber: 0, type: "moveY", BPMList: this.options.BPMList })],
            rotateEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: angle,
                end: angle
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: "0", eventNumber: 0, type: "rotate", BPMList: this.options.BPMList })],
            alphaEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: alpha,
                end: alpha
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: "0", eventNumber: 0, type: "alpha", BPMList: this.options.BPMList })],
            speedEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: speed,
                end: speed
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: "0", eventNumber: 0, type: "speed", BPMList: this.options.BPMList })]
        }, {
            judgeLineNumber: this.options.judgeLineNumber,
            eventLayerId: "0",
            BPMList: this.options.BPMList
        });
    }

    /**
     * 获取某一个时刻的 floor position。
     * floor position 的解释：若在某一个时刻有一个音符A，第0拍处有一个音符B，A到B的距离就是这个时刻的 floor position。
     * @param seconds 时刻，以秒为单位
     * @returns floor position
     */
    getFloorPositionOfSeconds(seconds: number) {
        let position = 0;

        /**
         * 遍历所有事件层计算累积位移
         * 每个事件层独立计算位移后累加到总位置
         */
        for (const layer of this.eventLayers) {
            let distance = 0;
            let currentSeconds = 0;
            let currentVelocity = 0;

            /**
             * 按开始时间排序速度事件
             * 确保事件处理顺序正确
             */
            const speedEvents = layer.speedEvents.sort((event1, event2) => beatsCompare(event1.startTime, event2.startTime));

            /**
             * 处理每个速度事件的时间段
             * 分段计算不同速度/加速度阶段的位移
             */
            for (const event of speedEvents) {
                const { cachedStartSeconds: startSeconds, cachedEndSeconds: endSeconds, start, end } = event;

                /**
                 * 如果开始时间大于等于结束时间，则跳过该事件
                 * 因为这个事件的时间非法，有可能会出现错误
                 */
                if (startSeconds >= endSeconds) {
                    continue;
                }

                /**
                 * 跳过开始时间在目标时间之后的事件
                 * 后续事件必然在更晚时间发生，直接终止循环
                 */
                if (startSeconds >= seconds) {
                    break;
                }

                /**
                 * 处理事件前的匀速运动阶段
                 * 计算当前时间段内的匀速运动位移
                 */
                if (startSeconds > currentSeconds) {
                    const duration = Math.min(startSeconds - currentSeconds, seconds - currentSeconds);
                    distance += currentVelocity * duration * SPEED_RATIO;
                    currentSeconds += duration;

                    if (currentSeconds >= seconds) {
                        break;
                    }
                }

                /**
                 * 处理当前事件时间段内的变速运动
                 * 计算加速度和位移
                 */
                const effectiveEndTime = Math.min(endSeconds, seconds);
                const duration = effectiveEndTime - startSeconds;
                const acceleration = (end - start) / (endSeconds - startSeconds);

                // eslint-disable-next-line no-magic-numbers
                const displacement = (() => {
                    if (seconds <= startSeconds) return 0;
                    if (event.easingType === EasingType.Linear) {
                        return (start * duration + 0.5 * acceleration * duration * duration) * SPEED_RATIO;
                    }
                    else {
                        return calculateDisplacement(
                            getEasingFunctionOfNumberEvent(event),
                            startSeconds,
                            endSeconds,
                            start,
                            end,
                            effectiveEndTime
                        ) * SPEED_RATIO;
                    }
                })();

                distance += displacement;
                currentVelocity = start + acceleration * duration;
                currentSeconds = effectiveEndTime;

                if (currentSeconds >= seconds) {
                    break;
                }
            }

            /**
             * 处理最后的恒定速度阶段
             * 所有事件处理完成后剩余时间的匀速运动
             */
            if (currentSeconds < seconds) {
                const duration = seconds - currentSeconds;
                distance += currentVelocity * duration * SPEED_RATIO;
            }
            position += distance;
        }
        return position;
    }
    getEventLayerById(id: string) {
        if (id === "X") {
            return this.extended;
        }

        const eventLayerNumber = parseInt(id);
        if (isNaN(eventLayerNumber)) {
            throw new Error(`错误的事件层编号: ${id}`);
        }

        if (eventLayerNumber < 0) {
            throw new Error(`事件层编号不能小于 0，但当前为${id}`);
        }

        if (!Number.isInteger(eventLayerNumber)) {
            throw new Error(`事件层编号必须是整数，但当前为${eventLayerNumber}`);
        }

        if (eventLayerNumber >= this.eventLayers.length) {
            throw new Error(`事件层编号超出范围: ${id}`);
        }
        return this.eventLayers[eventLayerNumber];
    }
    get isUseful() {
        // 无用的判定线删除后不会影响显示效果
        // 判断条件：如果该判定线上存在音符或者值不为0的透明度事件，则认为该判定线是“有用的”
        if (this.notes.length > 0) {
            return true;
        }

        for (const eventLayer of this.eventLayers) {
            for (const event of eventLayer.alphaEvents) {
                if (event.start > 0 || event.end > 0) {
                    return true;
                }
            }
        }
        return false;
    }
    constructor(judgeLine: unknown, readonly options: JudgeLineExtendedOptions) {
        this.id = options.judgeLineNumber;
        if (isObject(judgeLine)) {
            if ("Group" in judgeLine) {
                if (isNumber(judgeLine.Group)) {
                    this.Group = judgeLine.Group;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 Group 属性必须是数字，但读取到了 ${judgeLine.Group}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 Group 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("Name" in judgeLine) {
                if (isString(judgeLine.Name)) {
                    this.Name = judgeLine.Name;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 Name 属性必须是字符串，但读取到了 ${judgeLine.Name}。将会被替换为字符串 "${DEFAULT_NAME}"。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 Name 属性。将会被设为字符串 "${DEFAULT_NAME}"。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("Texture" in judgeLine) {
                if (isString(judgeLine.Texture)) {
                    this.Texture = judgeLine.Texture;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 Texture 属性必须是字符串，但读取到了 ${judgeLine.Texture}。将会被替换为字符串 "${DEFAULT_TEXTURE}"。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 Texture 属性。将会被设为字符串 "${DEFAULT_TEXTURE}"。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("isCover" in judgeLine) {
                if (isNumber(judgeLine.isCover)) {
                    if (judgeLine.isCover === JudgeLineCover.Cover || judgeLine.isCover === JudgeLineCover.Uncover) {
                        this.isCover = judgeLine.isCover;
                    }
                    else {
                        this.errors.push(new ChartError(
                            `${this.id}号判定线：判定线的 isCover 属性必须是 0 或 1，但读取到了 ${judgeLine.isCover}。将会被替换为数字 ${DEFAULT_IS_COVER}。`,
                            "ChartReadError.OutOfRange"
                        ));
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 isCover 属性必须是数字，但读取到了 ${judgeLine.isCover}。将会被替换为数字 ${DEFAULT_IS_COVER}。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 isCover 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("father" in judgeLine) {
                if (isNumber(judgeLine.father)) {
                    this.father = judgeLine.father;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 father 属性必须是数字，但读取到了 ${judgeLine.father}。将会被替换为数字 -1。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 father 属性。将会被设为数字 -1。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("zOrder" in judgeLine) {
                if (isNumber(judgeLine.zOrder)) {
                    this.zOrder = judgeLine.zOrder;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 zOrder 属性必须是数字，但读取到了 ${judgeLine.zOrder}。将会被替换为数字 0。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 zOrder 属性。将会被设为数字 0。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("attachUI" in judgeLine) {
                if (judgeLine.attachUI === "combo" ||
                    judgeLine.attachUI === "score" ||
                    judgeLine.attachUI === "pause" ||
                    judgeLine.attachUI === "combonumber" ||
                    judgeLine.attachUI === "bar" ||
                    judgeLine.attachUI === "name" ||
                    judgeLine.attachUI === "level") {
                    this.attachUI = judgeLine.attachUI;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 attachUI 属性若存在，则必须是字符串 combo、score、pause、combonumber、bar、name 或 level中的一个。但读取到了 ${judgeLine.attachUI}。该属性将会被忽略。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }

            if ("eventLayers" in judgeLine) {
                if (isArray(judgeLine.eventLayers)) {
                    for (let i = 0; i < judgeLine.eventLayers.length; i++) {
                        const eventLayer = judgeLine.eventLayers[i];
                        const newEventLayer = new BaseEventLayer(eventLayer, {
                            judgeLineNumber: options.judgeLineNumber,
                            BPMList: options.BPMList,
                            eventLayerId: i.toString()
                        });
                        this.eventLayers.push(newEventLayer);
                        this.errors.push(...newEventLayer.errors);
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 eventLayers 属性必须是数组，但读取到了 ${judgeLine.eventLayers}。将会被替换为空数组。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 eventLayers 属性。将会被设为空数组。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("extended" in judgeLine) {
                const newExtendedEventLayer = new ExtendedEventLayer(judgeLine.extended, {
                    judgeLineNumber: options.judgeLineNumber,
                    BPMList: options.BPMList,
                    eventLayerId: "X"
                });
                this.extended = newExtendedEventLayer;
                this.errors.push(...newExtendedEventLayer.errors);
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 extended 属性。将会被设为默认值。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("notes" in judgeLine) {
                if (isArray(judgeLine.notes)) {
                    for (const note of judgeLine.notes) {
                        this.addNote(note);
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 notes 属性必须是数组，但读取到了 ${judgeLine.notes}。将会被替换为空数组。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 notes 属性。将会被设为空数组。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("bpmfactor" in judgeLine) {
                if (isNumber(judgeLine.bpmfactor)) {
                    this.bpmfactor = judgeLine.bpmfactor;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 bpmfactor 属性必须是数字，但读取到了 ${judgeLine.bpmfactor}。将会被替换为数字 1。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 bpmfactor 属性。将会被设为数字 1。`,
                    "ChartReadError.MissingProperty"
                ));
            }

            if ("anchor" in judgeLine) {
                if (isArrayOfNumbers(judgeLine.anchor, 2)) {
                    this.anchor = judgeLine.anchor;
                }
                else {
                    this.errors.push(new ChartError(
                        `${this.id}号判定线：判定线的 anchor 属性必须是两个数字的数组，但读取到了 ${judgeLine.anchor}。将会被替换为默认值 [0.5, 0.5]。`,
                        "ChartReadError.TypeError"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `${this.id}号判定线：判定线缺少 anchor 属性。将会被设为默认值 [0.5, 0.5]。`,
                    "ChartReadError.MissingProperty"
                ));
            }
        }
        else {
            this.errors.push(new ChartError(
                `${this.id}号判定线：判定线必须是一个对象，但读取到了 ${judgeLine}。将会使用默认值。`,
                "ChartReadError.TypeError"
            ));
        }

        // 设置默认的空特殊事件层（如果extended未正确初始化）
        this.extended ??= new ExtendedEventLayer(null, {
            judgeLineNumber: options.judgeLineNumber,
            BPMList: options.BPMList,
            eventLayerId: "X"
        });

        // 如果普通事件层不足4层，自动补至4层
        while (this.eventLayers.length < MAX_EVENT_LAYERS) {
            this.addEventLayer();
        }
    }
}