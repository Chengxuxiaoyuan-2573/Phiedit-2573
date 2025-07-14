import { contextBridge, ipcRenderer } from "electron";

const electronAPI: ElectronAPI = {
    loadChart: (chartPackagePath: string) => ipcRenderer.invoke("load-chart", chartPackagePath),
    addChart: (musicPath: string, backgroundPath: string, name: string) => ipcRenderer.invoke("add-chart", musicPath, backgroundPath, name),
    saveChart: (chartId: string, chartContent: string) => ipcRenderer.invoke("save-chart", chartId, chartContent),
    deleteChart: (chartId: string) => ipcRenderer.invoke("delete-chart", chartId),
    readChartList: () => ipcRenderer.invoke("read-chart-list"),
    readChart: (chartId: string) => ipcRenderer.invoke("read-chart", chartId),
    exportChart: (chartId: string, targetPath: string) => ipcRenderer.invoke("export-chart", chartId, targetPath),
    showSaveDialog: (name: string) => ipcRenderer.invoke("show-save-dialog", name),
    showOpenChartDialog: () => ipcRenderer.invoke("show-open-chart-dialog"),
    showOpenMusicDialog: () => ipcRenderer.invoke("show-open-music-dialog"),
    showOpenBackgroundDialog: () => ipcRenderer.invoke("show-open-background-dialog"),
}

interface ElectronAPI {
    loadChart: (chartPackagePath: string) => Promise<string>;
    readChart: (chartId: string) => Promise<{
        musicData: ArrayBuffer,
        backgroundData: ArrayBuffer,
        chartContent: string,
        texturePaths: string[],
        textureDatas: ArrayBuffer[],
    }>,
    addChart: (musicPath: string, backgroundPath: string, name: string) => Promise<string>,
    saveChart: (chartId: string, chartContent: string) => Promise<void>,
    deleteChart: (chartId: string) => Promise<void>,
    readChartList: () => Promise<string[]>,
    exportChart: (chartId: string, targetPath: string) => Promise<void>,
    showSaveDialog: (name: string) => Promise<string>,
    showOpenChartDialog: () => Promise<string[]>,
    showOpenMusicDialog: () => Promise<string[]>,
    showOpenBackgroundDialog: () => Promise<string[]>,
}

// 扩展 Window 接口以包含 electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
export default electronAPI;