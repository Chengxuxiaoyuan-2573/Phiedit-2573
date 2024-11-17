/* eslint-disable */
import { Box } from "./classes/box";
import { BaseEvent } from "./classes/event";
import { Note } from "./classes/note";
import { beatsToSeconds, secondsToBeatsValue, drawLine, getContext } from "./tools";
import { Beats, ChartData, Ctx, NoteType, UI } from "./typeDefinitions";
const lineWidth = 5,
    horzionalMainLineColor = "rgba(255, 255, 255, 0.5)",
    horzionalLineColor = "rgba(255, 255, 255, 0.2)",
    verticalMainLineColor = "rgba(255, 255, 255, 0.5)",
    verticalLineColor = "rgba(255, 255, 255, 0.2)",
    judgeLineColor = "#ee0",
    backgroundColor = "#222",
    top = 0,
    bottom = 900,
    left1 = 50,
    right1 = 650,
    width = right1 - left1,
    right2 = 1300,
    left2 = right2 - width,
    height = bottom - top,
    eventSpace = 20,
    selectPadding = 10;
export default function renderEditorUI(canvas: HTMLCanvasElement, chartData: ChartData, seconds: number, ui: UI) {
    const { chartPackage, resourcePackage } = chartData;
    const { chart } = chartPackage;
    chart.highlightNotes();
    seconds -= chart.META.offset / 1000;
    const ctx = getContext(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    const offsetY = ui.verticalStretch * seconds;
    const bottomSeconds = offsetY / ui.verticalStretch;
    const topSeconds = (offsetY + height) / ui.verticalStretch;
    const bottomBeats = secondsToBeatsValue(chart.BPMList, bottomSeconds);
    const topBeats = secondsToBeatsValue(chart.BPMList, topSeconds);
    function _position(s: number) {
        return bottom - (s * ui.verticalStretch - offsetY);
    }
    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < ui.horzionalLines; j++) {
            if (j == 0)
                ctx.strokeStyle = horzionalMainLineColor;
            else
                ctx.strokeStyle = horzionalLineColor;
            const beats: Beats = [i, j, ui.horzionalLines];
            const seconds = beatsToSeconds(chart.BPMList, beats);
            const position = _position(seconds);
            if (top < position && position < bottom)
                drawLine(ctx, left1, position, right1, position);
        }
    }
    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < ui.horzionalLines; j++) {
            if (j == 0)
                ctx.strokeStyle = horzionalMainLineColor;
            else
                ctx.strokeStyle = horzionalLineColor;
            const beats: Beats = [i, j, ui.horzionalLines];
            const seconds = beatsToSeconds(chart.BPMList, beats);
            const position = _position(seconds);
            if (top < position && position < bottom)
                drawLine(ctx, left2, position, right2, position);
        }
    }
    for (let i = 0; i <= 675; i += ui.verticalSpace) {
        if (i == 0)
            ctx.strokeStyle = verticalMainLineColor;
        else
            ctx.strokeStyle = verticalLineColor;
        drawLine(ctx, i / 1350 * width + left1 + width / 2, top, i / 1350 * width + left1 + width / 2, bottom);
        drawLine(ctx, -i / 1350 * width + left1 + width / 2, top, -i / 1350 * width + left1 + width / 2, bottom);
    }
    ctx.strokeStyle = verticalMainLineColor;
    for (let i = 1; i < 5; i++) {
        drawLine(ctx, width * i / 5 + left2, top, width * i / 5 + left2, bottom);
    }
    ctx.strokeStyle = judgeLineColor;
    ctx.strokeRect(left1, top, width, height);
    ctx.strokeRect(left2, top, width, height);
    ctx.fillStyle = "white";
    ctx.font = "20px PhiFont";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = Math.ceil(bottomBeats); i <= Math.floor(topBeats); i++) {
        const beats: Beats = [i, 0, 1];
        const seconds = beatsToSeconds(chart.BPMList, beats);
        const position = _position(seconds);
        ctx.fillText(i.toString(), (left2 + right1) / 2, position);
    }
    const selectedJudgeLine = chart.judgeLineList[ui.selectedJudgeLine];
    const noteBoxes: Box<Note>[] = [];
    for (const note of selectedJudgeLine.notes) {
        const noteStartSeconds = note._startSeconds || (note._startSeconds = beatsToSeconds(chart.BPMList, note.startTime));
        if (note.type == NoteType.Hold) {
            const noteEndSeconds = note._endSeconds || (note._endSeconds = beatsToSeconds(chart.BPMList, note.endTime));
            const noteX = note.positionX * (width / 1350) + left1 + width / 2;
            const noteStartY = _position(noteStartSeconds);
            const noteEndY = _position(noteEndSeconds);
            const noteWidth = (() => {
                let size = width / 1350 * 200 * note.size;
                if (note._highlight) size *= resourcePackage.holdHLBody.width / resourcePackage.holdBody.width;
                return size;
            })()
            const noteHeight = noteStartY - noteEndY;
            const holdHead = note._highlight ? resourcePackage.holdHLHead : resourcePackage.holdHead;
            const holdBody = note._highlight ? resourcePackage.holdHLBody : resourcePackage.holdBody;
            const holdEnd = note._highlight ? resourcePackage.holdHLEnd : resourcePackage.holdEnd;
            const noteHeadHeight = holdHead.height / holdBody.width * noteWidth;
            const noteEndHeight = holdEnd.height / holdBody.width * noteWidth;
            ctx.drawImage(holdHead, noteX - noteWidth / 2, noteStartY, noteWidth, noteHeadHeight);
            ctx.drawImage(holdBody, noteX - noteWidth / 2, noteEndY, noteWidth, noteHeight);
            ctx.drawImage(holdEnd, noteX - noteWidth / 2, noteEndY - noteEndHeight, noteWidth, noteEndHeight);
            noteBoxes.push(new Box(
                noteEndY - selectPadding,
                noteStartY + selectPadding,
                noteX - noteWidth / 2 - selectPadding,
                noteX + noteWidth / 2 + selectPadding,
                note
            ));
        }
        else {
            const noteImage = (() => {
                switch (note.type) {
                    case NoteType.Flick:
                        if (note._highlight)
                            return resourcePackage.flickHL;
                        else
                            return resourcePackage.flick;
                    case NoteType.Drag:
                        if (note._highlight)
                            return resourcePackage.dragHL;
                        else
                            return resourcePackage.drag;
                    default:
                        if (note._highlight)
                            return resourcePackage.tapHL;
                        else
                            return resourcePackage.tap;
                }
            })();
            const noteWidth = (() => {
                let size = width / 1350 * 200 * note.size;
                if (note._highlight) {
                    size *= (() => {
                        switch (note.type) {
                            case NoteType.Drag: return resourcePackage.dragHL.width / resourcePackage.drag.width;
                            case NoteType.Flick: return resourcePackage.flickHL.width / resourcePackage.flick.width;
                            default: return resourcePackage.tapHL.width / resourcePackage.tap.width;
                        }
                    })();
                }
                return size;
            })();
            const noteHeight = noteImage.height / noteImage.width * noteWidth;
            const noteX = note.positionX * (width / 1350) + left1 + width / 2;
            const noteY = _position(noteStartSeconds);
            ctx.drawImage(noteImage, noteX - noteWidth / 2, noteY - noteHeight / 2, noteWidth, noteHeight);
        }
    }
    ctx.fillStyle = "#eee";
    const eventWidth = width / 5 - 2 * eventSpace;
    function _drawEvents<T extends BaseEvent>(ctx: Ctx, events: T[], column: 0 | 1 | 2 | 3 | 4) {
        const boxes: Box<T>[] = [];
        for (const event of events) {
            const { startSeconds, endSeconds } = event.caculateSeconds(chart.BPMList);
            const eventStartY = _position(startSeconds);
            const eventEndY = _position(endSeconds);
            const eventHeight = eventStartY - eventEndY;
            ctx.fillRect(width * column / 5 + eventSpace + left2, eventStartY, eventWidth, eventHeight);
            boxes.push(new Box(eventStartY, eventEndY, width * column / 5 + eventSpace + left2, width * (column + 1) / 5 - eventSpace + left2, event));
        }
        return boxes;
    }
    const moveXEventBoxes = _drawEvents(ctx, selectedJudgeLine.eventLayers[ui.selectedEventLayer].moveXEvents, 0);
    const moveYEventBoxes = _drawEvents(ctx, selectedJudgeLine.eventLayers[ui.selectedEventLayer].moveYEvents, 1);
    const rotateEventBoxes = _drawEvents(ctx, selectedJudgeLine.eventLayers[ui.selectedEventLayer].rotateEvents, 2);
    const alphaEventBoxes = _drawEvents(ctx, selectedJudgeLine.eventLayers[ui.selectedEventLayer].alphaEvents, 3);
    const speedEventBoxes = _drawEvents(ctx, selectedJudgeLine.eventLayers[ui.selectedEventLayer].speedEvents, 4);
    return { noteBoxes, moveXEventBoxes, moveYEventBoxes, rotateEventBoxes, alphaEventBoxes, speedEventBoxes };
}