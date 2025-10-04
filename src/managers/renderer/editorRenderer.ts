/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Beats, beatsToSeconds, getBeatsValue } from "@/models/beats";
import { interpolateNumberEventValue, findLastEvent, interpolateColorEventValue, interpolateTextEventValue, isNumberEventLike, isColorEventLike, isTextEventLike } from "@/models/event";
import { isNoteLike, NoteType } from "@/models/note";
import { checkAndSort } from "@/tools/algorithm";
import canvasUtils from "@/tools/canvasUtils";
import { colorToHex, colorToString, RGBcolor } from "@/tools/color";
import { floor, ceil } from "lodash";
import Constants from "../../constants";
import { MouseMoveMode } from "./mouse";
import store from "@/store";
import Manager from "./abstract";
import { Box } from "@/tools/box";
import globalEventEmitter from "@/eventEmitter";
import { baseEventTypes, extendedEventTypes, isBaseEventLayer } from "@/models/eventLayer";
import { BottomText } from "./settings";
import { FullEvent } from "@/models/element";

export default class EditorRenderer extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("RENDER_EDITOR", () => {
            this.render();
        });
    }

    /** 显示编辑器界面到canvas上 */
    render() {
        this.renderBackground();
        this.renderGrid();
        this.renderSelection();
        this.renderNotes();
        this.renderEvents();

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

        const types = (() => {
            const eventLayer = stateManager.currentEventLayer;
            if (isBaseEventLayer(eventLayer)) {
                return baseEventTypes;
            }
            else {
                return extendedEventTypes;
            }
        })();

        // 显示事件中间的分隔线
        for (let i = 1; i < types.length; i++) {
            drawLine(Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * i / types.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
                Constants.EDITOR_VIEW_EVENTS_VIEWBOX.top,
                Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * i / types.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left,
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

        if (settingsManager._settings.bottomText === BottomText.Info) {
            writeText(`${stateManager._state.currentJudgeLineNumber}号判定线   名称${stateManager.currentJudgeLine.Name}`,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_FIRST_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
            writeText(`本判定线上共有${stateManager.currentJudgeLine.numOfNotes}个音符和${stateManager.currentJudgeLine.numOfEvents}个事件`,
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_SECOND_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
        }

        if (settingsManager._settings.bottomText === BottomText.Hint) {
            writeText("在此区域右键放置音符",
                Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_FIRST_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);
        }
    }

    /** 显示事件 */
    private renderEvents() {
        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const settingsManager = store.useManager("settingsManager");
        const coordinateManager = store.useManager("coordinateManager");
        const mouseManager = store.useManager("mouseManager");

        const canvas = store.useCanvas();
        const seconds = store.getSeconds();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const types = (() => {
            const eventLayer = stateManager.currentEventLayer;
            if (isBaseEventLayer(eventLayer)) {
                return baseEventTypes;
            }
            else {
                return extendedEventTypes;
            }
        })();

        for (let column = 0; column < types.length; column++) {
            const type = types[column];
            const events = stateManager.currentEventLayer.getEventsByType(type);

            // eslint-disable-next-line no-magic-numbers
            const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (column + 0.5) / types.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;

            // 确保事件按时间顺序排列
            checkAndSort<FullEvent>(events, (a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime));

            // 给事件分组，首尾相连的事件为一组
            const eventGroups: FullEvent[][] = [];
            let currentGroup: FullEvent[] = [];
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
                    if (group.every(event => isNumberEventLike(event))) {
                        return Math.min(...group.flatMap(x => [x.start, x.end]));
                    }
                })();
                const maxValue = (() => {
                    if (group.every(event => isNumberEventLike(event))) {
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
                    if (minValue !== undefined && maxValue !== undefined && minValue !== maxValue && isNumberEventLike(event)) {
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
                    else if (isColorEventLike(event)) {
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
                        if (isNumberEventLike(event)) {
                            writeText(event.start.toFixed(2),
                                eventX,
                                eventStartY - 1,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        else if (isTextEventLike(event)) {
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
                        if (isNumberEventLike(event)) {
                            writeText(event.end.toFixed(2),
                                eventX,
                                eventEndY,
                                Constants.EDITOR_VIEW_EVENT_FONT_SIZE,
                                Constants.EDITOR_VIEW_EVENT_TEXT_COLOR);
                        }
                        else if (isTextEventLike(event)) {
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

            if (!(settingsManager._settings.bottomText === BottomText.Info)) {
                continue;
            }
            writeText(type, eventX, Constants.EDITOR_VIEW_FIRST_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM, "white", true);
            if (type === "color") {
                const event = findLastEvent(events as FullEvent<RGBcolor>[], seconds);
                const color: RGBcolor = event ? interpolateColorEventValue(event, seconds) : [255, 255, 255];
                writeText(colorToHex(color), eventX, Constants.EDITOR_VIEW_SECOND_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_SMALL, color, true);
            }
            else if (type === "text") {
                const event = findLastEvent(events as FullEvent<string>[], seconds);
                const text = event ? interpolateTextEventValue(event, seconds) : "";

                // writeText(text, eventX, 860, 30, "white", false);
                writeText(text, eventX, Constants.EDITOR_VIEW_SECOND_LINE_Y, Constants.EDITOR_VIEW_FONT_SIZE_SMALL, "white", true);
            }
            else {
                const event = findLastEvent(events as FullEvent<number>[], seconds);
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

        if (settingsManager._settings.bottomText === BottomText.Hint) {
            writeText("在此区域右键放置事件",
                Constants.EDITOR_VIEW_EVENTS_VIEWBOX.middleX,
                Constants.EDITOR_VIEW_FIRST_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_MEDIUM,
                "white",
                true);

            writeText(`前往“设置>界面底部文字”以设置此位置显示的文字`,
                canvas.width / 2,
                Constants.EDITOR_VIEW_SECOND_LINE_Y,
                Constants.EDITOR_VIEW_FONT_SIZE_SMALL,
                "white",
                true);
        }
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