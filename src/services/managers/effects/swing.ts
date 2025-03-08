import { addBeats, Beats, divideBeats, multiplyBeats } from "@/classes/beats";
import Effect from "./base";
import { EasingTypeGroups, groupedEasingType } from "@/classes/easing";
import { findLastEvent, interpolateNumberEventValue, NumberEvent } from "@/classes/event";
import { reactive } from "vue";
import store from "@/store";
import stateManager from "../state";

export default class SwingEffect extends Effect {
    options: {
        /** 摆动周期的长度 */
        cycleLength: Beats,
        /** 重复次数 */
        times: number,
        /** 缓动 */
        easing: EasingTypeGroups,
        /** 开始时间 */
        startTime: Beats,
        /** 摆动幅度 */
        swingAmplitude: number
    }
    constructor() {
        super();
        this.options = reactive({
            cycleLength: [4, 0, 1],
            times: 1,
            easing: EasingTypeGroups.Sine,
            startTime: stateManager.getCurrentBeats(),
            swingAmplitude: 5
        })
    }
    generate() {
        const seconds = store.getSeconds();
        const chart = store.useChart();
        const currentEventValue = interpolateNumberEventValue(findLastEvent(stateManager.currentEventLayer.rotateEvents, seconds), seconds);
        for (let i = 0; i < this.options.times; i++) {
            const cycleStartTime = addBeats(this.options.startTime, multiplyBeats(this.options.cycleLength, i));
            const quarterCycle = divideBeats(this.options.cycleLength, 4)
            for (let j = 0; j < 4; j++) {
                const eventStartTime = addBeats(cycleStartTime, multiplyBeats(quarterCycle, j));
                const easingType = groupedEasingType[this.options.easing][j % 2 == 0 ? "out" : "in"];
                const { start, end } = (() => {
                    switch (j) {
                        case 0:
                            return {
                                start: currentEventValue,
                                end: currentEventValue - this.options.swingAmplitude
                            };
                        case 1:
                            return {
                                start: currentEventValue - this.options.swingAmplitude,
                                end: currentEventValue
                            };
                        case 2:
                            return {
                                start: currentEventValue,
                                end: currentEventValue + this.options.swingAmplitude
                            };
                        default:
                            return {
                                start: currentEventValue + this.options.swingAmplitude,
                                end: currentEventValue
                            };
                    }
                })();
                const event = new NumberEvent({
                    startTime: eventStartTime,
                    endTime: addBeats(eventStartTime, quarterCycle),
                    start,
                    end,
                    easingType
                }, chart.BPMList, 'rotate');
                stateManager.currentEventLayer.rotateEvents.push(event);
            }
        }
    }
}
