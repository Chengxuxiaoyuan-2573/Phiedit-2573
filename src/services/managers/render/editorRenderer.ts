import { Beats, beatsToSeconds, getBeatsValue } from "@/classes/beats";
import { NumberEvent, interpolateNumberEventValue, findLastEvent } from "@/classes/event";
import { Note, NoteType } from "@/classes/note";
import { checkAndSort } from "@/tools/algorithm";
import { BoxWithData } from "@/tools/box";
import canvasUtils from "@/tools/canvasUtils";
import { colorToString } from "@/tools/color";
import { floor, ceil } from "lodash";
import Constants from "../../constants";
import { MouseMoveMode } from "@/types";
import store from "@/store";
import mouseManager from "@/services/managers/mouse";
import stateManager from "@/services/managers/state";
import selectionManager from "../selection";


class EditorRenderer {
    /** 显示编辑器界面到canvas上 */
    render() {
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);

        ctx.reset();
        this.renderBackground();
        this.renderGrid();
        this.renderSelection();
        this.renderNotes();
        this.renderEvents();
    }
    /** 显示选择框 */
    private renderSelection() {
        const selectionBox = mouseManager.selectionBox;
        if (!selectionBox) return;
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(selectionBox.left,
            stateManager.relative(selectionBox.top),
            selectionBox.width,
            -selectionBox.height,
            Constants.selectionColor,
            true);
    }
    /** 显示背景 */
    private renderBackground() {
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        drawRect(0, 0, canvas.width, canvas.height, Constants.backgroundColor, true);
    }
    /** 显示网格 */
    private renderGrid() {
        const canvas = store.useCanvas();
        const chart = store.useChart();
        const ctx = canvasUtils.getContext(canvas);
        const drawLine = canvasUtils.drawLine.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        // 显示横线
        const min = floor(stateManager.getBeatsOfRelativePositionY(Constants.notesViewBox.bottom));
        const max = ceil(stateManager.getBeatsOfRelativePositionY(Constants.notesViewBox.top));
        for (let i = min; i <= max; i++) {
            for (let j = 0; j < stateManager.horizonalLineCount; j++) {
                const beats: Beats = [i, j, stateManager.horizonalLineCount];
                const pos = stateManager.getRelativePositionYOfSeconds(beatsToSeconds(chart.BPMList, beats));
                if (j == 0) {
                    writeText(i.toString(),
                        (Constants.eventsViewBox.left + Constants.notesViewBox.right) / 2,
                        pos,
                        20,
                        Constants.horzionalMainLineColor);
                    drawLine(Constants.notesViewBox.left,
                        pos, Constants.notesViewBox.right,
                        pos,
                        Constants.horzionalMainLineColor);
                    drawLine(Constants.eventsViewBox.left,
                        pos,
                        Constants.eventsViewBox.right,
                        pos,
                        Constants.horzionalMainLineColor);
                }
                else {
                    writeText(j.toString(),
                        (Constants.eventsViewBox.left + Constants.notesViewBox.right) / 2,
                        pos,
                        20,
                        Constants.horzionalLineColor);
                    drawLine(Constants.notesViewBox.left,
                        pos, Constants.notesViewBox.right,
                        pos,
                        Constants.horzionalLineColor);
                    drawLine(Constants.eventsViewBox.left,
                        pos, Constants.eventsViewBox.right,
                        pos,
                        Constants.horzionalLineColor);
                }
            }
        }
        // 显示竖线
        if (stateManager.verticalLineCount > 1) {
            drawLine(
                Constants.notesViewBox.middleX,
                Constants.notesViewBox.top,
                Constants.notesViewBox.middleX,
                Constants.notesViewBox.bottom,
                Constants.verticalMainLineColor);

            for (let i = Constants.notesViewBox.middleX + stateManager.verticalLineSpace;
                i <= Constants.notesViewBox.right;
                i += stateManager.verticalLineSpace)
                drawLine(i,
                    Constants.notesViewBox.top,
                    i, Constants.notesViewBox.bottom,
                    Constants.verticalLineColor);

            for (let i = Constants.notesViewBox.middleX - stateManager.verticalLineSpace;
                i >= Constants.notesViewBox.left;
                i -= stateManager.verticalLineSpace)
                drawLine(i,
                    Constants.notesViewBox.top,
                    i,
                    Constants.notesViewBox.bottom,
                    Constants.verticalLineColor);
        }
        // 显示事件中间的分隔线
        for (let i = 1; i < 5; i++)
            drawLine(Constants.eventsViewBox.width * i / 5 + Constants.eventsViewBox.left,
                Constants.eventsViewBox.top,
                Constants.eventsViewBox.width * i / 5 + Constants.eventsViewBox.left,
                Constants.notesViewBox.bottom,
                Constants.verticalMainLineColor);
        // 显示边框
        drawRect(Constants.notesViewBox.left,
            Constants.notesViewBox.top,
            Constants.notesViewBox.width,
            Constants.notesViewBox.height,
            Constants.borderColor);
        drawRect(Constants.eventsViewBox.left,
            Constants.eventsViewBox.top,
            Constants.eventsViewBox.width,
            Constants.eventsViewBox.height,
            Constants.borderColor);
    }
    /** 显示note */
    private renderNotes() {
        const canvas = store.useCanvas();
        const chartPackage = store.useChartPackage();
        const resourcePackage = store.useResourcePackage();
        const chart = store.useChart();
        const seconds = store.getSeconds();
        if (!canvas) return [];
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const judgeLine = stateManager.currentJudgeLine;
        const noteBoxes: BoxWithData<Note>[] = [];
        const a = stateManager.attatchY(mouseManager.mouseY);
        const imaginaryNote = new Note({
            startTime: a,
            endTime: a,
            positionX: stateManager.attatchX(mouseManager.mouseX),
            type: stateManager.currentNoteType
        }, chart.BPMList);
        const hideImaginaryNote = mouseManager.mouseMoveMode != MouseMoveMode.None || !Constants.notesViewBox.touch(mouseManager.mouseX, mouseManager.mouseY);
        const notes = hideImaginaryNote ? judgeLine.notes : [imaginaryNote, ...judgeLine.notes];
        for (const note of notes) {
            const noteStartSeconds = note.cachedStartSeconds;
            const noteEndSeconds = note.cachedEndSeconds;
            if (seconds >= noteStartSeconds && note.hitSeconds == undefined && !note.isFake) {
                note.hitSeconds = noteStartSeconds;
                resourcePackage.playSound(note.type);
            }
            if (note.hitSeconds && seconds < note.hitSeconds) {
                note.hitSeconds = undefined;
            }
            ctx.globalAlpha = note == imaginaryNote ? 0.5 : 1;
            if (note.type == NoteType.Hold) {
                const { head, body, end } = resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = Constants.notesViewBox.width / canvas.width * chartPackage.config.noteSize;
                const noteWidth = baseSize * note.size
                    * resourcePackage.getSkin(note.type, note.highlight).body.width
                    / resourcePackage.getSkin(note.type, false).body.width;

                const noteX = note.positionX * (Constants.notesViewBox.width / canvas.width) + Constants.notesViewBox.left + Constants.notesViewBox.width / 2;
                const noteStartY = stateManager.getRelativePositionYOfSeconds(noteStartSeconds);
                const noteEndY = stateManager.getRelativePositionYOfSeconds(noteEndSeconds);
                const noteHeight = noteStartY - noteEndY;
                const noteHeadHeight = head.height / body.width * noteWidth;
                const noteEndHeight = end.height / body.width * noteWidth;

                ctx.drawImage(head, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
                ctx.drawImage(body, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
                ctx.drawImage(end, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
                if (selectionManager.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteEndY - noteEndHeight,
                        noteWidth,
                        noteEndHeight + noteHeight + noteHeadHeight,
                        Constants.selectionColor,
                        true);
                }
            }
            else {
                const noteImage = resourcePackage.getSkin(note.type, note.highlight);

                const baseSize = Constants.notesViewBox.width / canvas.width * chartPackage.config.noteSize;
                const noteWidth = baseSize * note.size
                    * resourcePackage.getSkin(note.type, note.highlight).width
                    / resourcePackage.getSkin(note.type, false).width;

                const noteHeight = noteImage.height / noteImage.width * baseSize;
                const noteX = note.positionX * (Constants.notesViewBox.width / canvas.width) + Constants.notesViewBox.left + Constants.notesViewBox.width / 2;
                const noteY = stateManager.getRelativePositionYOfSeconds(noteStartSeconds);

                ctx.drawImage(
                    noteImage,
                    noteX - noteWidth / 2,
                    noteY - noteHeight / 2,
                    noteWidth,
                    noteHeight);
                if (selectionManager.isSelected(note)) {
                    drawRect(
                        noteX - noteWidth / 2,
                        noteY - noteHeight / 2,
                        noteWidth,
                        noteHeight,
                        Constants.selectionColor,
                        true);
                }
                if (note != imaginaryNote) {
                    noteBoxes.push(new BoxWithData(
                        stateManager.absolute(noteY - Constants.selectPadding),
                        stateManager.absolute(noteY + Constants.selectPadding),
                        noteX - noteWidth / 2 - Constants.selectPadding,
                        noteX + noteWidth / 2 + Constants.selectPadding,
                        note
                    ));
                }
            }
        }
        return noteBoxes;
    }
    /** 显示事件 */
    private renderEvents() {
        const canvas = store.useCanvas();
        const seconds = store.getSeconds();
        if (!canvas) return [];
        const ctx = canvasUtils.getContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const types = ["moveX", "moveY", "rotate", "alpha", "speed"] as const;
        types.forEach((type, column) => {
            const attrName = `${type}Events` as const;
            const events = stateManager.currentEventLayer[attrName];
            const eventX = Constants.eventsViewBox.width * (column + 0.5) / 5 + Constants.eventsViewBox.left;

            checkAndSort(events, (a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime));
            const groups: NumberEvent[][] = [];
            let cache: NumberEvent[] = [];
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                if (cache.length == 0 || getBeatsValue(event.startTime) == getBeatsValue(cache[cache.length - 1].endTime)) {
                    cache.push(event);
                }
                else {
                    groups.push(cache);
                    cache = [event];
                }
            }
            groups.push(cache);

            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                const minValue = Math.min(...group.flatMap(x => [x.start, x.end]));
                const maxValue = Math.max(...group.flatMap(x => [x.start, x.end]));
                for (let j = 0; j < group.length; j++) {
                    const event = group[j];
                    const startSeconds = event.cachedStartSeconds;
                    const endSeconds = event.cachedEndSeconds;
                    const eventStartY = stateManager.getRelativePositionYOfSeconds(startSeconds);
                    const eventEndY = stateManager.getRelativePositionYOfSeconds(endSeconds);
                    const eventHeight = eventStartY - eventEndY;

                    // 显示事件主体
                    drawRect(
                        eventX - Constants.eventWidth / 2,
                        eventEndY,
                        Constants.eventWidth,
                        eventHeight,
                        Constants.eventColor,
                        true);

                    if (selectionManager.isSelected(event)) {
                        // 显示选中框
                        drawRect(
                            eventX - Constants.eventWidth / 2,
                            eventEndY,
                            Constants.eventWidth,
                            eventHeight,
                            Constants.selectionColor,
                            true);
                    }

                    if (j == 0) {
                        // 显示开头文字
                        writeText(event.start.toFixed(2),
                            eventX,
                            eventStartY - 1,
                            30,
                            Constants.eventNumberColor);
                    }

                    if (j == group.length - 1) {
                        // 显示结尾文字
                        writeText(event.end.toFixed(2),
                            eventX,
                            eventEndY,
                            30,
                            Constants.eventNumberColor);
                    }

                    if (minValue != maxValue) {
                        // 显示事件曲线
                        ctx.strokeStyle = colorToString(Constants.eventLineColor);
                        ctx.lineWidth = 5;
                        ctx.beginPath();
                        for (let sec = startSeconds; sec <= endSeconds; sec += Constants.eventLinePrecision) {
                            if (endSeconds - sec < Constants.eventLinePrecision) {
                                sec = endSeconds;
                            }
                            const y = stateManager.getRelativePositionYOfSeconds(sec);
                            const left = eventX - Constants.eventWidth / 2;
                            const right = eventX + Constants.eventWidth / 2;
                            const value = interpolateNumberEventValue(event, sec);
                            const x = left + (right - left) * ((value - minValue) / (maxValue - minValue));
                            ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                }
            }
            const currentEventValue = interpolateNumberEventValue(findLastEvent(events, seconds), seconds);
            writeText(currentEventValue.toFixed(2), eventX, Constants.eventsViewBox.bottom - 20, 30, "white", false);
            writeText(currentEventValue.toFixed(2), eventX, Constants.eventsViewBox.bottom - 20, 30, "blue", true);
        })
    }
}
export default new EditorRenderer();