/* eslint-disable */
import { beatsToSeconds, secondsToBeatsValue, drawLine } from "./tools";
import { Beats, ChartData, NoteType, UIState } from "./typeDefinitions";
const lineWidth = 5,
    horzionalMainLineColor = "rgba(255, 255, 255, 0.5)",
    horzionalLineColor = "rgba(255, 255, 255, 0.2)",
    verticalMainLineColor = "rgba(255, 255, 255, 0.5)",
    verticalLineColor = "rgba(255, 255, 255, 0.2)",
    judgeLineColor = "#ee0",
    backgroundColor = "#222",
    top = 50,
    bottom = 850,
    left1 = 25,
    right1 = 650,
    width = right1 - left1,
    left2 = 675,
    right2 = left2 + width,
    height = bottom - top;
export default function renderEditorUI(canvas: HTMLCanvasElement, chartData: ChartData, seconds: number, UiState: UIState) {
    const { chartPackage, resourcePackage } = chartData;
    const { chart } = chartPackage;
    seconds -= chart.META.offset / 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    const bottomSeconds = seconds - UiState.viewSize / 2;
    const topSeconds = seconds + UiState.viewSize / 2;
    const bottomBeats = secondsToBeatsValue(chart.BPMList, bottomSeconds);
    const topBeats = secondsToBeatsValue(chart.BPMList, topSeconds);
    function _position(seconds: number) {
        return 
    }
    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < UiState.horzionalLines; j++) {
            if (j == 0) {
                ctx.strokeStyle = horzionalMainLineColor;
            }
            else {
                ctx.strokeStyle = horzionalLineColor;
            }
            const beats: Beats = [i, j, UiState.horzionalLines];
            const seconds = beatsToSeconds(chart.BPMList, beats);
            const position = bottom - (seconds - bottomSeconds) / UiState.viewSize * height;
            ctx.beginPath();
            ctx.moveTo(left1, position);
            ctx.lineTo(right1, position);
            ctx.stroke();
        }
    }
    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < UiState.horzionalLines; j++) {
            if (j == 0) {
                ctx.strokeStyle = horzionalMainLineColor;
            }
            else {
                ctx.strokeStyle = horzionalLineColor;
            }
            const beats: Beats = [i, j, UiState.horzionalLines];
            const seconds = beatsToSeconds(chart.BPMList, beats);
            const position = bottom - (seconds - bottomSeconds) / UiState.viewSize * height;
            ctx.beginPath();
            ctx.moveTo(left2, position);
            ctx.lineTo(right2, position);
            ctx.stroke();
        }
    }
    ctx.strokeStyle = judgeLineColor;
    ctx.beginPath();
    drawLine(ctx, left1, top + height / 2, right1, top + height / 2);
    ctx.strokeRect(left1, top, width, height);
    drawLine(ctx, left2, top + height / 2, right2, top + height / 2);
    ctx.strokeRect(left2, top, width, height);
    ctx.stroke();
    const selectedJudgeLine = chart.judgeLineList[UiState.selectedJudgeLine];
    for (const note of selectedJudgeLine.notes) {
        const noteStartSeconds = note._startSeconds || (note._startSeconds = beatsToSeconds(chart.BPMList, note.startTime));
        if (note.type == NoteType.Hold) {
            const noteEndSeconds = note._endSeconds || (note._endSeconds = beatsToSeconds(chart.BPMList, note.endTime));

        }
        else {

        }

    }
}