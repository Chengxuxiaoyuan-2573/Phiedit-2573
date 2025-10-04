/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "@/managers/renderer/abstract";
import { MIN_TO_SEC, SEC_TO_MS } from "@/tools/mathUtils";
import path from "path";
import filesManager from "./files";
import chartInfoManager from "./chartInfo";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import { NoteType } from "@/models/note";
import { isString } from "lodash";
import JSZip from "jszip";
import { BrowserWindow } from "electron";

export interface RenderingConfig {

    /** 要渲染的谱面的ID */
    chartId: string;

    /** 输出帧率 */
    fps: number;

    /** 输出路径 */
    outputPath: string;

    /** 谱面开始的时间，以秒为单位 */
    startTime: number;

    /** 谱面结束的时间，以秒为单位 */
    endTime: number;
}

/** 缓存的打击音效文件名 */
const HIT_SOUND_FILE_NAME = `hitSound.aac`;

/** 每次合成多少个打击音效 */
const BATCH_SIZE = 100;

/** 采样率 */
const SAMPLE_RATE = 44100;

/** 声道数 */
const CHANNEL_LAYOUT = "stereo";

class VideoRenderer extends Manager {
    ffmpegProcess: ChildProcessWithoutNullStreams | null = null;
    constructor() {
        super();
    }

    /** 获取打包的 FFmpeg 二进制文件路径  */
    getFFmpegPath(): string {
        const ffmpegPath = filesManager.getResourcePath("ffmpeg", "ffmpeg.exe");

        // 验证文件是否存在
        if (!fs.existsSync(ffmpegPath)) {
            throw new Error(`FFmpeg 二进制文件不存在：${ffmpegPath}`);
        }

        return ffmpegPath;
    }
    async start({ chartId, fps, outputPath, startTime, endTime }: RenderingConfig) {
        const chartPath = filesManager.getChartPath(chartId);
        const { song: musicPath } = await chartInfoManager.readChartInfo(chartId);
        const musicWholePath = path.join(chartPath, musicPath);

        const hitSoundAudioPath = filesManager.getTempPath(HIT_SOUND_FILE_NAME);

        return new Promise<void>((resolve, reject) => {
            const ffmpegPath = this.getFFmpegPath();

            const ffmpegConfig = [
                "-y",
                "-f", "image2pipe",
                "-vcodec", "mjpeg",
                "-framerate", fps.toString(),
                "-i", "-",
                "-i", musicWholePath,
                "-i", hitSoundAudioPath,
                "-filter_complex",
                `[0:v]setpts=PTS-STARTPTS[v];` +
                `[1:a]atrim=start=${startTime}:end=${endTime},asetpts=PTS-STARTPTS[main];` +
                `[2:a]atrim=start=${startTime}:end=${endTime},asetpts=PTS-STARTPTS[hit];` +
                `[main][hit]amix=inputs=2:duration=longest[aout]`,
                "-map", "[v]",
                "-map", "[aout]",
                "-t", (endTime - startTime).toString(),
                "-c:v", "libx264",
                "-preset", "slow",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-ar", SAMPLE_RATE.toString(),
                "-ac", "2",
                "-async", "10",
                "-vsync", "vfr",
                outputPath
            ];

            // Start FFmpeg process with pipe input
            const ffmpeg = spawn(ffmpegPath, ffmpegConfig, {
                stdio: ["pipe", "pipe", "pipe"]
            });

            this.ffmpegProcess = ffmpeg;

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
    }
    async sendFrameData(frameDataUrl: string) {
        if (!this.ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        // Convert data URL to buffer
        const base64Data = frameDataUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Write frame to FFmpeg stdin
        this.ffmpegProcess.stdin.write(buffer);
    }
    async addHitSounds(sounds: readonly HitSoundInfo[]) {
        if (!this.ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        // 确保资源包已经解压
        await this.unzipResourcePackage();

        // 把所有的音效加进 arr 中以备合成
        const arr: (string | HitSoundInfo)[] = [...sounds];

        /** 音频文件的编号 */
        let num = 0;

        /** 循环的次数 */
        const loopTimes = Math.ceil(arr.length / (BATCH_SIZE - 1));

        const sendProgress = (win: BrowserWindow, startTime: number, endTime: number) => {
            win.webContents.send("VIDEO_RENDERING_PROGRESS", {
                processed: num + 1,
                total: loopTimes,
                time: (endTime - startTime) / SEC_TO_MS,
                code: "MERGING_HITSOUNDS",
                status: "音频合成中……"
            });
        };

        const allWindows = BrowserWindow.getAllWindows();

        // 循环合成音频
        while (arr.length > 1) {
            const startTime = Date.now();

            // 生成合成后音频的文件名
            const fileName = path.join("hitSoundMerge", `${num++}.aac`);

            // 取前 BATCH_SIZE 个音效进行合成，如果不够，就全部合成
            const sliced: readonly (string | HitSoundInfo)[] = arr.splice(0, BATCH_SIZE);

            // 合成音效，并输出到 fileName
            await this.processSoundBatch(sliced, fileName);

            // 把 fileName 加入 arr 中，进行下一轮的合成
            arr.push(fileName);

            const endTime = Date.now();

            for (const win of allWindows) {
                sendProgress(win, startTime, endTime);
            }
        }

        // 直到只剩一个音频文件，这个文件就包含了所有的音效
        const finalFileName = `${num - 1}.aac`;

        // 把这个文件复制到 hitSoundFileName 中，作为 ffmpeg 的输入
        const finalFilePath = filesManager.getTempPath("hitSoundMerge", finalFileName);
        const hitSoundFilePath = filesManager.getTempPath(HIT_SOUND_FILE_NAME);
        await fs.promises.copyFile(finalFilePath, hitSoundFilePath)
            .catch(() => {
                throw new Error(`无法把 ${finalFilePath} 复制到 ${hitSoundFilePath}`);
            });

        return true;
    }
    async finish(outputPath: string) {
        return new Promise((resolve, reject) => {
            if (!this.ffmpegProcess) {
                throw new Error("FFmpeg 进程未启动");
            }

            // 1. 添加多重终止机制
            const cleanup = () => {
                if (this.ffmpegProcess) {
                    try {
                        this.ffmpegProcess.stdin.removeAllListeners();
                        this.ffmpegProcess.stdout.destroy();
                        this.ffmpegProcess.stderr.destroy();
                        this.ffmpegProcess.kill("SIGKILL");
                    }
                    catch (e) {
                        console.error("清理FFmpeg进程时出错", e);
                    }
                    this.ffmpegProcess = null;
                }
            };
            this.ffmpegProcess.stdin.end();

            this.ffmpegProcess.on("close", async (code) => {
                cleanup();
                if (code === 0) {
                    const stats = fs.statSync(outputPath);
                    if (stats.size > 0) {
                        this.ffmpegProcess = null;
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
            this.ffmpegProcess.on("error", (err) => {
                cleanup();
                reject(`导出视频后 FFmpeg 错误：${err.message}`);
            });
        });
    }
    async cancel() {
        if (this.ffmpegProcess) {
            const isSucceeded = this.ffmpegProcess.kill();

            await filesManager.clearDir(filesManager.getTempPath("hitSoundMerge"))
                .catch((error) => {
                    console.error(`无法清空缓存目录：${error}`);
                });

            if (!isSucceeded) {
                throw new Error("无法终止 FFmpeg 进程");
            }
            this.ffmpegProcess = null;
        }
    }

    /**
     * 把很多打击音效合成到一起，并输出到指定的文件中
     * @param sounds 要合成的打击音效数据或文件路径
     * @param outputFile 输出文件名，以临时文件夹（tempDir）为根目录
     */
    private async processSoundBatch(sounds: readonly (HitSoundInfo | string)[], outputFile: string) {
        const length = sounds.length;
        if (length === 0) return;

        if (!this.ffmpegProcess) {
            throw new Error("FFmpeg 进程未启动");
        }

        const outputWholePath = filesManager.getTempPath(outputFile);

        // 创建合成打击音效的临时目录
        if (!fs.existsSync(path.dirname(outputWholePath))) {
            await fs.promises.mkdir(filesManager.getTempPath("hitSoundMerge"));
        }

        // 构建FFmpeg命令：将多个音效混合到动态音频轨道
        const ffmpegArgs = [
            // 覆盖输出文件
            "-y",

            // 为每种音符类型添加对应的音频资源作为输入源
            ...sounds.flatMap(sound => [
                "-i",
                `${filesManager.getTempPath((() => {
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
            "-async", "10",

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
            "-filter_complex", this.buildFilterComplex(sounds),

            // 映射混合后的音频流
            "-map", "[mixed]",

            // 音频编码格式设置为AAC
            "-c:a", "aac",

            // 音频比特率设置为192kbps
            "-b:a", "192k",

            // 输出音频文件路径
            outputWholePath
        ];

        const ffmpeg = spawn(this.getFFmpegPath(), ffmpegArgs);

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
    private buildFilterComplex(sounds: readonly (string | HitSoundInfo)[]) {
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

    /** 把资源包解压到临时目录下 */
    private async unzipResourcePackage() {
        const resourcePackageArrayBuffer = await filesManager.loadResourcePackage();
        const zip = await JSZip.loadAsync(resourcePackageArrayBuffer);
        for (const [relativePath, file] of Object.entries(zip.files)) {
            // 确保目录存在
            const dirPath = path.dirname(relativePath);
            await fs.promises.mkdir(
                filesManager.getTempPath("resourcePackage", dirPath),
                { recursive: true }
            );
            file.async("uint8array").then(fileContent => {
                filesManager.createTempFile(fileContent, "resourcePackage", relativePath);
            });
        }
    }
}

export interface HitSoundInfo {
    type: NoteType;
    time: number;
}

export default new VideoRenderer();