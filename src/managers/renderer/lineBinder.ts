/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";
import { addBeats, Beats, beatsCompare, beatsToSeconds, isGreaterThanBeats, isLessThanBeats, subBeats } from "@/models/rpe/beats";
import store from "@/store";
import { Note, NoteAbove, NoteType } from "@/models/rpe/note";
import { EasingType } from "@/models/rpe/easing";
import { Bezier } from "@/models/rpe/event";
import { JudgeLine } from "@/models/rpe/judgeLine";
import MathUtils from "@/tools/mathUtils";

/** 两个数相差小于该值时视为相等，用于合并值不变的相邻事件，减少事件数量 */
const EPSILON = 1e-6;

function isClose(a: number, b: number) {
    return Math.abs(a - b) < EPSILON;
}

/** 一个采样点，表示某个时刻被绑线需要在本地坐标系下叠加的修正值 */
interface BindSample {
    time: Beats,
    deltaX: number,
    deltaY: number,
    deltaAngle: number
}

interface BindNoteData {
    note: Note,
    partStartTime: Beats,
    partEndTime: Beats,
    samples: BindSample[]
}

interface BindPlan {
    bindedLineNumber: number,
    eventLayerId: string,
    noteDatas: BindNoteData[]
}

export default class LineBinder extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("BIND_LINE", createCatchErrorByMessage(() => {
            this.bindLine();
        }, "绑线"));
    }
    bindLine() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const historyManager = store.useManager("historyManager");
        if (!stateManager.cache.fastBind.eventLength) {
            throw new Error("请输入事件长度");
        }

        if (!stateManager.cache.fastBind.precision) {
            throw new Error("请输入精度");
        }

        const selectedNotes = selectionManager.selectedElements.filter(element => element instanceof Note).sort((note1, note2) => beatsCompare(note1.startTime, note2.startTime));
        if (selectedNotes.length === 0) {
            throw new Error("未选择任何音符");
        }

        const lineNumbers = (() => {
            const isSelected = stateManager.cache.fastBind.judgeLinesIsSelected;
            const result: number[] = [];
            for (let lineNumber = 0; lineNumber < isSelected.length; lineNumber++) {
                const selected = isSelected[lineNumber];
                if (selected) {
                    result.push(lineNumber);
                }
            }
            return result;
        })();
        if (lineNumbers.length === 0) {
            throw new Error("请选择要绑线的判定线");
        }

        // 音符必须在同一条判定线上
        for (let i = 1; i < selectedNotes.length; i++) {
            const thisNote = selectedNotes[i];
            const previousNote = selectedNotes[i - 1];
            if (thisNote.judgeLineNumber !== previousNote.judgeLineNumber) {
                throw new Error("被绑线的音符必须在同一条判定线上");
            }
        }

        const judgeLineNumber = selectedNotes[0].judgeLineNumber;
        const sourceJudgeLine = store.getJudgeLineById(judgeLineNumber);
        const chart = store.useChart();

        // 被绑线可以是任意判定线，但不能是音符所在的判定线本身，
        // 也不能是它的祖先线，否则移动被绑线会连带移动音符所在的判定线，导致轨迹计算失效
        const ancestorLineNumbers: number[] = [];
        {
            const visited = new Set<number>([judgeLineNumber]);
            let father = sourceJudgeLine.father;
            while (father >= 0 && father < chart.judgeLineList.length && !visited.has(father)) {
                visited.add(father);
                ancestorLineNumbers.push(father);
                father = chart.judgeLineList[father].father;
            }
        }

        for (const lineNumber of lineNumbers) {
            if (lineNumber === judgeLineNumber) {
                throw new Error("被绑线的判定线不能是音符所在的判定线");
            }

            if (ancestorLineNumbers.includes(lineNumber)) {
                throw new Error(`被绑线的判定线不能是音符所在判定线的祖先线（${lineNumber}号线）`);
            }
        }

        historyManager.group("绑线");

        // 把音符按顺序轮流分给被绑的判定线
        const notesOfLines: Note[][] = lineNumbers.map(() => []);
        for (let i = 0; i < selectedNotes.length; i++) {
            notesOfLines[i % lineNumbers.length].push(selectedNotes[i]);
        }

        // 第一步：在添加任何事件之前，先计算出每个音符在每个采样时刻的轨迹修正值。
        // 此时所有判定线还处于原始状态，算出来的修正值才不会被本次绑线添加的事件干扰。
        const plans: BindPlan[] = [];
        for (let i = 0; i < notesOfLines.length; i++) {
            const notes = notesOfLines[i];
            if (notes.length === 0) {
                continue;
            }

            const bindedLineNumber = lineNumbers[i];
            const bindedLine = store.getJudgeLineById(bindedLineNumber);
            const noteDatas: BindNoteData[] = notes.map(note => {
                const { partStartTime, partEndTime, samples } = this.calculateSamples(note, bindedLine, sourceJudgeLine, judgeLineNumber, bindedLineNumber);
                return { note, partStartTime, partEndTime, samples };
            });

            // 该判定线需要跟随的全部音符的轨迹总时间范围
            let windowStartTime = noteDatas[0].partStartTime;
            let windowEndTime = noteDatas[0].partEndTime;
            for (const noteData of noteDatas) {
                if (isLessThanBeats(noteData.partStartTime, windowStartTime)) {
                    windowStartTime = noteData.partStartTime;
                }

                if (isGreaterThanBeats(noteData.partEndTime, windowEndTime)) {
                    windowEndTime = noteData.partEndTime;
                }
            }

            plans.push({
                bindedLineNumber,
                eventLayerId: this.findEventLayerId(bindedLine, windowStartTime, windowEndTime),
                noteDatas
            });
        }

        // 第二步：根据采样点添加事件，并把音符移动到被绑线上
        for (const plan of plans) {
            for (const noteData of plan.noteDatas) {
                const bindedNote = noteData.note;
                const bindedLine = store.getJudgeLineById(plan.bindedLineNumber);

                // 添加轨迹事件，让被绑线沿着音符本来的轨迹移动、旋转
                this.addTrajectoryEvents(plan.eventLayerId, plan.bindedLineNumber, noteData.samples);

                // 先弄一个速度很快的速度事件防止判定线上出现其他音符
                const fastSpeedEvent = store.addEvent({
                    bezier: Bezier.Off,
                    bezierPoints: [0, 0, 1, 1],
                    easingLeft: 0,
                    easingRight: 1,
                    easingType: EasingType.Linear,
                    end: 9999,
                    start: 9999,
                    startTime: subBeats(noteData.partStartTime, [0, 1, stateManager._state.horizonalLineCount]),
                    endTime: noteData.partStartTime,
                    linkgroup: 0,
                    isDisabled: false
                }, "speed", "0", plan.bindedLineNumber);
                historyManager.recordAddEvent(fastSpeedEvent.id);

                // 用速度为0的事件进行绑线，要遍历所有的事件层级并全部设为0，以保证最终速度为0
                for (let i = 0; i < bindedLine.eventLayers.length; i++) {
                    const zeroSpeedEvent = store.addEvent({
                        bezier: Bezier.Off,
                        bezierPoints: [0, 0, 1, 1],
                        easingLeft: 0,
                        easingRight: 1,
                        easingType: EasingType.Linear,
                        end: 0,
                        start: 0,
                        startTime: noteData.partStartTime,
                        endTime: bindedNote.startTime,
                        linkgroup: 0,
                        isDisabled: false
                    }, "speed", i.toString(), plan.bindedLineNumber);
                    historyManager.recordAddEvent(zeroSpeedEvent.id);
                }

                // 如果是Hold音符，则需要在打击时把速度恢复正常
                if (bindedNote.type === NoteType.Hold) {
                    const normalSpeedEvent = store.addEvent({
                        bezier: Bezier.Off,
                        bezierPoints: [0, 0, 1, 1],
                        easingLeft: 0,
                        easingRight: 1,
                        easingType: EasingType.Linear,
                        end: 10,
                        start: 10,
                        startTime: bindedNote.startTime,
                        endTime: bindedNote.endTime,
                        linkgroup: 0,
                        isDisabled: false
                    }, "speed", "0", plan.bindedLineNumber);
                    historyManager.recordAddEvent(normalSpeedEvent.id);
                }

                // 把音符移动到被绑定的判定线上，并删除原来的音符
                // positionX 设为 0，yOffset 保留，由音符自己提供与判定线的偏移
                const noteObject = bindedNote.toObject();
                noteObject.positionX = 0;
                historyManager.recordRemoveNote(noteObject, bindedNote.judgeLineNumber, bindedNote.id);
                store.removeNote(bindedNote.id);
                const newNote = store.addNote(noteObject, plan.bindedLineNumber);
                historyManager.recordAddNote(newNote.id);
            }
        }
        historyManager.ungroup();
        selectionManager.unselectAll();
    }

    /**
     * 计算一个音符的轨迹采样点。
     *
     * 每隔一个精度间隔取一个时刻，计算出该时刻：
     * 1. 音符在当前判定线上本来会出现的全局坐标（不含 yOffset，因为音符被移走后 yOffset 仍然由音符自己提供）；
     * 2. 被绑线在原始状态下的全局坐标和角度；
     * 两者之差换算到被绑线的本地坐标系下，就是被绑线需要叠加的 moveX、moveY 修正值；
     * 角度之差就是需要叠加的 rotate 修正值。
     * 这样无论被绑线有没有父线、有没有开启 rotateWithFather、有没有自己的事件，
     * 最终的全局位置和方向都与当前判定线保持一致。
     */
    private calculateSamples(bindedNote: Note, bindedLine: JudgeLine, sourceJudgeLine: JudgeLine, judgeLineNumber: number, bindedLineNumber: number) {
        const stateManager = store.useManager("stateManager");
        const chartRenderer = store.useManager("chartRenderer");
        const chart = store.useChart();
        const BPMList = sourceJudgeLine.options.BPMList;
        const partStartTime = subBeats(bindedNote.startTime, stateManager.cache.fastBind.eventLength);

        // Hold音符在被判定后头部始终贴在判定线上，所以轨迹要一直跟踪到长按结束
        const partEndTime = bindedNote.type === NoteType.Hold ? bindedNote.endTime : bindedNote.startTime;

        const noteFloorPosition = sourceJudgeLine.getFloorPositionOfSeconds(beatsToSeconds(BPMList, bindedNote.startTime));
        const aboveFactor = bindedNote.above === NoteAbove.Above ? 1 : -1;

        const times: Beats[] = [];
        for (let time = partStartTime; isLessThanBeats(time, partEndTime); time = addBeats(time, [0, 1, stateManager.cache.fastBind.precision])) {
            times.push(time);
        }

        // eventLength 不一定是精度的整数倍，补上最后一个采样点，保证轨迹能精确到达音符被判定的位置
        times.push(partEndTime);

        const samples: BindSample[] = [];
        for (const time of times) {
            const seconds = beatsToSeconds(BPMList, time);

            // 音符在当前判定线上本来会出现的全局坐标
            const sourceInfo = chartRenderer.getJudgeLineInfo(judgeLineNumber, seconds, {
                getX: true,
                getY: true,
                getAngle: true
            });

            // Hold音符被判定后头部贴在判定线上，位置不再下落
            const isHolding = bindedNote.type === NoteType.Hold && isGreaterThanBeats(time, bindedNote.startTime);
            const floorPosition = isHolding ? noteFloorPosition : sourceJudgeLine.getFloorPositionOfSeconds(seconds);
            const noteLocalY = (noteFloorPosition - floorPosition) * bindedNote.speed * aboveFactor;
            const noteWorld = MathUtils.moveAndRotate(sourceInfo.x, sourceInfo.y, sourceInfo.angle, bindedNote.positionX, noteLocalY);

            // 被绑线在原始状态下的全局坐标和角度
            const bindedInfo = chartRenderer.getJudgeLineInfo(bindedLineNumber, seconds, {
                getX: true,
                getY: true,
                getAngle: true
            });

            // 被绑线的父线的角度，全局坐标差换算成本地坐标差时要按这个角度反旋转
            let fatherAngle = 0;
            if (bindedLine.father >= 0 && bindedLine.father < chart.judgeLineList.length) {
                fatherAngle = chartRenderer.getJudgeLineInfo(bindedLine.father, seconds, { getAngle: true }).angle;
            }

            const delta = MathUtils.inverseMoveAndRotate(0, 0, fatherAngle, noteWorld.x - bindedInfo.x, noteWorld.y - bindedInfo.y);
            samples.push({
                time,
                deltaX: delta.x,
                deltaY: delta.y,

                // rotateWithFather 的影响已经包含在 bindedInfo.angle 里，所以角度差不需要再换算
                deltaAngle: sourceInfo.angle - bindedInfo.angle
            });
        }
        return { partStartTime, partEndTime, samples };
    }

    /**
     * 找一个在轨迹时间段内没有非零事件的事件层级。
     * 同一事件层在同一个时刻只有一个事件生效，如果把轨迹事件加到已有事件的层级里，
     * 会覆盖判定线原有的事件，导致修正值计算错误。
     */
    private findEventLayerId(bindedLine: JudgeLine, windowStartTime: Beats, windowEndTime: Beats) {
        for (let layerId = 0; layerId < bindedLine.eventLayers.length; layerId++) {
            const eventLayer = bindedLine.eventLayers[layerId];
            const hasConflict = [...eventLayer.moveXEvents, ...eventLayer.moveYEvents, ...eventLayer.rotateEvents]
                .some(event =>
                    (event.start !== 0 || event.end !== 0) &&
                    isGreaterThanBeats(event.endTime, windowStartTime) &&
                    isLessThanBeats(event.startTime, windowEndTime)
                );
            if (!hasConflict) {
                return layerId.toString();
            }
        }

        // 所有事件层都有冲突，只能加到第0层，这时可能会覆盖判定线原有的事件
        return "0";
    }

    /** 根据采样点添加轨迹事件，值不变的相邻采样点会合并成一个事件，减少事件数量 */
    private addTrajectoryEvents(eventLayerId: string, bindedLineNumber: number, samples: BindSample[]) {
        const types = ["moveX", "moveY", "rotate"] as const;
        for (const type of types) {
            const getValue = (sample: BindSample): number => {
                if (type === "moveX") {
                    return sample.deltaX;
                }

                if (type === "moveY") {
                    return sample.deltaY;
                }
                return sample.deltaAngle;
            };

            let p = 0;
            while (p < samples.length - 1) {
                const startValue = getValue(samples[p]);
                let q = p + 1;
                while (q < samples.length && isClose(getValue(samples[q]), startValue)) {
                    q++;
                }

                if (q === p + 1) {
                    // 下一个采样点的值就变了，生成普通的分段事件
                    this.addNumberEvent(type, samples[p].time, samples[q].time, startValue, getValue(samples[q]), eventLayerId, bindedLineNumber);
                    p = q;
                }
                else {
                    // 值从 samples[p] 到 samples[q - 1] 都没有变化，合并成一个事件
                    this.addNumberEvent(type, samples[p].time, samples[q - 1].time, startValue, startValue, eventLayerId, bindedLineNumber);
                    p = q - 1;
                }
            }
        }
    }

    private addNumberEvent(type: "moveX" | "moveY" | "rotate", startTime: Beats, endTime: Beats, start: number, end: number, eventLayerId: string, judgeLineNumber: number) {
        const historyManager = store.useManager("historyManager");
        const event = store.addEvent({
            startTime,
            endTime,
            start,
            end,
            easingLeft: 0,
            easingRight: 1,
            easingType: EasingType.Linear,
            bezier: Bezier.Off,
            bezierPoints: [0, 0, 1, 1],
            linkgroup: 0,
            isDisabled: false
        }, type, eventLayerId, judgeLineNumber);
        historyManager.recordAddEvent(event.id);
    }
}
