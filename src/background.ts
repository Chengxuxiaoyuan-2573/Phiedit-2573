/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

import { app, protocol, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import { isObject, isString } from "lodash";
import { Chart } from "./models/chart";
import { BPM } from "./models/beats";
import { autoUpdater } from "electron-updater";
import { HOUR_TO_MIN, MIN_TO_SEC, SEC_TO_MS } from "./tools/mathUtils";
const isDevelopment = process.env.NODE_ENV !== "production";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } }
]);

// interface FolderLike {
//     file: (string: string) => FileLike | null;
//     folder: (string: string) => FolderLike | null;
//     files:
// }

// interface FileLike {
//     read: (string: string) => Promise<Buffer>;
// }

async function createWindow() {
    // 获取目录和文件的路径
    const userDataDir = app.getPath("userData");
    const chartsDir = path.join(userDataDir, "charts");
    const chartListFile = path.join(chartsDir, "list.json");
    const settingsFile = path.join(userDataDir, "settings.json");

    // 定义文件编码格式
    const ENCODING = "utf-8";

    // 定义图片文件的后缀名
    const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];
    const IMAGE_REGEX = new RegExp(`\\.(${IMAGE_EXTENSIONS.join("|")})$`, "i");

    // 定义音频文件的后缀名
    const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];

    const CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX = /[\\/:*?"<>|]/g;

    const TIMESTAMP_ENCODING_BASE = 36;

    const SYSTEM_FILE_NAMES = ["con", "prn", "aux", "nul",
        "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
        "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"];

    // const audioRegExp = new RegExp(`\\.(${audioExtensions.join('|')})$`, 'i');

    // 确保目录和文件存在
    function ensurePathExists() {
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir);
        }

        if (!fs.existsSync(chartsDir)) {
            fs.mkdirSync(chartsDir);
        }

        if (!fs.existsSync(chartListFile)) {
            fs.writeFileSync(chartListFile, "[]");
        }
    }
    ensurePathExists();

    /**
     * 随机生成一个谱面ID，格式为 `<谱面名称>-<8位随机字符>`。
     * @param name 谱面名称
     * @returns 随机生成的谱面ID
     */
    function createRandomChartId(name: string) {
        // 把name中不能作为文件名的字符替换掉
        name = name.replace(CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX, "");

        // 把name中的空格替换为下划线
        name = name.replace(/\s/g, "_");

        const time = Math.round(Date.now()).toString(TIMESTAMP_ENCODING_BASE);
        return `${name}-${time}`;
    }

    function canBeFileName(name: string) {
        if (CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX.test(name)) {
            return false;
        }

        if (SYSTEM_FILE_NAMES.includes(name.toLowerCase())) {
            return false;
        }
        return true;
    }

    /**
     * 获取静态资源的路径。静态资源在开发模式下被放在 `resources` 文件夹中。
     * @param relativePaths 文件夹或文件的名称，可以写多个，表示多层目录结构
     * @returns 整个路径
     */
    function getResourcePath(...relativePaths: string[]) {
        // 开发环境：直接使用项目路径
        if (isDevelopment) {
            return path.join(process.cwd(), "resources", ...relativePaths);
        }

        // 生产环境：使用应用安装路径
        else {
            return path.join(

                // 指向安装包的 resources 目录
                process.resourcesPath,
                ...relativePaths
            );
        }
    }

    async function findFileInZip(zip: JSZip) {
        let musicPath: string | undefined = undefined,
            backgroundPath: string | undefined = undefined,
            chartPath: string | undefined = undefined;
        const infoFile = zip.file("info.txt");
        if (!infoFile) {
            for (const fileName in zip.files) {
                if (/\.(pec|json)$/.test(fileName)) {
                    const file = zip.files[fileName];
                    const chart: unknown = JSON.parse(await file.async("text"));
                    if (isObject(chart) &&
                        "META" in chart && isObject(chart.META) &&
                        "song" in chart.META && isString(chart.META.song) &&
                        "background" in chart.META && isString(chart.META.background)) {
                        chartPath = fileName;
                        musicPath = fileName.replace(/[^/\\]*$/, "") + chart.META.song;
                        backgroundPath = fileName.replace(/[^/\\]*$/, "") + chart.META.background;
                        break;
                    }
                }
            }
        }
        else {
            const info = await infoFile.async("text");
            const lines = info.split(/[\r\n]+/g);
            for (const line of lines) {
                const kv = line.split(":");
                if (kv.length <= 1) continue;
                const key = kv[0].trim().toLowerCase();
                const value = kv[1].trim();
                if (key === "song" || key === "music") {
                    musicPath = value;
                }

                if (key === "picture" || key === "background") {
                    backgroundPath = value;
                }

                if (key === "chart") {
                    chartPath = value;
                }
            }
        }

        const texturePaths = [];
        for (const fileName in zip.files) {
            if (IMAGE_REGEX.test(fileName)) {
                texturePaths.push(fileName);
            }
        }

        if (!musicPath) {
            throw new Error("Missing music name");
        }

        if (!backgroundPath) {
            throw new Error("Missing background name");
        }

        if (!chartPath) {
            throw new Error("Missing chart name");
        }

        // 是否存在
        if (!zip.file(musicPath)) {
            throw new Error("Missing music file");
        }

        if (!zip.file(backgroundPath)) {
            throw new Error("Missing background file");
        }

        if (!zip.file(chartPath)) {
            throw new Error("Missing chart file");
        }
        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths
        };
    }

    async function readTextures(chartId: string) {
        const folderPath = path.join(chartsDir, chartId);
        const texturePaths = [];
        const allFiles = await fs.promises.readdir(folderPath);
        for (const fileName of allFiles) {
            if (IMAGE_REGEX.test(fileName)) {
                texturePaths.push(fileName);
            }
        }
        return texturePaths;
    }

    function createAnEmptyChart(chartName: string) {
        const lines = 24;
        const chart = new Chart(lines);
        chart.BPMList.push(new BPM({
            bpm: 120,
            startTime: [0, 0, 1]
        }));
        chart.META.name = chartName;

        // 真的想不到这段代码怎么写了，就写成这样了……
        chart.judgeLineList[0].eventLayers[0].moveYEvents[0].start = -250;
        chart.judgeLineList[0].eventLayers[0].moveYEvents[0].end = -250;
        chart.judgeLineList[0].eventLayers[0].alphaEvents[0].start = 255;
        chart.judgeLineList[0].eventLayers[0].alphaEvents[0].end = 255;
        for (const judgeLine of chart.judgeLineList) {
            judgeLine.eventLayers[0].speedEvents[0].start = 10;
            judgeLine.eventLayers[0].speedEvents[0].end = 10;
        }

        return chart;
    }

    async function addIdToChartList(chartId: string) {
        const chartList: string[] = JSON.parse(fs.readFileSync(chartListFile, { encoding: "utf-8" }));

        // 在开头插入chartId
        chartList.splice(0, 0, chartId);
        fs.writeFileSync(chartListFile, JSON.stringify(chartList));
    }

    async function modifyIdInChartList(chartId: string, newChartId: string) {
        const chartList: string[] = JSON.parse(fs.readFileSync(chartListFile, { encoding: "utf-8" }));
        const index = chartList.indexOf(chartId);
        if (index !== -1) {
            chartList[index] = newChartId;
            fs.writeFileSync(chartListFile, JSON.stringify(chartList));
        }
        else {
            throw new Error(`未找到谱面ID：${chartId}`);
        }
    }

    async function deleteIdFromChartList(chartId: string) {
        const chartList: string[] = JSON.parse(fs.readFileSync(chartListFile, { encoding: "utf-8" }));

        // 删除chartId
        const index = chartList.indexOf(chartId);
        if (index !== -1) {
            chartList.splice(index, 1);
            fs.writeFileSync(chartListFile, JSON.stringify(chartList));
        }
        else {
            throw new Error(`未找到谱面ID：${chartId}`);
        }
    }

    async function readChartInfo(chartId: string) {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const infoPath = path.join(folderPath, "info.txt");
        const info = await fs.promises.readFile(infoPath, ENCODING);
        const lines = info.split(/[\r\n]+/g);
        const infoObj = {
            name: "unknown",
            charter: "unknown",
            composer: "unknown",
            illustration: "unknown",
            level: "SP Lv.?",
            chart: "chart.json",
            song: "music.mp3",
            picture: "background.png",
        };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let [key, value] = line.split(":");
            if (!key || !value) continue;
            key = key.trim();
            value = value.trim();
            key = key.toLowerCase();
            if (key === "name") infoObj.name = value;
            else if (key === "charter") infoObj.charter = value;
            else if (key === "composer") infoObj.composer = value;
            else if (key === "illustration") infoObj.illustration = value;
            else if (key === "level") infoObj.level = value;
            else if (key === "chart") infoObj.chart = value;
            else if (key === "song") infoObj.song = value;
            else if (key === "picture") infoObj.picture = value;
        }
        return infoObj;
    }

    async function writeChartInfo(chartId: string, infoObj: {
        name: string,
        charter: string,
        composer: string,
        illustration: string,
        level: string,
        chart: string,
        song: string,
        picture: string
    }) {
        const info = `#\nName: ${infoObj.name}\nCharter: ${infoObj.charter}\nComposer: ${infoObj.composer}\nIllustration: ${infoObj.illustration}\nLevel: ${infoObj.level}\nChart: ${infoObj.chart}\nSong: ${infoObj.song}\nPicture: ${infoObj.picture}\n`;
        return await fs.promises.writeFile(path.join(chartsDir, chartId, "info.txt"), info);
    }

    async function packageFolderToZip(chartId: string) {
        const zip = new JSZip();
        async function addFolderToZip(zip: JSZip, folderPath: string, relativePath = "") {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(folderPath, entry.name);
                const zipPath = path.join(relativePath, entry.name);

                // 如果是文件夹，则递归添加
                if (entry.isDirectory()) {
                    const subFolder = zip.folder(entry.name);
                    if (subFolder) {
                        await addFolderToZip(subFolder, fullPath, zipPath);
                    }
                }

                // 如果是文件，则直接添加到zip中
                else {
                    const fileData = await fs.promises.readFile(fullPath);
                    zip.file(zipPath, fileData);
                }
            }
        }

        const folderPath = path.join(chartsDir, chartId);
        await addFolderToZip(zip, folderPath);
        return zip.generateAsync({ type: "uint8array" });
    }

    async function loadResourcePackage() {
        const resourcePackagePath = getResourcePath("DefaultResourcePackage.zip");
        const buffer = await fs.promises.readFile(resourcePackagePath);
        const arrayBuffer = buffer.buffer;
        return arrayBuffer;
    }

    ipcMain.handle("read-chart-list", async () => {
        try {
            ensurePathExists();
            const chartList = JSON.parse(await fs.promises.readFile(chartListFile, ENCODING));
            if (!Array.isArray(chartList)) {
                throw new Error("chartList 读取失败，因为 chartList 不是数组");
            }

            if (!chartList.every(isString)) {
                throw new Error("chartList 读取失败，因为 chartList 中有非字符串的元素");
            }
            return chartList;
        }
        catch (err: any) {
            // 文件不存在
            if (err.code === "ENOENT") return [];
            throw err;
        }
    });

    ipcMain.handle("read-chart-info", async (event, chartId: string) => {
        return await readChartInfo(chartId);
    });

    ipcMain.handle("write-chart-info", async (event, chartId: string, newInfo: {
        name: string,
        charter: string,
        composer: string,
        illustration: string,
        level: string
    }) => {
        const info = await readChartInfo(chartId);
        info.name = newInfo.name;
        info.charter = newInfo.charter;
        info.composer = newInfo.composer;
        info.illustration = newInfo.illustration;
        info.level = newInfo.level;
        return await writeChartInfo(chartId, info);
    });

    ipcMain.handle("load-chart", async (event, chartId: string) => {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const { song: musicPath, picture: backgroundPath, chart: chartPath } = await readChartInfo(chartId);
        const texturePaths = await readTextures(chartId);

        const musicWholePath = path.join(folderPath, musicPath);
        const backgroundWholePath = path.join(folderPath, backgroundPath);
        const chartWholePath = path.join(folderPath, chartPath);
        const textureWholePaths = texturePaths.map(texturePath => path.join(folderPath, texturePath));
        const extraPath = path.join(folderPath, "extra.json");

        const musicData = await fs.promises.readFile(musicWholePath);
        const backgroundData = await fs.promises.readFile(backgroundWholePath);
        const chartContent = await fs.promises.readFile(chartWholePath, ENCODING).catch(() => "");
        const textureDatas = await Promise.all(textureWholePaths.map(texturePath => fs.promises.readFile(texturePath)));
        const extraContent = await fs.promises.readFile(extraPath, ENCODING).catch(() => "");

        // 将texturePaths和textureDatas合并为一个对象
        const textures: Record<string, ArrayBuffer> = {};
        texturePaths.forEach((path, index) => {
            textures[path] = textureDatas[index].buffer as ArrayBuffer;
        });

        return {
            musicData: musicData.buffer,
            backgroundData: backgroundData.buffer,
            chartContent,
            textures,
            extraContent
        };
    });

    ipcMain.handle("add-chart", async (event, musicPath: string, backgroundPath: string, name: string) => {
        const chartId = createRandomChartId(name);
        const path666 = path.join(chartsDir, chartId);
        fs.mkdirSync(path666);

        const chart = createAnEmptyChart(name);

        const musicExt = path.extname(musicPath);
        const backgroundExt = path.extname(backgroundPath);
        const chartExt = ".json";

        const promises = [
            fs.promises.copyFile(musicPath, path.join(path666, chartId + musicExt)),
            fs.promises.copyFile(backgroundPath, path.join(path666, chartId + backgroundExt)),
            fs.promises.writeFile(path.join(path666, chartId + chartExt), JSON.stringify(chart.toObject())),
            fs.promises.writeFile(path.join(path666, "info.txt"), `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${chartId + musicExt}\nPicture: ${chartId + backgroundExt}\nChart: ${chartId + ".json"}`)
        ];
        addIdToChartList(chartId);
        await Promise.all(promises);
        return chartId;
    });

    ipcMain.handle("save-chart", async (event, chartId: string, chartContent: string, extraContent: string) => {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const chartInfo = await readChartInfo(chartId);
        const chartPath = chartInfo.chart;
        const chartWholePath = path.join(folderPath, chartPath);
        const extraWholePath = path.join(folderPath, "extra.json");
        fs.writeFileSync(chartWholePath, chartContent, ENCODING);
        fs.writeFileSync(extraWholePath, extraContent, ENCODING);
    });

    ipcMain.handle("import-chart", async (event, chartPackagePath: string) => {
        ensurePathExists();
        const chartPackageFile = await fs.promises.readFile(chartPackagePath);
        const jszip = await JSZip.loadAsync(chartPackageFile);
        const { musicPath: musicPathInZip, backgroundPath: backgroundPathInZip, chartPath: chartPathInZip, texturePaths: texturePathsInZip } = await findFileInZip(jszip);

        const musicFile = jszip.file(musicPathInZip)!;
        const backgroundFile = jszip.file(backgroundPathInZip)!;
        const chartFile = jszip.file(chartPathInZip)!;

        const musicExt = path.extname(musicPathInZip);
        const backgroundExt = path.extname(backgroundPathInZip);
        const chartExt = path.extname(chartPathInZip);

        const chartContent = await chartFile.async("text");
        const name = JSON.parse(chartContent)?.META?.name || "unknown";
        const chartId = createRandomChartId(name);

        const musicNameInFolder = `${chartId}${musicExt}`;
        const backgroundNameInFolder = `${chartId}${backgroundExt}`;
        const chartNameInFolder = `${chartId}${chartExt}`;

        const texturesFiles = texturePathsInZip.map(texturePath => jszip.file(texturePath)!);

        const path666 = path.join(chartsDir, chartId);

        async function saveFile(fileName: string, file: Uint8Array | string) {
            return fs.promises.writeFile(path.join(path666, fileName), file);
        }

        // 把 musicFile, backgroundFile, chartFile 解压到 chartPath 目录下，并添加一个 info.txt 文件
        fs.mkdirSync(path666);
        await Promise.all([
            musicFile.async("uint8array")
                .then(data => saveFile(musicNameInFolder, data)),
            backgroundFile.async("uint8array")
                .then(data => saveFile(backgroundNameInFolder, data)),
            chartFile.async("uint8array")
                .then(data => saveFile(chartNameInFolder, data)),
            Promise.all(
                texturesFiles.map(async (textureFile) => {
                    return textureFile.async("uint8array")
                        .then(data => saveFile(textureFile.name, data));
                })
            ),
            saveFile("info.txt", `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${musicNameInFolder}\nPicture: ${backgroundNameInFolder}\nChart: ${chartNameInFolder}`)
        ]);
        addIdToChartList(chartId);
        return chartId;
    });

    ipcMain.handle("delete-chart", async (event, chartId: string) => {
        // const path666 = path.join(chartsDir, chartId);
        // await fs.promises.rmdir(path666, { recursive: true });
        deleteIdFromChartList(chartId);
    });

    ipcMain.handle("load-resource-package", async () => {
        const resourcePackage = await loadResourcePackage();
        return resourcePackage;
    });

    ipcMain.handle("show-save-dialog", async (event, name: string) => {
        const result = await dialog.showSaveDialog({
            title: "保存谱面",
            defaultPath: `${name}.pez`,
            filters: [
                { name: "RPE 格式谱面", extensions: ["pez"] },
                { name: "ZIP 文件", extensions: ["zip"] }
            ]
        });
        return result.filePath;
    });

    ipcMain.handle("show-open-chart-dialog", async (event, multiple = false) => {
        const properties: Array<"openFile" | "multiSelections"> = ["openFile"];

        // 如果允许多选，则添加 multiSelections 属性
        if (multiple) {
            properties.push("multiSelections");
        }

        const result = await dialog.showOpenDialog({
            title: "打开谱面",
            properties,
            filters: [
                { name: "谱面文件", extensions: ["pez", "zip"] }
            ]
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });

    ipcMain.handle("show-open-music-dialog", async (event, multiple = false) => {
        const properties: Array<"openFile" | "multiSelections"> = ["openFile"];

        // 如果允许多选，则添加 multiSelections 属性
        if (multiple) {
            properties.push("multiSelections");
        }

        const result = await dialog.showOpenDialog({
            title: "选择音乐文件",
            properties,
            filters: [
                { name: "音频文件", extensions: AUDIO_EXTENSIONS }
            ]
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });

    ipcMain.handle("show-open-image-dialog", async (event, multiple = false) => {
        const properties: Array<"openFile" | "multiSelections"> = ["openFile"];

        // 如果允许多选，则添加 multiSelections 属性
        if (multiple) {
            properties.push("multiSelections");
        }

        const result = await dialog.showOpenDialog({
            title: "选择图片",
            properties,
            filters: [
                { name: "图片文件", extensions: IMAGE_EXTENSIONS }
            ],
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });

    ipcMain.handle("export-chart", async (event, chartId: string, targetPath: string) => {
        try {
            const data = await packageFolderToZip(chartId);
            return fs.promises.writeFile(targetPath, data);
        }
        catch (error) {
            throw new Error(`导出谱面失败：${error}`);
        }
    });

    ipcMain.handle("load-settings", async () => {
        try {
            const settingsContent = await fs.promises.readFile(settingsFile, "utf-8");
            const settings = JSON.parse(settingsContent);
            return settings;
        }
        catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                return null;
            }
            throw new Error(`读取设置文件失败：${error}`);
        }
    });

    ipcMain.handle("save-settings", async (event, settings) => {
        try {
            await fs.promises.writeFile(settingsFile, JSON.stringify(settings));
        }
        catch (error) {
            throw new Error(`写入设置文件失败：${error}`);
        }
    });

    ipcMain.handle("add-textures", async (event, chartId: string, texturePaths: string[]) => {
        try {
            const textureArrayBuffers: Record<string, ArrayBufferLike> = {};
            const promises = [];
            for (const texturePath of texturePaths) {
                if (!IMAGE_REGEX.test(texturePath)) {
                    throw new Error(`${texturePath} 不是图片文件`);
                }

                const chartDir = path.join(chartsDir, chartId);

                // 把图片文件复制到chartDir下
                promises.push(fs.promises.copyFile(texturePath, path.join(chartDir, path.basename(texturePath))));
                const textureFile = await fs.promises.readFile(texturePath);
                const textureArrayBuffer = textureFile.buffer;
                textureArrayBuffers[path.basename(texturePath)] = textureArrayBuffer;
            }
            await Promise.all(promises);
            return textureArrayBuffers;
        }
        catch (error) {
            throw new Error(`添加判定线贴图失败：${error}`);
        }
    });

    ipcMain.handle("open-chart-folder", async (event, chartId: string) => {
        const chartPath = path.join(chartsDir, chartId);
        shell.openPath(chartPath);
    });

    ipcMain.handle("rename-chart-id", async (event, chartId: string, newChartId: string) => {
        if (!canBeFileName(newChartId)) {
            throw new Error(`无法修改谱面 ID 为 "${newChartId}"，因为它不能被用作文件名`);
        }
        fs.promises.rename(path.join(chartsDir, chartId), path.join(chartsDir, newChartId));
        modifyIdInChartList(chartId, newChartId);
    });

    ipcMain.handle("load-shader-file", async (event, shaderName: string) => {
        const vshPath = getResourcePath("shaders", `default.vsh`);
        const fshPath = getResourcePath("shaders", `${shaderName}.glsl`);
        const vsh = await fs.promises.readFile(vshPath, "utf-8")
            .catch(() => null);
        const fsh = await fs.promises.readFile(fshPath, "utf-8")
            .catch(() => null);
        return { vsh, fsh };
    });

    ipcMain.handle("open-external-link", async (event, url: string) => {
        shell.openExternal(url);
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

    if (process.env.NODE_ENV === "development") {
        autoUpdater.updateConfigPath = path.join(__dirname, "..", "dev-app-update.yml");
    }

    // Check for updates periodically
    setInterval(() => autoUpdater.checkForUpdates(), HOUR_TO_MIN * MIN_TO_SEC * SEC_TO_MS);

    // Create the browser window.
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        show: false,

        // fullscreenable: true,
        // fullscreen: true,
        icon: app.isPackaged ?

            // Production path
            path.join(__dirname, "build/icon.ico") :

            // Development path
            path.join(process.cwd(), "build/icon.ico"),
        webPreferences: {
            devTools: isDevelopment,
            preload: path.join(__dirname, "preload.js"),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
    });

    // Menu.setApplicationMenu(null);

    win.on("ready-to-show", () => {
        win.maximize();
        win.show();
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
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS);
        }
        catch (e) {
            console.error("Vue Devtools 安装失败：", e);
        }
    }

    createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
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
