/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import path from "path";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import fs from "fs";

class LogManager extends Manager {
    private stream: fs.WriteStream | null = null;
    private currentFilePath: string | null = null;

    constructor() {
        super();
    }

    /** 打开一个日志写入流，开始新的日志会话 */
    async openLog(fileName: string): Promise<string> {
        if (this.stream) {
            throw new Error("已有日志流处于打开状态，请先调用 closeLog()");
        }
        this.currentFilePath = path.join(filesManager.logsFolder, fileName);
        this.stream = fs.createWriteStream(this.currentFilePath, { flags: "a" });

        // 等待底层 fd 打开成功，避免“假成功”
        await new Promise<void>((resolve, reject) => {
            this.stream!.once("open", () => resolve());
            this.stream!.once("error", reject);
        });
        return this.currentFilePath;
    }

    /** 追加一行日志，内部处理背压 */
    async addLog(content: string): Promise<void> {
        const stream = this.stream;
        if (!stream) {
            throw new Error("日志流未打开，请先调用 openLog(fileName)");
        }

        const ok = stream.write(content + "\n");
        if (!ok) {
            // 缓冲区满了，等 drain 再继续，防止内存爆炸
            await new Promise<void>((resolve, reject) => {
                stream.once("drain", resolve);
                stream.once("error", reject);
            });
        }
    }

    /** 结束写入，关闭流，返回最终文件路径 */
    async closeLog(): Promise<string> {
        const stream = this.stream;
        const filePath = this.currentFilePath;
        if (!stream || !filePath) {
            throw new Error("没有打开的日志流");
        }
        this.stream = null;
        this.currentFilePath = null;

        await new Promise<void>((resolve, reject) => {
            stream.end((err?: Error | null) => err ? reject(err) : resolve());
        });
        return filePath;
    }
}

export default new LogManager();