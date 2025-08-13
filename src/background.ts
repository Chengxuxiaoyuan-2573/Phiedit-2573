/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict'

import { app, protocol, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from "fs"
import JSZip from 'jszip'
import { isObject, isString } from 'lodash'
import { Chart } from './models/chart'
import { BPM } from './models/beats'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])

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
    const userDataDir = app.getPath('userData');
    const chartsDir = path.join(userDataDir, "charts");
    const chartListFile = path.join(chartsDir, "list.json");

    // 定义文件编码格式
    const encoding = 'utf-8';

    // 确保目录和文件存在
    function ensurePathExists() {
        if (!fs.existsSync(userDataDir))
            fs.mkdirSync(userDataDir);
        if (!fs.existsSync(chartsDir))
            fs.mkdirSync(chartsDir);
        if (!fs.existsSync(chartListFile))
            fs.writeFileSync(chartListFile, "[]");
    }
    ensurePathExists();

    /**
     * 随机生成一个谱面ID，格式为 `<谱面名称>-<8位随机字符>`。
     * @param name 谱面名称
     * @returns 随机生成的谱面ID
     */
    function createRandomChartId(name: string) {
        // 把name中不能作为文件名的字符替换掉
        name = name.replace(/[\\/:*?"<>|]/g, "");

        // 把name中的空格替换为下划线
        name = name.replace(/\s/g, "_");

        const time = Date.now().toString(36).substring(2, 10);
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
            return path.join(process.cwd(), 'resources', ...relativePaths);
        }

        // 生产环境：使用应用安装路径
        else {
            return path.join(
                process.resourcesPath,  // 指向安装包的 resources 目录
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
                    const chart: unknown = JSON.parse(await file.async('text'));
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
            const info = await infoFile.async('text');
            const lines = info.split(/[\r\n]+/g);
            for (const line of lines) {
                const kv = line.split(":");
                if (kv.length <= 1) continue;
                const key = kv[0].trim().toLowerCase();
                const value = kv[1].trim();
                if (key == "song" || key == "music") {
                    musicPath = value;
                }
                if (key == "picture" || key == "background") {
                    backgroundPath = value;
                }
                if (key == "chart") {
                    chartPath = value;
                }
            }
        }
        const texturePaths = [];
        for (const fileName in zip.files) {
            if (/\.(png|jpg|jpeg|gif|svg)$/.test(fileName)) {
                texturePaths.push(fileName);
            }
        }
        if (!musicPath) {
            throw new Error("Missing music name")
        }
        if (!backgroundPath) {
            throw new Error("Missing background name")
        }
        if (!chartPath) {
            throw new Error("Missing chart name")
        }
        // 是否存在
        if (!zip.file(musicPath)) {
            throw new Error("Missing music file")
        }
        if (!zip.file(backgroundPath)) {
            throw new Error("Missing background file")
        }
        if (!zip.file(chartPath)) {
            throw new Error("Missing chart file")
        }
        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths
        }
    }
    async function findFileInFolder(folderPath: string) {
        let musicPath: string | undefined = undefined,
            backgroundPath: string | undefined = undefined,
            chartPath: string | undefined = undefined;

        // 异步检查 info.txt 是否存在
        const infoTxtPath = path.join(folderPath, "info.txt");
        const hasInfoTxt = await fs.promises.access(infoTxtPath).then(() => true).catch(() => false);

        if (!hasInfoTxt) {
            const files = await fs.promises.readdir(folderPath);
            for (const fileName of files) {
                if (/\.(pec|json)$/.test(fileName)) {
                    const filePath = path.join(folderPath, fileName);
                    const fileContent = await fs.promises.readFile(filePath, { encoding: "utf-8" });
                    const chart: unknown = JSON.parse(fileContent);
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
        } else {
            const info = await fs.promises.readFile(infoTxtPath, { encoding: "utf-8" });
            const lines = info.split(/[\r\n]+/g);
            for (const line of lines) {
                const kv = line.split(":");
                if (kv.length <= 1) continue;
                const key = kv[0].trim().toLowerCase();
                const value = kv[1].trim();
                if (key == "song" || key == "music") {
                    musicPath = value;
                }
                if (key == "picture" || key == "background") {
                    backgroundPath = value;
                }
                if (key == "chart") {
                    chartPath = value;
                }
            }
        }

        const texturePaths = [];
        const allFiles = await fs.promises.readdir(folderPath);
        for (const fileName of allFiles) {
            if (/\.(png|jpg|jpeg|gif|svg)$/.test(fileName)) {
                texturePaths.push(fileName);
            }
        }

        // 错误检查（异步）
        if (!musicPath) throw new Error("Missing song name");
        if (!backgroundPath) throw new Error("Missing picture name");
        if (!chartPath) throw new Error("Missing chart name");

        const musicWholePath = path.join(folderPath, musicPath);
        const backgroundWholePath = path.join(folderPath, backgroundPath);
        const chartWholePath = path.join(folderPath, chartPath);

        // 异步检查文件存在性
        const fileChecks = await Promise.all([
            fs.promises.access(musicWholePath).then(() => true).catch(() => false),
            fs.promises.access(backgroundWholePath).then(() => true).catch(() => false),
            fs.promises.access(chartWholePath).then(() => true).catch(() => false)
        ]);

        if (!fileChecks[0]) throw new Error("Missing music file");
        if (!fileChecks[1]) throw new Error("Missing background file");
        if (!fileChecks[2]) throw new Error("Missing chart file");

        return {
            musicPath,
            backgroundPath,
            chartPath,
            texturePaths
        };
    }
    function createEmptyChart(chartName: string) {
        const lines = 24;
        const chart = new Chart(lines);
        chart.BPMList.push(new BPM({
            bpm: 120,
            startTime: [0, 0, 1]
        }));
        chart.META.name = chartName;
        return chart;
    }
    async function addIdToChartList(chartId: string) {
        const chartList: string[] = JSON.parse(fs.readFileSync(chartListFile, { encoding: "utf-8" }));
        // 在开头插入chartId
        chartList.splice(0, 0, chartId);
        fs.writeFileSync(chartListFile, JSON.stringify(chartList));
    }
    async function deleteIdFromChartList(chartId: string) {
        const chartList: string[] = JSON.parse(fs.readFileSync(chartListFile, { encoding: "utf-8" }));
        // 删除chartId
        const index = chartList.indexOf(chartId);
        if (index !== -1) {
            chartList.splice(index, 1);
        }
        else {
            console.error("deleteIdFromChartList: chartId not found");
        }
        fs.writeFileSync(chartListFile, JSON.stringify(chartList));
    }
    async function readChartInfo(chartId: string) {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const infoPath = path.join(folderPath, 'info.txt');
        const info = await fs.promises.readFile(infoPath, encoding);
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
        }
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let [key, value] = line.split(':');
            if (!key || !value) continue;
            key = key.trim();
            value = value.trim();
            key = key.toLowerCase();
            if (key == "name") infoObj.name = value;
            else if (key == "charter") infoObj.charter = value;
            else if (key == "composer") infoObj.composer = value;
            else if (key == "illustration") infoObj.illustration = value;
            else if (key == "level") infoObj.level = value;
            else if (key == "chart") infoObj.chart = value;
            else if (key == "song") infoObj.song = value;
            else if (key == "picture") infoObj.picture = value;
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
        async function addFolderToZip(zip: JSZip, folderPath: string, relativePath = '') {
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
        return zip.generateAsync({ type: 'uint8array' });
    }
    async function readResourcePackage() {
        const resourcePackagePath = getResourcePath("DefaultResourcePackage.zip");
        const buffer = await fs.promises.readFile(resourcePackagePath);
        const arrayBuffer = buffer.buffer;
        return arrayBuffer;
    }


    ipcMain.handle('read-chart-list', async () => {
        try {
            ensurePathExists();
            const chartList = JSON.parse(await fs.promises.readFile(chartListFile, encoding));
            if (!Array.isArray(chartList)) {
                throw new Error("chartList 读取失败，因为 chartList 不是数组");
            }
            if (!chartList.every(isString)) {
                throw new Error("chartList 读取失败，因为 chartList 中有非字符串的元素");
            }
            return chartList;
        } catch (err: any) {
            if (err.code === 'ENOENT') return []; // 文件不存在
            throw err;
        }
    });
    ipcMain.handle('read-chart-info', async (event, chartId: string) => {
        return await readChartInfo(chartId);
    })
    ipcMain.handle('write-chart-info', async (event, chartId: string, newInfo: {
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
    })
    ipcMain.handle('read-chart', async (event, chartId: string) => {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const { musicPath, backgroundPath, chartPath, texturePaths } = await findFileInFolder(folderPath);

        const musicWholePath = path.join(folderPath, musicPath);
        const backgroundWholePath = path.join(folderPath, backgroundPath);
        const chartWholePath = path.join(folderPath, chartPath);
        const textureWholePaths = texturePaths.map(path123 => path.join(folderPath, path123));

        const musicData = await fs.promises.readFile(musicWholePath);
        const backgroundData = await fs.promises.readFile(backgroundWholePath);
        const chartContent = await fs.promises.readFile(chartWholePath, encoding);
        const textureDatas = await Promise.all(textureWholePaths.map(path123 => fs.promises.readFile(path123)));

        return {
            musicData: musicData.buffer,
            backgroundData: backgroundData.buffer,
            chartContent,
            texturePaths,
            textureDatas: textureDatas.map(data => data.buffer),
        };
    });
    ipcMain.handle('add-chart', async (event, musicPath: string, backgroundPath: string, name: string) => {
        const chartId = createRandomChartId(name);
        const path666 = path.join(chartsDir, chartId);
        fs.mkdirSync(path666);

        const chart = createEmptyChart(name);

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
    ipcMain.handle('save-chart', async (event, chartId: string, chartContent: string) => {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const { chartPath } = await findFileInFolder(folderPath);
        fs.writeFileSync(path.join(folderPath, chartPath), chartContent);
    });
    ipcMain.handle('load-chart', async (event, chartPackagePath: string) => {
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

        const texturesFiles = texturePathsInZip.map(path123 => jszip.file(path123)!);


        const path666 = path.join(chartsDir, chartId);

        async function saveFile(fileName: string, file: Uint8Array | string) {
            return fs.promises.writeFile(path.join(path666, fileName), file);
        }
        // 把musicFile, backgroundFile, chartFile解压到 chartPath 目录下，并添加一个info.txt文件
        fs.mkdirSync(path666);
        await Promise.all([
            musicFile.async("uint8array").then(data => saveFile(musicNameInFolder, data)),
            backgroundFile.async("uint8array").then(data => saveFile(backgroundNameInFolder, data)),
            chartFile.async("uint8array").then(data => saveFile(chartNameInFolder, data)),
            Promise.all(texturesFiles.map(async (textureFile) =>
                textureFile.async("uint8array").then(data => saveFile(textureFile.name, data)))),
            saveFile("info.txt", `#\nName: ${name}\nCharter: unknown\nComposer: unknown\nIllustrator: unknown\nSong: ${musicNameInFolder}\nPicture: ${backgroundNameInFolder}\nChart: ${chartNameInFolder}`)
        ])
        addIdToChartList(chartId);
        return chartId;
    })
    ipcMain.handle('delete-chart', async (event, chartId: string) => {
        // const path666 = path.join(chartsDir, chartId);
        // await fs.promises.rmdir(path666, { recursive: true });
        deleteIdFromChartList(chartId);
    })
    ipcMain.handle('read-resource-package', async () => {
        const resourcePackage = await readResourcePackage();
        return resourcePackage;
    })
    ipcMain.handle('show-save-dialog', async (event, name: string) => {
        const result = await dialog.showSaveDialog({
            title: '保存谱面',
            defaultPath: `${name}.pez`,
            filters: [
                { name: 'RPE 格式谱面', extensions: ['pez'] },
                { name: 'ZIP 文件', extensions: ['zip'] }
            ]
        });
        return result.filePath;
    });
    ipcMain.handle('show-open-chart-dialog', async () => {
        const result = await dialog.showOpenDialog({
            title: '打开谱面',
            properties: ['openFile'],
            filters: [
                { name: '谱面文件', extensions: ['pez', 'zip'] }
            ]
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });
    ipcMain.handle('show-open-music-dialog', async () => {
        const result = await dialog.showOpenDialog({
            title: '选择音乐文件',
            properties: ['openFile'],
            filters: [
                { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac'] }
            ]
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });
    ipcMain.handle('show-open-background-dialog', async () => {
        const result = await dialog.showOpenDialog({
            title: '选择图片',
            properties: ['openFile'],
            filters: [
                { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] }
            ]
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    });
    ipcMain.handle('export-chart', async (event, chartId: string, targetPath: string) => {
        try {
            const data = await packageFolderToZip(chartId);
            return fs.promises.writeFile(targetPath, data);
        }
        catch (error) {
            console.error('Folder packaging failed:', error);
            throw error;
        }
    });



    // Create the browser window.
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        show: false,
        // fullscreenable: true,
        // fullscreen: true,
        icon: app.isPackaged
            ? path.join(__dirname, 'build/icon.ico')  // Production path
            : path.join(process.cwd(), 'build/icon.ico'), // Development path,
        webPreferences: {
            devTools: isDevelopment,
            preload: path.join(__dirname, 'preload.js'),
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: (process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
            contextIsolation: !(process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean
        },
    })

    Menu.setApplicationMenu(null);


    win.on('ready-to-show', () => {
        win.maximize();
        win.show();
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS)
        } catch (e) {
            console.error('Vue Devtools failed to install:', String(e))
        }
    }

    createWindow();
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
