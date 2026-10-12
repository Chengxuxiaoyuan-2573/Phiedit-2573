/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isArray, isObject } from "lodash";
import { BPM, ExtraBPM } from "./beats";
import { IEffect, Effect } from "./effect";
import { SYMBOL_EXTRA_JSON_ERROR, SYMBOL_EXTRA_NOT_EXIST } from "./chartPackage";
import { IObjectizable } from "../objectizable";
import { markRaw } from "vue";

export interface IExtra {
    bpm: ExtraBPM[];
    effects: IEffect[];
}

export class Extra implements IExtra, IObjectizable {
    bpm: BPM[] = [];
    effects: Effect[] = [];
    errorMessages: string[] = [];
    private effectNumber = 0;
    toObject(): IExtra {
        const extraObject = {
            bpm: this.bpm.map(bpm => bpm.toObjectExtra()),
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
        this.errorMessages = this.errorMessages.concat(newEffect.errorMessages);
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
                    this.errorMessages.push(`extra.json: extra.effects 必须为一个数组，但读取到了 ${extra.effects}。将会被设为空数组。`);
                }
            }
            else {
                this.errorMessages.push(`extra.json: extra 缺少 effects 属性。将会被设为空数组。`);
            }
        }
        else {
            if (extra === SYMBOL_EXTRA_NOT_EXIST) {
                // this.errorMessages.push(`extra.json: extra.json 文件不存在。如果你没有使用 extra.json 文件，请忽略此信息。`);
            }
            else if (extra === SYMBOL_EXTRA_JSON_ERROR) {
                this.errorMessages.push(`extra.json: extra.json 文件不能被 JSON 解析。请检查 extra.json 文件格式是否正确。`);
            }
            else {
                this.errorMessages.push(`extra.json: extra 必须为一个对象，但读取到了 ${extra}。`);
            }
        }

        // 以防止被转换为响应式
        markRaw(this);
    }
}