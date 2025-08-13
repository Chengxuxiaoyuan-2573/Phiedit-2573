import { isNumber, isObject, isString } from "lodash";

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
export class ChartMeta implements IChartMeta {
    charter = "unknown";
    composer = "unknown";
    illustration = "unknown";
    level = "SP Lv.?";
    name = "unknown";
    offset = 0;
    RPEVersion = 10;
    readonly is2573 = true;
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
        }
    }
    constructor(meta: unknown) {
        if (isObject(meta)) {
            if ("name" in meta && isString(meta.name)) this.name = meta.name;
            if ("level" in meta && isString(meta.level)) this.level = meta.level;
            if ("offset" in meta && isNumber(meta.offset)) this.offset = meta.offset;
            if ("charter" in meta && isString(meta.charter)) this.charter = meta.charter;
            if ("composer" in meta && isString(meta.composer)) this.composer = meta.composer;
            if ("RPEVersion" in meta && isNumber(meta.RPEVersion)) this.RPEVersion = meta.RPEVersion;
            if ("illustrator" in meta && isString(meta.illustrator)) this.illustration = meta.illustrator;
        }
    }
}