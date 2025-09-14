import { contextBridge, ipcRenderer } from "electron";
import type { defaultSettings } from "./managers/settings";
import { ChartReadResult } from "./models/chartPackage";

const electronAPI: ElectronAPI = {
    loadChart: (chartPackagePath: string) => ipcRenderer.invoke("load-chart", chartPackagePath),
    addChart: (musicPath: string, backgroundPath: string, name: string) => ipcRenderer.invoke("add-chart", musicPath, backgroundPath, name),
    saveChart: (chartId: string, chartContent: string, extraContent: string) => ipcRenderer.invoke("save-chart", chartId, chartContent, extraContent),
    deleteChart: (chartId: string) => ipcRenderer.invoke("delete-chart", chartId),
    readChartList: () => ipcRenderer.invoke("read-chart-list"),
    readChart: (chartId: string) => ipcRenderer.invoke("read-chart", chartId),
    exportChart: (chartId: string, targetPath: string) => ipcRenderer.invoke("export-chart", chartId, targetPath),
    showSaveDialog: (name: string) => ipcRenderer.invoke("show-save-dialog", name),
    showOpenChartDialog: (multiple?: boolean) => ipcRenderer.invoke("show-open-chart-dialog", multiple),
    showOpenMusicDialog: (multiple?: boolean) => ipcRenderer.invoke("show-open-music-dialog", multiple),
    showOpenImageDialog: (multiple?: boolean) => ipcRenderer.invoke("show-open-image-dialog", multiple),
    readChartInfo: (chartId: string) => ipcRenderer.invoke("read-chart-info", chartId),
    writeChartInfo: (chartId: string, infoObj: {
        name: string,
        charter: string,
        composer: string,
        illustration: string,
        level: string
    }) => ipcRenderer.invoke("write-chart-info", chartId, infoObj),
    readResourcePackage: () => ipcRenderer.invoke("read-resource-package"),
    readSettings: () => ipcRenderer.invoke("read-settings"),
    writeSettings: (settings: typeof defaultSettings) => ipcRenderer.invoke("write-settings", settings),
    addTextures: (chartId: string, texturePaths: string[]) => ipcRenderer.invoke("add-textures", chartId, texturePaths),
    openChartFolder: (path: string) => ipcRenderer.invoke("open-chart-folder", path),
    renameChartId: (chartId: string, newChartId: string) => ipcRenderer.invoke("rename-chart-id", chartId, newChartId),
    readShader: (shaderName: string) => ipcRenderer.invoke("read-shader", shaderName),
    openExternalLink: (url: string) => ipcRenderer.invoke("open-external-link", url),
};

interface ElectronAPI {
    loadChart: (chartPackagePath: string) => Promise<string>;
    readChart: (chartId: string) => Promise<ChartReadResult>,
    addChart: (musicPath: string, backgroundPath: string, name: string) => Promise<string>,
    saveChart: (chartId: string, chartContent: string, extraContent: string) => Promise<void>,
    deleteChart: (chartId: string) => Promise<void>,
    readChartList: () => Promise<string[]>,
    exportChart: (chartId: string, targetPath: string) => Promise<void>,
    showSaveDialog: (name: string) => Promise<string>,
    showOpenChartDialog: () => Promise<string[] | null>,
    showOpenMusicDialog: () => Promise<string[] | null>,
    showOpenImageDialog: (multiple?: boolean) => Promise<string[] | null>,
    readChartInfo: (chartId: string) => Promise<{
        name: string;
        charter: string;
        composer: string;
        illustration: string;
        level: string;
        chart: string;
        song: string;
        picture: string;
    }>,
    writeChartInfo: (chartId: string, infoObj: {
        name: string,
        charter: string,
        composer: string,
        illustration: string,
        level: string
    }) => Promise<void>,
    readResourcePackage: () => Promise<ArrayBuffer>,
    readSettings: () => Promise<object | null>,
    writeSettings: (settings: typeof defaultSettings) => Promise<void>,
    addTextures: (chartId: string, texturePaths: string[]) => Promise<Record<string, ArrayBuffer>>,
    openChartFolder: (chartId: string) => Promise<void>,
    renameChartId: (chartId: string, newChartId: string) => Promise<void>,
    readShader: (shaderName: string) => Promise<{ vsh: string, fsh: string }>,
    openExternalLink: (url: string) => Promise<void>
}

// 扩展 Window 接口以包含 electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
export default electronAPI;