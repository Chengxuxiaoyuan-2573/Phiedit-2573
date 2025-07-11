/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict'

import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
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

    function createRandomChartId(name: string) {
        // 把name中不能作为文件名的字符替换掉
        name = name.replace(/[\\/:*?"<>|]/g, "");

        // 把name中的空格替换为下划线
        name = name.replace(/\s/g, "_");

        const time = Date.now().toString(36).substring(2, 10);
        return `${name}-${time}`;
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
                if (key == "picture" || key == "background" || key == "illustration") {
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
            throw new Error("Missing song name")
        }
        if (!backgroundPath) {
            throw new Error("Missing picture name")
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
                if (key == "picture" || key == "background" || key == "illustration") {
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

    ipcMain.handle('read-chart-list', async () => {
        try {
            ensurePathExists();
            return JSON.parse(await fs.promises.readFile(chartListFile, 'utf-8'));
        } catch (err: any) {
            if (err.code === 'ENOENT') return []; // 文件不存在
            throw err;
        }
    });

    ipcMain.handle('read-chart', async (event, chartId: string) => {
        // folderPath == C:\Users\yuanh\AppData\Roaming\phiedit2573online\charts\Better_Graphic_Animation-fx462e
        // chartPath == C:\Users\yuanh\AppData\Roaming\phiedit2573online\charts\Better_Graphic_Animation-fx462e\18032738.json
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const { musicPath, backgroundPath, chartPath, texturePaths } = await findFileInFolder(folderPath);
        // 用fs读取文件，并解析为ChartPackage
        const musicWholePath = path.join(folderPath, musicPath);
        const backgroundWholePath = path.join(folderPath, backgroundPath);
        const chartWholePath = path.join(folderPath, chartPath);
        const textureWholePaths = texturePaths.map(path123 => path.join(folderPath, path123));

        const musicData = await fs.promises.readFile(musicWholePath);
        const backgroundData = await fs.promises.readFile(backgroundWholePath);
        const chartContent = await fs.promises.readFile(chartWholePath, 'utf-8');
        const textureDatas = await Promise.all(textureWholePaths.map(path123 => fs.promises.readFile(path123)));

        // Send buffers to renderer process
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

        const musicName = path.basename(musicPath);
        const backgroundName = path.basename(backgroundPath);
        const chartName = `${name}.json`;
        const promises = [
            fs.promises.copyFile(musicPath, path.join(path666, musicName)),
            fs.promises.copyFile(backgroundPath, path.join(path666, backgroundName)),
            fs.promises.writeFile(path.join(path666, chartName), JSON.stringify(chart.toObject())),
            fs.promises.writeFile(path.join(path666, "info.txt"), `Song: ${musicName}\nPicture: ${backgroundName}\nChart: ${chartName}`)
        ];
        addIdToChartList(chartId);
        console.log(1);
        await Promise.all(promises);
        console.log(2);
        return chartId;
    });
    ipcMain.handle('save-chart', async (event, chartId: string, chartContent: string) => {
        ensurePathExists();
        const folderPath = path.join(chartsDir, chartId);
        const { chartPath } = await findFileInFolder(folderPath);
        fs.writeFileSync(path.join(folderPath, chartPath), chartContent);
    });

    ipcMain.handle('load-chart', async (event, chartPackagePath: string) => {
        console.log(chartPackagePath);
        ensurePathExists();
        const chartPackageFile = await fs.promises.readFile(chartPackagePath);
        const jszip = await JSZip.loadAsync(chartPackageFile);
        const { musicPath, backgroundPath, chartPath, texturePaths } = await findFileInZip(jszip);

        const musicFile = jszip.file(musicPath)!;
        const backgroundFile = jszip.file(backgroundPath)!;
        const chartFile = jszip.file(chartPath)!;
        const texturesFiles = texturePaths.map(path123 => jszip.file(path123)!);

        const chartContent = await chartFile.async("text");
        const name = JSON.parse(chartContent)?.META?.name || "UnknownChart";

        const chartId = createRandomChartId(name);
        const path666 = path.join(chartsDir, chartId);
        // 把musicFile, backgroundFile, chartFile解压到 chartPath 目录下，并添加一个info.txt文件
        async function saveFile(fileName: string, file: Uint8Array | string) {
            return fs.promises.writeFile(path.join(path666, fileName), file);
        }
        fs.mkdirSync(path666);
        await Promise.all([
            musicFile.async("uint8array").then(data => saveFile(musicFile.name, data)),
            backgroundFile.async("uint8array").then(data => saveFile(backgroundFile.name, data)),
            chartFile.async("uint8array").then(data => saveFile(chartFile.name, data)),
            Promise.all(texturesFiles.map(async (textureFile) =>
                textureFile.async("uint8array").then(data => saveFile(textureFile.name, data)))),
            saveFile("info.txt", `Song: ${musicPath}\nPicture: ${backgroundPath}\nChart: ${chartPath}`)
        ])
        addIdToChartList(chartId);
        return chartId;
    })

    ipcMain.handle('delete-chart', async (event, chartId: string) => {
        const path666 = path.join(chartsDir, chartId);
        // 删除文件夹
        await fs.promises.rmdir(path666, { recursive: true });
        deleteIdFromChartList(chartId);
    })

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
    // Add this IPC handler to expose the functionality
    ipcMain.handle('export-chart', async (event, chartId: string, targetPath: string) => {
        try {
            const data = await packageFolderToZip(chartId);
            console.log(targetPath, data); // targetPath == undefined
            return fs.promises.writeFile(targetPath, data);
        }
        catch (error) {
            console.error('Folder packaging failed:', error);
            throw error;
        }
    });



    // Create the browser window.
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: (process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
            contextIsolation: !(process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean
        }
    })

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

    // protocol.registerFileProtocol('app', (request, callback) => {
    //     const userDataDir = app.getPath('userData');
    //     const chartsDir = path.join(userDataDir, "charts");
    //     try {
    //         // 像file协议一样读取文件
    //         if (request.url.includes('..')) {
    //             callback({ error: 403 }); // 拒绝包含 `..` 的路径
    //             return;
    //         }
    //         const url = path.join(chartsDir, request.url.replace('app:///', ''))
    //         callback({ path: path.normalize(url) })
    //     }
    //     catch {
    //         callback({ error: 404 }); // 找不到文件
    //     }
    // });
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
