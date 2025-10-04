/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";
import { addBeats, Beats, beatsCompare, beatsToSeconds, isGreaterThanBeats, isLessThanBeats, isLessThanOrEqualBeats, subBeats } from "@/models/beats";
import store from "@/store";
import { Note, NoteAbove, NoteType } from "@/models/note";
import { EasingType } from "@/models/easing";
import { Bezier } from "@/models/event";

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
        for (const lineNumber of lineNumbers) {
            const judgeLine = store.getJudgeLineById(lineNumber);
            if (judgeLine.father !== stateManager._state.currentJudgeLineNumber) {
                throw new Error("被绑线的判定线必须是当前判定线的子线");
            }
        }

        for (let i = 1; i < selectedNotes.length; i++) {
            const thisNote = selectedNotes[i];
            const previousNote = selectedNotes[i - 1];
            if (thisNote.judgeLineNumber !== previousNote.judgeLineNumber) {
                throw new Error("被绑线的音符必须在同一条判定线上");
            }
        }

        const judgeLineNumber = selectedNotes[0].judgeLineNumber;
        const sourceJudgeLine = store.getJudgeLineById(judgeLineNumber);

        // 为防止事件层级不够用，先检查有没有判定线事件层级数量比原来判定线少的，有的话就添加到一样多为止
        // for (const lineNumber of lineNumbers) {
        //     const judgeLine = store.getJudgeLineById(lineNumber);
        //     if (judgeLine.eventLayers.length < sourceJudgeLine.eventLayers.length) {
        //         for (let i = judgeLine.eventLayers.length; i < sourceJudgeLine.eventLayers.length; i++) {
        //             judgeLine.addEventLayer();
        //         }
        //     }
        // }
        historyManager.group("绑线");

        // 先复制所有的旋转事件到新判定线上，从第一个音符提前eventLength开始，到最后一个音符结束
        const startTime = subBeats(selectedNotes[0].startTime, stateManager.cache.fastBind.eventLength);
        const endTime = selectedNotes[selectedNotes.length - 1].endTime;
        for (let i = 0; i < sourceJudgeLine.eventLayers.length; i++) {
            const sourceEventLayer = sourceJudgeLine.eventLayers[i];
            const rotateEvents = sourceEventLayer.rotateEvents.filter(event => {
                // 只要与 (startTime, endTime) 有重叠就添加
                return isGreaterThanBeats(event.endTime, startTime) && isLessThanBeats(event.startTime, endTime);
            });
            for (const event of rotateEvents) {
                const eventObject = event.toObject();
                for (const lineNumber of lineNumbers) {
                    const judgeLine = store.getJudgeLineById(lineNumber);
                    const targetEventLayer = judgeLine.eventLayers[i];
                    const newEvent = store.addEvent(eventObject, event.type, targetEventLayer.options.eventLayerId, lineNumber);
                    historyManager.recordAddEvent(newEvent.id);
                }
            }
        }

        for (let i = 0; i < selectedNotes.length; i++) {
            const bindedNote = selectedNotes[i];

            // 让指定的判定线轮流绑定音符，X坐标为音符的X坐标，Y坐标根据速度事件来定
            const bindedLineNumber = lineNumbers[i % lineNumbers.length];
            const bindedLine = store.getJudgeLineById(bindedLineNumber);
            const times: Beats[] = [];
            const yPositions: number[] = [];
            const notePosition = sourceJudgeLine.getFloorPositionOfSeconds(beatsToSeconds(bindedLine.options.BPMList, bindedNote.startTime));

            // 计算从开始到音符被判定的时间段内，每个时刻的Y坐标
            // 只从最开始的时间遍历到note被判定时
            const partStartTime = subBeats(bindedNote.startTime, stateManager.cache.fastBind.eventLength);
            const partEndTime = bindedNote.startTime;
            for (let time = partStartTime; isLessThanOrEqualBeats(time, partEndTime); time = addBeats(time, [0, 1, stateManager.cache.fastBind.precision])) {
                times.push(time);
                yPositions.push(sourceJudgeLine.getFloorPositionOfSeconds(beatsToSeconds(bindedLine.options.BPMList, time)));
            }

            const moveXEvent = store.addEvent({
                startTime: partStartTime,
                endTime: partEndTime,
                start: bindedNote.positionX,
                end: bindedNote.positionX,
                easingLeft: 0,
                easingRight: 1,
                easingType: EasingType.Linear,
                bezier: Bezier.Off,
                bezierPoints: [0, 0, 1, 1],
                linkgroup: 0,
                isDisabled: false
            }, "moveX", "0", bindedLineNumber);
            historyManager.recordAddEvent(moveXEvent.id);
            for (let j = 1; j < yPositions.length; j++) {
                const time = times[j];
                const previousTime = times[j - 1];
                const pos = yPositions[j];
                const previousPos = yPositions[j - 1];
                let start = notePosition - previousPos;
                let end = notePosition - pos;
                start = start * bindedNote.speed * (bindedNote.above === NoteAbove.Above ? 1 : -1) + bindedNote.yOffset;
                end = end * bindedNote.speed * (bindedNote.above === NoteAbove.Above ? 1 : -1) + bindedNote.yOffset;
                const moveYEvent = store.addEvent({
                    startTime: previousTime,
                    endTime: time,
                    start: start,
                    end: end,
                    easingLeft: 0,
                    easingRight: 1,
                    easingType: EasingType.Linear,
                    bezier: Bezier.Off,
                    bezierPoints: [0, 0, 1, 1],
                    linkgroup: 0,
                    isDisabled: false
                }, "moveY", "0", bindedLineNumber);
                historyManager.recordAddEvent(moveYEvent.id);
            }

            // 先弄一个速度很快的速度事件防止判定线上出现其他音符
            const fastSpeedEvent = store.addEvent({
                bezier: Bezier.Off,
                bezierPoints: [0, 0, 1, 1],
                easingLeft: 0,
                easingRight: 1,
                easingType: EasingType.Linear,
                end: 9999,
                start: 9999,
                startTime: subBeats(partStartTime, [0, 1, stateManager._state.horizonalLineCount]),
                endTime: partStartTime,
                linkgroup: 0,
                isDisabled: false
            }, "speed", "0", bindedLineNumber);
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
                    startTime: partStartTime,
                    endTime: bindedNote.startTime,
                    linkgroup: 0,
                    isDisabled: false
                }, "speed", i.toString(), bindedLineNumber);
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
                }, "speed", "0", bindedLineNumber);
                historyManager.recordAddEvent(normalSpeedEvent.id);
            }

            // 把音符移动到被绑定的判定线上，并删除原来的音符
            const noteObject = bindedNote.toObject();
            noteObject.positionX = 0;
            historyManager.recordRemoveNote(noteObject, bindedLineNumber, bindedNote.id);
            store.removeNote(bindedNote.id);
            const newNote = store.addNote(noteObject, bindedLineNumber);
            historyManager.recordAddNote(newNote.id);
        }
        historyManager.ungroup();
        selectionManager.unselectAll();
    }
}