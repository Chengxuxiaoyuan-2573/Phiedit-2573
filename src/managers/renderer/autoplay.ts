/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import store from "@/store";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";

export default class AutoplayManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("AUTOPLAY", () => {
            this.autoplay();
        });
    }
    autoplay() {
        let combo = 0;
        const chart = store.useChart();
        const resourcePackage = store.useResourcePackage();
        const settingsManager = store.useManager("settingsManager");
        const judgeManager = store.useManager("judgeManager");
        const seconds = store.getSeconds();
        const audio = store.useAudio();
        const audioIsPlaying = !audio.paused;

        // const offset = Math.random() * 360 - 180; // 随机偏移
        for (const judgeLine of chart.judgeLineList) {
            for (const note of judgeLine.notes) {
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;

                // 自动击打音符（autoplay）
                if (!note.isFake) {
                    if (seconds >= startSeconds) {
                        note.missed = false;
                        const hitted = note.hit(startSeconds);
                        if (hitted === "SUCCESS") {
                            // 为防止出现奇怪的打击音效，检查音频是否在播放中，只有播放中的时候才播放打击音效
                            if (audioIsPlaying) {
                                resourcePackage.playSound(store.audioContext, note.type, settingsManager._settings.hitSoundVolume);
                            }
                        }
                    }

                    if (seconds >= endSeconds) {
                        combo++;
                    }
                }
            }
        }
        judgeManager.judgeInfo.combo = combo;
    }
}