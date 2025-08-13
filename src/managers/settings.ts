import { reactive } from "vue";
import Manager from "./abstract";
const defaultSettings = {
    backgroundDarkness: 90,
    lineWidth: 5,
    lineLength: 2000,
    textSize: 50,
    noteSize: 175,
    wheelSpeed: 1,
    autoplayOffset: 0
}
export default class SettingsManager extends Manager {
    _settings = {
        backgroundDarkness: defaultSettings.backgroundDarkness,
        lineWidth: defaultSettings.lineWidth,
        lineLength: defaultSettings.lineLength,
        textSize: defaultSettings.textSize,
        noteSize: defaultSettings.noteSize,
        wheelSpeed: defaultSettings.wheelSpeed,
        autoplayOffset: defaultSettings.autoplayOffset
    };
    settings = reactive(this._settings)
    setToDefault() {
        for (const key in defaultSettings) {
            this.settings[key as keyof typeof defaultSettings] = defaultSettings[key as keyof typeof defaultSettings];
        }
    }
}