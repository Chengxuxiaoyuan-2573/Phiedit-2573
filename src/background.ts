/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

import { app, protocol, BrowserWindow, ipcMain, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";
import { autoUpdater } from "electron-updater";
import { RenderingConfig } from "./preload";
import FileUtils from "./tools/fileUtils";
import chartInfoManager, { ChartInfo } from "./managers/main/chartInfo";
import filesManager from "./managers/main/files";
import videoRenderer, { HitSoundInfo } from "./managers/main/videoRenderer";
import environment from "./managers/main/environment";
import settingsManager from "./managers/main/settings";
import chartListManager from "./managers/main/chartList";
import loadManager from "./managers/main/load";
import addChartManager from "./managers/main/add";
import saveChartManager from "./managers/main/save";
import importChartManager from "./managers/main/import";
import exportChartManager from "./managers/main/export";
import addTexturesManager from "./managers/main/addTextures";
import shaderLoader from "./managers/main/shaderLoader";
import dialogManager from "./managers/main/dialog";

// import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } }
]);

async function createWindow() {
    ipcMain.handle("read-chart-list", async () => {
        return await chartListManager.readChartList();
    });

    ipcMain.handle("read-chart-info", async (event, chartId: string) => {
        return await chartInfoManager.readChartInfo(chartId);
    });

    ipcMain.handle("write-chart-info", async (event, chartId: string, newInfo: Omit<ChartInfo, "song" | "background" | "chart">) => {
        return await chartInfoManager.writeChartInfo(chartId, newInfo);
    });

    ipcMain.handle("load-chart", async (event, chartId: string) => {
        return await loadManager.loadChart(chartId);
    });

    ipcMain.handle("add-chart", async (event, musicPath: string, backgroundPath: string, name: string) => {
        return await addChartManager.addChart(musicPath, backgroundPath, name);
    });

    ipcMain.handle("save-chart", async (event, chartId: string, chartContent: string, extraContent: string) => {
        return await saveChartManager.saveChart(chartId, chartContent, extraContent);
    });

    ipcMain.handle("import-chart", async (event, chartPackagePath: string) => {
        return await importChartManager.importChart(chartPackagePath);
    });

    ipcMain.handle("rename-chart-id", async (event, chartId: string, newChartId: string) => {
        return await chartListManager.modifyIdInChartList(chartId, newChartId);
    });

    ipcMain.handle("delete-chart", async (event, chartId: string) => {
        return await chartListManager.deleteIdFromChartList(chartId);
    });

    ipcMain.handle("load-resource-package", async () => {
        return await filesManager.loadResourcePackage();
    });

    ipcMain.handle("export-chart", async (event, chartId: string, targetPath: string) => {
        return await exportChartManager.export(chartId, targetPath);
    });

    ipcMain.handle("show-save-dialog", async (event, name: string) => {
        return await dialogManager.showSaveDialog({
            title: "保存谱面",
            defaultPath: `${name}.pez`,
            filters: [
                { name: "PEZ 文件", extensions: ["pez"] },
                { name: "ZIP 文件", extensions: ["zip"] }
            ]
        });
    });

    ipcMain.handle("show-open-chart-dialog", async (event, multiple = false) => {
        return await dialogManager.showOpenDialog({
            title: "打开谱面",
            multiple,
            filters: [
                { name: "PEZ 文件", extensions: ["pez"] },
                { name: "ZIP 文件", extensions: ["zip"] }
            ]
        });
    });

    ipcMain.handle("show-open-music-dialog", async (event, multiple = false) => {
        return await dialogManager.showOpenDialog({
            title: "选择音乐文件",
            multiple,
            filters: [
                { name: "音频文件", extensions: FileUtils.AUDIO_EXTENSIONS }
            ]
        });
    });

    ipcMain.handle("show-open-image-dialog", async (event, multiple = false) => {
        return await dialogManager.showOpenDialog({
            title: "选择图片",
            multiple,
            filters: [
                { name: "图片文件", extensions: FileUtils.IMAGE_EXTENSIONS }
            ],
        });
    });

    ipcMain.handle("show-save-video-dialog", async (event, name: string) => {
        return await dialogManager.showSaveDialog({
            title: "保存视频",
            defaultPath: `${name}.mp4`,
            filters: [
                { name: "视频文件", extensions: FileUtils.VIDEO_EXTENSIONS }
            ],
        });
    });

    ipcMain.handle("load-settings", async () => {
        return await settingsManager.readSettings();
    });

    ipcMain.handle("save-settings", async (event, settings) => {
        return await settingsManager.saveSettings(settings);
    });

    ipcMain.handle("add-textures", async (event, chartId: string, texturePaths: string[]) => {
        return await addTexturesManager.addTextures(chartId, texturePaths);
    });

    ipcMain.handle("open-chart-folder", async (event, chartId: string) => {
        return await shell.openPath(filesManager.getChartPath(chartId));
    });

    ipcMain.handle("load-shader-file", async (event, shaderName: string) => {
        return await shaderLoader.loadShaderFile(shaderName);
    });

    ipcMain.handle("open-external-link", async (event, url: string) => {
        return await shell.openExternal(url);
    });

    ipcMain.handle("start-video-rendering", async (event, { chartId, fps, outputPath, startTime, endTime }: RenderingConfig) => {
        return await videoRenderer.start({ chartId, fps, outputPath, startTime, endTime });
    });

    ipcMain.handle("send-frame-data", async (event, frameDataUrl: string) => {
        return await videoRenderer.sendFrameData(frameDataUrl);
    });

    ipcMain.handle("add-hit-sounds", async (event, sounds: readonly HitSoundInfo[]) => {
        return await videoRenderer.addHitSounds(sounds);
    });

    ipcMain.handle("finish-video-rendering", async (event, outputPath: string) => {
        return await videoRenderer.finish(outputPath);
    });

    ipcMain.handle("cancel-video-rendering", async () => {
        return await videoRenderer.cancel();
    });

    autoUpdater.autoDownload = false;
    autoUpdater.forceDevUpdateConfig = true;

    autoUpdater.on("checking-for-update", () => {
        // Notify renderer that update check has started
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-checking");
        });
    });

    autoUpdater.on("update-available", (info) => {
        // Notify user that update is available
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-available", info);
        });
    });

    autoUpdater.on("update-not-available", (info) => {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-not-available", info);
        });
    });

    autoUpdater.on("download-progress", (progress) => {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-download-progress", progress);
        });
    });

    autoUpdater.on("update-downloaded", (info) => {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-downloaded", info);
        });
    });

    autoUpdater.on("error", (err) => {
        console.error("autoUpdater 出现错误：", err);
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("update-error", err);
        });
    });

    ipcMain.handle("check-for-updates", async () => {
        return await autoUpdater.checkForUpdates();
    });

    ipcMain.handle("download-update", async () => {
        return await autoUpdater.downloadUpdate();
    });

    ipcMain.handle("quit-and-install", async () => {
        return autoUpdater.quitAndInstall();
    });

    if (environment === "development") {
        autoUpdater.updateConfigPath = path.join(__dirname, "..", "dev-app-update.yml");
    }

    // Create the browser window.
    const win = new BrowserWindow({
        width: 1000,
        height: 700,

        // fullscreenable: true,
        // fullscreen: true,
        icon: app.isPackaged ?

            // Production path
            path.join(__dirname, "build/icon.ico") :

            // Development path
            path.join(process.cwd(), "build/icon.ico"),
        webPreferences: {
            devTools: environment === "development",
            preload: path.join(__dirname, "preload.js"),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
    })
        .on("ready-to-show", () => {
            win.maximize();
            win.show();
        })
        .on("blur", () => {
            win.webContents.send("window-blur");
        })
        .on("focus", () => {
            win.webContents.send("window-focus");
        });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
        if (!process.env.IS_TEST) win.webContents.openDevTools();
    }
    else {
        createProtocol("app");

        // Load the index.html when not in development
        win.loadURL("app://./index.html");
    }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
    createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (environment === "development") {
    if (process.platform === "win32") {
        process.on("message", (data) => {
            if (data === "graceful-exit") {
                app.quit();
            }
        });
    }
    else {
        process.on("SIGTERM", () => {
            app.quit();
        });
    }
}
