import { addBeats, Beats, multiplyBeats } from '@/classes/beats';
import { EasingType } from '@/classes/easing';
import { findLastEvent, interpolateNumberEventValue, NumberEvent } from '@/classes/event';
import Effect from './base';
import stateManager from '../state';
import store from '@/store';
export default class VibrateEffect extends Effect {
    options: {
        space: Beats
        duration: Beats
        offsetX: number
        offsetY: number
        times: number
        startTime: Beats
        easing: EasingType
    }
    constructor() {
        super();
        this.options = {
            space: [1, 0, 1],
            duration: [0, 1, 2],
            offsetX: 0,
            offsetY: -20,
            times: 4,
            startTime: stateManager.getCurrentBeats(),
            easing: EasingType.QuadOut
        }
    }
    generate() {
        const chart = store.useChart();
        const seconds = store.getSeconds();
        const x = interpolateNumberEventValue(findLastEvent(stateManager.currentEventLayer.moveXEvents, seconds), seconds);
        const y = interpolateNumberEventValue(findLastEvent(stateManager.currentEventLayer.moveYEvents, seconds), seconds);
        for (let i = 0; i < this.options.times; i++) {
            const startTime = addBeats(this.options.startTime, multiplyBeats(this.options.space, i));
            const endTime = addBeats(startTime, this.options.duration);
            const startX = x + this.options.offsetX;
            const startY = y + this.options.offsetY;
            const endX = x;
            const endY = y;
            const eventX = new NumberEvent({
                startTime,
                endTime,
                start: startX,
                end: endX,
                easingType: this.options.easing
            }, chart.BPMList, 'moveX');
            const eventY = new NumberEvent({
                startTime,
                endTime,
                start: startY,
                end: endY,
                easingType: this.options.easing
            }, chart.BPMList, 'moveY');
            stateManager.currentEventLayer.moveXEvents.push(eventX);
            stateManager.currentEventLayer.moveYEvents.push(eventY);
        }
    }
}