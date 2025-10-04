/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import { addBeats, Beats, getBeatsValue, isLessThanBeats } from "@/models/beats";
import store from "@/store";
import { easingFuncs, EasingType } from "@/models/easing";

export default class EventFiller extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("FILL_EVENTS", () => {
            this.fill();
        });
    }
    fill() {
        const historyManager = store.useManager("historyManager");
        const stateManager = store.useManager("stateManager");
        if (stateManager.cache.eventFill.startTime === undefined || stateManager.cache.eventFill.endTime === undefined) {
            throw new Error("请输入起始和结束时间");
        }

        const easingFuncKeys: EasingType[] = Object.keys(easingFuncs).map(Number);
        const easingFuncNames = easingFuncKeys.map(key => EasingType[key]);
        const easingFuncValues = easingFuncKeys.map(name => easingFuncs[name]);
        const func = new Function("t",
            ...easingFuncNames,
            stateManager.cache.eventFill.code);
        const step: Beats = [0, 1, stateManager.cache.eventFill.density];

        historyManager.group("填充事件轨迹");
        for (let time: Beats = [...stateManager.cache.eventFill.startTime];
            isLessThanBeats(time, stateManager.cache.eventFill.endTime);
            time = addBeats(time, step)) {
            // 获取这个事件开头和结尾的 t 值
            const startT = (getBeatsValue(time) - getBeatsValue(stateManager.cache.eventFill.startTime)) /
                (getBeatsValue(stateManager.cache.eventFill.endTime) - getBeatsValue(stateManager.cache.eventFill.startTime));

            const endT = (getBeatsValue(addBeats(time, step)) - getBeatsValue(stateManager.cache.eventFill.startTime)) /
                (getBeatsValue(stateManager.cache.eventFill.endTime) - getBeatsValue(stateManager.cache.eventFill.startTime));

            const startValue = func(startT,
                ...easingFuncValues);
            const endValue = func(endT,
                ...easingFuncValues);
            const startX = startValue.x ?? 0;
            const startY = startValue.y ?? 0;
            const startAngle = startValue.angle ?? 0;
            const endX = endValue.x ?? 0;
            const endY = endValue.y ?? 0;
            const endAngle = endValue.angle ?? 0;

            const eventObject = {
                bezier: 0 as 0 | 1,
                bezierPoints: [0, 0, 0, 0] as [number, number, number, number],
                easingType: EasingType.Linear,
                easingLeft: 0,
                easingRight: 1,
                startTime: time,
                endTime: addBeats(time, step),
                linkgroup: 0,
                isDisabled: false,
            };
            if (stateManager._state.currentEventLayerId === "X") {
                stateManager._state.currentEventLayerId = "0";
            }

            const moveXEvent = store.addEvent({
                ...eventObject,
                start: startX,
                end: endX,
            }, "moveX", stateManager._state.currentEventLayerId, stateManager._state.currentJudgeLineNumber);
            const moveYEvent = store.addEvent({
                ...eventObject,
                start: startY,
                end: endY,
            }, "moveY", stateManager._state.currentEventLayerId, stateManager._state.currentJudgeLineNumber);
            const rotateEvent = store.addEvent({
                ...eventObject,
                start: startAngle,
                end: endAngle,
            }, "rotate", stateManager._state.currentEventLayerId, stateManager._state.currentJudgeLineNumber);
            historyManager.recordAddEvent(moveXEvent.id);
            historyManager.recordAddEvent(moveYEvent.id);
            historyManager.recordAddEvent(rotateEvent.id);
        }
        historyManager.ungroup();
    }
}