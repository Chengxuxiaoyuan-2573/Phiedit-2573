import { ipcRenderer } from "electron";

const electronAPI: ElectronAPI = {
    loadChart: (chartPackagePath: string) => ipcRenderer.invoke("load-chart", chartPackagePath),
    addChart: (musicPath: string, backgroundPath: string, name: string) => ipcRenderer.invoke("add-chart", musicPath, backgroundPath, name),
    saveChart: (chartId: string, chartContent: string) => ipcRenderer.invoke("save-chart", chartId, chartContent),
    deleteChart: (chartId: string) => ipcRenderer.invoke("delete-chart", chartId),
    readChartList: () => ipcRenderer.invoke("read-chart-list"),
    readChart: (chartId: string) => ipcRenderer.invoke("load-chart", chartId),
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
}

// 扩展 Window 接口以包含 electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

window.electronAPI = electronAPI;
export default electronAPI;