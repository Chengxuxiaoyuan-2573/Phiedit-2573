/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * 这个文件是预加载脚本文件，把 background.ts 提供的 API 暴露给渲染进程使用。
 * 渲染进程可以直接使用 window.electronAPI 访问到这些 API。
 * 如果要查看 API 的具体代码实现，请查看 background.ts 文件。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { contextBridge, ipcRenderer } from "electron";
import type { defaultSettings } from "./managers/renderer/settings";
import type { ChartReadResult } from "./models/chartPackage";
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from "electron-updater";
import type { Replace } from "./tools/typeTools";
import type { HitSoundInfo } from "./managers/main/videoRenderer";

const electronAPI: ElectronAPI = {
    importChart: (chartPackagePath) => ipcRenderer.invoke("import-chart", chartPackagePath),
    addChart: (musicPath, backgroundPath, name) => ipcRenderer.invoke("add-chart", musicPath, backgroundPath, name),
    saveChart: (chartId, chartContent, extraContent) => ipcRenderer.invoke("save-chart", chartId, chartContent, extraContent),
    deleteChart: (chartId) => ipcRenderer.invoke("delete-chart", chartId),
    readChartList: () => ipcRenderer.invoke("read-chart-list"),
    loadChart: (chartId) => ipcRenderer.invoke("load-chart", chartId),
    exportChart: (chartId, targetPath) => ipcRenderer.invoke("export-chart", chartId, targetPath),
    showSaveDialog: (name) => ipcRenderer.invoke("show-save-dialog", name),
    showOpenChartDialog: (multiple?) => ipcRenderer.invoke("show-open-chart-dialog", multiple),
    showOpenMusicDialog: (multiple?) => ipcRenderer.invoke("show-open-music-dialog", multiple),
    showOpenImageDialog: (multiple?) => ipcRenderer.invoke("show-open-image-dialog", multiple),
    showSaveVideoDialog: (name) => ipcRenderer.invoke("show-save-video-dialog", name),
    readChartInfo: (chartId) => ipcRenderer.invoke("read-chart-info", chartId),
    writeChartInfo: (chartId, infoObj) => ipcRenderer.invoke("write-chart-info", chartId, infoObj),
    loadResourcePackage: () => ipcRenderer.invoke("load-resource-package"),
    loadSettings: () => ipcRenderer.invoke("load-settings"),
    saveSettings: (settings: typeof defaultSettings) => ipcRenderer.invoke("save-settings", settings),
    addTextures: (chartId, texturePaths) => ipcRenderer.invoke("add-textures", chartId, texturePaths),
    openChartFolder: (path) => ipcRenderer.invoke("open-chart-folder", path),
    renameChartId: (chartId, newChartId) => ipcRenderer.invoke("rename-chart-id", chartId, newChartId),
    loadShaderFile: (shaderName) => ipcRenderer.invoke("load-shader-file", shaderName),
    openExternalLink: (url) => ipcRenderer.invoke("open-external-link", url),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    downloadUpdate: () => ipcRenderer.invoke("download-update"),
    quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
    onUpdateChecking(callback) {
        const listener = () => callback();
        ipcRenderer.on("update-checking", listener);
        return () => {
            ipcRenderer.off("update-checking", listener);
        };
    },
    onUpdateAvailable(callback) {
        const listener = (event: unknown, info: typeof callback extends (arg: infer T) => void ? T : never) => callback(info);
        ipcRenderer.on("update-available", listener);
        return () => {
            ipcRenderer.off("update-available", listener);
        };
    },
    onUpdateNotAvailable(callback) {
        const listener = (event: unknown, info: typeof callback extends (arg: infer T) => void ? T : never) => callback(info);
        ipcRenderer.on("update-not-available", listener);
        return () => {
            ipcRenderer.off("update-not-available", listener);
        };
    },
    onUpdateDownloadProgress(callback) {
        const listener = (event: unknown, progress: typeof callback extends (arg: infer T) => void ? T : never) => callback(progress);
        ipcRenderer.on("update-download-progress", listener);
        return () => {
            ipcRenderer.off("update-download-progress", listener);
        };
    },
    onUpdateDownloaded(callback) {
        const listener = (event: unknown, info: typeof callback extends (arg: infer T) => void ? T : never) => callback(info);
        ipcRenderer.on("update-downloaded", listener);
        return () => {
            ipcRenderer.off("update-downloaded", listener);
        };
    },
    onUpdateError(callback) {
        const listener = (event: unknown, error: typeof callback extends (arg: infer T) => void ? T : never) => callback(error);
        ipcRenderer.on("update-error", listener);
        return () => {
            ipcRenderer.off("update-error", listener);
        };
    },
    startVideoRendering: (config) => ipcRenderer.invoke("start-video-rendering", config),
    sendFrameData: (frameDataUrl) => ipcRenderer.invoke("send-frame-data", frameDataUrl),
    finishVideoRendering: (outputPath) => ipcRenderer.invoke("finish-video-rendering", outputPath),
    addHitSounds: (sounds) => ipcRenderer.invoke("add-hit-sounds", sounds),
    cancelVideoRendering: () => ipcRenderer.invoke("cancel-video-rendering"),
    onWindowFocus(callback) {
        const listener = () => callback();
        ipcRenderer.on("window-focus", listener);
        return () => {
            ipcRenderer.off("window-focus", listener);
        };
    },
    onWindowBlur(callback) {
        const listener = () => callback();
        ipcRenderer.on("window-blur", listener);
        return () => {
            ipcRenderer.off("window-blur", listener);
        };
    },
    on(name, callback) {
        ipcRenderer.on(name, callback);
    },
    off(name, callback) {
        ipcRenderer.off(name, callback);
    }
};

interface ElectronAPI {

    /** 导入谱面 */
    importChart: (chartPackagePath: string) => Promise<string>

    /** 加载谱面 */
    loadChart: (chartId: string) => Promise<ChartReadResult>

    /** 添加谱面 */
    addChart: (musicPath: string, backgroundPath: string, name: string) => Promise<string>

    /** 保存谱面 */
    saveChart: (chartId: string, chartContent: string, extraContent: string) => Promise<void>

    /** 删除谱面 */
    deleteChart: (chartId: string) => Promise<void>

    /** 读取谱面列表 */
    readChartList: () => Promise<string[]>

    /** 导出谱面 */
    exportChart: (chartId: string, targetPath: string) => Promise<void>

    /** 显示保存谱面（pez/zip）文件的对话框 */
    showSaveDialog: (name: string) => Promise<string | null>

    /** 显示打开谱面（json）文件的对话框 */
    showOpenChartDialog: (multiple?: boolean) => Promise<string[] | null>

    /** 显示打开音乐文件的对话框 */
    showOpenMusicDialog: (multiple?: boolean) => Promise<string[] | null>

    /** 显示打开图片文件的对话框 */
    showOpenImageDialog: (multiple?: boolean) => Promise<string[] | null>

    /** 显示保存视频文件的对话框 */
    showSaveVideoDialog: (name: string) => Promise<string | null>

    /** 读取谱面的 info.txt */
    readChartInfo: (chartId: string) => Promise<{
        name: string;
        charter: string;
        composer: string;
        illustration: string;
        level: string;
        chart: string;
        song: string;
        picture: string;
    }>

    /** 写入谱面的 info.txt */
    writeChartInfo: (chartId: string, infoObj: {
        name: string,
        charter: string,
        composer: string,
        illustration: string,
        level: string
    }) => Promise<void>

    /** 加载资源包 */
    loadResourcePackage: () => Promise<ArrayBuffer>

    /** 加载设置项 */
    loadSettings: () => Promise<object | null>

    /** 写入设置项 */
    saveSettings: (settings: typeof defaultSettings) => Promise<void>

    /** 添加判定线贴图 */
    addTextures: (chartId: string, texturePaths: string[]) => Promise<Record<string, ArrayBuffer>>

    /** 打开谱面文件夹 */
    openChartFolder: (chartId: string) => Promise<void>

    /** 重命名谱面 ID */
    renameChartId: (chartId: string, newChartId: string) => Promise<void>

    /** 读取 shader */
    loadShaderFile: (shaderName: string) => Promise<{ vsh: string | null, fsh: string | null }>

    /** 打开外部链接 */
    openExternalLink: (url: string) => Promise<void>

    /** 检查更新 */
    checkForUpdates: () => Promise<void>

    /** 下载更新 */
    downloadUpdate: () => Promise<void>

    /** 退出并安装更新 */
    quitAndInstall: () => Promise<void>

    onUpdateChecking: (callback: () => void) => ()=>void
    onUpdateAvailable: (callback: (info: Replace<UpdateInfo, "releaseNotes", string>) => void) => ()=>void
    onUpdateNotAvailable: (callback: (info: Replace<UpdateInfo, "releaseNotes", string>) => void) => ()=>void
    onUpdateDownloadProgress: (callback: (progress: ProgressInfo) => void) => ()=>void
    onUpdateDownloaded: (callback: (info: Replace<UpdateDownloadedEvent, "releaseNotes", string>) => void) => ()=>void
    onUpdateError: (callback: (error: Error) => void) => ()=>void

    /** Start video export session */
    startVideoRendering: (config: RenderingConfig) => Promise<void>

    /** Send frame data to video export session */
    sendFrameData: (frameDataUrl: string) => Promise<void>

    /** Finish video export and save to file */
    finishVideoRendering: (outputPath: string) => Promise<void>

    addHitSounds: (sounds: HitSoundInfo[]) => Promise<void>

    cancelVideoRendering: () => Promise<void>

    onWindowFocus: (callback: () => void) => ()=>void

    onWindowBlur: (callback: () => void) => ()=>void

    on: (name: string, callback: (event: unknown, ...args: any[]) => void) => void
    off: (name: string, callback: (event: unknown, ...args: any[]) => void) => void
}

export interface RenderingConfig {
    chartId: string;
    fps: number;
    outputPath: string;
    startTime: number;
    endTime: number;
}

declare global {
    const electronAPI: ElectronAPI;
    interface Window {
        electronAPI: ElectronAPI;
    }
}

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
export default electronAPI;