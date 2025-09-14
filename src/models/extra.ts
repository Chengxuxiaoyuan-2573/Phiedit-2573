import { isArray, isObject } from "lodash";
import { IBPM, BPM } from "./beats";
import { IEffect, Effect } from "./effect";
import ChartError from "./error";
import { SYMBOL_EXTRA_JSON_ERROR } from "./chartPackage";
import { IObjectizable } from "./objectizable";
import { markRaw } from "vue";

export interface IExtra {
    bpm: IBPM[];
    effects: IEffect[];
}

export class Extra implements IExtra, IObjectizable {
    readonly bpm: BPM[] = [];
    readonly effects: Effect[] = [];
    readonly errors: ChartError[] = [];
    private effectNumber = 0;
    toObject(): IExtra {
        const extraObject = {
            bpm: this.bpm,
            effects: this.effects.map(effect => effect.toObject())
        };
        return extraObject;
    }
    calculateSeconds() {
        for (const effect of this.effects) {
            effect.calculateSeconds();
        }
    }
    addEffect(effect: unknown) {
        const newEffect = new Effect(effect, {
            BPMList: this.bpm,
            effectNumber: this.effectNumber++
        });
        this.effects.push(newEffect);
        this.errors.push(...newEffect.errors);
    }
    removeEffect(effect: Effect) {
        const index = this.effects.indexOf(effect);
        if (index !== -1) {
            this.effects.splice(index, 1);
        }
        else {
            throw new Error(`被删除的 effect 不存在：${effect}`);
        }
    }
    constructor(extra: unknown) {
        if (isObject(extra)) {
            if ("effects" in extra) {
                if (isArray(extra.effects)) {
                    for (const effect of extra.effects) {
                        this.addEffect(effect);
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `extra.json: extra.effects 必须为一个数组，但读取到了 ${extra.effects}。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `extra.json: extra 缺少 effects 属性。将会被设为空数组。`,
                    "ChartReadError.MissingProperty",
                    "error"
                ));
            }
        }
        else {
            if (extra === SYMBOL_EXTRA_JSON_ERROR) {
                this.errors.push(new ChartError(
                    `extra.json: extra.json 文件不存在或不能被 JSON 解析。请确保文件存在且格式正确。`,
                    "ChartReadError.FormatError"
                ));
            }
            else {
                this.errors.push(new ChartError(
                    `extra.json: extra 必须为一个对象，但读取到了 ${extra}。`,
                    "ChartReadError.TypeError",
                    "error"
                ));
            }
        }

        // 以防止被转换为响应式
        markRaw(this);
    }
}