import store from "@/store";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";
import Constants from "@/constants";

export default class AutoplayManager extends Manager {
    combo: number = 0;
    score: number = 0;
    constructor() {
        super();
        globalEventEmitter.on("AUTOPLAY", () => {
            this.autoplay();
        });
    }
    autoplay() {
        let combo = 0, perfect = 0, good = 0, realNotes = 0;
        const chart = store.useChart();
        const resourcePackage = store.useResourcePackage();
        const settingsManager = store.useManager("settingsManager");
        const seconds = store.getSeconds();
        const audio = store.useAudio();
        const audioIsPlaying = !audio.paused;

        // const offset = Math.random() * 360 - 180; // 随机偏移
        for (const judgeLine of chart.judgeLineList) {
            for (const note of judgeLine.notes) {
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;

                // 如果当前时间小于击打时间，说明用户在音符被击打以后把进度条往回拖动了，重新把该音符设置为未击打状态
                if (note.hitSeconds && seconds < note.hitSeconds) {
                    note.unhit();
                }

                // 自动击打音符（autoplay）
                if (seconds >= startSeconds) {
                    const hitted = note.hit(startSeconds);
                    if (hitted === "SUCCESS") {
                        // 为防止出现奇怪的打击音效，检查音频是否在播放中，只有播放中的时候才播放打击音效
                        if (audioIsPlaying) {
                            resourcePackage.playSound(store.audioContext, note.type, settingsManager._settings.hitSoundVolume);
                        }
                    }
                }

                if (!note.isFake) {
                    if (seconds >= endSeconds) {
                        combo++;
                        switch (note.getJudgement()) {
                            case "perfect":
                                perfect++;
                                break;
                            case "good":
                                good++;
                                break;
                        }
                    }
                    realNotes++;
                }
            }
        }
        this.combo = combo;
        this.score = (perfect + good * Constants.CHART_VIEW_GOOD_RATE) / realNotes * Constants.CHART_VIEW_PERFECT_SCORE;
    }
}