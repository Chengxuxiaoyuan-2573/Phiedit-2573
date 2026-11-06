/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Beats, beatsToSeconds, formatBeats, getBeatsValue } from "@/models/rpe/beats";
import { interpolateNumberEventValue, findLastEventIndex, interpolateColorEventValue, interpolateTextEventValue, isNumberEvent, isColorEvent, isTextEvent, NumberEvent, ColorEvent, TextEvent, AbstractEvent } from "@/models/rpe/event";
import { isNoteLike, NoteType } from "@/models/rpe/note";
import canvasUtils from "@/tools/canvasUtils";
import { colorToHex, colorToString, RGBcolor } from "@/tools/color";
import { floor, ceil } from "lodash";
import Constants from "../../constants";
import { MouseMoveMode } from "./mouse";
import store from "@/store";
import Manager from "./abstract";
import { Box } from "@/tools/box";
import globalEventEmitter from "@/eventEmitter";
import { BlockArea, BlockAreaEventType, blockAreaEventTracks, getBlockAreaEventTypeOfTrack } from "@/models/rpe/blockArea";

/** 事件编辑区中的一栏 */
interface EventTrackColumn {

    /** 显示在栏顶部的名称 */
    name: string

    /** 这一栏的事件类型。激活区间没有事件类型，为空字符串 */
    type: string
}

export default class EditorRenderer extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("RENDER_EDITOR", () => {
            this.render();
        });
    }

    /** 显示编辑器界面到canvas上 */
    render() {
        const stateManager = store.useManager("stateManager");
        this.renderBackground();
        this.renderGrid();
        this.renderSelection();
        if (stateManager._state.isEditingBlockArea) {
            this.renderBlockAreas();
            this.renderBlockAreaEvents();
        }
        else {
            this.renderNotes();
            this.renderEvents();
        }

        // this.renderBoxes();
    }

    /** 显示选择框 */
    private renderSelection() {
        const mouseManager = store.useManager("mouseManager");
        const coordinateManager = store.useManager("coordinateManager");

        const selectionBox = mouseManager.selectionBox;
        if (!selectionBox) return;
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(selectionBox.left,
            coordinateManager.relative(selectionBox.top),
            selectionBox.width,
            -selectionBox.height,
            Constants.EDITOR_VIEW_SELECTION_COLOR,
            true);
    }

    /** 显示背景 */
    private renderBackground() {
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(0, 0, canvas.width, canvas.height, Constants.EDITOR_VIEW_BACKGROUND_COLOR, true);
    }

    /** 显示网格 */
    private renderGrid() {
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");

        const canvas = store.useCanvas();
        const chart = store.useChart();
        const ctx = canvasUtils.getContext(canvas);
        const drawLine = canvasUtils.drawLine.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);

        // 显示横线及其旁边的数字
        const min = floor(coordinateManager.getBeatsOfRelativePositionY(Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom));
        const max = ceil(coordinateManager.getBeatsOfRelativePositionY(Constants.EDITOR_VIEW_NOTES_VIEWBOX.top));
        for (let i = min; i <= max; i++) {
            for (let j = 0; j < stateManager.state.horizonalLineCount; j++) {
                const beats: Beats = [i, j, stateManager.state.horizonalLineCount];
                const pos = coordinateManager.getRelativePositionYOfSeconds(beatsToSeconds(chart.BPMList, beats));
                if (pos < Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top || pos > Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom) {
                    continue;
                }

                if (j === 0) {
                    writeText(i.toString(),
                        (Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left + Constants.EDITOR_VIEW_NOTES_VIEWBOX.right) / 2,
                        pos,
                        Constants.EDITOR_VIEW_BEATS_NUMBER_FONT_SIZE,
                        Constants.EDITOR_VIEW_HORIZONTAL_MAIN_LINE_COLOR);
                    drawLine(Constants.EDITOR_VIEW_NOTES_VIEWBOX.left,
                        pos, Constants.EDITOR_VIEW_NOTES_VIEWBOX.right,
                        pos,
                        Constants.EDITOR_VIEW_HORIZONTAL_MAIN_LINE_COLOR);
                    drawLine(Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
                        pos,
                        Constants.EDITOR_VIEW_EVENTS_VIEWBOX.right,
                        pos,
                        Constants.EDITOR_VIEW_HORIZONTAL_MAIN_LINE_COLOR);
                }
                else {
                    writeText(j.toString(),
                        (Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left + Constants.EDITOR_VIEW_NOTES_VIEWBOX.right) / 2,
                        pos,
                        Constants.EDITOR_VIEW_BEATS_NUMBER_FONT_SIZE,
                        Constants.EDITOR_VIEW_HORIZONTAL_LINE_COLOR);
                    drawLine(Constants.EDITOR_VIEW_NOTES_VIEWBOX.left,
                        pos, Constants.EDITOR_VIEW_NOTES_VIEWBOX.right,
                        pos,
                        Constants.EDITOR_VIEW_HORIZONTAL_LINE_COLOR);
                    drawLine(Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
                        pos, Constants.EDITOR_VIEW_EVENTS_VIEWBOX.right,
                        pos,
                        Constants.EDITOR_VIEW_HORIZONTAL_LINE_COLOR);
                }
            }
        }

        // 显示竖线
        if (stateManager.state.verticalLineCount > 1) {
            drawLine(
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.top,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom,
                Constants.EDITOR_VIEW_VERTICAL_MAIN_LINE_COLOR);

            for (let i = Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX + coordinateManager.verticalLineSpaceScaled;
                i <= Constants.EDITOR_VIEW_NOTES_VIEWBOX.right;
                i += coordinateManager.verticalLineSpaceScaled) {
                drawLine(i,
                    Constants.EDITOR_VIEW_NOTES_VIEWBOX.top,
                    i, Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom,
                    Constants.EDITOR_VIEW_VERTICAL_LINE_COLOR);
            }

            for (let i = Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX - coordinateManager.verticalLineSpaceScaled;
                i >= Constants.EDITOR_VIEW_NOTES_VIEWBOX.left;
                i -= coordinateManager.verticalLineSpaceScaled) {
                drawLine(i,
                    Constants.EDITOR_VIEW_NOTES_VIEWBOX.top,
                    i,
                    Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom,
                    Constants.EDITOR_VIEW_VERTICAL_LINE_COLOR);
            }
        }

        const tracks = stateManager.eventTracks;

        // 显示事件中间的分隔线
        for (let i = 1; i < tracks.length; i++) {
            drawLine(Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * i / tracks.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
                Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top,
                Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * i / tracks.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom,
                Constants.EDITOR_VIEW_VERTICAL_MAIN_LINE_COLOR);
        }

        // 显示边框
        drawRect(Constants.EDITOR_VIEW_NOTES_VIEWBOX.left,
            Constants.EDITOR_VIEW_NOTES_VIEWBOX.top,
            Constants.EDITOR_VIEW_NOTES_VIEWBOX.width,
            Constants.EDITOR_VIEW_NOTES_VIEWBOX.height,
            Constants.EDITOR_VIEW_BORDER_COLOR);
        drawRect(Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
            Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top,
            Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width,
            Constants.EDITOR_VIEW_EVENTS_VIEWBOX.height,
            Constants.EDITOR_VIEW_BORDER_COLOR);
    }

    /** 显示音符 */
    private renderNotes() {
        const mouseManager = store.useManager("mouseManager");
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");
        const selectionManager = store.useManager("selectionManager");
        const settingsManager = store.useManager("settingsManager");

        const canvas = store.useCanvas();
        const chartPackage = store.useChartPackage();
        const resourcePackage = store.useResourcePackage();
        const chart = chartPackage.chart;
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const judgeLine = stateManager.currentJudgeLine;
        const a = coordinateManager.attatchY(mouseManager.mouseY);
        const imaginaryNote = {
            startTime: a,
            endTime: a,
            positionX: coordinateManager.attatchX(mouseManager.mouseX),
            type: stateManager.state.currentNoteType,
            size: 1,
            isFake: 1,
            cachedStartSeconds: beatsToSeconds(chart.BPMList, a),
            cachedEndSeconds: beatsToSeconds(chart.BPMList, a),
            hitSeconds: 0,
            highlight: false
        };
        const hideImaginaryNote = (() => {
            if (!Constants.EDITOR_VIEW_NOTES_VIEWBOX.touch(mouseManager.mouseX, mouseManager.mouseY)) {
                return true;
            }

            if (mouseManager.mouseMoveMode !== MouseMoveMode.None) {
                return true;
            }
            return false;
        })();
        const notes = hideImaginaryNote ? judgeLine.notes : [imaginaryNote, ...judgeLine.notes];

        /** 视口顶部所对应的时间 */
        const s1 = coordinateManager.getSecondsOfRelativePositionY(Constants.EDITOR_VIEW_NOTES_VIEWBOX.top);

        /** 视口底部所对应的时间 */
        const s2 = coordinateManager.getSecondsOfRelativePositionY(Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom);

        for (const note of notes) {
            const noteStartSeconds = note.cachedStartSeconds;
            const noteEndSeconds = note.cachedEndSeconds;
            if (noteStartSeconds > s1 || noteEndSeconds < s2) {
                continue;
            }
            ctx.globalAlpha = note === imaginaryNote ? Constants.EDITOR_VIEW_IMAGINARY_ALPHA : 1;
            if (note.type === NoteType.Hold) {
                const { head, body, end } = resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width * settingsManager._settings.noteSize;
                const noteWidth = baseSize * note.size *
                    resourcePackage.getSkin(note.type, note.highlight).body.width /
                    resourcePackage.getSkin(note.type, false).body.width;

                const noteX = note.positionX * (Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width) + Constants.EDITOR_VIEW_NOTES_VIEWBOX.left + Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / 2;
                let noteStartY = coordinateManager.getRelativePositionYOfSeconds(noteStartSeconds);
                const noteEndY = coordinateManager.getRelativePositionYOfSeconds(noteEndSeconds);
                let isCuttedStart = false;
                if (noteEndY > Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom) {
                    continue;
                }

                if (noteStartY > Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom) {
                    noteStartY = Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom;
                    isCuttedStart = true;
                }

                const noteHeight = noteStartY - noteEndY;
                const noteHeadHeight = head.height / body.width * noteWidth;
                const noteEndHeight = end.height / body.width * noteWidth;
                if (!isCuttedStart || resourcePackage.config.holdKeepHead) {
                    ctx.drawImage(head, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
                }
                ctx.drawImage(body, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
                ctx.drawImage(end, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
                const box = new Box(noteEndY - noteEndHeight, noteStartY + noteHeadHeight, noteX - noteWidth / 2, noteX + noteWidth / 2);
                if (!isNoteLike(note)) continue;
                if (selectionManager.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteEndY - noteEndHeight,
                        noteWidth,
                        noteEndHeight + noteHeight + noteHeadHeight,
                        Constants.EDITOR_VIEW_SELECTION_COLOR,
                        true);
                }
                else if (box.touch(mouseManager.mouseX, mouseManager.mouseY)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteEndY - noteEndHeight,
                        noteWidth,
                        noteEndHeight + noteHeight + noteHeadHeight,
                        Constants.EDITOR_VIEW_HOVER_COLOR,
                        true);
                }
            }
            else {
                const noteImage = resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width * settingsManager._settings.noteSize;
                const noteWidth = baseSize * note.size *
                    resourcePackage.getSkin(note.type, note.highlight).width /
                    resourcePackage.getSkin(note.type, false).width;

                const noteHeight = noteImage.height / noteImage.width * baseSize;
                const noteX = note.positionX * (Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width) + Constants.EDITOR_VIEW_NOTES_VIEWBOX.left + Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / 2;
                const noteY = coordinateManager.getRelativePositionYOfSeconds(noteStartSeconds);
                if (noteY < Constants.EDITOR_VIEW_NOTES_VIEWBOX.top || noteY > Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom) {
                    continue;
                }
                ctx.drawImage(
                    noteImage,
                    noteX - noteWidth / 2,
                    noteY - noteHeight / 2,
                    noteWidth,
                    noteHeight);
                const box = new Box(noteY - noteHeight / 2, noteY + noteHeight / 2, noteX - noteWidth / 2, noteX + noteWidth / 2);
                if (!isNoteLike(note)) continue;
                if (selectionManager.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteY - noteHeight / 2,
                        noteWidth,
                        noteHeight,
                        Constants.EDITOR_VIEW_SELECTION_COLOR,
                        true);
                }
                else if (box.touch(mouseManager.mouseX, mouseManager.mouseY)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteY - noteHeight / 2,
                        noteWidth,
                        noteHeight,
                        Constants.EDITOR_VIEW_HOVER_COLOR,
                        true);
                }
            }
        }

        writeText(`线号：${stateManager._state.currentJudgeLineNumber}，名称：${stateManager.currentJudgeLine.Name}`,
            Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
            Constants.EDITOR_VIEW_FIRST_LINE_Y,
            Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
            "white",
            true);
        writeText(`音符数：${stateManager.currentJudgeLine.numOfNotes}，事件数：${stateManager.currentJudgeLine.numOfEvents}`,
            Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
            Constants.EDITOR_VIEW_SECOND_LINE_Y,
            Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
            "white",
            true);
    }

    /** 显示事件 */
    private renderEvents() {
        const stateManager = store.useManager("stateManager");
        const eventLayer = stateManager.currentEventLayer;
        const columns = stateManager.eventTracks.map(track => ({ name: track, type: track }));
        this.renderEventColumns(columns, column => eventLayer.getEventsByType(column.type));
    }

    /**
     * 显示事件编辑区中的若干栏事件
     *
     * @param columns 每一栏的名称与事件类型
     * @param getEvents 根据一栏取到这一栏的事件
     */
    private renderEventColumns(columns: EventTrackColumn[], getEvents: (column: EventTrackColumn) => AbstractEvent[]) {
        const selectionManager = store.useManager("selectionManager");
        const coordinateManager = store.useManager("coordinateManager");
        const mouseManager = store.useManager("mouseManager");

        const canvas = store.useCanvas();
        const seconds = store.getSeconds();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);

        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const column = columns[columnIndex];
            const type = column.type;
            const events = getEvents(column);

            // eslint-disable-next-line no-magic-numbers
            const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (columnIndex + 0.5) / columns.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;

            // 确保事件按时间顺序排列
            // checkAndSort<AbstractEvent>(events, (a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime));

            // 给事件分组，首尾相连的事件为一组
            const eventGroups: AbstractEvent[][] = [];
            let currentGroup: AbstractEvent[] = [];
            for (let i = 0; i < events.length; i++) {
                const event = events[i];

                // 如果这是第一个事件，或者该事件的开始时间和前一个事件的结束时间相同，则划为一组
                if (currentGroup.length === 0 || getBeatsValue(event.startTime) === getBeatsValue(currentGroup[currentGroup.length - 1].endTime)) {
                    currentGroup.push(event);
                }
                else {
                    eventGroups.push(currentGroup);
                    currentGroup = [event];
                }
            }
            eventGroups.push(currentGroup);

            for (let i = 0; i < eventGroups.length; i++) {
                const group = eventGroups[i];
                const minValue = (() => {
                    if (group.every(event => isNumberEvent(event))) {
                        return Math.min(...group.flatMap(x => [x.start, x.end]));
                    }
                })();
                const maxValue = (() => {
                    if (group.every(event => isNumberEvent(event))) {
                        return Math.max(...group.flatMap(x => [x.start, x.end]));
                    }
                })();
                for (let j = 0; j < group.length; j++) {
                    const event = group[j];
                    const startSeconds = event.cachedStartSeconds;
                    const endSeconds = event.cachedEndSeconds;
                    let eventStartY = coordinateManager.getRelativePositionYOfSeconds(startSeconds);
                    let eventEndY = coordinateManager.getRelativePositionYOfSeconds(endSeconds);
                    let isCuttedStart = false;
                    let isCuttedEnd = false;
                    if (eventEndY > Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom || eventStartY < Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top) {
                        continue;
                    }

                    if (eventEndY < Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top) {
                        eventEndY = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top;
                        isCuttedEnd = true;
                    }

                    if (eventStartY > Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom) {
                        eventStartY = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom;
                        isCuttedStart = true;
                    }

                    const eventHeight = eventStartY - eventEndY;

                    const box = new Box(eventEndY, eventStartY, eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2, eventX + Constants.EDITOR_VIEW_EVENT_WIDTH / 2);

                    // 显示事件主体
                    drawRect(
                        eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                        eventEndY,
                        Constants.EDITOR_VIEW_EVENT_WIDTH,
                        eventHeight,
                        event.isDisabled ? Constants.EDITOR_VIEW_EVENT_DISABLED_COLOR : Constants.EDITOR_VIEW_EVENT_COLOR,
                        true);

                    // 显示事件边框
                    ctx.lineWidth = Constants.EDITOR_VIEW_EVENT_BORDER_WIDTH;
                    drawRect(
                        eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                        eventEndY,
                        Constants.EDITOR_VIEW_EVENT_WIDTH,
                        eventHeight,
                        event.isDisabled ? Constants.EDITOR_VIEW_EVENT_DISABLED_BORDER_COLOR : Constants.EDITOR_VIEW_EVENT_BORDER_COLOR,
                        false);

                    // 显示选中框
                    if (selectionManager.isSelected(event)) {
                        drawRect(
                            eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                            eventEndY,
                            Constants.EDITOR_VIEW_EVENT_WIDTH,
                            eventHeight,
                            Constants.EDITOR_VIEW_SELECTION_COLOR,
                            true);
                    }

                    // 显示鼠标悬停的效果
                    if (mouseManager.mouseX >= eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2 && mouseManager.mouseX <= eventX + Constants.EDITOR_VIEW_EVENT_WIDTH / 2) {
                        if (box.touch(mouseManager.mouseX, mouseManager.mouseY)) {
                            drawRect(
                                eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                                eventEndY,
                                Constants.EDITOR_VIEW_EVENT_WIDTH,
                                eventHeight,
                                Constants.EDITOR_VIEW_HOVER_COLOR,
                                true);
                        }
                    }

                    // 显示数字事件的曲线
                    if (minValue !== undefined && maxValue !== undefined && minValue !== maxValue && isNumberEvent(event)) {
                        ctx.strokeStyle = colorToString(Constants.EDITOR_VIEW_EVENT_LINE_COLOR);
                        ctx.lineWidth = 5;
                        ctx.beginPath();
                        const left = eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2;
                        const right = eventX + Constants.EDITOR_VIEW_EVENT_WIDTH / 2;
                        if (endSeconds - startSeconds < Constants.EDITOR_VIEW_EVENT_LINE_PRECISION) {
                            const startY = coordinateManager.getRelativePositionYOfSeconds(startSeconds);
                            const endY = coordinateManager.getRelativePositionYOfSeconds(endSeconds);
                            const startX = left + (right - left) * ((event.start - minValue) / (maxValue - minValue));
                            const endX = left + (right - left) * ((event.end - minValue) / (maxValue - minValue));
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(endX, endY);
                        }
                        else {
                            for (let sec = startSeconds; sec <= endSeconds; sec += Constants.EDITOR_VIEW_EVENT_LINE_PRECISION) {
                                // 为了使事件曲线连续，如果剩余时间小于精度，则取结束时间
                                if (endSeconds - sec < Constants.EDITOR_VIEW_EVENT_LINE_PRECISION) {
                                    sec = endSeconds;
                                }

                                const y = coordinateManager.getRelativePositionYOfSeconds(sec);
                                if (y < Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top) {
                                    break;
                                }

                                if (y > Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom) {
                                    continue;
                                }

                                const value = interpolateNumberEventValue(event, sec);
                                const x = left + (right - left) * ((value - minValue) / (maxValue - minValue));
                                ctx.lineTo(x, y);
                            }
                        }
                        ctx.stroke();
                    }

                    // 显示颜色事件的渐变条
                    else if (isColorEvent(event)) {
                        ctx.strokeStyle = colorToString(Constants.EDITOR_VIEW_EVENT_LINE_COLOR);
                        ctx.lineWidth = 1;
                        for (let sec = startSeconds; sec <= endSeconds; sec += Constants.EDITOR_VIEW_EVENT_LINE_PRECISION) {
                            // 为了使事件曲线连续，如果剩余时间小于精度，则取结束时间
                            let nextSec = sec + Constants.EDITOR_VIEW_EVENT_LINE_PRECISION;
                            if (endSeconds - sec < Constants.EDITOR_VIEW_EVENT_LINE_PRECISION) {
                                nextSec = endSeconds;
                            }

                            const y = coordinateManager.getRelativePositionYOfSeconds(sec);
                            if (y > Constants.EDITOR_VIEW_EVENTS_VIEWBOX.bottom) {
                                continue;
                            }

                            if (y < Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top) {
                                break;
                            }

                            const nextY = coordinateManager.getRelativePositionYOfSeconds(nextSec);
                            const left = eventX - Constants.EDITOR_VIEW_EVENT_WIDTH * Constants.EDITOR_VIEW_COLOR_EVENT_GRADIENT_WIDTH / 2;
                            const right = eventX + Constants.EDITOR_VIEW_EVENT_WIDTH * Constants.EDITOR_VIEW_COLOR_EVENT_GRADIENT_WIDTH / 2;
                            const value = interpolateColorEventValue(event, sec);
                            ctx.fillStyle = colorToString(value);
                            ctx.fillRect(left, nextY, right - left, nextY - y);
                        }
                    }

                    // 如果是本组的第一个事件
                    if (j === 0 && !isCuttedStart) {
                        // 显示开头文字
                        ctx.shadowBlur = Constants.EDITOR_VIEW_EVENT_TEXT_SHADOW_BLUR;
                        ctx.shadowColor = colorToString(Constants.EDITOR_VIEW_BACKGROUND_COLOR);
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        if (isNumberEvent(event)) {
                            writeText(event.start.toFixed(2),
                                eventX,
                                eventStartY - 1,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        else if (isTextEvent(event)) {
                            writeText(event.start,
                                eventX,
                                eventStartY - 1,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        ctx.shadowBlur = 0;
                    }

                    // 如果是本组的最后一个事件
                    if (j === group.length - 1 && !isCuttedEnd) {
                        // 显示结尾文字
                        ctx.shadowBlur = Constants.EDITOR_VIEW_EVENT_TEXT_SHADOW_BLUR;
                        ctx.shadowColor = colorToString(Constants.EDITOR_VIEW_BACKGROUND_COLOR);
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        if (isNumberEvent(event)) {
                            writeText(event.end.toFixed(2),
                                eventX,
                                eventEndY,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        else if (isTextEvent(event)) {
                            writeText(event.end,
                                eventX,
                                eventEndY,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        ctx.shadowBlur = 0;
                    }
                }
            }

            writeText(column.name, eventX, Constants.EDITOR_VIEW_FIRST_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM, "white", true);

            // 没有事件类型的栏（噪域编辑区的激活区间）由别的方法绘制下面的内容
            if (!type) {
                continue;
            }

            if (type === "color") {
                const eventIndex = findLastEventIndex<AbstractEvent>(events, seconds);
                const event = events[eventIndex] as ColorEvent;
                const color: RGBcolor = event ? interpolateColorEventValue(event, seconds) : [255, 255, 255];
                writeText(colorToHex(color), eventX, Constants.EDITOR_VIEW_SECOND_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_SMALL, color, true);
            }
            else if (type === "text") {
                const eventIndex = findLastEventIndex<AbstractEvent>(events, seconds);
                const event = events[eventIndex] as TextEvent;
                const text = event ? interpolateTextEventValue(event, seconds) : "";

                // writeText(text, eventX, 860, 30, "white", false);
                writeText(text, eventX, Constants.EDITOR_VIEW_SECOND_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_SMALL, "white", true);
            }
            else {
                const eventIndex = findLastEventIndex<AbstractEvent>(events, seconds);
                const event = events[eventIndex] as NumberEvent;
                let currentEventValue = event ? interpolateNumberEventValue(event, seconds) : undefined;
                switch (type) {
                    case "scaleX":
                    case "scaleY":
                        currentEventValue ??= 1;
                        break;
                    default:
                        currentEventValue ??= 0;
                }
                ctx.lineWidth = 5;

                // writeText(currentEventValue.toFixed(2), eventX, 860, 30, "white", false);
                writeText(currentEventValue.toFixed(2), eventX, Constants.EDITOR_VIEW_SECOND_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_SMALL, "white", true);
            }
        }
    }

    /**
     * 显示噪域编辑区中的噪域
     *
     * 每个噪域显示为一个红色带边框的方块，横向中心位于 editorPositionX，
     * 纵向覆盖噪域的出现时间到消失时间。当前正在编辑的噪域正常显示，其余噪域半透明。
     */
    private renderBlockAreas() {
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");
        const mouseManager = store.useManager("mouseManager");
        const selectionManager = store.useManager("selectionManager");

        const canvas = store.useCanvas();
        const chart = store.useChart();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);

        const currentIndex = stateManager._state.currentBlockAreaNumber;
        const halfWidth = Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH / 2;
        const viewBox = Constants.EDITOR_VIEW_NOTES_VIEWBOX;

        // 当前噪域最后绘制，避免被其他噪域盖住
        const drawOrder = chart.blockAreaList
            .map((_, index) => index)
            .filter(index => index !== currentIndex);
        drawOrder.push(currentIndex);

        for (const index of drawOrder) {
            const blockArea = chart.blockAreaList[index];
            if (!blockArea) {
                continue;
            }

            const x = coordinateManager.scaleX(blockArea.editorPositionX);
            const appearY = coordinateManager.getRelativePositionYOfSeconds(blockArea.cachedStartSeconds);
            const disappearY = coordinateManager.getRelativePositionYOfSeconds(blockArea.cachedEndSeconds);
            const top = Math.min(appearY, disappearY);
            const height = Math.max(Math.abs(disappearY - appearY), Constants.EDITOR_VIEW_BLOCK_AREA_MIN_HEIGHT);

            // 裁剪到噪域编辑区内，避免遮挡其他界面
            const clippedTop = Math.max(top, viewBox.top);
            const clippedBottom = Math.min(top + height, viewBox.bottom);
            if (clippedBottom <= clippedTop) {
                continue;
            }

            const alpha = index === currentIndex ? 1 : Constants.EDITOR_VIEW_BLOCK_AREA_INACTIVE_ALPHA;
            const left = x - halfWidth;
            const clippedHeight = clippedBottom - clippedTop;

            // 噪域主体
            drawRect(left,
                clippedTop,
                Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH,
                clippedHeight,
                Constants.BLOCK_AREA_ACTIVE_FILL_COLOR,
                true,
                alpha);

            // 噪域边框
            ctx.lineWidth = Constants.EDITOR_VIEW_BLOCK_AREA_BORDER_WIDTH;
            drawRect(left,
                clippedTop,
                Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH,
                clippedHeight,
                Constants.BLOCK_AREA_ACTIVE_BORDER_COLOR,
                false,
                alpha);

            // 选中的噪域
            if (selectionManager.isSelected(blockArea)) {
                drawRect(left,
                    clippedTop,
                    Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH,
                    clippedHeight,
                    Constants.EDITOR_VIEW_SELECTION_COLOR,
                    true,
                    alpha);
            }

            // 鼠标悬停的噪域
            if (mouseManager.mouseX >= left && mouseManager.mouseX <= left + Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH &&
                mouseManager.mouseY >= clippedTop && mouseManager.mouseY <= clippedBottom) {
                drawRect(left,
                    clippedTop,
                    Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH,
                    clippedHeight,
                    Constants.EDITOR_VIEW_HOVER_COLOR,
                    true,
                    alpha);
            }

            if (clippedTop === top) {
                writeText(index.toString(),
                    x,
                    top + Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                    Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                    "white",
                    true,
                    alpha);
            }
        }

        // 显示当前噪域的信息
        const blockArea = stateManager.currentBlockArea;
        if (blockArea) {
            writeText(`噪域编号：${stateManager._state.currentBlockAreaNumber}，名称：${blockArea.Name}`,
                viewBox.middleX,
                Constants.EDITOR_VIEW_FIRST_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
            writeText(`激活区间数：${blockArea.activeIntervals.length}，事件数：${blockArea.numOfEvents}`,
                viewBox.middleX,
                Constants.EDITOR_VIEW_SECOND_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
        }
        else {
            writeText("当前谱面没有噪域",
                viewBox.middleX,
                Constants.EDITOR_VIEW_FIRST_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
        }
    }

    /** 显示噪域编辑区右侧的事件 */
    private renderBlockAreaEvents() {
        const stateManager = store.useManager("stateManager");
        const blockArea = stateManager.currentBlockArea;
        if (!blockArea) {
            return;
        }

        const columns: EventTrackColumn[] = blockAreaEventTracks.map(track => {
            const type = getBlockAreaEventTypeOfTrack(track);
            return {
                // 栏顶部的文字不显示 "Events" 后缀，读起来更短
                name: type ?? track,
                type: type ?? ""
            };
        });

        this.renderBlockAreaIntervalColumn(blockArea, columns);
        this.renderEventColumns(columns, column => {
            if (!column.type) return [];
            return blockArea.getEventsByType(column.type as BlockAreaEventType);
        });
    }

    /** 显示噪域编辑区的激活区间栏（activeIntervals） */
    private renderBlockAreaIntervalColumn(blockArea: BlockArea, columns: EventTrackColumn[]) {
        const coordinateManager = store.useManager("coordinateManager");
        const mouseManager = store.useManager("mouseManager");
        const selectionManager = store.useManager("selectionManager");

        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);

        const columnIndex = columns.findIndex(column => !column.type);
        if (columnIndex === -1) {
            return;
        }

        const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (columnIndex + 0.5) / columns.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;
        const viewBox = Constants.EDITOR_VIEW_EVENTS_VIEWBOX;

        for (const interval of blockArea.activeIntervals) {
            const startY = coordinateManager.getRelativePositionYOfSeconds(interval.cachedStartSeconds);
            const endY = coordinateManager.getRelativePositionYOfSeconds(interval.cachedEndSeconds);
            const top = Math.max(Math.min(startY, endY), viewBox.top);
            const bottom = Math.min(Math.max(startY, endY), viewBox.bottom);
            if (bottom <= top) {
                continue;
            }

            const left = eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2;
            const height = bottom - top;

            drawRect(left,
                top,
                Constants.EDITOR_VIEW_EVENT_WIDTH,
                height,
                Constants.EDITOR_VIEW_BLOCK_AREA_INTERVAL_COLOR,
                true);
            ctx.lineWidth = Constants.EDITOR_VIEW_EVENT_BORDER_WIDTH;
            drawRect(left,
                top,
                Constants.EDITOR_VIEW_EVENT_WIDTH,
                height,
                Constants.EDITOR_VIEW_BLOCK_AREA_INTERVAL_BORDER_COLOR,
                false);

            // 显示选中框
            if (selectionManager.isSelected(interval)) {
                drawRect(left,
                    top,
                    Constants.EDITOR_VIEW_EVENT_WIDTH,
                    height,
                    Constants.EDITOR_VIEW_SELECTION_COLOR,
                    true);
            }

            // 显示鼠标悬停的效果
            if (mouseManager.mouseX >= left && mouseManager.mouseX <= left + Constants.EDITOR_VIEW_EVENT_WIDTH &&
                mouseManager.mouseY >= top && mouseManager.mouseY <= bottom) {
                drawRect(left,
                    top,
                    Constants.EDITOR_VIEW_EVENT_WIDTH,
                    height,
                    Constants.EDITOR_VIEW_HOVER_COLOR,
                    true);
            }

            // 显示开始时间
            ctx.shadowBlur = Constants.EDITOR_VIEW_EVENT_TEXT_SHADOW_BLUR;
            ctx.shadowColor = colorToString(Constants.EDITOR_VIEW_BACKGROUND_COLOR);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            if (startY >= viewBox.top) {
                writeText(formatBeats(interval.startTime),
                    eventX,
                    startY - 1,
                    Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                    Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
            }

            if (endY <= viewBox.bottom) {
                writeText(formatBeats(interval.endTime),
                    eventX,
                    endY,
                    Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                    Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
            }
            ctx.shadowBlur = 0;
        }

        writeText(columns[columnIndex].name, eventX, Constants.EDITOR_VIEW_FIRST_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM, "white", true);

        // 显示当前时间是否处于激活区间内
        const seconds = store.getSeconds();
        const isActive = blockArea.activeIntervals.some(interval => {
            return interval.cachedStartSeconds <= seconds && seconds <= interval.cachedEndSeconds;
        });
        writeText(isActive ? "已激活" : "未激活",
            eventX,
            Constants.EDITOR_VIEW_SECOND_LINE_Y,
            Constants.EDITOR_VIEW_FONT_SIZE_SMALL,
            isActive ? Constants.BLOCK_AREA_ACTIVE_BORDER_COLOR : "white",
            true);
    }

    /** 测试专用：显示碰撞箱 */
    private renderBoxes() {
        const canvas = store.useCanvas();
        const coordinateManager = store.useManager("coordinateManager");
        const boxesManager = store.useManager("boxesManager");
        if (!canvas) return;
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        for (const box of boxesManager.calculateBoxes()) {
            const top = coordinateManager.relative(box.bottom);
            drawRect(box.left, top, box.width, box.height, "rgba(255,255,0,0.4)", true);
        }
    }
}