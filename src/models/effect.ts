import { isArray, isBoolean, isNumber, isObject, isString } from "lodash";
import { Beats, beatsToSeconds, BPM, isGreaterThanBeats, isLessThanBeats, makeSureBeatsValid } from "./beats";
import ChartError from "./error";
import { IEvent, ShaderVariableEvent } from "./event";
import { ArrayRepeat, DeepNotReadonly, isArrayOfNumbers, NotReadonly } from "@/tools/typeTools";
import { ArrayedObject } from "@/tools/algorithm";
import { IObjectizable } from "./objectizable";
import { RGBAcolor } from "@/tools/color";

export interface IEffect {

    /** shader 的开始时间 */
    start: Beats;

    /** shader 的结束时间 */
    end: Beats;

    /** shader 的名称 */
    shader: string;

    /**
     * shader 是否是全局 shader，
     * 即 shader 是否影响界面 UI
     */
    global: boolean;

    /**
     * shader 的参数，
     * 如果为单个数字，则表示该值不会变；
     * 如果为事件数组，则表示该值会随时间而变化
     */
    vars: Record<string, ShaderNumberType | IEvent<ShaderNumberType>[]>;

    description?: string;
}

interface EffectOptions {
    BPMList: BPM[];
    effectNumber: number;
}

export type Shaders = DeepNotReadonly<typeof DEFAULT_VARS>;
export type ShaderName = "chromatic" | "circleBlur" | "fisheye" | "glitch" | "grayscale" | "noise" | "pixel" | "radialBlur" | "shockwave" | "vignette";
export type ShaderVarType = "int" | "int2" | "int3" | "int4" | "float" | "float2" | "float3" | "float4";

/** shader 变量的类型可以是数字、二维矢量、三维矢量或四维矢量 */
export type ShaderNumberType = number | ArrayRepeat<number, 2> | ArrayRepeat<number, 3> | ArrayRepeat<number, 4>;
export interface VarInfo {
    value: ShaderNumberType;
    type: ShaderVarType;
    min?: number;
    max?: number;
}

export function isNumberOrVector(value: unknown) {
    return isNumber(value) || isArrayOfNumbers(value, 2) || isArrayOfNumbers(value, 3) || isArrayOfNumbers(value, 4);
}

/**
 * 用来定义：
 * 有哪些 shader
 * shader 有哪些变量
 * shader 变量的类型
 * shader 变量的默认值
 */
export const DEFAULT_VARS = {
    chromatic: {
        sampleCount: { value: 3, type: "float", min: 1, max: 64 },
        power: { value: 0.01, type: "float" },
    },
    circleBlur: {
        size: { value: 10.0, type: "float" },
    },
    fisheye: {
        power: { value: -0.1, type: "float" },
    },
    glitch: {
        power: { value: 0.03, type: "float" },
        rate: { value: 0.6, type: "float", min: 0, max: 1 },
        speed: { value: 5.0, type: "float" },
        blockCount: { value: 30.5, type: "float" },
        colorRate: { value: 0.01, type: "float", min: 0, max: 1 },
    },
    grayscale: {
        factor: { value: 1.0, type: "float" },
    },
    noise: {
        seed: { value: 81.0, type: "float" },
        power: { value: 0.03, type: "float", min: 0, max: 1 },
    },
    pixel: {
        size: { value: 10.0, type: "float" },
    },
    radialBlur: {
        centerX: { value: 0.5, type: "float", min: 0, max: 1 },
        centerY: { value: 0.5, type: "float", min: 0, max: 1 },
        power: { value: 0.01, type: "float", min: 0, max: 1 },
        sampleCount: { value: 3, type: "float", min: 1, max: 64 },
    },
    shockwave: {
        progress: { value: 0.2, type: "float", min: 0, max: 1 },
        centerX: { value: 0.5, type: "float", min: 0, max: 1 },
        centerY: { value: 0.5, type: "float", min: 0, max: 1 },
        width: { value: 0.1, type: "float" },
        distortion: { value: 0.8, type: "float" },
        expand: { value: 10.0, type: "float" },
    },
    vignette: {
        color: { value: [0, 0, 0, 1] as NotReadonly<RGBAcolor>, type: "float4" },
        extend: { value: 0.25, type: "float", min: 0, max: 1 },
        radius: { value: 15.0, type: "float" },
    }
} as Record<ShaderName, Record<string, VarInfo>>;

export class Effect implements IEffect, IObjectizable {
    _start: Beats = [0, 0, 1];
    _end: Beats = [0, 0, 1];
    _shader: ShaderName = "chromatic";
    description = "";
    global: boolean = false;
    readonly vars: Record<string, ShaderNumberType | ShaderVariableEvent[]> = {};
    errors: ChartError[] = [];
    BPMList: BPM[];
    id: number;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
    isDisabled = false;
    private eventNumber = 0;
    get startTime() {
        return this._start;
    }
    set startTime(beats: Beats) {
        this._start = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get endTime() {
        return this._end;
    }
    set endTime(beats: Beats) {
        this._end = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get start() {
        return this._start;
    }
    set start(beats: Beats) {
        this._start = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get end() {
        return this._end;
    }
    set end(beats: Beats) {
        this._end = makeSureBeatsValid(beats);
        this.calculateSeconds();
    }
    get shader() {
        return this._shader;
    }
    set shader(shader: ShaderName) {
        this._shader = shader;
        this.setDefaults(true);
    }
    toObject(): IEffect {
        return {
            start: this.start,
            end: this.end,
            shader: this.shader,
            global: this.global,
            vars: new ArrayedObject(this.vars)
                .map((key, value) => {
                    if (isNumberOrVector(value)) {
                        return value;
                    }
                    else {
                        return value.map(event => event.toObject());
                    }
                })
                .toObject(),
            description: this.description,
        };
    }
    calculateSeconds() {
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this.start);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this.end);
        for (const value of Object.values(this.vars)) {
            if (!isNumberOrVector(value)) {
                for (const event of value) {
                    event.calculateSeconds();
                }
            }
        }
    }
    addEvent(event: unknown, varName: string) {
        if (isNumberOrVector(this.vars[varName])) {
            this.vars[varName] = [];
        }

        const value = this.vars[varName];
        if (!(varName in DEFAULT_VARS[this.shader])) {
            throw new Error(`尝试向不存在的变量 ${this.shader}.${varName} 添加事件`);
        }

        const newEvent = new ShaderVariableEvent(event, {
            BPMList: this.BPMList,
            shader: this.shader,
            varName: varName,
            eventNumber: this.eventNumber++,
        });
        if (isLessThanBeats(newEvent.startTime, this.startTime)) {
            newEvent.startTime = [...this.startTime];
        }

        if (isGreaterThanBeats(newEvent.endTime, this.endTime)) {
            newEvent.endTime = [...this.endTime];
        }
        value.push(newEvent);
    }
    removeEvent(event: unknown, varName: string) {
        if (isNumberOrVector(this.vars[varName])) return;
        const index = this.vars[varName].findIndex(e => e === event);
        if (index === -1) return;
        this.vars[varName].splice(index, 1);
    }
    changeToDynamic(varName: string) {
        const value = this.vars[varName];
        const event = new ShaderVariableEvent({
            start: isNumber(value) ? value : [...value],
            end: isNumber(value) ? value : [...value],
            startTime: [...this.startTime],
            endTime: [...this.endTime],
        }, {
            shader: this.shader,
            BPMList: this.BPMList,
            eventNumber: this.eventNumber++,
            varName: varName
        });
        this.vars[varName] = [event];
    }
    changeToStatic(varName: string) {
        this.vars[varName] = this.vars[varName] = DEFAULT_VARS[this.shader][varName].value;
    }
    constructor(effect: unknown, options: EffectOptions) {
        this.BPMList = options.BPMList;
        this.id = options.effectNumber;
        if (isObject(effect)) {
            if ("start" in effect) {
                if (isArrayOfNumbers(effect.start, 3)) {
                    this._start = [...effect.start];
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.start 必须是一个包含3个数字的数组，但读取到了 ${JSON.stringify(effect.start)}。将会被替换为默认值 [0, 0, 1]。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `Effect：effect 缺少 start 属性。将会被设为默认值 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error"
                ));
            }

            if ("end" in effect) {
                if (isArrayOfNumbers(effect.end, 3)) {
                    this._end = [...effect.end];
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.end 必须是一个包含3个数字的数组，但读取到了 ${JSON.stringify(effect.end)}。将会被替换为默认值 [0, 0, 1]。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `Effect：effect 缺少 end 属性。将会被设为默认值 [0, 0, 1]。`,
                    "ChartReadError.MissingProperty",
                    "error"
                ));
            }

            if ("shader" in effect) {
                if (isString(effect.shader) && effect.shader in DEFAULT_VARS) {
                    this._shader = effect.shader as ShaderName;
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.shader 必须为${Object.keys(DEFAULT_VARS).map(str => `"${str}"`)
                            .join("、")}中的一个，但读取到了 ${JSON.stringify(effect.shader)}。将会被替换为默认值 "chromatic"。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `Effect：effect 缺少 shader 属性。将会被设为默认值 "chromatic"。`,
                    "ChartReadError.MissingProperty",
                    "error"
                ));
            }

            if ("global" in effect) {
                if (isBoolean(effect.global)) {
                    this.global = effect.global;
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.global 必须为一个布尔值，但读取到了 ${JSON.stringify(effect.global)}。将会被替换为默认值 false。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
            else {
                this.errors.push(new ChartError(
                    `Effect：effect 缺少 global 属性。将会被设为默认值 false。`,
                    "ChartReadError.MissingProperty",
                    "error"
                ));
            }

            if ("vars" in effect) {
                if (isObject(effect.vars)) {
                    for (const [key, value] of Object.entries(effect.vars)) {
                        if (isNumberOrVector(value)) {
                            this.vars[key] = value;
                        }
                        else if (isArray(value)) {
                            this.vars[key] = [];
                            for (let i = 0; i < value.length; i++) {
                                const event = value[i];
                                this.addEvent(event, key);
                            }
                        }
                        else {
                            this.errors.push(new ChartError(
                                `Effect：effect.vars.${key} 必须为数字或矢量，但读取到了 ${JSON.stringify(value)}。将会被替换为空数组。`,
                                "ChartReadError.TypeError",
                                "error"
                            ));
                        }
                    }
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.vars 必须为一个对象，但读取到了 ${JSON.stringify(effect.vars)}。将会被替换为空对象。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }

            if ("description" in effect) {
                if (isString(effect.description)) {
                    this.description = effect.description;
                }
                else {
                    this.errors.push(new ChartError(
                        `Effect：effect.description 若存在，则必须为字符串，但读取到了 ${effect.description}。将会被替换为空字符串。`,
                        "ChartReadError.TypeError",
                        "error"
                    ));
                }
            }
        }
        else {
            this.errors.push(new ChartError(
                `Effect：effect 必须为一个对象，但读取到了 ${effect}。将会被替换为空对象。`,
                "ChartReadError.TypeError",
                "error"
            ));
        }
        this.cachedStartSeconds = beatsToSeconds(this.BPMList, this.start);
        this.cachedEndSeconds = beatsToSeconds(this.BPMList, this.end);

        // 设置默认值
        this.setDefaults();
    }
    setDefaults(rewrite = false) {
        const currentShaderVars = DEFAULT_VARS[this.shader];
        const allowedKeys = new Set(Object.keys(currentShaderVars));

        // Remove properties not in DEFAULT_VARS
        for (const key in this.vars) {
            if (!allowedKeys.has(key)) {
                delete this.vars[key];
            }
        }

        // Add missing default values
        for (const [key, info] of Object.entries(currentShaderVars)) {
            if (!(key in this.vars) || rewrite) {
                this.vars[key] = info.value;
            }
        }
    }
}