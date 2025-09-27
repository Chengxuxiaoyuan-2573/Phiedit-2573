import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import ChartError from "@/models/error";
import store from "@/store";
import { isNoteLike, Note, NoteType } from "@/models/note";
import { addBeats, isEqualBeats, isGreaterThanBeats, isGreaterThanOrEqualBeats, isLessThanBeats, isLessThanOrEqualBeats } from "@/models/beats";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/eventLayer";
import Constants from "@/constants";
import { SEC_TO_MS } from "@/tools/mathUtils";
import { isEventLike } from "@/models/event";

export default class ErrorManager extends Manager {
    errors: ChartError[] = [];
    constructor() {
        super();
        globalEventEmitter.on("CHECK_ERRORS", () => {
            this.checkErrors();
        });
        globalEventEmitter.on("AUTO_FIX_ERRORS", () => {
            this.autoFix();
        });
        globalEventEmitter.on("HISTORY_UPDATE", () => {
            const settingsManager = store.useManager("settingsManager");
            if (settingsManager._settings.autoCheckErrors) {
                this.checkErrors();
            }
        });
    }
    private checkChartReadErrors() {
        // 获取谱面压缩包的所有错误
        const chartPackage = store.useChartPackage();
        for (let i = 0; i < chartPackage.errors.length; i++) {
            if (i >= 100) {
                return;
            }

            const error = chartPackage.errors[i];
            this.errors.push(error);
        }
    }
    private checkChartEditErrors() {
        const chart = store.useChart();
        const audio = store.useAudio();
        const settingsManager = store.useManager("settingsManager");
        for (let i = 0; i < chart.judgeLineList.length; i++) {
            const judgeLine = chart.judgeLineList[i];
            const notes = judgeLine.notes;
            const taps = [], drags = [], holds = [], flicks = [];
            for (let j = 0; j < notes.length; j++) {
                const note = notes[j];
                switch (note.type) {
                    case NoteType.Tap:
                        taps.push(note);
                        break;
                    case NoteType.Drag:
                        drags.push(note);
                        break;
                    case NoteType.Hold:
                        holds.push(note);
                        break;
                    case NoteType.Flick:
                        flicks.push(note);
                        break;
                }
            }

            // 检查Hold有没有结束时间小于等于起始时间的
            for (const hold of holds) {
                if (isLessThanOrEqualBeats(hold.endTime, hold.startTime)) {
                    this.errors.push(new ChartError(
                        `Hold 音符时间有误，结束时间应大于起始时间`,
                        "ChartEditError.InvalidHoldTime",
                        "error",
                        hold
                    ));
                }
            }

            for (const note of notes) {
                // 检查非Hold音符有没有结束时间不等于起始时间的
                if (note.type !== NoteType.Hold && !isEqualBeats(note.endTime, note.startTime)) {
                    this.errors.push(new ChartError(
                        `${NoteType[note.type]} 音符时间有误，结束时间应等于起始时间`,
                        "ChartEditError.InvalidNonHoldTime",
                        "error",
                        note
                    ));
                }

                // 检查音符有没有超出时间范围的
                if (note.cachedEndSeconds + chart.META.offset / SEC_TO_MS < 0) {
                    this.errors.push(new ChartError(
                        `音符时间超出范围，位于音乐开始之前`,
                        "ChartEditError.NoteOutOfRange",
                        "error",
                        note
                    ));
                }

                if (note.cachedStartSeconds + chart.META.offset / SEC_TO_MS > audio.duration) {
                    this.errors.push(new ChartError(
                        `音符时间超出范围，位于音乐结束之后`,
                        "ChartEditError.NoteOutOfRange",
                        "error",
                        note
                    ));
                }
            }

            // Check for overlapping Tap notes
            for (let i = 0; i < taps.length; i++) {
                for (let j = i + 1; j < taps.length; j++) {
                    const tap1 = taps[i];
                    const tap2 = taps[j];

                    if (isEqualBeats(tap1.startTime, tap2.startTime) &&
                        !tap1.isFake && !tap2.isFake && tap1.above === tap2.above &&
                        Math.abs(tap1.positionX - tap2.positionX) < settingsManager._settings.noteSize) {
                        this.errors.push(new ChartError(
                            `两个 Tap 音符重叠`,
                            "ChartEditError.TapsOverlapped",
                            "warning",
                            tap1,
                            tap2
                        ));
                    }
                }
            }

            // Check for overlapping Tap and Hold notes
            for (const tap of taps) {
                for (const hold of holds) {
                    if (isGreaterThanOrEqualBeats(tap.startTime, hold.startTime) &&
                        isLessThanOrEqualBeats(tap.startTime, hold.endTime) &&
                        !tap.isFake && !hold.isFake && tap.above === hold.above &&
                        Math.abs(tap.positionX - hold.positionX) < settingsManager._settings.noteSize) {
                        this.errors.push(new ChartError(
                            `Tap 音符和 Hold 音符重叠`,
                            "ChartEditError.TapAndHoldOverlapped",
                            "warning",
                            tap,
                            hold
                        ));
                    }
                }
            }

            // Check for overlapping Hold notes
            for (let i = 0; i < holds.length; i++) {
                for (let j = i + 1; j < holds.length; j++) {
                    const hold1 = holds[i];
                    const hold2 = holds[j];

                    if (isGreaterThanOrEqualBeats(hold1.endTime, hold2.startTime) &&
                        isLessThanOrEqualBeats(hold1.startTime, hold2.endTime) &&
                        !hold1.isFake && !hold2.isFake && hold1.above === hold2.above &&
                        Math.abs(hold1.positionX - hold2.positionX) < settingsManager._settings.noteSize) {
                        this.errors.push(new ChartError(
                            `两个 Hold 音符重叠`,
                            "ChartEditError.HoldsOverlapped",
                            "warning",
                            hold1,
                            hold2
                        ));
                    }
                }
            }

            for (let i = 0; i < taps.length; i++) {
                const tap = taps[i];
                for (let j = 0; j < drags.length; j++) {
                    const drag = drags[j];
                    if (Math.abs(tap.positionX - drag.positionX) < settingsManager._settings.noteSize &&
                        tap.cachedStartSeconds - drag.cachedStartSeconds > 0 &&
                        tap.cachedStartSeconds - drag.cachedStartSeconds < Constants.ERROR_DRAG_TAP_THRESHOLD) {
                        this.errors.push(new ChartError(
                            `Drag 接 Tap，可能会影响手感`,
                            "ChartEditError.TapAfterDrag",
                            "warning",
                            drag,
                            tap
                        ));
                    }
                }

                for (let j = 0; j < flicks.length; j++) {
                    const flick = flicks[j];
                    if (Math.abs(tap.positionX - flick.positionX) < settingsManager._settings.noteSize &&
                        tap.cachedStartSeconds - flick.cachedStartSeconds > 0 &&
                        tap.cachedStartSeconds - flick.cachedStartSeconds < Constants.ERROR_FLICK_TAP_THRESHOLD) {
                        this.errors.push(new ChartError(
                            `Flick 接 Tap，可能会影响手感`,
                            "ChartEditError.TapAfterFlick",
                            "warning",
                            flick,
                            tap
                        ));
                    }
                }
            }

            // 遍历事件
            for (const eventLayer of [...judgeLine.eventLayers, judgeLine.extended]) {
                const types = eventLayer instanceof BaseEventLayer ? baseEventTypes : extendedEventTypes;
                for (const type of types) {
                    const events = eventLayer.getEventsByType(type);

                    // 检测是否有两个事件重叠的
                    for (let i = 0; i < events.length; i++) {
                        for (let j = i + 1; j < events.length; j++) {
                            const event1 = events[i];
                            const event2 = events[j];
                            if (isGreaterThanBeats(event1.endTime, event2.startTime) &&
                                isLessThanBeats(event1.startTime, event2.endTime)) {
                                this.errors.push(new ChartError(
                                    `两个 ${event1.type} 事件重叠`,
                                    "ChartEditError.EventsOverlapped",
                                    "error",
                                    event1,
                                    event2
                                ));
                            }
                        }
                    }

                    for (let i = 0; i < events.length; i++) {
                        const event = events[i];

                        // 检测是否有结束时间小于等于开始时间的事件
                        if (isLessThanOrEqualBeats(event.endTime, event.startTime)) {
                            this.errors.push(new ChartError(
                                `事件时间有误，结束时间应大于开始时间`,
                                "ChartEditError.InvalidEventTime",
                                "error",
                                event
                            ));
                        }

                        if (event.type === "paint") {
                            this.errors.push(new ChartError(
                                `出现了本软件不支持的 paint 事件`,
                                "ChartEditError.NotSupported",
                                "info",
                                event
                            ));
                        }

                        if (event.cachedEndSeconds + chart.META.offset / SEC_TO_MS < 0) {
                            this.errors.push(new ChartError(
                                `事件时间超出范围，位于音乐开始之前`,
                                "ChartEditError.EventOutOfRange",
                                "error",
                                event
                            ));
                        }

                        if (event.cachedStartSeconds + chart.META.offset / SEC_TO_MS > audio.duration) {
                            this.errors.push(new ChartError(
                                `事件时间超出范围，位于音乐结束之后`,
                                "ChartEditError.EventOutOfRange",
                                "error",
                                event
                            ));
                        }

                        if (event.easingLeft >= event.easingRight) {
                            this.errors.push(new ChartError(
                                `事件缓动截取错误，左边界必须小于右边界`,
                                "ChartEditError.InvalidEasingLeftRight",
                                "error",
                                event
                            ));
                        }

                        if (event.isDisabled) {
                            this.errors.push(new ChartError(
                                `事件已禁用，请在导出谱面前删除该事件`,
                                "ChartEditError.EventDisabled",
                                "info",
                                event
                            ));
                        }
                    }
                }
            }
        }
    }
    checkErrors() {
        const stateManager = store.useManager("stateManager");
        this.errors.length = 0;
        switch (stateManager.cache.error.errorType) {
            case "ChartReadError":
                this.checkChartReadErrors();
                break;
            case "ChartEditError":
                this.checkChartEditErrors();
                break;
            case "All":
                this.checkChartReadErrors();
                this.checkChartEditErrors();
                break;
        }

        // 按照 error > warning > info 的顺序排序
        const errorLevel = {
            "error": 0,
            "warning": 1,
            "info": 2
        };
        this.errors.sort((a, b) => errorLevel[a.level] - errorLevel[b.level]);
    }
    autoFix() {
        const historyManager = store.useManager("historyManager");
        let fixedErrors = 0;
        this.errors.length = 0;
        this.checkChartEditErrors();
        this.checkChartReadErrors();
        for (let i = this.errors.length - 1; i >= 0; i--) {
            const error = this.errors[i];
            let isSucceeded = false;
            switch (error.code) {
                case "ChartEditError.NoteOutOfRange":
                    if (!(error.objects[0] instanceof Note)) {
                        break;
                    }

                    historyManager.recordRemoveNote(error.objects[0].toObject(), error.objects[0].judgeLineNumber, error.objects[0].id);
                    store.removeNote(error.objects[0].id);
                    isSucceeded = true;
                    break;

                case "ChartEditError.EventOutOfRange":
                    if (isNoteLike(error.objects[0])) {
                        break;
                    }

                    historyManager.recordRemoveEvent(error.objects[0].toObject(), error.objects[0].type, error.objects[0].eventLayerId, error.objects[0].judgeLineNumber, error.objects[0].id);
                    store.removeEvent(error.objects[0].id);
                    isSucceeded = true;
                    break;

                case "ChartEditError.InvalidEventTime":
                    if (isNoteLike(error.objects[0])) {
                        break;
                    }

                    // 强制把结束时间设为开始时间加1拍
                    error.objects[0].endTime = addBeats(error.objects[0].startTime, [1, 0, 1]);
                    isSucceeded = true;
                    break;

                case "ChartEditError.InvalidHoldTime":
                    if (isEventLike(error.objects[0])) {
                        break;
                    }

                    // 强制把结束时间设为开始时间加1拍
                    error.objects[0].endTime = addBeats(error.objects[0].startTime, [1, 0, 1]);
                    isSucceeded = true;
                    break;

                case "ChartEditError.InvalidNonHoldTime":
                    if (!(error.objects[0] instanceof Note)) {
                        break;
                    }

                    // 强制把结束时间设为开始时间
                    error.objects[0].endTime = [...error.objects[0].startTime];
                    isSucceeded = true;
                    break;
            }

            if (isSucceeded) {
                this.errors.splice(i, 1);
                fixedErrors++;
            }
        }
        globalEventEmitter.emit("ERRORS_FIXED", fixedErrors);
        this.checkErrors();
    }
}