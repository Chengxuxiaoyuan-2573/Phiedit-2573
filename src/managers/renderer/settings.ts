/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { reactive } from "vue";
import Manager from "./abstract";
import { NotReadonly } from "@/tools/typeTools";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
export const defaultSettings = {
    hitSoundVolume: 1,
    musicVolume: 1,
    backgroundDarkness: 90,
    lineThickness: 5,
    lineLength: 4000,
    textSize: 50,
    noteSize: 175,
    wheelSpeed: 0.2,
    showJudgeLineNumber: true,
    markCurrentJudgeLine: true,
    autoCheckErrors: false,
    autoHighlight: true,
    unlimitFps: false,
    renderTimeStart: 0,
    renderTimeEnd: 0,
    renderFPS: 60
};

/**
 * 这些设置与当前谱面的音乐有关，不能跨谱面继承，
 * 否则打开新谱面时会沿用上一个谱面的值。
 */
const chartRelatedSettingKeys = ["renderTimeStart", "renderTimeEnd"];

export default class SettingsManager extends Manager {
    _settings: NotReadonly<typeof defaultSettings> = { ...defaultSettings };
    settings = reactive(this._settings);
    constructor() {
        super();
        this.loadSettings();
        globalEventEmitter.on("SAVE_SETTINGS", createCatchErrorByMessage(() => {
            this.saveSettings();
            return "修改设置成功";
        }));
    }
    private loadSettings() {
        window.electronAPI
            .loadSettings()
            .then((settings) => {
                if (settings) {
                    for (const key in settings) {
                        if (chartRelatedSettingKeys.includes(key)) continue;
                        if (key in this.settings) {
                            this.settings[key as keyof typeof this.settings] = settings[key as keyof typeof settings];
                        }
                    }
                }

                // 无论设置是否读取成功，都要通知外部设置已经加载完毕
                globalEventEmitter.emit("SETTINGS_LOADED");
            })
            .catch((error) => {
                console.error("读取设置失败", error);
                globalEventEmitter.emit("SETTINGS_LOADED");
            });
    }
    setToDefault() {
        for (const key in defaultSettings) {
            this.settings[key as keyof typeof this.settings] = defaultSettings[key as keyof typeof defaultSettings] as never;
        }
    }
    saveSettings() {
        const settingsManager = store.useManager("settingsManager");
        window.electronAPI.saveSettings(settingsManager._settings);
    }
    setSettings(settings: Partial<typeof defaultSettings>) {
        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key as keyof typeof this.settings] = settings[key as keyof typeof settings] as never;
            }
        }
    }
}