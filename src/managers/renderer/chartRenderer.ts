/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { easingFuncs, EasingType } from "@/models/easing";
import { interpolateNumberEventValue, findLastEvent, interpolateColorEventValue, interpolateTextEventValue, interpolateShaderVariableEventValue } from "@/models/event";
import { INote, INoteHighlight, INoteJudgement, NoteAbove, NoteType } from "@/models/note";
import store from "@/store";
import { ArrayedObject, sortAndForEach } from "@/tools/algorithm";
import canvasUtils from "@/tools/canvasUtils";
import { GREEN, isEqualRGBcolors, RGBAtoRGB, RGBcolor, WHITE } from "@/tools/color";
import MathUtils from "@/tools/mathUtils";
import { ceil, isNull } from "lodash";
import Manager from "./abstract";
import globalEventEmitter from "@/eventEmitter";
import { ArrayRepeat, UnionToTuple } from "@/tools/typeTools";
import EditableImage from "@/tools/editableImage";
import Constants from "@/constants";
import { ElMessage } from "element-plus";
import { DEFAULT_VARS, isNumberOrVector, ShaderName, ShaderNumberType, ShaderVarType } from "@/models/effect";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { ITimeSegment } from "@/models/timeSegment";

interface ShaderInfo {
    name: ShaderName;
    global: boolean;
    options: Record<string, {
        type: ShaderVarType;
        value: ShaderNumberType;
    } | null>
}

// 4 bytes per float
const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

// 4 vertices
const VERTEX_STRIDE = 4 * FLOAT_SIZE;

// x, y
const POSITION_COMPONENTS = 2;

// 2 * 4 = 8 bytes
const TEXCOORD_OFFSET = POSITION_COMPONENTS * FLOAT_SIZE;

export default class ChartRenderer extends Manager {
    private offscreenCanvas = new OffscreenCanvas(Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
    private shaderCanvas: HTMLCanvasElement | null = null;
    private gl: WebGLRenderingContext | null = null;
    private shaderProgram: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private vertexBuffer: WebGLBuffer | null = null;
    private vertexShader: WebGLShader | null = null;
    private fragmentShader: WebGLShader | null = null;
    private currentShaderName: string | null = null;
    constructor() {
        super();
        globalEventEmitter.on("RENDER_CHART", createCatchErrorByMessage(() => {
            this.render();
        }, "渲染谱面", false));
    }

    /** 显示谱面到 canvas 上 */
    render() {
        const canvas = store.useCanvas();
        const ctx = canvasUtils.getContext(canvas);

        // 把背景、判定线和音符绘制到离屏 canvas 上
        this.drawBackground();
        this.drawJudgeLines();
        this.drawNotes();

        // 把屏幕 canvas 全部清空
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 获取 shader 信息
        const shaderConfigs = this.getShaderInfo();

        // 获取离屏 canvas 的上下文
        const ctxOffscreen = canvasUtils.getOffscreenCanvasContext(this.offscreenCanvas);

        const _addShader = (shaderConfig: ShaderInfo) => {
            // 把 offscreenCanvas 的内容加上一层 shader
            this.applyShaderEffect(shaderConfig.name, shaderConfig.options);

            // 把应用 shader 之后的内容绘制回 offscreenCanvas 上，作为下一个 shader 的输入
            ctxOffscreen.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
            ctxOffscreen.drawImage(this.shaderCanvas!, 0, 0, canvas.width, canvas.height);
        };

        // 先应用非全局的 shader
        for (const shaderConfig of shaderConfigs.filter(shaderConfig => !shaderConfig.global)) {
            _addShader(shaderConfig);
        }

        // 显示未被判定线绑定的 UI
        this.drawUI();

        // 再应用全局的 shader，此时 shader 会影响 UI
        for (const shaderConfig of shaderConfigs.filter(shaderConfig => shaderConfig.global)) {
            _addShader(shaderConfig);
        }

        // 到最后，offscreenCanvas 上显示的应该是已经叠加了所有 shader 的画面
        // 把 offscreenCanvas 直接绘制到屏幕 canvas 上
        ctx.drawImage(this.offscreenCanvas, 0, 0, canvas.width, canvas.height);
    }

    private getShaderInfo(): ShaderInfo[] {
        const chartPackage = store.useChartPackage();
        const seconds = store.getSeconds();
        const extra = chartPackage.extra;
        const effects = extra.effects.filter(effect => effect.cachedStartSeconds <= seconds && effect.cachedEndSeconds >= seconds);
        return effects.map(effect => ({
            name: effect.shader,
            global: effect.global,
            options: new ArrayedObject(effect.vars).map((key) => {
                const value = effect.vars[key];
                if (isNumberOrVector(value)) {
                    if (!(key in DEFAULT_VARS[effect.shader])) {
                        return null;
                    }
                    return {
                        type: DEFAULT_VARS[effect.shader][key].type,
                        value,
                    };
                }
                else {
                    const event = findLastEvent(value, seconds);
                    if (!event) {
                        return null;
                    }
                    return {
                        type: DEFAULT_VARS[effect.shader][key].type,
                        value: interpolateShaderVariableEventValue(event, seconds),
                    };
                }
            })
                .filter(v => !isNull(v))
                .toObject(),
        }));
    }

    /** 把 shader 效果应用到 canvas 上 */
    private async applyShaderEffect(shaderName: ShaderInfo["name"], shaderOptions: ShaderInfo["options"] = {}) {
        const sourceCanvas = this.offscreenCanvas;

        // Create or get shader canvas
        if (!this.shaderCanvas) {
            this.createShaderCanvas();
        }

        if (!this.shaderCanvas || !this.gl) return;

        // Ensure shader canvas matches source canvas size
        if (this.shaderCanvas.width !== sourceCanvas.width ||
            this.shaderCanvas.height !== sourceCanvas.height) {
            this.shaderCanvas.width = sourceCanvas.width;
            this.shaderCanvas.height = sourceCanvas.height;
            this.gl.viewport(0, 0, this.shaderCanvas.width, this.shaderCanvas.height);
        }

        // Load and compile shaders if needed
        if (!this.shaderProgram || this.currentShaderName !== shaderName) {
            await this.loadAndCompileShaders(shaderName);
            this.currentShaderName = shaderName;
        }

        if (this.shaderProgram && this.gl) {
            // Apply the shader effect
            this.renderWithShader(shaderName, shaderOptions);
        }
    }

    /** 创建专门用于 shader 处理的 WebGL 环境 */
    private createShaderCanvas() {
        const sourceCanvas = this.offscreenCanvas;

        // 创建一个独立的 canvas 用于 WebGL 渲染
        this.shaderCanvas = document.createElement("canvas");
        this.shaderCanvas.width = sourceCanvas.width;
        this.shaderCanvas.height = sourceCanvas.height;

        // 获取WebGL上下文（不与主Canvas冲突）
        this.gl = this.shaderCanvas.getContext("webgl") ||
            this.shaderCanvas.getContext("experimental-webgl") as WebGLRenderingContext;

        if (!this.gl) {
            this.gl = null;
            throw new Error("不支持 WebGL，将无法使用 shader 效果");
        }

        // 设置视口
        this.gl.viewport(0, 0, this.shaderCanvas.width, this.shaderCanvas.height);

        // 预创建纹理和顶点缓冲区以提高性能
        this.texture = this.gl.createTexture();

        // 创建全屏四边形的顶点数据
        const vertices = new Float32Array([
            -1.0, -1.0, 0.0, 1.0,
            1.0, -1.0, 1.0, 1.0,
            -1.0, 1.0, 0.0, 0.0,
            1.0, 1.0, 1.0, 0.0
        ]);

        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }

    /** Load and compile shader programs */
    private async loadAndCompileShaders(shaderName: string) {
        if (!this.gl || !window.electronAPI || !window.electronAPI.loadShaderFile) {
            return;
        }

        if (this.shaderProgram) {
            this.gl?.deleteProgram(this.shaderProgram);
            this.shaderProgram = null;
        }

        if (this.vertexShader) {
            this.gl?.deleteShader(this.vertexShader);
            this.vertexShader = null;
        }

        if (this.fragmentShader) {
            this.gl?.deleteShader(this.fragmentShader);
            this.fragmentShader = null;
        }

        // Load vertex and fragment shaders
        const { vsh: vertexShaderSource, fsh: fragmentShaderSource } = await window.electronAPI.loadShaderFile(shaderName);

        if (!vertexShaderSource) {
            throw new Error(`shader 不存在，缺少 vertex shader：${shaderName}`);
        }

        if (!fragmentShaderSource) {
            throw new Error(`shader 不存在，缺少 fragment shader：${shaderName}`);
        }

        // Compile shaders
        this.vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        this.fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

        // Create shader program
        this.shaderProgram = this.gl.createProgram();
        if (!this.shaderProgram) {
            throw new Error("无法创建着色器程序对象");
        }

        this.gl.attachShader(this.shaderProgram, this.vertexShader);
        this.gl.attachShader(this.shaderProgram, this.fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            const log = this.gl.getProgramInfoLog(this.shaderProgram);
            this.gl.deleteProgram(this.shaderProgram);
            this.shaderProgram = null;
            throw new Error(`无法链接着色器程序：${log}`);
        }

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            const log = this.gl.getProgramInfoLog(this.shaderProgram);
            this.gl.deleteProgram(this.shaderProgram);
            this.shaderProgram = null;
            this.currentShaderName = null;
            throw new Error(`无法链接着色器程序：${log}`);
        }
    }

    /**
     * 编译指定类型的 WebGL 着色器。
     *
     * 该函数负责创建着色器对象、设置源代码、执行编译并验证编译结果。
     * 若编译失败，将自动清理资源并返回 null。
     *
     * @param source 着色器源代码字符串（GLSL 代码）
     * @param type 着色器类型常量，必须是 gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER
     * @returns 编译成功的 WebGLShader 对象，若上下文不可用或编译失败则报错
     */
    private compileShader(source: string, type: WebGLRenderingContext["VERTEX_SHADER"] | WebGLRenderingContext["FRAGMENT_SHADER"]): WebGLShader {
        if (!this.gl) {
            throw new Error("WebGL 上下文不可用");
        }

        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error("无法创建着色器");
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const log = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`无法编译 shader：${log}`);
        }

        return shader;
    }

    /** 使用Shader处理Canvas内容 */
    private renderWithShader(shaderName: ShaderName, shaderOptions: ShaderInfo["options"]) {
        const sourceCanvas = this.offscreenCanvas;

        // 检查必要资源是否存在
        if (!this.gl || !this.shaderProgram || !this.shaderCanvas || !this.texture || !this.vertexBuffer) {
            throw new Error("必要资源不存在");
        }

        // 清空WebGL画布
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // 将 sourceCanvas 的内容作为纹理绑定到WebGL
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, sourceCanvas);

        // 设置纹理参数
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        // 使用 shader 程序
        this.gl.useProgram(this.shaderProgram);

        // 设置 shader 变量
        for (const [key, defaultValue] of Object.entries(DEFAULT_VARS[shaderName])) {
            const location = this.gl.getUniformLocation(this.shaderProgram, key);

            // 添加检查，确保location不为null
            if (location === null) {
                console.error(`没有找到 uniform 变量 ${key}，该变量将会被忽略`);
                continue;
            }

            const value = shaderOptions[key]?.value !== undefined ?
                shaderOptions[key].value :
                defaultValue.value;

            switch (defaultValue.type) {
                case "int":
                    this.gl.uniform1i(location, value as number);
                    break;
                case "int2":
                    this.gl.uniform2iv(location, value as ArrayRepeat<number, 2>);
                    break;
                case "int3":
                    this.gl.uniform3iv(location, value as ArrayRepeat<number, 3>);
                    break;
                case "int4":
                    this.gl.uniform4iv(location, value as ArrayRepeat<number, 4>);
                    break;
                case "float":
                    this.gl.uniform1f(location, value as number);
                    break;
                case "float2":
                    this.gl.uniform2fv(location, value as ArrayRepeat<number, 2>);
                    break;
                case "float3":
                    this.gl.uniform3fv(location, value as ArrayRepeat<number, 3>);
                    break;
                case "float4":
                    this.gl.uniform4fv(location, value as ArrayRepeat<number, 4>);
                    break;
                default:
                    throw new Error(`未知的 shader 变量类型：${shaderOptions[key]?.type}`);
            }
        }

        // 设置顶点属性
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

        // 时间属性
        const timeLocation = this.gl.getUniformLocation(this.shaderProgram, "time");
        if (timeLocation !== null) {
            const seconds = store.getSeconds();
            this.gl.uniform1f(timeLocation, seconds);
        }

        // 位置属性
        const positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, VERTEX_STRIDE, 0);

        // 纹理坐标属性
        const texcoordLocation = this.gl.getAttribLocation(this.shaderProgram, "a_texCoord");
        this.gl.enableVertexAttribArray(texcoordLocation);
        this.gl.vertexAttribPointer(texcoordLocation, 2, this.gl.FLOAT, false, VERTEX_STRIDE, TEXCOORD_OFFSET);

        // 设置纹理uniform
        const textureLocation = this.gl.getUniformLocation(this.shaderProgram, "u_texture");
        this.gl.uniform1i(textureLocation, 0);

        // 设置屏幕尺寸uniform
        const screenSizeLocation = this.gl.getUniformLocation(this.shaderProgram, "screenSize");
        this.gl.uniform2f(screenSizeLocation, sourceCanvas.width, sourceCanvas.height);

        // 绘制全屏四边形
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    /** 显示背景的曲绘 */
    private drawBackground() {
        const settingsManager = store.useManager("settingsManager");
        const canvas = this.offscreenCanvas;
        const chartPackage = store.useChartPackage();
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        const { background } = chartPackage;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imageWidth = background.width;
        const imageHeight = background.height;
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        const scale = Math.max(scaleX, scaleY);
        const cropWidth = canvasWidth / scale;
        const cropHeight = canvasHeight / scale;
        let cropX = 0;
        let cropY = 0;
        if (scale === scaleX) {
            cropY = (imageHeight - cropHeight) / 2;
        }
        else {
            cropX = (imageWidth - cropWidth) / 2;
        }
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        ctx.drawImage(
            background,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, canvasWidth, canvasHeight
        );
        drawRect(
            0,
            0,
            canvas.width,
            canvas.height,
            "black",
            true,
            settingsManager._settings.backgroundDarkness / 100);
    }

    /** 显示判定线及其贴图和UI */
    private drawJudgeLines() {
        const settingsManager = store.useManager("settingsManager");
        const stateManager = store.useManager("stateManager");
        const autoplayManager = store.useManager("autoplayManager");
        const coordinateManager = store.useManager("coordinateManager");
        const canvas = this.offscreenCanvas;
        const seconds = store.getSeconds();
        const chart = store.useChart();
        const audio = store.useAudio();
        const chartPackage = store.useChartPackage();
        const resourcePackage = store.useResourcePackage();
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        const { combo, score } = autoplayManager;

        const shownCombo = combo < 3 && combo >= 0 ? "" : combo.toString();
        const perfectScoreString = Constants.CHART_VIEW_PERFECT_SCORE.toString();
        const shownScore = isNaN(score) ?
            perfectScoreString :
            Math.round(score)
                .toString()
                .padStart(perfectScoreString.length, "0");

        const drawLine = canvasUtils.drawLine.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);

        const { textures } = chartPackage;
        const defaultScaleX = 1;
        const defaultScaleY = 1;
        const defaultColor = RGBAtoRGB(resourcePackage.config.colorPerfect);
        const currentColor: RGBcolor = GREEN;
        sortAndForEach(chart.judgeLineList, (x, y) => x.zOrder - y.zOrder, (judgeLine, i) => {
            const { x, y, angle, alpha, scaleX, scaleY, color, text } = this.getJudgeLineInfo(i, seconds, {
                getX: true,
                getY: true,
                getAngle: true,
                getAlpha: true,
                getScaleX: true,
                getScaleY: true,
                getColor: true,
                getText: true
            });
            const radians = MathUtils.degToRad(angle);
            const isMarkedCurrent = stateManager._state.currentJudgeLineNumber === i && settingsManager._settings.markCurrentJudgeLine;

            // const defaultPaint = 0;
            // const defaultText = "";

            ctx.save();
            if (judgeLine.attachUI !== "none") {
                switch (judgeLine.attachUI) {
                    case "combonumber":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_COMBO_NUMBER_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_COMBO_NUMBER_POSITION.y));
                        break;

                    case "combo":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_COMBO_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_COMBO_POSITION.y));
                        break;

                    case "score":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_SCORE_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_SCORE_POSITION.y));
                        break;

                    case "name":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_NAME_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_NAME_POSITION.y));
                        break;

                    case "level":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_LEVEL_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_LEVEL_POSITION.y));
                        break;

                    case "pause":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.y));
                        break;

                    case "bar":
                        ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_BAR_POSITION.x), coordinateManager.convertYToCanvas(Constants.CHART_VIEW_BAR_POSITION.y));
                        break;
                }

                // canvas坐标系的Y轴方向和谱面坐标系是相反的，所以把Y坐标取反
                ctx.translate(x, -y);
            }
            else {
                ctx.translate(coordinateManager.convertXToCanvas(x), coordinateManager.convertYToCanvas(y));
            }

            // For text elements, adjust the rotation point to the center
            if (text !== undefined || judgeLine.attachUI === "name" || judgeLine.attachUI === "level") {
                let textToMeasure = "";
                let textAlign: CanvasTextAlign = "center";

                if (text !== undefined) {
                    textToMeasure = text;
                }
                else if (judgeLine.attachUI === "name") {
                    textToMeasure = chart.META.name;
                    textAlign = "left";
                }
                else if (judgeLine.attachUI === "level") {
                    textToMeasure = chart.META.level;
                    textAlign = "right";
                }

                if (textToMeasure) {
                    // Set the font to measure text correctly
                    ctx.font = `${(() => {
                        if (judgeLine.attachUI === "name") {
                            return Constants.CHART_VIEW_NAME_SIZE;
                        }
                        else {
                            return Constants.CHART_VIEW_LEVEL_SIZE;
                        }
                    })()}px PhiFont`;
                    const metrics = ctx.measureText(textToMeasure);
                    const textWidth = metrics.width;

                    // Adjust the rotation point based on text alignment
                    let offsetX = 0;
                    if (textAlign === "left") {
                        offsetX = textWidth / 2;
                    }
                    else if (textAlign === "right") {
                        offsetX = -textWidth / 2;
                    }

                    // Apply the translation to rotate around the center
                    ctx.translate(offsetX, 0);
                }
            }

            // 旋转
            ctx.rotate(radians);

            if (settingsManager._settings.showJudgeLineNumber) {
                // 在靠下30像素的位置显示判定线号，字号为30px，颜色与判定线颜色相同
                writeText(judgeLine.father < 0 ? i.toString() : `${i}(${judgeLine.father})`,
                    0,
                    Constants.CHART_VIEW_JUDGE_LINE_NUMBER_DISTANCE,
                    Constants.CHART_VIEW_JUDGE_LINE_NUMBER_FONT_SIZE,
                    isMarkedCurrent ? currentColor : color ?? defaultColor);
            }

            // 缩放
            ctx.scale(scaleX ?? defaultScaleX, scaleY ?? defaultScaleY);

            // 没有透明度的判定线不绘制
            if (alpha <= 0) {
                ctx.restore();
                return;
            }

            // 如果透明度小于0，则按照透明度等于0处理
            if (alpha < 0) {
                ctx.globalAlpha = 0;
            }

            // 如果透明度大于255，则按照透明度等于255处理
            else if (alpha > 255) {
                ctx.globalAlpha = 1;
            }

            // 否则按照正常的透明度处理
            else {
                ctx.globalAlpha = alpha / 255;
            }

            const size = ((): [number, number] => {
                if (judgeLine.Texture in textures) {
                    const image = textures[judgeLine.Texture];
                    return [image.width, image.height];
                }

                if (text !== undefined) {
                    ctx.font = `${settingsManager._settings.textSize}px PhiFont`;
                    return [ctx.measureText(text).width, settingsManager._settings.textSize];
                }
                else {
                    return [settingsManager._settings.lineLength, settingsManager._settings.lineThickness];
                }
            })();

            // 根据判定线锚点偏移
            ctx.translate((0.5 - judgeLine.anchor[0]) * size[0],
                (0.5 - judgeLine.anchor[1]) * size[1]);

            if (judgeLine.Texture in textures) {
                const image = textures[judgeLine.Texture];
                if (isMarkedCurrent) {
                    const editableImage = new EditableImage(image);
                    editableImage.addColor(currentColor);
                    const newImage = editableImage.canvas;
                    ctx.drawImage(
                        newImage,
                        -newImage.width / 2,
                        -newImage.height / 2,
                        newImage.width,
                        newImage.height);
                }
                else if (color === undefined || isEqualRGBcolors(color, WHITE)) {
                    ctx.drawImage(
                        image,
                        -image.width / 2,
                        -image.height / 2,
                        image.width,
                        image.height);
                }
                else {
                    const editableImage = new EditableImage(image);
                    editableImage.addColor(color);
                    const newImage = editableImage.canvas;
                    ctx.drawImage(
                        newImage,
                        -newImage.width / 2,
                        -newImage.height / 2,
                        newImage.width,
                        newImage.height);
                }
            }

            // 如果有文字事件，就显示文字
            else if (text !== undefined) {
                writeText(
                    text,
                    0,
                    0,
                    settingsManager._settings.textSize,
                    isMarkedCurrent ? currentColor : color,
                    true,
                    alpha / 255);
            }

            // 如果判定线绑定了UI，就显示UI
            else if (judgeLine.attachUI !== "none") {
                switch (judgeLine.attachUI) {
                    case "combonumber":
                        if (shownCombo) {
                            writeText(shownCombo,
                                0,
                                0,
                                Constants.CHART_VIEW_COMBO_NUMBER_SIZE,
                                isMarkedCurrent ? currentColor : color,
                                true,
                                alpha / 255);
                        }
                        break;

                    case "combo":
                        if (shownCombo) {
                            writeText(Constants.CHART_VIEW_COMBO_TEXT,
                                0,
                                0,
                                Constants.CHART_VIEW_COMBO_SIZE,
                                isMarkedCurrent ? currentColor : color,
                                true,
                                alpha / 255);
                        }
                        break;

                    case "score":
                        writeText(shownScore,
                            0,
                            0,
                            Constants.CHART_VIEW_SCORE_SIZE,
                            isMarkedCurrent ? currentColor : color,
                            true,
                            alpha / 255);
                        break;

                    case "name":
                        writeText(chart.META.name,
                            0,
                            0,
                            Constants.CHART_VIEW_NAME_SIZE,
                            isMarkedCurrent ? currentColor : color,
                            true,
                            alpha / 255);
                        break;

                    case "level":
                        writeText(chart.META.level,
                            0,
                            0,
                            Constants.CHART_VIEW_LEVEL_SIZE,
                            isMarkedCurrent ? currentColor : color,
                            true,
                            alpha / 255);
                        break;

                    case "pause":
                        drawRect(-Constants.CHART_VIEW_PAUSE_WIDTH / 2,
                            -Constants.CHART_VIEW_PAUSE_HEIGHT / 2,
                            Constants.CHART_VIEW_PAUSE_WIDTH / 3,
                            Constants.CHART_VIEW_PAUSE_HEIGHT,
                            isMarkedCurrent ? currentColor : color,
                            true,
                            alpha / 255);

                        drawRect(Constants.CHART_VIEW_PAUSE_WIDTH / 2 / 3,
                            -Constants.CHART_VIEW_PAUSE_HEIGHT / 2,
                            Constants.CHART_VIEW_PAUSE_WIDTH / 3,
                            Constants.CHART_VIEW_PAUSE_HEIGHT,
                            isMarkedCurrent ? currentColor : color,
                            true,
                            alpha / 255);
                        break;

                    case "bar":
                        drawLine(0,
                            0,
                            audio.currentTime / audio.duration * canvas.width,
                            0,
                            isMarkedCurrent ? currentColor : color,
                            Constants.CHART_VIEW_BAR_THICKNESS,
                            alpha / 255);
                        break;
                }
            }

            // 如果都没有，就显示正常的判定线
            else {
                drawLine(
                    -settingsManager._settings.lineLength / 2,
                    0,
                    settingsManager._settings.lineLength / 2,
                    0,
                    isMarkedCurrent ? currentColor : color ?? defaultColor,
                    settingsManager._settings.lineThickness,
                    alpha / 255);
            }

            ctx.restore();
        });
    }

    private drawUI() {
        const autoplayManager = store.useManager("autoplayManager");
        const coordinateManager = store.useManager("coordinateManager");
        const canvas = this.offscreenCanvas;
        const chart = store.useChart();
        const audio = store.useAudio();
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        const { combo, score } = autoplayManager;

        const shownCombo = combo < 3 && combo >= 0 ? "" : combo.toString();
        const perfectScoreString = Constants.CHART_VIEW_PERFECT_SCORE.toString();
        const shownScore = isNaN(score) ?
            perfectScoreString :
            Math.round(score)
                .toString()
                .padStart(perfectScoreString.length, "0");

        const drawLine = canvasUtils.drawLine.bind(ctx);
        const writeText = canvasUtils.writeText.bind(ctx);
        const drawRect = canvasUtils.drawRect.bind(ctx);
        let comboNumberIsAttached = false,
            comboIsAttached = false,
            scoreIsAttached = false,
            pauseIsAttached = false,
            nameIsAttached = false,
            levelIsAttached = false,
            barIsAttached = false;
        for (const judgeLine of chart.judgeLineList) {
            if (judgeLine.attachUI !== "none") {
                switch (judgeLine.attachUI) {
                    case "combonumber":
                        comboNumberIsAttached = true;
                        break;

                    case "combo":
                        comboIsAttached = true;
                        break;

                    case "score":
                        scoreIsAttached = true;
                        break;

                    case "name":
                        nameIsAttached = true;
                        break;

                    case "level":
                        levelIsAttached = true;
                        break;

                    case "pause":
                        pauseIsAttached = true;
                        break;

                    case "bar":
                        barIsAttached = true;
                        break;
                }
            }
        }

        if (!comboNumberIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_COMBO_NUMBER_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_COMBO_NUMBER_POSITION.y));

            if (shownCombo) {
                writeText(shownCombo,
                    0,
                    0,
                    Constants.CHART_VIEW_COMBO_NUMBER_SIZE,
                    "white",
                    true,
                    255);
            }
            ctx.restore();
        }

        if (!comboIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_COMBO_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_COMBO_POSITION.y));

            if (shownCombo) {
                writeText(Constants.CHART_VIEW_COMBO_TEXT,
                    0,
                    0,
                    Constants.CHART_VIEW_COMBO_SIZE,
                    "white",
                    true);
            }
            ctx.restore();
        }

        if (!scoreIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_SCORE_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_SCORE_POSITION.y));

            writeText(shownScore,
                0,
                0,
                Constants.CHART_VIEW_SCORE_SIZE,
                "white",
                true);

            ctx.restore();
        }

        if (!nameIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_NAME_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_NAME_POSITION.y));

            writeText(chart.META.name,
                0,
                0,
                Constants.CHART_VIEW_NAME_SIZE,
                "white",
                true,
                undefined,
                "left");

            ctx.restore();
        }

        if (!levelIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_LEVEL_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_LEVEL_POSITION.y));

            writeText(chart.META.level,
                0,
                0,
                Constants.CHART_VIEW_LEVEL_SIZE,
                "white",
                true,
                undefined,
                "right");

            ctx.restore();
        }

        if (!pauseIsAttached) {
            ctx.save();
            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.y));

            drawRect(-Constants.CHART_VIEW_PAUSE_WIDTH / 2,
                -Constants.CHART_VIEW_PAUSE_HEIGHT / 2,
                Constants.CHART_VIEW_PAUSE_WIDTH / 3,
                Constants.CHART_VIEW_PAUSE_HEIGHT,
                "white",
                true);

            drawRect(Constants.CHART_VIEW_PAUSE_WIDTH / 2 / 3,
                -Constants.CHART_VIEW_PAUSE_HEIGHT / 2,
                Constants.CHART_VIEW_PAUSE_WIDTH / 3,
                Constants.CHART_VIEW_PAUSE_HEIGHT,
                "white",
                true);

            ctx.restore();
        }

        if (!barIsAttached) {
            ctx.save();

            ctx.translate(coordinateManager.convertXToCanvas(Constants.CHART_VIEW_BAR_POSITION.x),
                coordinateManager.convertYToCanvas(Constants.CHART_VIEW_BAR_POSITION.y));

            drawLine(0,
                0,
                audio.currentTime / audio.duration * canvas.width,
                0,
                "white",
                Constants.CHART_VIEW_BAR_THICKNESS);

            ctx.restore();
        }
    }

    /** 显示音符及其打击特效 */
    private drawNotes() {
        const settingsManager = store.useManager("settingsManager");
        const coordinateManager = store.useManager("coordinateManager");
        const canvas = this.offscreenCanvas;
        const seconds = store.getSeconds();
        const chart = store.useChart();
        const resourcePackage = store.useResourcePackage();
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);

        const drawRect = canvasUtils.drawRect.bind(ctx);

        const RENDERING_LAYER = {
            [NoteType.Hold]: 0,
            [NoteType.Drag]: 1,
            [NoteType.Tap]: 2,
            [NoteType.Flick]: 3,
            hitFx: 4
        } as const;
        type PriorityCount = UnionToTuple<keyof typeof RENDERING_LAYER>["length"];

        const functions: ArrayRepeat<(() => void)[], PriorityCount> = [[], [], [], [], []];
        for (let judgeLineNumber = 0; judgeLineNumber < chart.judgeLineList.length; judgeLineNumber++) {
            const judgeLine = chart.judgeLineList[judgeLineNumber];
            const judgeLineInfo = this.getJudgeLineInfo(judgeLineNumber, seconds, {
                getX: true,
                getY: true,
                getAngle: true,
                getAlpha: true
            });
            const currentPositionY = judgeLine.getFloorPositionOfSeconds(seconds);
            const drawNote = (note: INote & ITimeSegment & INoteJudgement & INoteHighlight) => {
                // 把当前判定线的角度转为弧度
                const radians = MathUtils.degToRad(judgeLineInfo.angle);
                const missSeconds = note.getJudgementRange().bad;
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;

                // 计算音符头部和尾部离判定线的距离
                let startPositionY = judgeLine.getFloorPositionOfSeconds(startSeconds) - currentPositionY;
                let endPositionY = judgeLine.getFloorPositionOfSeconds(endSeconds) - currentPositionY;

                // 正在判定的Hold音符，头部强制设为0
                if (note.type === NoteType.Hold && seconds >= startSeconds && seconds < endSeconds) {
                    startPositionY = 0;
                }

                const isCovered = endPositionY < 0 && judgeLine.isCover === 1 && seconds < endSeconds;

                startPositionY = startPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                endPositionY = endPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;

                if (startSeconds - seconds > note.visibleTime) {
                    // note不在可见时间内
                    return;
                }

                if (judgeLineInfo.alpha < 0) {
                    // 线的透明度是负数把note给隐藏了
                    return;
                }

                if (isCovered) {
                    // note被遮罩了
                    return;
                }

                if (note.type === NoteType.Hold) {
                    const { type, highlight } = note;
                    functions[RENDERING_LAYER[NoteType.Hold]].push(() => {
                        ctx.globalAlpha = note.alpha / 255;
                        const missed = seconds > startSeconds + missSeconds && note.getJudgement() === "none";
                        if (missed && !note.isFake) {
                            ctx.globalAlpha *= Constants.CHART_VIEW_MISS_ALPHA;
                        }

                        // 以判定线为参考系
                        ctx.save();
                        ctx.translate(coordinateManager.convertXToCanvas(judgeLineInfo.x), coordinateManager.convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        if (startPositionY > endPositionY) {
                            //    startPositionY --> sy
                            //     endPositionY --> ey
                            //       positionX --> x
                            //
                            // +6   _____               -6
                            // +5  /     \  A.x  = -6   -5
                            // +4  |  A  |  A.sy = 2    -4
                            // +3  |     |  A.ey = 5    -3
                            // +2  \_____/  A.sy < A.ey -2
                            // +1                       -1
                            // 0y x9876543210123456789x y0
                            // -1   _____               +1
                            // -2  /     \  B.x  = -6   +2
                            // -3  |  B  |  B.sy = -2   +3
                            // -4  |     |  B.ey = -5   +4
                            // -5  \_____/  B.sy > B.ey +5
                            // -6                       +6
                            // 上下翻转之后，y坐标再变相反数，可以正确显示倒打长条，否则会显示成倒的
                            // 因为canvas绘制图片时，无论图片的宽高是正数还是负数，图片都是正立的

                            ctx.scale(1, -1);
                            startPositionY = -startPositionY;
                            endPositionY = -endPositionY;
                        }

                        const height = endPositionY - startPositionY;
                        const { head, body, end } = resourcePackage.getSkin(type, highlight);
                        const width = note.size * settingsManager._settings.noteSize *
                            resourcePackage.getSkin(type, highlight).body.width / resourcePackage.getSkin(type, false).body.width;
                        const headHeight = head.height / head.width * width;
                        const endHeight = end.height / end.width * width;

                        // 显示主体

                        // holdRepeat 有性能问题，长条太长时会很卡
                        if (resourcePackage.config.holdRepeat) {
                            const step = body.height / body.width * width;
                            for (let i = height; i >= 0; i -= step) {
                                if (i < step) {
                                    ctx.drawImage(body,
                                        0, 0, body.width, body.height * (i / step),
                                        note.positionX - width / 2, -startPositionY - i, width, i);
                                }
                                else {
                                    ctx.drawImage(body, note.positionX - width / 2, -startPositionY - i, width, step);
                                }
                            }
                        }
                        else {
                            ctx.drawImage(body, note.positionX - width / 2, -startPositionY - height, width, height);
                        }

                        // 显示头部
                        if (seconds < startSeconds || resourcePackage.config.holdKeepHead) {
                            ctx.drawImage(head, note.positionX - width / 2, -startPositionY, width, headHeight);
                        }

                        // 显示尾部
                        ctx.drawImage(end, note.positionX - width / 2, -endPositionY - endHeight, width, endHeight);

                        ctx.restore();
                    });
                }
                else {
                    const { type, highlight } = note;
                    functions[RENDERING_LAYER[note.type]].push(() => {
                        ctx.globalAlpha = note.alpha / 255;

                        // 当前时间大于音符时间，说明音符时间到了还没有击打，显示为即将miss（不透明度降低）
                        if (seconds >= startSeconds) {
                            if (note.isFake) {
                                return;
                            }
                            ctx.globalAlpha *= Math.max(0, 1 - (seconds - startSeconds) / missSeconds);
                        }

                        const image = resourcePackage.getSkin(type, highlight);
                        const width = note.size * settingsManager._settings.noteSize *
                            resourcePackage.getSkin(type, highlight).width / resourcePackage.getSkin(type, false).width;
                        const height = image.height / image.width * settingsManager._settings.noteSize;

                        // const height = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                        ctx.save();
                        ctx.translate(coordinateManager.convertXToCanvas(judgeLineInfo.x), coordinateManager.convertYToCanvas(judgeLineInfo.y));
                        ctx.rotate(radians);
                        ctx.drawImage(image,
                            0, 0, image.width, image.height,
                            note.positionX - width / 2, -startPositionY - height / 2, width, height);
                        ctx.restore();
                    });
                }
            };

            for (let noteNumber = 0; noteNumber < judgeLine.notes.length; noteNumber++) {
                const note = judgeLine.notes[noteNumber];
                const startSeconds = note.cachedStartSeconds;
                const endSeconds = note.cachedEndSeconds;

                // 显示打击特效
                if (!note.isFake) {
                    (() => {
                        const hitSeconds = note.hitSeconds;
                        if (note.type === NoteType.Hold) {
                            if (!hitSeconds || seconds >= endSeconds + resourcePackage.config.hitFxDuration) {
                                return;
                            }
                        }
                        else {
                            if (!hitSeconds || seconds >= hitSeconds + resourcePackage.config.hitFxDuration) {
                                return;
                            }
                        }

                        /** Hold多少秒显示一次打击特效 */
                        const hitFxFrequency = 0.25;

                        /** 粒子大小 */
                        const particleSize = 25;

                        /** 粒子数量 */
                        const particleCount = 5;

                        /** 粒子半径 */
                        const particleRadius = 256;
                        functions[RENDERING_LAYER.hitFx].push(() => {
                            const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitSeconds, {
                                getX: true,
                                getY: true,
                                getAngle: true
                            });
                            const radians = MathUtils.degToRad(angle);
                            const judgement = note.getJudgement();

                            /** 一个随机数种子生成器，只要保证输入不同的数字输出也不同就可以，这个是最优的方案 */
                            const hash = (a: number, b: number, c: number) => a * a + b * b + c * c;

                            /**
                             * 给这个音符显示打击特效，“这个”音符见外部作用域中的 `note` 变量。
                             * @param type 判定类型
                             * @param hitFxStartSeconds 打击特效开始出现的时间
                             * @param n 打击特效的序号。对于非 Hold 音符或判定为 Bad 的音符，`n` 永远为 0。
                             * `n` 仅用于计算打击特效粒子的位置
                             */
                            const showHitFx = (type: "perfect" | "good" | "bad", hitFxStartSeconds: number, n: number) => {
                                if (type === "bad") {
                                    let startPositionY = judgeLine.getFloorPositionOfSeconds(startSeconds) - judgeLine.getFloorPositionOfSeconds(hitSeconds);
                                    startPositionY = startPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                                    ctx.globalAlpha = (1 - (seconds - hitSeconds) / resourcePackage.config.hitFxDuration) * Constants.CHART_VIEW_BAD_ALPHA;
                                    ctx.save();
                                    ctx.translate(coordinateManager.convertXToCanvas(x), coordinateManager.convertYToCanvas(y));
                                    ctx.rotate(radians);
                                    if (note.type === NoteType.Hold) {
                                        if (seconds > hitSeconds + resourcePackage.config.hitFxDuration) {
                                            ctx.restore();
                                            return;
                                        }

                                        let endPositionY = judgeLine.getFloorPositionOfSeconds(endSeconds) - judgeLine.getFloorPositionOfSeconds(hitSeconds);
                                        endPositionY = endPositionY * note.speed * (note.above === NoteAbove.Above ? 1 : -1) + note.yOffset;
                                        if (startPositionY > endPositionY) {
                                            //    startPositionY --> sy
                                            //     endPositionY --> ey
                                            //       positionX --> x
                                            //
                                            // +6   _____               -6
                                            // +5  /     \  A.x  = -6   -5
                                            // +4  |  A  |  A.sy = 2    -4
                                            // +3  |     |  A.ey = 5    -3
                                            // +2  \_____/  A.sy < A.ey -2
                                            // +1                       -1
                                            // 0y x9876543210123456789x y0
                                            // -1   _____               +1
                                            // -2  /     \  B.x  = -6   +2
                                            // -3  |  B  |  B.sy = -2   +3
                                            // -4  |     |  B.ey = -5   +4
                                            // -5  \_____/  B.sy > B.ey +5
                                            // -6                       +6
                                            // 上下翻转之后，y坐标再变相反数，可以正确显示倒打长条，否则会显示成倒的
                                            // 因为canvas绘制图片时，无论图片的宽高是正数还是负数，图片都是正立的

                                            ctx.scale(1, -1);
                                            startPositionY = -startPositionY;
                                            endPositionY = -endPositionY;
                                        }

                                        const height = endPositionY - startPositionY;
                                        const { head, body, end } = resourcePackage.getSkin(note.type, note.highlight);
                                        const width = note.size * settingsManager._settings.noteSize *
                                            resourcePackage.getSkin(note.type, note.highlight).body.width / resourcePackage.getSkin(note.type, false).body.width;
                                        const headHeight = head.height / head.width * width;
                                        const endHeight = end.height / end.width * width;

                                        // 显示主体
                                        if (resourcePackage.config.holdRepeat) {
                                            const step = body.height / body.width * width;
                                            for (let i = height; i >= 0; i -= step) {
                                                if (i < step) {
                                                    ctx.drawImage(body,
                                                        0, 0, body.width, body.height * (i / step),
                                                        note.positionX - width / 2, -startPositionY - i, width, i);
                                                }
                                                else {
                                                    ctx.drawImage(body, note.positionX - width / 2, -startPositionY - i, width, step);
                                                }
                                            }
                                        }
                                        else {
                                            ctx.drawImage(body, note.positionX - width / 2, -startPositionY - height, width, height);
                                        }

                                        // 显示头部
                                        ctx.drawImage(head, note.positionX - width / 2, -startPositionY, width, headHeight);

                                        // 显示尾部
                                        ctx.drawImage(end, note.positionX - width / 2, -endPositionY - endHeight, width, endHeight);
                                    }
                                    else {
                                        const image = resourcePackage.getSkin(note.type, note.highlight);
                                        const width = note.size * settingsManager._settings.noteSize *
                                            resourcePackage.getSkin(note.type, note.highlight).width / resourcePackage.getSkin(note.type, false).width;
                                        const height = image.height / image.width * settingsManager._settings.noteSize;

                                        // const noteHeight = noteImage.height / noteImage.width * noteWidth; // 会让note等比缩放
                                        ctx.drawImage(image,
                                            0, 0, image.width, image.height,
                                            note.positionX - width / 2, -startPositionY - height / 2, width, height);
                                    }
                                    ctx.restore();
                                }
                                else {
                                    const { x, y, angle } = this.getJudgeLineInfo(judgeLineNumber, hitFxStartSeconds, {
                                        getX: true,
                                        getY: true,
                                        getAngle: true
                                    });
                                    const frameNumber = Math.floor(
                                        (seconds - hitFxStartSeconds) /
                                        resourcePackage.config.hitFxDuration *
                                        resourcePackage.perfectHitFxFrames.length
                                    );

                                    /** 用判定线号、音符编号和打击特效的序号生成一个随机数作为种子，用来生成打击特效的粒子 */
                                    const randomSeed = hash(judgeLineNumber, noteNumber, n);

                                    /** 用 `randomSeed` 生成的打击特效粒子飞出的角度 */
                                    const angles: readonly number[] = MathUtils.randomNumbers(particleCount, randomSeed, 0, 360);

                                    /** 用 `angles` 计算出的各个粒子运动终点的x、y坐标 */
                                    const xys = angles.map(angle => MathUtils.pole(0, 0, angle, particleRadius));

                                    /** 计算粒子飞出的进度，0表示刚开始，1表示已经结束 */
                                    const progress = (seconds - hitFxStartSeconds) / resourcePackage.config.hitFxDuration;

                                    const hitFxPosition = MathUtils.moveAndRotate(x, y, angle, note.positionX, note.yOffset);
                                    const canvasX = coordinateManager.convertXToCanvas(hitFxPosition.x);
                                    const canvasY = coordinateManager.convertYToCanvas(hitFxPosition.y);

                                    const frames = type === "perfect" ? resourcePackage.perfectHitFxFrames : resourcePackage.goodHitFxFrames;
                                    const color = type === "perfect" ? resourcePackage.config.colorPerfect : resourcePackage.config.colorGood;

                                    // 如果当前的打击特效帧数不在范围内，则不显示特效
                                    // 因为不在范围内说明打击特效还未开始或已结束
                                    if (frameNumber < 0 || frameNumber >= frames.length) return;
                                    const frame = frames[frameNumber];

                                    ctx.save();
                                    ctx.translate(canvasX, canvasY);

                                    // 如果资源包的 `hitFxRotate` 配置为 `true`，则旋转对应的角度
                                    if (resourcePackage.config.hitFxRotate) {
                                        ctx.rotate(radians);
                                    }
                                    ctx.globalAlpha = 1;

                                    // 绘制当前帧的打击特效
                                    ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);

                                    // 绘制打击特效的粒子
                                    if (!resourcePackage.config.hideParticles) {
                                        xys.forEach(({ x, y }) => {
                                            // 使用 OutSine 缓动计算打击特效粒子的运动轨迹
                                            drawRect(x * easingFuncs[EasingType.OutSine](progress) - particleSize / 2,
                                                y * easingFuncs[EasingType.OutSine](progress) - particleSize / 2,
                                                particleSize,
                                                particleSize,
                                                color,
                                                true,
                                                1 - easingFuncs[EasingType.InSine](progress));
                                        });
                                    }
                                    ctx.restore();
                                }
                            };

                            if (judgement === "perfect" || judgement === "good") {
                                if (note.type === NoteType.Hold) {
                                    /*
                                    满足下面不等式时Hold的第n个打击特效可见

                                    n >= 0
                                    （要是n是负数的话就没意义了）

                                    n > (seconds - hitFxDuration - hitSeconds) / hitFxFrequency（即 hitSeconds + n * hitFxFrequency + hitFxDuration > seconds）
                                    （打击特效结束时间大于当前时间，即打击特效还没结束）

                                    n <= (endSeconds - hitSeconds) / hitFxFrequency
                                    （用Hold的结束时间减去被击打的时间，除以打击特效频率，得到的数表示Hold可以显示多少个打击特效）

                                    n <= (seconds - hitSeconds) / hitFxFrequency（即 hitSeconds + n * hitFxFrequency <= seconds）
                                    （打击特效开始时间小于等于当前时间，即打击特效已经开始了）
                                    */

                                    for (

                                        // 初始值取两式的最大值，因为要同时大于等于这两个式子
                                        let n = Math.max(0, ceil((seconds - resourcePackage.config.hitFxDuration - hitSeconds) / hitFxFrequency));

                                        // 要同时小于等于两个式子
                                        n <= (endSeconds - hitSeconds) / hitFxFrequency &&
                                        n <= (seconds - hitSeconds) / hitFxFrequency;

                                        // n必须是整数，每次循环加1
                                        n++
                                    ) {
                                        const hitFxStartSeconds = hitSeconds + n * hitFxFrequency;

                                        showHitFx(judgement, hitFxStartSeconds, n);
                                    }
                                }
                                else {
                                    showHitFx(judgement, hitSeconds, 0);
                                }
                            }
                            else if (judgement === "bad") {
                                showHitFx(judgement, hitSeconds, 0);
                            }
                        });
                    })();
                }

                // 不论是什么种类的音符，被判定为bad的都不绘制，只绘制打击特效
                if (note.getJudgement() === "bad") continue;

                // 已经结束的Hold音符不绘制
                if (note.type === NoteType.Hold) {
                    if (seconds >= endSeconds) continue;
                }

                // 已经被判定的非Hold音符不绘制
                else {
                    if (note.getJudgement() !== "none") continue;
                }
                drawNote(note);
            }
        }

        // 依次运行 functions 列表里用来绘制音符或打击特效的函数
        for (const funcs of functions) {
            for (const func of funcs) {
                func();
            }
        }
    }

    /** 获取判定线的事件信息 */
    private getJudgeLineInfo(lineNumber: number, seconds: number, {
        getX = false,
        getY = false,
        getAngle = false,
        getAlpha = false,
        getSpeed = false,
        getScaleX = false,
        getScaleY = false,
        getColor = false,
        getPaint = false,
        getText = false
    }, visited: number[] = []) {
        const chart = store.useChart();
        const judgeLine = chart.judgeLineList[lineNumber];
        if (visited.includes(lineNumber)) {
            ElMessage.error(`出现循环父线，已经自动将${lineNumber}号判定线的父线设置为-1`);
            judgeLine.father = -1;
        }
        visited.push(lineNumber);
        let x = 0, y = 0, angle = 0, alpha = 0, speed = 0;
        for (const layer of judgeLine.eventLayers) {
            if (getX) {
                const event = findLastEvent(layer.moveXEvents, seconds);
                if (event) {
                    x += interpolateNumberEventValue(event, seconds);
                }
            }

            if (getY) {
                const event = findLastEvent(layer.moveYEvents, seconds);
                if (event) {
                    y += interpolateNumberEventValue(event, seconds);
                }
            }

            if (getAngle) {
                const event = findLastEvent(layer.rotateEvents, seconds);
                if (event) {
                    angle += interpolateNumberEventValue(event, seconds);
                }
            }

            if (getAlpha) {
                const event = findLastEvent(layer.alphaEvents, seconds);
                if (event) {
                    alpha += interpolateNumberEventValue(event, seconds);
                }
            }

            if (getSpeed) {
                const event = findLastEvent(layer.speedEvents, seconds);
                if (event) {
                    speed += interpolateNumberEventValue(event, seconds);
                }
            }
        }

        if (judgeLine.father >= 0 && judgeLine.father < chart.judgeLineList.length) {
            const { x: fatherX, y: fatherY, angle: fatherAngle } = this.getJudgeLineInfo(judgeLine.father, seconds, {
                getX: true,
                getY: true,
                getAngle: true
            }, visited);
            const { x: newX, y: newY } = MathUtils.moveAndRotate(fatherX, fatherY, fatherAngle, x, y);
            x = newX;
            y = newY;
        }

        const scaleX = (() => {
            if (getScaleX) {
                const event = findLastEvent(judgeLine.extended.scaleXEvents, seconds);

                if (event) {
                    return interpolateNumberEventValue(event, seconds);
                }

                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        })();
        const scaleY = (() => {
            if (getScaleY) {
                const event = findLastEvent(judgeLine.extended.scaleYEvents, seconds);
                if (event) {
                    return interpolateNumberEventValue(event, seconds);
                }

                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        })();
        const color = (() => {
            if (getColor) {
                const event = findLastEvent(judgeLine.extended.colorEvents, seconds);
                if (event) {
                    return interpolateColorEventValue(event, seconds);
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        })();
        const paint = (() => {
            if (getPaint) {
                const event = findLastEvent(judgeLine.extended.paintEvents, seconds);
                if (event) {
                    return interpolateNumberEventValue(event, seconds);
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        })();
        const text = (() => {
            if (getText) {
                const event = findLastEvent(judgeLine.extended.textEvents, seconds);
                if (event) {
                    return interpolateTextEventValue(event, seconds);
                }
                else {
                    return undefined;
                }
            }

            // 随便返回啥都行
            else {
                return undefined;
            }
        })();
        return { x, y, angle, alpha, speed, scaleX, scaleY, color, paint, text };
    }
}