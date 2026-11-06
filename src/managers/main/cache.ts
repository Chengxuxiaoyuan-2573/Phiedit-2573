/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import fs from "fs";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import path from "path";

async function getFolderSize(dirPath: string): Promise<number> {
    let total = 0;
    const dir = await fs.promises.opendir(dirPath);

    for await (const entry of dir) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += await getFolderSize(fullPath);
        }
        else if (entry.isFile()) {
            const stat = await fs.promises.stat(fullPath);
            total += stat.size;
        }
    }
    return total;
}

async function emptyDir(dirPath: string): Promise<void> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    }
    catch (err: any) {
        if (err.code === "ENOENT") return;
        throw err;
    }

    await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await emptyDir(fullPath);
            }
            else if (entry.isFile()) {
                try {
                    await fs.promises.unlink(fullPath);
                }
                catch (err: any) {
                    if (err.code !== "ENOENT") throw err;
                }
            }
        })
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
}

class CacheManager extends Manager {
    readonly cacheFolders: ReadonlyArray<string> = [filesManager.logsFolder, filesManager.tempDir];
    constructor() {
        super();
    }
    async getCacheSize() {
        let size = 0;
        for (const folder of this.cacheFolders) {
            size += await getFolderSize(folder);
        }
        return size;
    }
    async clearCache() {
        for (const folder of this.cacheFolders) {
            await emptyDir(folder);
        }
    }
}
export default new CacheManager();