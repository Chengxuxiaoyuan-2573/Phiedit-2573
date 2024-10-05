import JSZip from 'jszip';
import { BPM, Chart, BaseEventLayer, JudgeLine, Note, NoteType, BaseEvent, EasingType } from './typeDefinitions';
export default function readZipFile(file: File) {
    return new Promise<{ songBlob: Blob, backgroundBlob: Blob, chartString: string }>((resolve) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async function () {
            const result = reader.result;
            if (!result) {
                throw new Error("Empty result")
            }
            const zip = await JSZip.loadAsync(result);
            const infoFile = zip.file("info.txt");
            if (!infoFile) {
                throw new Error("Missing info.txt file");
            }
            const info = await infoFile.async('text');
            const lines = info.split(/[\r\n]+/g);
            let songName: string | undefined = undefined, backgroundName: string | undefined = undefined, chartName: string | undefined = undefined;
            lines.forEach((line) => {
                const kv = line.split(":");
                if (kv.length <= 1) return;
                const key = kv[0].trim().toLowerCase();
                const value = kv[1].trim();
                if (key == "song") {
                    songName = value;
                }
                if (key == "picture") {
                    backgroundName = value;
                }
                if (key == "chart") {
                    chartName = value;
                }
            })
            if (!songName) {
                throw new Error("Missing song name")
            }
            if (!backgroundName) {
                throw new Error("Missing picture name")
            }
            if (!chartName) {
                throw new Error("Missing chart name")
            }
            const songFile = zip.file(songName);
            const backgroundFile = zip.file(backgroundName);
            const chartFile = zip.file(chartName);
            if (!songFile) {
                throw new Error("Missing song file")
            }
            if (!backgroundFile) {
                throw new Error("Missing background file")
            }
            if (!chartFile) {
                throw new Error("Missing chart file")
            }
            Promise.all([
                songFile.async('blob'),
                backgroundFile.async('blob'),
                chartFile.async('text')
            ]).then(([songBlob, backgroundBlob, chartString]) => {
                resolve({ songBlob, backgroundBlob, chartString });
            });
        }
    })
}
function isNumber(value: unknown): value is number {
    return typeof value === "number"
}
function isString(value: unknown): value is string {
    return typeof value === "string"
}
// eslint-disable-next-line
export function formatChart(chart: any): Chart {
    const formatedChart: Chart = {
        BPMList: [],
        META: {
            name: "Unknown",
            level: "SP Lv.?",
            offset: 0,
            charter: "Unknown",
            composer: "Unknown",
            illustrator: "Unknown"
        },
        judgeLineGroup: [],
        judgeLineList: []
    };
    if (Array.isArray(chart?.BPMList)) {
        for (const bpm of chart.BPMList) {
            const formatedBPM: BPM = {
                bpm: 120,
                startTime: [0, 0, 1]
            };
            if (isNumber(bpm?.bpm))
                formatedBPM.bpm = bpm.bpm;
            if (Array.isArray(bpm?.startTime) && bpm?.startTime?.length == 3)
                formatedBPM.startTime = bpm.startTime;
            formatedChart.BPMList.push(formatedBPM);
        }
    }
    if (typeof chart?.META == "object") {
        if (isString(chart?.META.name)) formatedChart.META.name = chart.META.name;
        if (isString(chart?.META.level)) formatedChart.META.level = chart.META.level;
        if (isNumber(chart?.META.offset)) formatedChart.META.offset = chart.META.offset;
        if (isString(chart?.META.charter)) formatedChart.META.charter = chart.META.charter;
        if (isString(chart?.META.composer)) formatedChart.META.composer = chart.META.composer;
        if (isString(chart?.META.illustrator)) formatedChart.META.illustrator = chart.META.illustrator;
    }
    if (Array.isArray(chart?.judgeLineGroup)) {
        for (const group of chart.judgeLineGroup) {
            let formatedGroup = "Default";
            if (isString(group)) {
                formatedGroup = group;
            }
            formatedChart.judgeLineGroup.push(formatedGroup);
        }
    }
    if (Array.isArray(chart?.judgeLineList)) {
        for (const judgeLine of chart.judgeLineList) {
            const formatedJudgeLine: JudgeLine = {
                Group: 0,
                Name: "Unnamed",
                eventLayers: [],
                notes: [],
                father: -1,
                zOrder: 0
            };
            if (isNumber(judgeLine?.Group) && judgeLine?.Group < chart?.judgeLineGroup?.length)
                formatedJudgeLine.Group = judgeLine.Group;
            if (isString(judgeLine?.Name))
                formatedJudgeLine.Name = judgeLine.Name;
            if (Array.isArray(judgeLine?.eventLayers)) {
                for (const eventLayer of judgeLine.eventLayers) {
                    const formatedEventLayer: BaseEventLayer = {
                        moveXEvents: [],
                        moveYEvents: [],
                        rotateEvents: [],
                        alphaEvents: [],
                        speedEvents: []
                    }
                    if (Array.isArray(eventLayer?.moveXEvents)) {
                        for (const event of eventLayer.moveXEvents) {
                            const formatedEvent: BaseEvent = {
                                bezier: 0,
                                bezierPoints: [0, 0, 1, 1],
                                easingLeft: 0,
                                easingRight: 1,
                                easingType: EasingType.Linear,
                                startTime: [0, 0, 1],
                                endTime: [1, 0, 1],
                                start: 0,
                                end: 0
                            };
                            if (event?.bezier == 0 || event?.bezier == 1)
                                formatedEvent.bezier = event.bezier;
                            if (Array.isArray(event?.bezierPoints) && event?.bezierPoints?.length == 4)
                                formatedEvent.bezierPoints = event.bezierPoints;
                            if (isNumber(event?.easingLeft) && isNumber(event?.easingRight)
                                && event?.easingLeft >= 0 && event?.easingRight <= 1 && event?.easingLeft < event?.easingRight) {
                                formatedEvent.easingLeft = event.easingLeft;
                                formatedEvent.easingRight = event.easingRight;
                            }
                            if (event?.easingType >= 1 && event?.easingType <= 29 && Number.isInteger(event?.easingType))
                                formatedEvent.easingType = event.easingType;
                            if (Array.isArray(event?.startTime) && event?.startTime?.length == 3)
                                formatedEvent.startTime = event.startTime;
                            if (Array.isArray(event?.endTime) && event?.endTime?.length == 3)
                                formatedEvent.endTime = event.endTime;
                            if (isNumber(event?.start))
                                formatedEvent.start = event.start;
                            if (isNumber(event?.end))
                                formatedEvent.end = event.end;
                            formatedEventLayer.moveXEvents.push(formatedEvent);
                        }
                    }
                    if (Array.isArray(eventLayer?.moveYEvents)) {
                        for (const event of eventLayer.moveYEvents) {
                            const formatedEvent: BaseEvent = {
                                bezier: 0,
                                bezierPoints: [0, 0, 1, 1],
                                easingLeft: 0,
                                easingRight: 1,
                                easingType: EasingType.Linear,
                                startTime: [0, 0, 1],
                                endTime: [1, 0, 1],
                                start: 0,
                                end: 0
                            };
                            if (event?.bezier == 0 || event?.bezier == 1)
                                formatedEvent.bezier = event.bezier;
                            if (Array.isArray(event?.bezierPoints) && event?.bezierPoints?.length == 4)
                                formatedEvent.bezierPoints = event.bezierPoints;
                            if (isNumber(event?.easingLeft) && isNumber(event?.easingRight)
                                && event?.easingLeft >= 0 && event?.easingRight <= 1 && event?.easingLeft < event?.easingRight) {
                                formatedEvent.easingLeft = event.easingLeft;
                                formatedEvent.easingRight = event.easingRight;
                            }
                            if (event?.easingType >= 1 && event?.easingType <= 29 && Number.isInteger(event?.easingType))
                                formatedEvent.easingType = event?.easingType;
                            if (Array.isArray(event?.startTime) && event?.startTime?.length == 3)
                                formatedEvent.startTime = event?.startTime;
                            if (Array.isArray(event?.endTime) && event?.endTime?.length == 3)
                                formatedEvent.endTime = event?.endTime;
                            if (isNumber(event?.start))
                                formatedEvent.start = event?.start;
                            if (isNumber(event?.end))
                                formatedEvent.end = event?.end;
                            formatedEventLayer.moveYEvents?.push(formatedEvent);
                        }
                    }
                    if (Array.isArray(eventLayer?.rotateEvents)) {
                        for (const event of eventLayer.rotateEvents) {
                            const formatedEvent: BaseEvent = {
                                bezier: 0,
                                bezierPoints: [0, 0, 1, 1],
                                easingLeft: 0,
                                easingRight: 1,
                                easingType: EasingType.Linear,
                                startTime: [0, 0, 1],
                                endTime: [1, 0, 1],
                                start: 0,
                                end: 0
                            };
                            if (event?.bezier == 0 || event?.bezier == 1)
                                formatedEvent.bezier = event?.bezier;
                            if (Array.isArray(event?.bezierPoints) && event?.bezierPoints?.length == 4)
                                formatedEvent.bezierPoints = event?.bezierPoints;
                            if (isNumber(event?.easingLeft) && isNumber(event?.easingRight)
                                && event?.easingLeft >= 0 && event?.easingRight <= 1 && event?.easingLeft < event?.easingRight) {
                                formatedEvent.easingLeft = event?.easingLeft;
                                formatedEvent.easingRight = event?.easingRight;
                            }
                            if (event?.easingType >= 1 && event?.easingType <= 29 && Number.isInteger(event?.easingType))
                                formatedEvent.easingType = event?.easingType;
                            if (Array.isArray(event?.startTime) && event?.startTime?.length == 3)
                                formatedEvent.startTime = event?.startTime;
                            if (Array.isArray(event?.endTime) && event?.endTime?.length == 3)
                                formatedEvent.endTime = event?.endTime;
                            if (isNumber(event?.start))
                                formatedEvent.start = event?.start;
                            if (isNumber(event?.end))
                                formatedEvent.end = event?.end;
                            formatedEventLayer.rotateEvents?.push(formatedEvent);
                        }
                    }
                    if (Array.isArray(eventLayer?.alphaEvents)) {
                        for (const event of eventLayer.alphaEvents) {
                            const formatedEvent: BaseEvent = {
                                bezier: 0,
                                bezierPoints: [0, 0, 1, 1],
                                easingLeft: 0,
                                easingRight: 1,
                                easingType: EasingType.Linear,
                                startTime: [0, 0, 1],
                                endTime: [1, 0, 1],
                                start: 0,
                                end: 0
                            };
                            if (event?.bezier == 0 || event?.bezier == 1)
                                formatedEvent.bezier = event?.bezier;
                            if (Array.isArray(event?.bezierPoints) && event?.bezierPoints?.length == 4)
                                formatedEvent.bezierPoints = event?.bezierPoints;
                            if (isNumber(event?.easingLeft) && isNumber(event?.easingRight)
                                && event?.easingLeft >= 0 && event?.easingRight <= 1 && event?.easingLeft < event?.easingRight) {
                                formatedEvent.easingLeft = event?.easingLeft;
                                formatedEvent.easingRight = event?.easingRight;
                            }
                            if (event?.easingType >= 1 && event?.easingType <= 29 && Number.isInteger(event?.easingType))
                                formatedEvent.easingType = event?.easingType;
                            if (Array.isArray(event?.startTime) && event?.startTime?.length == 3)
                                formatedEvent.startTime = event?.startTime;
                            if (Array.isArray(event?.endTime) && event?.endTime?.length == 3)
                                formatedEvent.endTime = event?.endTime;
                            if (isNumber(event?.start) && event?.start <= 255)
                                formatedEvent.start = event?.start;
                            if (isNumber(event?.end) && event?.end <= 255)
                                formatedEvent.end = event?.end;
                            formatedEventLayer.alphaEvents?.push(formatedEvent);
                        }
                    }
                    if (Array.isArray(eventLayer?.speedEvents)) {
                        for (const event of eventLayer.speedEvents) {
                            const formatedEvent: BaseEvent = {
                                bezier: 0,
                                bezierPoints: [0, 0, 1, 1],
                                easingLeft: 0,
                                easingRight: 1,
                                easingType: EasingType.Linear,
                                startTime: [0, 0, 1],
                                endTime: [1, 0, 1],
                                start: 0,
                                end: 0
                            };
                            if (event?.bezier == 0 || event?.bezier == 1)
                                formatedEvent.bezier = event?.bezier;
                            if (Array.isArray(event?.bezierPoints) && event?.bezierPoints?.length == 4)
                                formatedEvent.bezierPoints = event?.bezierPoints;
                            if (isNumber(event?.easingLeft) && isNumber(event?.easingRight)
                                && event?.easingLeft >= 0 && event?.easingRight <= 1 && event?.easingLeft < event?.easingRight) {
                                formatedEvent.easingLeft = event?.easingLeft;
                                formatedEvent.easingRight = event?.easingRight;
                            }
                            if (event?.easingType >= 1 && event?.easingType <= 29 && Number.isInteger(event?.easingType))
                                formatedEvent.easingType = event?.easingType;
                            if (Array.isArray(event?.startTime) && event?.startTime?.length == 3)
                                formatedEvent.startTime = event?.startTime;
                            if (Array.isArray(event?.endTime) && event?.endTime?.length == 3)
                                formatedEvent.endTime = event?.endTime;
                            if (isNumber(event?.start))
                                formatedEvent.start = event?.start;
                            if (isNumber(event?.end))
                                formatedEvent.end = event?.end;
                            formatedEventLayer.speedEvents?.push(formatedEvent);
                        }
                    }
                    formatedJudgeLine.eventLayers?.push(formatedEventLayer);
                }
            }
            if (Array.isArray(judgeLine?.notes)) {
                for (const note of judgeLine.notes) {
                    const formatedNote: Note = {
                        above: 1,
                        alpha: 255,
                        startTime: [0, 0, 1],
                        endTime: [0, 0, 1],
                        type: NoteType.Tap,
                        isFake: 0,
                        positionX: 0,
                        size: 1,
                        speed: 1,
                        yOffset: 0,
                        visibleTime: 999999.99
                    }
                    if (note?.above == 0 || note?.above == 1)
                        formatedNote.above = note?.above;
                    if (isNumber(note?.alpha) && note?.alpha >= 0 && note?.alpha <= 255)
                        formatedNote.alpha = note?.alpha;
                    if (Array.isArray(note?.startTime) && note?.startTime?.length == 3)
                        formatedNote.startTime = note?.startTime;
                    if (Array.isArray(note?.endTime) && note?.endTime?.length == 3)
                        formatedNote.endTime = note?.endTime;
                    if (note?.type >= 1 && note?.type <= 4 && Number.isInteger(note?.type))
                        formatedNote.type = note?.type;
                    if (note?.isFake == 0 || note?.isFake == 1)
                        formatedNote.isFake = note?.isFake;
                    if (isNumber(note?.positionX))
                        formatedNote.positionX = note?.positionX;
                    if (isNumber(note?.size))
                        formatedNote.size = note?.size;
                    if (isNumber(note?.speed))
                        formatedNote.speed = note?.speed;
                    if (isNumber(note?.yOffset))
                        formatedNote.yOffset = note?.yOffset;
                    if (isNumber(note?.visibleTime))
                        formatedNote.visibleTime = note?.visibleTime;
                    formatedJudgeLine.notes?.push(note);
                }
            }
            if (isNumber(judgeLine?.father) && judgeLine?.father < chart?.judgeLineList?.length)
                formatedJudgeLine.father = judgeLine.father;
            if (isNumber(judgeLine?.zOrder))
                formatedJudgeLine.zOrder = judgeLine.zOrder;
            formatedChart.judgeLineList?.push(formatedJudgeLine);
        }
    }
    return formatedChart;
}