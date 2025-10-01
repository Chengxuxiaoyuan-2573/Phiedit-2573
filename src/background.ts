/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

import { app, protocol, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import { isObject, isString } from "lodash";
import { Chart } from "./models/chart";
import { BPM } from "./models/beats";
import { autoUpdater } from "electron-updater";
import { HOUR_TO_MIN, MIN_TO_SEC, SEC_TO_MS } from "./tools/mathUtils";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { HitSoundInfo } from "./preload";
import { NoteType } from "./models/note";

// import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";

const isDevelopment = process.env.NODE_ENV !== "production";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } }
]);

/** 统一的文件编码格式 */
const ENCODING = "utf-8";

/** 图片文件的后缀名 */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];

/** 图片文件名的正则表达式 */
const IMAGE_REGEX = new RegExp(`\\.(${IMAGE_EXTENSIONS.join("|")})$`, "i");

/** 音频文件的后缀名 */
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];

/** 音频文件名的正则表达式 */
// const audioRegExp = new RegExp(`\\.(${audioExtensions.join('|')})$`, 'i');

/** 不允许在文件名中使用的字符的正则表达式 */
const CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX = /[\\/:*?"<>|]/g;

/** 时间戳的编码进制 */
const TIMESTAMP_ENCODING_BASE = 36;

/** 系统文件名 */
const SYSTEM_FILE_NAMES = ["con", "prn", "aux", "nul",
    "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
    "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"];

function canBeFileName(name: string) {
    if (CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX.test(name)) {
        return false;
    }

    if (SYSTEM_FILE_NAMES.includes(name.toLowerCase())) {
        return false;
    }
    return true;
}

async function createWindow() {
    // 获取目录和文件的路径
    const userDataDir = app.getPath("userData");
    const chartsDir = path.join(userDataDir, "charts");
    const tempDir = path.join(userDataDir, "temp");
    const chartListFile = path.join(chartsDir, "list.json");
    const settingsFile = path.join(userDataDir, "settings.json");

    /** 确保目录和文件存在 */
    function ensurePathExists() {
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir);
        }

        if (!fs.existsSync(chartsDir)) {
            fs.mkdirSync(chartsDir);
        }

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
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

    function getTempPath(...relativePaths: string[]) {
        return path.join(tempDir, ...relativePaths);
    }

    function createTempFile(fileContent: Uint8Array, ...relativePaths: string[]) {
        const filePath = getTempPath(...relativePaths);
        return fs.promises.writeFile(filePath, fileContent);
    }

    /** 把资源包解压到临时目录下 */
    async function unzipResourcePackage() {
        const resourcePackageArrayBuffer = await loadResourcePackage();
        const zip = await JSZip.loadAsync(resourcePackageArrayBuffer);
        for (const [relativePath, file] of Object.entries(zip.files)) {
            // 确保目录存在
            const dirPath = path.dirname(relativePath);
            await fs.promises.mkdir(
                getTempPath("resourcePackage", dirPath),
                { recursive: true }
            );
            file.async("uint8array").then(fileContent => {
                createTempFile(fileContent, "resourcePackage", relativePath);
            });
        }
    }

    /**
     * 在 zip 格式的谱面压缩包中寻找一些必要的文件
     * @param zip 谱面压缩包的 JSZip 对象
     * @returns 包含音乐、曲绘和谱面文件相对于压缩包根目录的路径
     */
    async function findFilesInZipChart(zip: JSZip) {
        let musicPath: string | undefined = undefined,
            backgroundPath: string | undefined = undefined,
            chartPath: string | undefined = undefined;

        const SYMBOL_CHART_JSON_ERROR = Symbol("Chart json parse error");

        // 寻找 info.txt 文件
        const infoFile = zip.file("info.txt");

        if (!infoFile) {
            for (const fileName in zip.files) {
                // 遍历压缩包，寻找 pec 或 json 文件
                if (/\.(pec|json)$/.test(fileName)) {
                    const file = zip.files[fileName];

                    // 试图解析为 json 格式
                    const chart: unknown = await (async () => {
                        return JSON.parse(await file.async("text"));
                    })().catch(() => {
                        // 解析失败，返回一个代表解析失败的 Symbol
                        return SYMBOL_CHART_JSON_ERROR;
                    });

                    // 如果解析失败，则跳过当前循环
                    if (chart === SYMBOL_CHART_JSON_ERROR) {
                        continue;
                    }

                    // 在解析的 json 文件里寻找 chart.META.song 和 chart.META.background 属性
                    if (isObject(chart) &&
                        "META" in chart && isObject(chart.META) &&
                        "song" in chart.META && isString(chart.META.song) &&
                        "background" in chart.META && isString(chart.META.background)) {
                        // 如果这两个属性存在

                        // 就把这个文件当作谱面文件
                        chartPath = fileName;

                        // 把相对于这个文件的 chart.META.song 当作音乐文件
                        musicPath = fileName.replace(/[^/\\]*$/, "") + chart.META.song;

                        // 把相对于这个文件的  chart.META.background 当作背景文件
                        backgroundPath = fileName.replace(/[^/\\]*$/, "") + chart.META.background;

                        // 然后就可以直接退出了
                        break;
                    }
                }
            }
        }
        else {
            // 如果有 info.txt 文件，就直接读取
            const info = await infoFile.async("text");

            // 逐行读取
            const lines = info.split(/[\r\n]+/g);
            for (const line of lines) {
                // 以冒号分隔
                const kv = line.split(":");

                // 必须要有一个键和一个值
                if (kv.length < 2) continue;

                // 把键两端的空格去掉，忽略大小写
                const key = kv[0].trim().toLowerCase();

                // 把值两端的空格去掉
                const value = kv[1].trim();

                // 读取音乐文件的路径
                if (key === "song" || key === "music") {
                    musicPath = value;
                }

                // 读取曲绘文件的路径
                if (key === "picture" || key === "background") {
                    backgroundPath = value;
                }

                // 读取谱面文件的路径
                if (key === "chart") {
                    chartPath = value;
                }
            }
        }

        // 把所有的图片文件都视为判定线贴图
        const texturePaths = [];
        for (const fileName in zip.files) {
            if (IMAGE_REGEX.test(fileName)) {
                texturePaths.push(fileName);
            }
        }

        if (!musicPath) {
            throw new Error("无法获取音乐文件的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        if (!backgroundPath) {
            throw new Error("无法获取曲绘图片的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        if (!chartPath) {
            throw new Error("无法获取谱面文件的路径，请检查压缩包内是否有 info.txt 或类似的文件");
        }

        // 是否存在
        if (!zip.file(musicPath)) {
            throw new Error(`不存在的音乐文件：${musicPath}`);
        }

        if (!zip.file(backgroundPath)) {
            throw new Error(`不存在的曲绘文件：${backgroundPath}`);
        }

        if (!zip.file(chartPath)) {
            throw new Error(`不存在的谱面文件：${chartPath}`);
        }
        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths
        };
    }

    /** 加载判定线贴图 */
    async function loadTextures(chartId: string) {
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

    /** 创建一个空的谱面 */
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
        const arrayBuffer = buffer.buffer as ArrayBuffer;
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
        const texturePaths = await loadTextures(chartId);

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
        const chartDir = path.join(chartsDir, chartId);
        fs.mkdirSync(chartDir);

        const chart = createAnEmptyChart(name);

        const musicExt = path.extname(musicPath);
        const backgroundExt = path.extname(backgroundPath);
        const chartExt = ".json";

        const promises = [
            fs.promises.copyFile(musicPath, path.join(chartDir, chartId + musicExt)),
            fs.promises.copyFile(backgroundPath, path.join(chartDir, chartId + backgroundExt)),
            fs.promises.writeFile(path.join(chartDir, chartId + chartExt), JSON.stringify(chart.toObject())),
            fs.promises.writeFile(path.join(chartDir, "info.txt"), `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${chartId + musicExt}\nPicture: ${chartId + backgroundExt}\nChart: ${chartId + ".json"}`)
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
        const { musicPath: musicPathInZip, backgroundPath: backgroundPathInZip, chartPath: chartPathInZip, texturePaths: texturePathsInZip } = await findFilesInZipChart(jszip);

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

        const chartDir = path.join(chartsDir, chartId);

        async function saveFile(fileName: string, file: Uint8Array | string) {
            return fs.promises.writeFile(path.join(chartDir, fileName), file);
        }

        // 把 musicFile, backgroundFile, chartFile 解压到 chartPath 目录下，并添加一个 info.txt 文件
        fs.mkdirSync(chartDir);
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
        // const chartDir = path.join(chartsDir, chartId);
        // await fs.promises.rmdir(chartDir, { recursive: true });
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
        if (result.canceled) {
            return null;
        }
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

    ipcMain.handle("show-save-video-dialog", async (event, name: string) => {
        const result = await dialog.showSaveDialog({
            title: "保存视频",
            defaultPath: name,
            filters: [
                { name: "视频文件", extensions: ["mp4"] }
            ],
        });
        if (result.canceled) {
            return null;
        }
        return result.filePath;
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

    const hitSoundFileName = `hitSound.aac`;

    let ffmpegProcess: ChildProcessWithoutNullStreams | null = null;

    /** 获取打包的 FFmpeg 二进制文件路径  */
    function getFFmpegPath(): string {
        const ffmpegPath = getResourcePath("ffmpeg", "ffmpeg.exe");

        // 验证文件是否存在
        if (!fs.existsSync(ffmpegPath)) {
            throw new Error(`FFmpeg 二进制文件不存在：${ffmpegPath}`);
        }

        return ffmpegPath;
    }

    ipcMain.handle("start-video-rendering", async (event, chartId: string, fps: number, outputPath: string) => {
        const chartPath = path.join(chartsDir, chartId);
        const { song: musicPath } = await readChartInfo(chartId);
        const musicWholePath = path.join(chartPath, musicPath);

        // 创建临时音频文件用于动态混合
        const dynamicAudioPath = path.join(tempDir, hitSoundFileName);

        return new Promise<void>((resolve, reject) => {
            const ffmpegPath = getFFmpegPath();

            const ffmpegConfig = [
                "-y",
                "-f", "image2pipe",
                "-vcodec", "mjpeg",
                "-framerate", fps.toString(),
                "-i", "-",
                "-i", musicWholePath,
                "-i", dynamicAudioPath,
                "-filter_complex",
                `[1:a]aformat=sample_fmts=fltp:sample_rates=${SAMPLE_RATE}:channel_layouts=${CHANNEL_LAYOUT}[main];` +
                `[2:a]aformat=sample_fmts=fltp:sample_rates=${SAMPLE_RATE}:channel_layouts=${CHANNEL_LAYOUT}[hit];` +
                `[main][hit]amix=inputs=2:duration=longest[aout]`,
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "slow",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-ar", SAMPLE_RATE.toString(),
                "-ac", "2",
                "-async", "1",
                "-vsync", "cfr",
                "-copyts",
                outputPath
            ];

            // Start FFmpeg process with pipe input
            const ffmpeg = spawn(ffmpegPath, ffmpegConfig, {
                stdio: ["pipe", "pipe", "pipe"]
            });

            ffmpegProcess = ffmpeg;

            // 添加进程启动确认
            let isProcessReady = false;

            // FFmpeg 启动成功标志
            ffmpeg.stderr.on("data", (data) => {
                const output = data.toString();

                // 检测 FFmpeg 已准备好接收输入
                if (output.includes("ffmpeg version")) {
                    isProcessReady = true;
                    clearTimeout(startupTimeout);

                    resolve();
                }

                // 处理错误
                const outputLowerCase = output.toLowerCase();
                if (outputLowerCase.includes("error") || outputLowerCase.includes("failed")) {
                    reject(new Error(`FFmpeg 出现错误：${output}`));
                }
            });

            ffmpeg.on("error", (error) => {
                reject(new Error(`FFmpeg 出现错误：${error.message}`));
            });

            ffmpeg.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`FFmpeg 错误，错误码 ${code}`));
                }
            });

            // 设置超时，确保不会无限等待
            const startupTimeout = setTimeout(() => {
                if (!isProcessReady) {
                    reject(new Error("FFmpeg 启动超时"));
                }
            }, MIN_TO_SEC * SEC_TO_MS);
        });
    });

    ipcMain.handle("send-frame-data", async (event, frameDataUrl: string, currentFrame: number, totalFrames: number) => {
        if (!ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        const startTime = Date.now();

        // Convert data URL to buffer
        const base64Data = frameDataUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Write frame to FFmpeg stdin
        ffmpegProcess.stdin.write(buffer);

        const endTime = Date.now();

        win.webContents.send("video-rendering-progress", {
            status: `正在生成视频画面（${currentFrame + 1} / ${totalFrames}）`,
            processed: currentFrame + 1,
            total: totalFrames,
            code: "RENDERING_FRAMES",
            time: endTime - startTime,
        });
    });

    ipcMain.handle("add-hit-sounds", async (event, sounds: readonly HitSoundInfo[]) => {
        if (!ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        // 确保资源包已经解压
        await unzipResourcePackage();

        // 把所有的音效加进 arr 中以备合成
        const arr: (string | HitSoundInfo)[] = [ ...sounds ];

        /** 音频文件的编号 */
        let num = 0;

        /** 循环的次数 */
        const loopTimes = arr.length / (BATCH_SIZE - 1);

        // 循环合成音频
        while (arr.length > 1) {
            const startTime = Date.now();

            // 生成合成后音频的文件名
            const fileName = path.join("hitSoundMerge", `${num++}.aac`);

            // 取前 BATCH_SIZE 个音效进行合成，如果不够，就全部合成
            const sliced: readonly (string | HitSoundInfo)[] = arr.splice(0, BATCH_SIZE);

            // 合成音效，并输出到 fileName
            await processSoundBatch(sliced, fileName);

            // 把 fileName 加入 arr 中，进行下一轮的合成
            arr.push(fileName);

            const endTime = Date.now();

            win.webContents.send("video-rendering-progress", {
                status: `正在合成打击音效`,
                processed: num + 1,
                total: loopTimes,
                time: endTime - startTime,
                code: "MERGING_HITSOUNDS"
            });
        }

        // 直到只剩一个音频文件，这个文件就包含了所有的音效
        const finalFileName = `${num - 1}.aac`;

        // 把这个文件复制到 hitSoundFileName 中，作为 ffmpeg 的输入
        const finalFilePath = path.join(tempDir, "hitSoundMerge", finalFileName);
        const hitSoundFilePath = path.join(tempDir, hitSoundFileName);
        await fs.promises.copyFile(finalFilePath, hitSoundFilePath)
            .catch(() => {
                throw new Error(`无法把 ${finalFilePath} 复制到 ${hitSoundFilePath}`);
            });

        return true;
    });

    ipcMain.handle("finish-video-rendering", async (event, outputPath: string) => {
        return new Promise((resolve, reject) => {
            if (!ffmpegProcess) {
                throw new Error("FFmpeg 进程未启动");
            }

            // 1. 添加多重终止机制
            const cleanup = () => {
                if (ffmpegProcess) {
                    try {
                        ffmpegProcess.stdin.removeAllListeners();
                        ffmpegProcess.stdout.destroy();
                        ffmpegProcess.stderr.destroy();
                        ffmpegProcess.kill("SIGKILL");
                    }
                    catch (e) {
                        console.error("清理FFmpeg进程时出错", e);
                    }
                    ffmpegProcess = null;
                }
            };
            ffmpegProcess.stdin.end();

            ffmpegProcess.on("close", async (code) => {
                cleanup();
                if (code === 0) {
                    const stats = fs.statSync(outputPath);
                    if (stats.size > 0) {
                        ffmpegProcess = null;
                        resolve(outputPath);
                    }
                    else {
                        reject("导出的视频文件为空");
                    }
                }
                else {
                    reject(`导出视频后 FFmpeg 发生错误，错误码 ${code}`);
                }
            });
            ffmpegProcess.on("error", (err) => {
                cleanup();
                reject(`导出视频后 FFmpeg 错误：${err.message}`);
            });
        });
    });

    ipcMain.handle("cancel-video-rendering", async () => {
        if (ffmpegProcess) {
            const isSucceeded = ffmpegProcess.kill();

            await clearDir(path.join(tempDir, "hitSoundMerge"))
                .catch((error) => {
                    console.error(`无法清空缓存目录：${error}`);
                });

            if (!isSucceeded) {
                throw new Error("无法终止 FFmpeg 进程");
            }
            ffmpegProcess = null;
        }
    });

    async function clearDir(dir: string) {
        const promises: Promise<void>[] = [];
        for (const file of await fs.promises.readdir(dir)) {
            const filePath = path.join(dir, file);
            if ((await fs.promises.stat(filePath)).isFile()) {
                promises.push(fs.promises.unlink(filePath));
            }
        }
        await Promise.all(promises);
    }

    /** 每次合成多少个打击音效 */
    const BATCH_SIZE = 100;

    /** 采样率 */
    const SAMPLE_RATE = 44100;

    /** 声道数 */
    const CHANNEL_LAYOUT = "stereo";

    /**
     * 把很多打击音效合成到一起，并输出到指定的文件中
     * @param sounds 要合成的打击音效数据或文件路径
     * @param outputFile 输出文件名，以临时文件夹（tempDir）为根目录
     */
    async function processSoundBatch(sounds: readonly (HitSoundInfo | string)[], outputFile: string) {
        const length = sounds.length;
        if (length === 0) return;

        if (!ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        const outputWholePath = path.join(tempDir, outputFile);

        // 创建合成打击音效的临时目录
        if (!fs.existsSync(path.dirname(outputWholePath))) {
            await fs.promises.mkdir(path.join(tempDir, "hitSoundMerge"));
        }

        // 构建FFmpeg命令：将多个音效混合到动态音频轨道
        const ffmpegArgs = [
            // 覆盖输出文件
            "-y",

            // 为每种音符类型添加对应的音频资源作为输入源
            ...sounds.flatMap(sound => [
                "-i",
                `${path.join(tempDir, (() => {
                    if (isString(sound)) {
                        return sound;
                    }

                    switch (sound.type) {
                        case NoteType.Tap:
                        case NoteType.Hold:
                            return path.join("resourcePackage", "click.ogg");
                        case NoteType.Drag:
                            return path.join("resourcePackage", "drag.ogg");
                        case NoteType.Flick:
                            return path.join("resourcePackage", "flick.ogg");
                    }
                })())}`
            ]),

            // 添加同步参数
            "-async", "1",

            // 添加采样率参数
            "-ar", SAMPLE_RATE.toString(),

            // 添加声道参数
            "-ac", "2",

            // 添加时间参数
            "-fflags", "+genpts",

            // 添加时间参数
            "-avoid_negative_ts", "make_zero",

            // 添加时间参数
            "-start_at_zero",

            // 复杂滤镜配置，用于音频混合
            "-filter_complex", buildFilterComplex(sounds),

            // 映射混合后的音频流
            "-map", "[mixed]",

            // 音频编码格式设置为AAC
            "-c:a", "aac",

            // 音频比特率设置为192kbps
            "-b:a", "192k",

            // 输出音频文件路径
            outputWholePath
        ];

        const ffmpeg = spawn(getFFmpegPath(), ffmpegArgs);

        return new Promise<void>((resolve, reject) => {
            ffmpeg.on("close", async (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`音效混合失败，FFmpeg退出代码: ${code}`));
                }
            });

            ffmpeg.on("error", async (error) => {
                reject(error);
            });
        });
    }

    /**
     * 根据要混合的音效，生成 -filter_complex 配置
     * @param sounds 音效列表，可以是文件路径或 HitSoundInfo
     * @returns -filter_complex 的值
     */
    function buildFilterComplex(sounds: readonly (string | HitSoundInfo)[]) {
        let filter = "";

        // 为每个音效添加延迟
        sounds.forEach((sound, i) => {
            const delayMs = (() => {
                const result = (() => {
                    if (isString(sound)) {
                        return 0;
                    }
                    else {
                        return Math.floor(sound.time * SEC_TO_MS);
                    }
                })();

                if (result < 0) {
                    throw new Error(`Invalid delay time: ${result}`);
                }
                return result;
            })();
            filter += `[${i}:a]aformat=sample_fmts=fltp:sample_rates=${SAMPLE_RATE}:channel_layouts=${CHANNEL_LAYOUT},adelay=${delayMs}|${delayMs}[sound${i}];`;
        });

        sounds.forEach((_, i) => {
            filter += `[sound${i}]`;
        });

        const totalInputs = sounds.length;

        filter += `amix=inputs=${totalInputs}:duration=longest:normalize=0[mixed]`;

        return filter;
    }

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
    /*
    // 一加上这段代码就会输出 Vue Devtools 安装失败
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS);
        }
        catch (e) {
            console.error("Vue Devtools 安装失败：", e);
        }
    }
    */

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
