/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isNumber, isObject, isString } from "lodash";
import { IObjectizable } from "./objectizable";

export interface IChartMeta {

    /** 谱师 */
    charter: string,

    /** 曲师 */
    composer: string,

    /** 画师 */
    illustration: string,

    /** 难度 */
    level: string,

    /** 曲名 */
    name: string,

    /** 偏移（以毫秒为单位，正数则谱面向后偏移） */
    offset: number,

    /** 编辑器版本，10代表0.1.0版本，100代表1.0.0版本，以此类推 */
    RPEVersion: number,

    /** 是否是由本编辑器编辑的谱面 */
    is2573: true,

    /** 图片文件名称 */
    background?: string,

    /** 音乐文件名称 */
    song?: string,
}

/** 谱面元数据，是响应式的 */
export class ChartMeta implements IChartMeta, IObjectizable {
    charter = "unknown";
    composer = "unknown";
    illustration = "unknown";
    level = "SP Lv.?";
    name = "unknown";
    offset = 0;
    readonly RPEVersion;
    readonly is2573 = true;
    readonly errorMessages: string[] = [];
    toObject(): IChartMeta {
        return {
            charter: this.charter,
            composer: this.composer,
            illustration: this.illustration,
            level: this.level,
            name: this.name,
            offset: this.offset,
            RPEVersion: this.RPEVersion,
            is2573: this.is2573
        };
    }
    constructor(meta: unknown, version: string) {
        this.RPEVersion = parseInt(version.replaceAll(".", ""));
        if (isObject(meta)) {
            // name - required field
            if ("name" in meta) {
                if (isString(meta.name)) {
                    this.name = meta.name;
                }
                else {
                    this.errorMessages.push(`chart.META.name 属性必须是字符串，但读取到了 ${meta.name}。将会被设为 "unknown"。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.name 属性。将会被设为 "unknown"。`);
            }

            // level
            if ("level" in meta) {
                if (isString(meta.level)) {
                    this.level = meta.level;
                }
                else {
                    this.errorMessages.push(`chart.META.level 属性必须是字符串，但读取到了 ${meta.level}。将会被设为 "SP Lv.?"。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.level 属性。将会被设为 "SP Lv.?"。`);
            }

            if ("offset" in meta) {
                if (isNumber(meta.offset)) {
                    this.offset = meta.offset;
                }
                else {
                    this.errorMessages.push(`chart.META.offset 属性必须是数字，但读取到了 ${meta.offset}。将会被设为 0。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.offset 属性。将会被设为 0。`);
            }

            if ("charter" in meta) {
                if (isString(meta.charter)) {
                    this.charter = meta.charter;
                }
                else {
                    this.errorMessages.push(`chart.META.charter 属性必须是字符串，但读取到了 ${meta.charter}。将会被设为 "unknown"。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.charter 属性。将会被设为 "unknown"。`);
            }

            if ("composer" in meta) {
                if (isString(meta.composer)) {
                    this.composer = meta.composer;
                }
                else {
                    this.errorMessages.push(`chart.META.composer 属性必须是字符串，但读取到了 ${meta.composer}。将会被设为 "unknown"。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.composer 属性。将会被设为 "unknown"。`);
            }

            if ("RPEVersion" in meta) {
                if (isNumber(meta.RPEVersion)) {
                    this.RPEVersion = meta.RPEVersion;
                }
                else {
                    this.errorMessages.push(`chart.META.RPEVersion 属性必须是数字，但读取到了 ${meta.RPEVersion}。将会被设为 Phiedit 2573 的当前版本号 ${this.RPEVersion}。`);
                }
            }

            if ("illustration" in meta) {
                if (isString(meta.illustration)) {
                    this.illustration = meta.illustration;
                }
                else {
                    this.errorMessages.push(`chart.META.illustration 属性必须是字符串，但读取到了 ${meta.illustration}。将会替换为字符串 "unknown"。`);
                }
            }
            else {
                this.errorMessages.push(`未找到 chart.META.illustration 属性。将会替换为字符串 "unknown"。`);
            }
        }
        else {
            this.errorMessages.push(`chart.META 必须是一个对象，但读取到了 ${meta}。将会使用默认值。`);
        }
    }
}