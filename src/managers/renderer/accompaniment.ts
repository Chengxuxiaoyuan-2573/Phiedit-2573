/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

/* eslint-disable no-magic-numbers */

import globalEventEmitter from "@/eventEmitter";
import { NoteType, NoteFake, NoteAbove, INote } from "@/models/note";
import { Beats, addBeats, isGreaterThanBeats, secondsToBeats } from "@/models/beats";
import store from "@/store";
import Manager from "./abstract";
import { createCatchErrorByMessage } from "@/tools/catchError";

/** 倒计时秒数（与向前预热秒数一致） */
const COUNTDOWN_SECONDS = 3;

/** 开始播放时向前预热的秒数（从当前位置前三秒开始） */
const LEAD_SECONDS = 3;

export default class AccompanimentManager extends Manager {
    private rafId: number | null = null;

    /** 点击开始时记录的「开始位置」（秒）：播放头到达此处才切到监听 */
    private startPosition = 0;

    /** 进行中的长按音符（Hold）：key(按键) → 已按下但未抬起的 note，抬起时回填 endTime */
    private activeHolds: Map<string, INote> = new Map();

    /** 监听音频原生 pause 事件：伴随创作中一旦暂停（含点击上方暂停按钮）即退出模式 */
    private audioPauseHandler: (() => void) | null = null;

    constructor() {
        super();
        globalEventEmitter.on("ACCOMPANIMENT_TOGGLE", createCatchErrorByMessage(() => {
            this.toggle();
        }, "切换伴随创作"));
        globalEventEmitter.on("ACCOMPANIMENT_STOP", createCatchErrorByMessage(() => {
            this.stop();
        }, "停止伴随创作"));
        globalEventEmitter.on("ACCOMPANIMENT_PLACE", createCatchErrorByMessage((type: NoteType, key: string) => {
            this.placeNote(type, key);
        }, "伴随创作放置音符"));
        globalEventEmitter.on("ACCOMPANIMENT_END_HOLD", createCatchErrorByMessage((key: string) => {
            this.endHold(key);
        }, "伴随创作结束长按"));
    }

    get enabled() {
        return store.useManager("stateManager").state.accompanimentMode;
    }

    get listening() {
        return store.useManager("stateManager").state.accompanimentListening;
    }

    toggle() {
        if (this.enabled) {
            this.stop();
        }
        else {
            this.start();
        }
    }

    start() {
        const stateManager = store.useManager("stateManager");

        // 记录点击时的「开始位置」，播放头到达此处才切到监听
        this.startPosition = store.getSeconds();

        // 倒带前三秒开始播放音乐，但先不监听
        const startSeconds = Math.max(0, this.startPosition - LEAD_SECONDS);
        store.setSeconds(startSeconds);
        store.playAudio();

        // 监听音频暂停：伴随创作激活期间点击上方暂停（或任何导致音乐暂停的方式）即退出模式
        this.attachAudioPauseListener();

        // 通过响应式代理 state 写值，确保 Vue 模板（按钮/覆盖层）会更新
        stateManager.state.accompanimentMode = true;
        stateManager.state.accompanimentListening = false;
        stateManager.state.accompanimentCountdown = COUNTDOWN_SECONDS;

        this.beginWatch();
    }

    /**
     * 每帧检查播放头位置：距离开始位置还有多少秒就显示 3→2→1，
     * 播放头恰好到达开始位置时切到监听。相比固定墙钟计时，能严格对齐音乐进度。
     */
    private beginWatch() {
        this.clearRaf();
        const tick = () => {
            const stateManager = store.useManager("stateManager");
            if (!stateManager.state.accompanimentMode) {
                return;
            }

            const remaining = this.startPosition - store.getSeconds();
            if (remaining > 0) {
                stateManager.state.accompanimentCountdown =
                    Math.min(COUNTDOWN_SECONDS, Math.max(1, Math.ceil(remaining)));
                stateManager.state.accompanimentListening = false;
                this.rafId = window.requestAnimationFrame(tick);
            }
            else {
                stateManager.state.accompanimentCountdown = null;
                stateManager.state.accompanimentListening = true;
                this.clearRaf();
            }
        };
        this.rafId = window.requestAnimationFrame(tick);
    }

    private clearRaf() {
        if (this.rafId !== null) {
            window.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** 绑定音频原生 pause 事件：暂停即视为退出伴随创作模式（音频已暂停，方向天然正确，且不受事件处理顺序影响） */
    private attachAudioPauseListener() {
        if (this.audioPauseHandler) {
            return;
        }

        try {
            const audio = store.useAudio();
            this.audioPauseHandler = createCatchErrorByMessage(() => {
                const stateManager = store.useManager("stateManager");
                if (stateManager.state.accompanimentMode && audio.paused) {
                    this.stop();
                }
            }, "伴随创作随暂停退出");
            audio.addEventListener("pause", this.audioPauseHandler);
        }
        catch {
            this.audioPauseHandler = null;
        }
    }

    /** 解除音频 pause 监听，避免 stop() 自身 pauseAudio() 再次触发退出逻辑 */
    private detachAudioPauseListener() {
        if (this.audioPauseHandler) {
            try {
                store.useAudio().removeEventListener("pause", this.audioPauseHandler);
            }
            catch {
                // 音频已不可用，忽略
            }
            this.audioPauseHandler = null;
        }
    }

    /**
     * 取「延迟校正后」的当前拍值。
     *
     * 用户听到的声音比播放头落后 accompanimentLatency 秒（音频输出延迟），
     * 因此他**听到鼓点时**按下的那一刻，getSeconds() 已经比真正的节拍时间**超前**了这么多。
     * 写谱时把时间往前挪同样的秒数，正好抵消这个系统性偏移，让音符落回用户意图的节拍上。
     * 未校准（0）时退化为原行为。
     */
    private getLatencyAdjustedBeatsValue(): number {
        const latency = store.useManager("settingsManager").settings.accompanimentLatency;
        if (!latency) {
            return store.getCurrentBeatsValue();
        }

        const chart = store.useChart();
        const seconds = Math.max(0, store.getSeconds() - latency);
        return secondsToBeats(chart.BPMList, seconds);
    }

    /** 把当前播放位置的拍数吸附到最近的横网格格点 */
    private snapBeatsToGrid(beatsValue: number): Beats {
        const stateManager = store.useManager("stateManager");
        const intPart = Math.floor(beatsValue);
        const decimal = beatsValue - intPart;
        const fenzi = Math.round(decimal * stateManager.state.horizonalLineCount);
        const fenmu = stateManager.state.horizonalLineCount;
        return [intPart, fenzi, fenmu];
    }

    placeNote(type: NoteType, key: string) {
        const stateManager = store.useManager("stateManager");
        if (!stateManager.state.accompanimentMode || !stateManager.state.accompanimentListening) {
            return;
        }

        const coordinateManager = store.useManager("coordinateManager");
        const mouseManager = store.useManager("mouseManager");
        const historyManager = store.useManager("historyManager");

        const snappedBeats = this.snapBeatsToGrid(this.getLatencyAdjustedBeatsValue());

        // 横向位置：跟随鼠标并吸附到竖线，未悬停画布时落在中线
        const positionX = mouseManager.isHovering ?
            coordinateManager.attatchX(mouseManager.mouseX) :
            0;

        // Hold 类型：按下键作为「开始」，先建一个端点重合的占位音符，
        // 待抬起键（ACCOMPANIMENT_END_HOLD）时再回填 endTime。
        // 同一按键按住期间的系统自动重复 keydown 直接忽略，避免叠出多个长按。
        if (type === NoteType.Hold) {
            if (this.activeHolds.has(key)) {
                return;
            }

            const addedNote = store.addNote({
                startTime: [...snappedBeats],
                endTime: [...snappedBeats],
                positionX,
                type,
                speed: 1,
                alpha: 255,
                size: 1,
                visibleTime: 999999,
                yOffset: 0,
                isFake: NoteFake.Real,
                above: NoteAbove.Above,
                judgeArea: 1,
            }, stateManager.state.currentJudgeLineNumber);
            this.activeHolds.set(key, addedNote);
            historyManager.recordAddNote(addedNote.id);
            return;
        }

        // 其余类型：按下即放置，endTime 与 startTime 一致（瞬时音符）
        const addedNote = store.addNote({
            startTime: [...snappedBeats],
            endTime: [...snappedBeats],
            positionX,
            type,
            speed: 1,
            alpha: 255,
            size: 1,
            visibleTime: 999999,
            yOffset: 0,
            isFake: NoteFake.Real,
            above: NoteAbove.Above,
            judgeArea: 1,
        }, stateManager.state.currentJudgeLineNumber);
        historyManager.recordAddNote(addedNote.id);
    }

    /**
     * 抬起键时结束对应的长按音符：以当前播放位置（吸附格点）作为 endTime。
     * 若抬起过早（endTime 不晚于 startTime），则兜底给一个最小格点长度，避免退化成 0 长音符。
     * 仅对 Hold 类型有意义；其余类型按键无进行中的长按，自然被忽略。
     */
    endHold(key: string) {
        const stateManager = store.useManager("stateManager");
        const note = this.activeHolds.get(key);
        if (!note) {
            return;
        }
        this.activeHolds.delete(key);

        // 已退出监听（如中途 ESC）：不再回填，交由 stop() 收尾
        if (!stateManager.state.accompanimentListening) {
            return;
        }

        const snappedEnd = this.snapBeatsToGrid(this.getLatencyAdjustedBeatsValue());
        const fenmu = stateManager.state.horizonalLineCount;
        const endTime = isGreaterThanBeats(snappedEnd, note.startTime as Beats) ?
            snappedEnd :
            addBeats(note.startTime as Beats, [0, 1, fenmu]);
        note.endTime = [...endTime];
    }

    stop() {
        const stateManager = store.useManager("stateManager");
        this.clearRaf();
        this.detachAudioPauseListener();

        // 收尾：若仍有按住未抬起的长按（如中途 ESC 退出），按当前播放位置结束之，避免残留 0 长音符
        for (const key of [...this.activeHolds.keys()]) {
            this.endHold(key);
        }

        // 通过响应式代理 state 写值
        stateManager.state.accompanimentMode = false;
        stateManager.state.accompanimentListening = false;
        stateManager.state.accompanimentCountdown = null;
        store.pauseAudio();
    }
}
