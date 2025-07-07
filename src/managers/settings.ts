import Manager from "./abstract";
const defaultSettings = {
    backgroundDarkness: 90,
    lineWidth: 5,
    lineLength: 2000,
    textSize: 50,
    chartSpeed: 120,
    noteSize: 175,
    wheelSpeed: 1
}
export default class SettingsManager extends Manager {
    backgroundDarkness = defaultSettings.backgroundDarkness
    lineWidth = defaultSettings.lineWidth
    lineLength = defaultSettings.lineLength
    textSize = defaultSettings.textSize
    chartSpeed = defaultSettings.chartSpeed
    noteSize = defaultSettings.noteSize
    wheelSpeed = defaultSettings.wheelSpeed
    setToDefault(){
        for(const key in defaultSettings){
            this[key as keyof typeof defaultSettings] = defaultSettings[key as keyof typeof defaultSettings];
        }
    }
}