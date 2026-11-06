/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import { addBeats, Beats, getBeatsValue, subBeats } from "@/models/rpe/beats";
import { blockAreaEventTracks } from "@/models/rpe/blockArea";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
export enum FlipOptions {
    None,
    Horizontal,
    Vertical,
    Both,
}
export default class ParagraphRepeater {
    startTime: Beats = [0, 0, 1];
    endTime: Beats = [0, 0, 1];
    targetTime: Beats = [0, 0, 1];
    flip: FlipOptions = FlipOptions.None;
    constructor() {
        globalEventEmitter.on("REPEAT_PARAGRAPH", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制段落"));
    }
    copy() {
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const start = getBeatsValue(this.startTime);
        const end = getBeatsValue(this.endTime);
        if (![start, end, getBeatsValue(this.targetTime)].every(Number.isFinite) || start > end) {
            throw new Error("复制段落的时间范围无效");
        }

        const beats = subBeats(this.targetTime, this.startTime);
        historyManager.group("复制段落");
        try {
            this.copyJudgeLines(beats);
            this.copyBlockAreas(beats, start, end);
        }
        finally {
            historyManager.ungroup();
        }
    }

    private copyJudgeLines(beats: Beats) {
        const historyManager = store.useManager("historyManager");
        const chart = store.useChart();
        for (const judgeLine of chart.judgeLineList) {
            for (const eventLayer of judgeLine.eventLayers) {
                for (const type of ["moveX", "moveY", "rotate", "alpha", "speed"]) {
                    const events = eventLayer.getEventsByType(type);

                    // 找到位于startTime和endTime之间的事件
                    const filteredEvents = events.filter(event => {
                        return getBeatsValue(event.endTime) >= getBeatsValue(this.startTime) &&
                            getBeatsValue(event.startTime) <= getBeatsValue(this.endTime);
                    });
                    for (const event of filteredEvents) {
                        const eventObject = event.toObject();
                        eventObject.startTime = addBeats(eventObject.startTime, beats);
                        eventObject.endTime = addBeats(eventObject.endTime, beats);
                        if ((this.flip === FlipOptions.Horizontal || this.flip === FlipOptions.Both) && type === "moveX") {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if ((this.flip === FlipOptions.Vertical || this.flip === FlipOptions.Both) && type === "moveY") {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Horizontal) {
                            eventObject.start = -eventObject.start;
                            eventObject.end = -eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Vertical) {
                            eventObject.start = 180 - eventObject.start;
                            eventObject.end = 180 - eventObject.end;
                        }

                        if (type === "rotate" && this.flip === FlipOptions.Both) {
                            eventObject.start = 180 + eventObject.start;
                            eventObject.end = 180 + eventObject.end;
                        }

                        const newEvent = store.addEvent(eventObject, type, event.eventLayerId, event.judgeLineNumber);
                        historyManager.recordAddEvent(newEvent.id);
                    }
                }
            }

            const notes = judgeLine.notes;
            const filteredNotes = notes.filter(note => {
                return getBeatsValue(note.endTime) >= getBeatsValue(this.startTime) &&
                    getBeatsValue(note.startTime) <= getBeatsValue(this.endTime);
            });
            for (const note of filteredNotes) {
                const noteObject = note.toObject();
                noteObject.startTime = addBeats(noteObject.startTime, beats);
                noteObject.endTime = addBeats(noteObject.endTime, beats);
                if (this.flip === FlipOptions.Horizontal || this.flip === FlipOptions.Vertical) {
                    noteObject.positionX = -noteObject.positionX;
                }

                const newNote = store.addNote(noteObject, judgeLine.id);
                historyManager.recordAddNote(newNote.id);
            }
        }
    }

    /** 噪域与激活区间、变换事件一起复制，保持相对时间和空间关系 */
    private copyBlockAreas(beats: Beats, start: number, end: number) {
        const chart = store.useChart();
        const stateManager = store.useManager("stateManager");
        const historyManager = store.useManager("historyManager");
        const areas = chart.blockAreaList.filter(area =>
            getBeatsValue(area.disappearTime) >= start && getBeatsValue(area.appearTime) <= end);
        const horizontal = this.flip === FlipOptions.Horizontal || this.flip === FlipOptions.Both;
        const vertical = this.flip === FlipOptions.Vertical || this.flip === FlipOptions.Both;
        const xSign = horizontal ? -1 : 1;
        const ySign = vertical ? -1 : 1;
        const signs = {
            moveXEvents: xSign,
            moveYEvents: ySign,
            rotateEvents: xSign * ySign,
            scaleXEvents: 1,
            scaleYEvents: 1
        };
        const shift = (segment: { startTime: Beats, endTime: Beats }) => {
            segment.startTime = addBeats(segment.startTime, beats);
            segment.endTime = addBeats(segment.endTime, beats);
        };

        for (const area of areas) {
            const copy = area.toObject();
            copy.appearTime = addBeats(copy.appearTime, beats);
            copy.disappearTime = addBeats(copy.disappearTime, beats);
            const x1 = copy.bottomLeft.x * xSign;
            const x2 = copy.topRight.x * xSign;
            const y1 = copy.bottomLeft.y * ySign;
            const y2 = copy.topRight.y * ySign;
            copy.bottomLeft = { x: Math.min(x1, x2), y: Math.min(y1, y2) };
            copy.topRight = { x: Math.max(x1, x2), y: Math.max(y1, y2) };

            for (const track of blockAreaEventTracks) {
                if (track === "activeIntervals") {
                    copy.activeIntervals.forEach(shift);
                    continue;
                }

                const sign = signs[track];
                for (const event of copy[track]) {
                    shift(event);
                    event.start *= sign;
                    event.end *= sign;
                    if (event.anchor) {
                        event.anchor = { x: event.anchor.x * xSign, y: event.anchor.y * ySign };
                    }

                    if (event.transformStart !== undefined) {
                        event.transformStart *= sign;
                    }

                    if (event.transformEnd !== undefined) {
                        event.transformEnd *= sign;
                    }
                }
            }

            const position = chart.blockAreaList.length;
            const added = store.insertBlockArea(copy, position);
            historyManager.recordAddBlockArea(added, position);
        }

        if (areas.length > 0) {
            stateManager.notifyBlockAreaListChanged();
        }
    }
}
