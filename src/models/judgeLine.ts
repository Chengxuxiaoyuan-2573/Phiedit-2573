import { isObject, isNumber, isString, isArray } from "lodash"
import { EasingType } from "./easing"
import { BaseEventLayer, ExtendedEventLayer, IBaseEventLayer, IExtendedEventLayer } from "./eventLayer"
import { INote, Note } from "./note"
import { BaseEvent, NumberEvent } from "./event"
import { beatsCompare, BPM } from "./beats"
interface JudgeLineOptions {
    BPMList: BPM[],
    judgeLineNumber: number
}
export enum JudgeLineCover {
    Uncover = 0,
    Cover = 1
}
export interface IJudgeLine {
    /** 没用属性，可以不用 */
    Group: number
    /** 没用属性，可以不用 */
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
export class JudgeLine implements IJudgeLine {
    Group = 0
    Name = "Unnamed"
    Texture = "line.png"
    bpmfactor = 1
    eventLayers: BaseEventLayer[] = []
    readonly extended: ExtendedEventLayer
    father = -1
    isCover = JudgeLineCover.Cover
    notes: Note[] = []
    alphaControl = [{
        easing: EasingType.Linear,
        alpha: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        alpha: 1,
        x: 0
    }]
    posControl = [{
        easing: EasingType.Linear,
        pos: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        pos: 1,
        x: 0
    }]
    sizeControl = [{
        easing: EasingType.Linear,
        size: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        size: 1,
        x: 0
    }]
    skewControl = [{
        easing: EasingType.Linear,
        skew: 1,
        x: 999999
    }, {
        easing: EasingType.Linear,
        skew: 1,
        x: 0
    }]
    yControl = [{
        easing: EasingType.Linear,
        y: 1,
        x: 999999,
    }, {
        easing: EasingType.Linear,
        y: 1,
        x: 0
    }]
    zOrder: number = 0
    attachUI?: "pause" | "combonumber" | "combo" | "score" | "bar" | "name" | "level"
    id: number
    private noteNumber = 0;
    getAllEvents() {
        const events: BaseEvent[] = [];
        this.eventLayers.forEach(eventLayer => {
            events.push(
                ...eventLayer.moveXEvents,
                ...eventLayer.moveYEvents,
                ...eventLayer.rotateEvents,
                ...eventLayer.alphaEvents,
                ...eventLayer.speedEvents
            )
        })
        events.push(
            ...this.extended.scaleXEvents,
            ...this.extended.scaleYEvents,
            ...this.extended.colorEvents,
            ...this.extended.paintEvents,
            ...this.extended.textEvents
        )
        return events;
    }

    toObject(): IJudgeLine {
        return {
            Group: this.Group,
            Name: this.Name,
            Texture: this.Texture,
            father: this.father,
            isCover: this.isCover,
            zOrder: this.zOrder,
            alphaControl: this.alphaControl,
            posControl: this.posControl,
            sizeControl: this.sizeControl,
            skewControl: this.skewControl,
            yControl: this.yControl,
            bpmfactor: this.bpmfactor,
            eventLayers: this.eventLayers.map(eventLayer => ({
                moveXEvents: eventLayer.moveXEvents.map(event => event.toObject()),
                moveYEvents: eventLayer.moveYEvents.map(event => event.toObject()),
                rotateEvents: eventLayer.rotateEvents.map(event => event.toObject()),
                alphaEvents: eventLayer.alphaEvents.map(event => event.toObject()),
                speedEvents: eventLayer.speedEvents.map(event => event.toObject())
            })),
            extended: {
                scaleXEvents: this.extended.scaleXEvents.map(event => event.toObject()),
                scaleYEvents: this.extended.scaleYEvents.map(event => event.toObject()),
                colorEvents: this.extended.colorEvents.map(event => event.toObject()),
                paintEvents: this.extended.paintEvents.map(event => event.toObject()),
                textEvents: this.extended.textEvents.map(event => event.toObject()),
                inclineEvents: this.extended.inclineEvents.map(event => event.toObject()) // unsupported
            },
            notes: this.notes.map(note => note.toObject()),
            numOfNotes: this.notes.length,
        }
    }
    addNote(note: unknown, id?: string) {
        const newNote = new Note(note, {
            judgeLineNumber: this.options.judgeLineNumber,
            BPMList: this.options.BPMList,
            noteNumber: this.noteNumber++,
            id
        });
        this.notes.push(newNote);
        return newNote;
    }
    addEventLayer() {
        const newEventLayer = this.createAnInitializedEventLayer(0, 0, 0, 0, 0);
        this.eventLayers.push(newEventLayer);
        return newEventLayer;
    }
    initializeEvents() {
        this.eventLayers.push(this.createAnInitializedEventLayer(0, 0, 0, 0, 10));
        this.extended.inclineEvents.push(new NumberEvent({
            startTime: [0, 0, 1],
            endTime: [1, 0, 1],
            start: 0,
            end: 0
        }, {
            judgeLineNumber: this.options.judgeLineNumber,
            eventLayerId: 'X',
            eventNumber: 0,
            type: 'incline',
            BPMList: this.options.BPMList
        }));
    }
    createAnInitializedEventLayer(x = 0, y = 0, angle = 0, alpha = 0, speed = 0) {
        return new BaseEventLayer({
            moveXEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: x,
                end: x
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'moveX', BPMList: this.options.BPMList })],
            moveYEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: y,
                end: y
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'moveY', BPMList: this.options.BPMList })],
            rotateEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: angle,
                end: angle
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'rotate', BPMList: this.options.BPMList })],
            alphaEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: alpha,
                end: alpha
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'alpha', BPMList: this.options.BPMList })],
            speedEvents: [new NumberEvent({
                startTime: [0, 0, 1],
                endTime: [1, 0, 1],
                start: speed,
                end: speed
            }, { judgeLineNumber: this.options.judgeLineNumber, eventLayerId: '0', eventNumber: 0, type: 'speed', BPMList: this.options.BPMList })]
        }, {
            judgeLineNumber: this.options.judgeLineNumber,
            eventLayerId: '0',
            BPMList: this.options.BPMList
        })
    }
    /**
     * 
     * @param seconds 当前时间，以秒为单位
     * @returns 在当前时间被判定的音符离在第0拍时被判定的音符的距离
     */
    getPositionOfSeconds(seconds: number) {
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
                    distance += currentVelocity * duration * 120;
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
                const displacement = (start * duration + 0.5 * acceleration * duration * duration) * 120;

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
                distance += currentVelocity * duration * 120;
            }
            position += distance;
        }
        return position;
    }
    constructor(judgeLine: unknown, readonly options: JudgeLineOptions) {
        if (isObject(judgeLine)) {
            if ("Group" in judgeLine && isNumber(judgeLine.Group))
                this.Group = judgeLine.Group;
            if ("Name" in judgeLine && isString(judgeLine.Name))
                this.Name = judgeLine.Name;
            if ("Texture" in judgeLine && isString(judgeLine.Texture))
                this.Texture = judgeLine.Texture;
            if ("isCover" in judgeLine)
                this.isCover = judgeLine.isCover ? JudgeLineCover.Cover : JudgeLineCover.Uncover;
            if ("father" in judgeLine && isNumber(judgeLine.father))
                this.father = judgeLine.father;
            if ("zOrder" in judgeLine && isNumber(judgeLine.zOrder))
                this.zOrder = judgeLine.zOrder;
            if ("eventLayers" in judgeLine && isArray(judgeLine.eventLayers)) {
                for (let i = 0; i < judgeLine.eventLayers.length; i++) {
                    const eventLayer = judgeLine.eventLayers[i];
                    this.eventLayers.push(new BaseEventLayer(eventLayer, {
                        judgeLineNumber: options.judgeLineNumber,
                        BPMList: options.BPMList,
                        eventLayerId: i.toString()
                    }));
                }
            }
            if ("extended" in judgeLine)
                this.extended = new ExtendedEventLayer(judgeLine.extended, {
                    judgeLineNumber: options.judgeLineNumber,
                    BPMList: options.BPMList,
                    eventLayerId: 'X'
                });
            if ("notes" in judgeLine && isArray(judgeLine.notes)) {
                for (const note of judgeLine.notes) {
                    this.addNote(note);
                }
            }
        }
        this.extended ??= new ExtendedEventLayer(null, {
            judgeLineNumber: options.judgeLineNumber,
            BPMList: options.BPMList,
            eventLayerId: 'X'
        });
        this.id = options.judgeLineNumber;
    }
}