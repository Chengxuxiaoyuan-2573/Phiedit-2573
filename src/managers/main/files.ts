/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "@/managers/renderer/abstract";
import { app } from "electron";
import path from "path";
import fs from "fs";
import environment from "./environment";
import JSZip from "jszip";

class FilesManager extends Manager {
    /** 包含临时文件的文件夹 */
    private readonly tempDir: string;

    /** 包含谱面文件夹的文件夹 */
    readonly chartFoldersDir: string;

    constructor() {
        super();
        const userDataDir = app.getPath("userData");
        this.chartFoldersDir = path.join(userDataDir, "charts");
        this.tempDir = path.join(userDataDir, "temp");
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir);
        }

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }

        if (!fs.existsSync(this.chartFoldersDir)) {
            fs.mkdirSync(this.chartFoldersDir);
        }
    }

    getChartPath(chartId: string, ...relativePaths: string[]) {
        return path.join(this.chartFoldersDir, chartId, ...relativePaths);
    }

    /**
     * 获取临时文件的路径。临时文件在 `userData\temp` 文件夹中。
     * @param relativePaths 文件夹或文件的名称，可以写多个，表示多层目录结构
     * @returns 整个路径
     */
    getTempPath(...relativePaths: string[]) {
        return path.join(this.tempDir, ...relativePaths);
    }

    /**
     * 获取静态资源的路径。静态资源在开发模式下被放在 `resources` 文件夹中。
     * @param relativePaths 文件夹或文件的名称，可以写多个，表示多层目录结构
     * @returns 整个路径
     */
    getResourcePath(...relativePaths: string[]) {
        // 开发环境：直接使用项目路径
        if (environment === "development") {
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

    /**
     * 清空目录
     * @param dir 目录路径
     */
    async clearDir(dir: string) {
        const files = await fs.promises.readdir(dir);
        const promises = files.map(async file => {
            const filePath = path.join(dir, file);
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile()) {
                await fs.promises.rm(filePath)
                    .catch(error => {
                        console.error(`无法删除文件 ${filePath}：${error}`);
                    });
            }
        });

        return await Promise.allSettled(promises);
    }

    createTempFile(fileContent: Uint8Array, ...relativePaths: string[]) {
        const filePath = this.getTempPath(...relativePaths);
        return fs.promises.writeFile(filePath, fileContent);
    }

    async loadResourcePackage() {
        const resourcePackagePath = this.getResourcePath("DefaultResourcePackage.zip");
        const buffer = await fs.promises.readFile(resourcePackagePath);
        const arrayBuffer = buffer.buffer as ArrayBuffer;
        return arrayBuffer;
    }

    async packageFolderToZip(folderPath: string) {
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

        await addFolderToZip(zip, folderPath);
        return zip.generateAsync({ type: "uint8array" });
    }
}
export default new FilesManager();