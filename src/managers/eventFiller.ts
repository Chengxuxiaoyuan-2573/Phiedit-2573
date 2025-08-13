import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import { addBeats, Beats, getBeatsValue } from "@/models/beats";
import store from "@/store";
import { EasingType } from "@/models/easing";

export default class EventFiller extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("FILL_EVENTS", (startTime, endTime, density, code) => {
            this.fill(startTime, endTime, density, code);
        })
    }
    fill(startTime: Beats | undefined, endTime: Beats | undefined, density: number, code: string) {
        if (startTime == undefined || endTime == undefined) {
            throw new Error("请输入起始和结束时间");
        }
        const historyManager = store.useManager("historyManager");
        const stateManager = store.useManager("stateManager");
        const func = new Function("t", code);
        const step: Beats = [0, 1, density];

        historyManager.group("填充事件轨迹");
        for (let time: Beats = [...startTime]; getBeatsValue(time) < getBeatsValue(endTime); time = addBeats(time, step)) {
            const startT = (getBeatsValue(time) - getBeatsValue(startTime)) / (getBeatsValue(endTime) - getBeatsValue(startTime));
            const endT = (getBeatsValue(addBeats(time, step)) - getBeatsValue(startTime)) / (getBeatsValue(endTime) - getBeatsValue(startTime));
            const startValue = func(startT);
            const endValue = func(endT);
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
            }
            
            const moveXEvent = store.addEvent({
                ...eventObject,
                start: startX,
                end: endX,
            }, "moveX", stateManager._state.currentEventLayerNumber.toString(), stateManager._state.currentJudgeLineNumber);
            const moveYEvent = store.addEvent({
                ...eventObject,
                start: startY,
                end: endY,
            }, "moveY", stateManager._state.currentEventLayerNumber.toString(), stateManager._state.currentJudgeLineNumber);
            const rotateEvent = store.addEvent({
                ...eventObject,
                start: startAngle,
                end: endAngle,
            }, "rotate", stateManager._state.currentEventLayerNumber.toString(), stateManager._state.currentJudgeLineNumber);
            historyManager.recordAddEvent(moveXEvent.id);
            historyManager.recordAddEvent(moveYEvent.id);
            historyManager.recordAddEvent(rotateEvent.id);
        }
        historyManager.ungroup();
    }
}