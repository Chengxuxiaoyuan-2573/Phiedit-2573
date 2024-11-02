/* eslint-disable */
import { convertBeatsToSeconds, convertSecondsToBeatsValue } from "./tools";
import { Beats, ChartData, ChartPackage } from "./typeDefinitions";
const UiSettings = {
    notesEditor: {
        left: 25,
        right: 650,
        top: 50,
        bottom: 850,
        get width() {
            return this.right - this.left;
        },
        get height() {
            return this.bottom - this.top;
        }
    },
    eventsEditor: {
        left: 675,
        right: 1325,
        top: 50,
        bottom: 850,
        get width() {
            return this.right - this.left;
        },
        get height() {
            return this.bottom - this.top;
        }
    },
    lineWidth: 5,
    horzionalMainLineColor: "rgba(255, 255, 255, 0.5)",
    horzionalLineColor: "rgba(255, 255, 255, 0.2)",
    verticalMainLineColor: "rgba(255, 255, 255, 0.5)",
    verticalLineColor: "rgba(255, 255, 255, 0.2)",
    judgeLineColor: "#ee0",
    backgroundColor: "#222"
}
export default function renderEditorUI(canvas: HTMLCanvasElement, chartData: ChartData, seconds: number, UiState: {
    viewSize: number
    selectedJudgeLine: number
    horzionalLines: number
    verticalLines: number
}) {
    const { chartPackage } = chartData;
    const { chart } = chartPackage;
    seconds -= chart.META.offset / 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = UiSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = UiSettings.lineWidth;
    const bottomSeconds = seconds - UiState.viewSize / 2;
    const topSeconds = seconds + UiState.viewSize / 2;
    const bottomBeats = convertSecondsToBeatsValue(chart.BPMList, bottomSeconds);
    const topBeats = convertSecondsToBeatsValue(chart.BPMList, topSeconds);

    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < UiState.horzionalLines; j++) {
            if (j == 0) {
                ctx.strokeStyle = UiSettings.horzionalMainLineColor;
            }
            else {
                ctx.strokeStyle = UiSettings.horzionalLineColor;
            }
            const beats: Beats = [i, j, UiState.horzionalLines];
            const seconds = convertBeatsToSeconds(chart.BPMList, beats);
            const position = UiSettings.notesEditor.bottom - (seconds - bottomSeconds) / UiState.viewSize * UiSettings.notesEditor.height;
            ctx.beginPath();
            ctx.moveTo(UiSettings.notesEditor.left, position);
            ctx.lineTo(UiSettings.notesEditor.right, position);
            ctx.stroke();
        }
    }
    for (let i = Math.floor(bottomBeats); i <= Math.ceil(topBeats); i++) {
        for (let j = 0; j < UiState.horzionalLines; j++) {
            if (j == 0) {
                ctx.strokeStyle = UiSettings.horzionalMainLineColor;
            }
            else {
                ctx.strokeStyle = UiSettings.horzionalLineColor;
            }
            const beats: Beats = [i, j, UiState.horzionalLines];
            const seconds = convertBeatsToSeconds(chart.BPMList, beats);
            const position = UiSettings.eventsEditor.bottom - (seconds - bottomSeconds) / UiState.viewSize * UiSettings.eventsEditor.height;
            ctx.beginPath();
            ctx.moveTo(UiSettings.eventsEditor.left, position);
            ctx.lineTo(UiSettings.eventsEditor.right, position);
            ctx.stroke();
        }
    }
    ctx.strokeStyle = UiSettings.judgeLineColor;
    ctx.beginPath();
    ctx.moveTo(UiSettings.notesEditor.left, UiSettings.notesEditor.top + UiSettings.notesEditor.height / 2);
    ctx.lineTo(UiSettings.notesEditor.right, UiSettings.notesEditor.top + UiSettings.notesEditor.height / 2);
    ctx.strokeRect(UiSettings.notesEditor.left, UiSettings.notesEditor.top, UiSettings.notesEditor.width, UiSettings.notesEditor.height);
    ctx.moveTo(UiSettings.eventsEditor.left, UiSettings.eventsEditor.top + UiSettings.eventsEditor.height / 2);
    ctx.lineTo(UiSettings.eventsEditor.right, UiSettings.eventsEditor.top + UiSettings.eventsEditor.height / 2);
    ctx.strokeRect(UiSettings.eventsEditor.left, UiSettings.eventsEditor.top, UiSettings.eventsEditor.width, UiSettings.eventsEditor.height);
    ctx.stroke();
    //const selectedJudgeLine = chart.judgeLineList[UiState.selectedJudgeLine];

}