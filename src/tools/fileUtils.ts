/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

export default class FileUtils {
    /** 系统文件名 */
    static readonly SYSTEM_FILE_NAMES = ["con", "prn", "aux", "nul",
        "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
        "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"] as ReadonlyArray<string>;

    /** 不允许在文件名中使用的字符的正则表达式 */
    static readonly CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX = /[\\/:*?"<>|]/g;

    /** 图片文件的后缀名 */
    static readonly IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];

    /** 图片文件名的正则表达式 */
    static readonly IMAGE_REGEX = new RegExp(`\\.(${this.IMAGE_EXTENSIONS.join("|")})$`, "i");

    /** 音频文件的后缀名 */
    static readonly AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];

    /** 音频文件名的正则表达式 */
    static readonly AUDIO_REGEX = new RegExp(`\\.(${this.AUDIO_EXTENSIONS.join("|")})$`, "i");

    /** 视频文件的后缀名 */
    static readonly VIDEO_EXTENSIONS = ["mp4", "avi", "mov", "wmv", "mkv", "webm"];

    /** 视频文件名的正则表达式 */
    static readonly VIDEO_REGEX = new RegExp(`\\.(${this.VIDEO_EXTENSIONS.join("|")})$`, "i");

    static canBeFileName(name: string) {
        if (this.CHARS_CANNOT_BE_USED_IN_FILE_NAME_REGEX.test(name)) {
            return false;
        }

        if (this.SYSTEM_FILE_NAMES.includes(name.toLowerCase())) {
            return false;
        }
        return true;
    }

    static isImage(fileName: string) {
        return this.IMAGE_REGEX.test(fileName);
    }

    static isVideo(fileName: string) {
        return this.VIDEO_REGEX.test(fileName);
    }

    static isAudio(fileName: string) {
        return this.AUDIO_REGEX.test(fileName);
    }
}