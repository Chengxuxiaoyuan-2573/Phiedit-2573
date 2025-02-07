<template>
    <ElContainer>
        <ElHeader
            @wheel.stop
            @keydown.stop
        >
            <ElRow>
                <audio
                    ref="audioRef"
                    :src="chartPackage.musicSrc"
                />
                <template v-if="audioRef">
                    <ElIcon
                        size="30"
                        @click="mediaUtils.togglePlay(audioRef)"
                    >
                        <VideoPlay v-if="!audioIsPlaying" />
                        <VideoPause v-else />
                    </ElIcon>
                    <ElSlider
                        v-model="time"
                        :min="0"
                        :max="audioRef.duration"
                        :step="0.01"
                        :format-tooltip="seconds => {
                            const min = Math.floor(seconds / 60).toString().padStart(2, '0');
                            const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
                            return `${min}:${sec}`;
                        }"
                        @input="audioRef.pause(), audioRef.currentTime = typeof time == 'number' ? time : time[0]"
                    />
                </template>
                <ElButton
                    type="primary"
                    @click="editor.switchMainState()"
                >
                    {{ editor.state.canvas == CanvasState.Editing ? "切换到播放器界面" : "切换到编辑器界面" }}
                </ElButton>
                <p
                    :style="{
                        color: (() => {
                            if (fps >= fpsLimit) {
                                return 'green';
                            }
                            else if (fps >= fpsLimit / 2) {
                                return 'skyblue';
                            }
                            else if (fps >= fpsLimit / 4) {
                                return 'orange';
                            }
                            else {
                                return 'red';
                            }
                        })(),
                        display: 'block',
                        whiteSpace: 'nowrap'
                    }"
                    useless-attribute
                >
                    FPS: {{ fps.toFixed(1) }}
                </p>
            </ElRow>
            <ElRow>
                右键放置，
                左键选择，
                选择之后按住拖动，
                按Alt拖动尾部，
                QWER切换note种类，
                方括号切换判定线，
                短按空格播放或暂停，
                长按空格预览谱面
            </ElRow>
        </ElHeader>
        <ElAside
            class="left"
            @wheel.stop
            @keydown.stop
        >
            <div class="left-inner">
                <h1>Phiedit 2573 线上制谱器</h1>
                <!-- eslint-disable-next-line vue/first-attribute-linebreak -->
                <ElUpload :before-upload="file => ChartPackage.load(file, str => loadingText.show(str)).then(a => {
                    chartPackage.chart = new Chart(a.chart);
                    chartPackage.background = a.background;
                    chartPackage.textures = a.textures;
                    chartPackage.musicSrc = a.musicSrc;
                    loadingText.hide();
                    // eslint-disable-next-line vue/html-closing-bracket-newline
                })">
                    <template #trigger>
                        <ElButton type="primary">
                            上传谱面文件（zip或pez格式）
                        </ElButton>
                    </template>
                </ElUpload>
                <ElUpload
                    :before-upload="async file => {
                        const a = await ResourcePackage.load(file, str => loadingText.show(str));
                        Object.assign(resourcePackage, a);
                        loadingText.hide();
                    }"
                    useless-attribute
                >
                    <template #trigger>
                        <ElButton type="primary">
                            上传资源包（zip格式）
                        </ElButton>
                    </template>
                </ElUpload>
                <ElButton
                    type="primary"
                    @click="downloadChart"
                >
                    下载谱面文件（json格式）
                </ElButton>
            </div>
        </ElAside>
        <ElMain>
            <canvas
                ref="canvasRef"
                class="canvas"
                :width="1350"
                :height="900"
            />
        </ElMain>
        <ElAside
            class="right"
            @wheel.stop
            @keydown.stop
        >
            <template v-if="editor.state.right == RightState.Default">
                <div class="right-inner">
                    <ElButton
                        type="primary"
                        @click="editor.state.right = RightState.Settings"
                    >
                        设置
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="editor.state.right = RightState.BPMList"
                    >
                        BPM编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="editor.state.right = RightState.Meta"
                    >
                        谱面信息编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="editor.state.right = RightState.JudgeLine"
                    >
                        判定线编辑
                    </ElButton>
                    <MyInputNumber
                        v-model="editor.currentJudgeLineNumber"
                        :min="0"
                        :max="chartPackage.chart.judgeLineList.length - 1"
                    >
                        <template #prepend>
                            当前判定线号
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="editor.currentEventLayerNumber"
                        :min="0"
                        :max="chartPackage.chart.judgeLineList[editor.currentJudgeLineNumber].eventLayers.length - 1"
                    >
                        <template #prepend>
                            当前事件层级号
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="editor.horizonalLineCount"
                        :min="1"
                        :max="1024"
                    >
                        <template #prepend>
                            横线数
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="editor.verticalLineCount"
                        :min="2"
                        :max="1350"
                    >
                        <template #prepend>
                            竖线数
                        </template>
                    </MyInputNumber>
                </div>
            </template>
            <template v-else>
                <ElHeader style="height:25px;">
                    <ArrowLeft
                        style="
                            cursor: pointer;
                            height: 100%;
                            vertical-align: middle;
                        "
                        @click="editor.state.right = RightState.Default"
                    />
                    <span>返回</span>
                </ElHeader>
                <template v-if="editor.state.right == RightState.Editing && editor.selectedElements.length == 1">
                    <NoteEditor
                        v-if="(editor.selectedElements[0] instanceof Note)"
                        v-model="editor.selectedElements[0]"
                    />
                    <NumberEventEditor
                        v-else-if="(editor.selectedElements[0] instanceof NumberEvent)"
                        v-model="editor.selectedElements[0]"
                    />
                </template>
                <MutipleEditor
                    v-else-if="editor.state.right == RightState.Editing && editor.selectedElements.length > 1"
                />
                <BPMListEditor v-else-if="editor.state.right == RightState.BPMList" />
                <ChartMetaEditor v-else-if="editor.state.right == RightState.Meta" />
                <JudgeLineEditor v-else-if="editor.state.right == RightState.JudgeLine" />
                <SettingsEditor v-else-if="editor.state.right == RightState.Settings" />
            </template>
        </ElAside>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElButton, ElContainer, ElHeader, ElIcon, ElMain, ElRow, ElSlider, ElUpload } from "element-plus";
import { onBeforeUnmount, onMounted, provide, reactive, ref } from "vue";

import { Chart } from "./classes/chart";
import { ChartPackage } from "./classes/chartPackage";
import { NumberEvent } from "./classes/event";
import { Note } from "./classes/note";
import { ResourcePackage } from "./classes/resourcePackage";

import ChartRenderer from "./chartRenderer";
import eventEmitter from "./eventEmitter";
import { CanvasState, Editor, RightState } from "./editor";
import { chartPackage, resourcePackage, canvasRef, audioRef } from "./store";

import BPMListEditor from "./editorComponents/BPMListEditor.vue";
import ChartMetaEditor from "./editorComponents/ChartMetaEditor.vue";
import JudgeLineEditor from "./editorComponents/JudgeLineEditor.vue";
import NoteEditor from "./editorComponents/NoteEditor.vue";
import NumberEventEditor from "./editorComponents/NumberEventEditor.vue";
import MutipleEditor from "./editorComponents/MutipleEditor.vue";
import SettingsEditor from "./editorComponents/SettingsEditor.vue";

import MyInputNumber from "./myElements/MyInputNumber.vue";

import loadingText from "./tools/loadingText";
import mediaUtils from "./tools/mediaUtils";
import math from "./tools/math";
import { clamp } from "lodash";

const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);
const editor: Editor = reactive(new Editor(chartPackage, resourcePackage));

provide("editor", editor);
provide("textures", chartPackage.textures);

const fpsLimit = 60;
let cachedRect: DOMRect;
function downloadChart() {
    mediaUtils.downloadText(
        JSON.stringify(chartPackage.chart.toObject()),
        chartPackage.chart.META.name + '.json',
        'application/json');
}
function canvasMouseDown(e: MouseEvent) {
    const { x, y } = getClickedPosition(e);
    const options = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
    }
    switch (e.button) {
        case 0:
            eventEmitter.emit("MOUSE_LEFT_CLICK", x, y, options);
            return;
        case 2:
            eventEmitter.emit("MOUSE_RIGHT_CLICK", x, y);
            return;
    }
}
function canvasMouseMove(e: MouseEvent) {
    const options = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
    }
    const { x, y } = getClickedPosition(e);
    eventEmitter.emit("MOUSE_MOVE", x, y, options);
}
function canvasMouseUp() {
    eventEmitter.emit("MOUSE_UP");
}
function windwoOnWheel(e: WheelEvent) {
    const audio = audioRef.value;
    if (!audio) throw new Error("audio is null");
    if (e.ctrlKey) {
        e.preventDefault();
        editor.pxPerSecond = clamp(editor.pxPerSecond + e.deltaY * -0.05, 1, 1000);
    } else {
        audio.currentTime += e.deltaY / -editor.pxPerSecond;
    }
}
function canvasOnResize() {
    const canvas = canvasRef.value;
    if (!canvas) throw new Error("canvas is null");
    cachedRect = canvas.getBoundingClientRect();
}
function windowOnKeyDown(e: KeyboardEvent) {
    const audio = audioRef.value;
    if (!audio) throw new Error("audio is null");
    if (e.repeat) {
        return;
    }
    //const { ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta } = e;
    const key = formatKey(e);
    console.log(key);
    switch (key) {
        case "Space": {
            const time = 300;
            const audioTime = audio.currentTime;
            let pressTime = performance.now();
            let releaseTime = undefined;
            let spacePressed = true;
            const keyUpHandler = (e: KeyboardEvent) => {
                releaseTime = performance.now();
                const key = formatKey(e);
                if (key == "Space") {
                    spacePressed = false;
                    if (releaseTime - pressTime < time) {
                        mediaUtils.togglePlay(audio);
                    }
                    else {
                        editor.state.canvas = CanvasState.Editing;
                        audio.currentTime = audioTime;
                        audio.pause();
                    }
                    window.removeEventListener("keyup", keyUpHandler);
                }
            };
            window.addEventListener("keyup", keyUpHandler);
            const timeout = setTimeout(() => {
                if (spacePressed) {
                    editor.state.canvas = CanvasState.Playing;
                    audio.play();
                }
                clearTimeout(timeout);
            }, time);
            return;
        }
        case "Esc":
            editor.unselectAll();
            return;
        case "Del":
            editor.deleteSelection();
            editor.unselectAll();
            return;
        case "Q":
            editor.changeType("Tap");
            return;
        case "W":
            editor.changeType("Drag");
            return;
        case "E":
            editor.changeType("Flick");
            return;
        case "R":
            editor.changeType("Hold");
            return;
        case "[":
            if (editor.currentJudgeLineNumber > 0)
                editor.currentJudgeLineNumber--;
            return;
        case "]":
            if (editor.currentJudgeLineNumber < editor.chart.judgeLineList.length - 1)
                editor.currentJudgeLineNumber++;
            return;
        case "Ctrl S":
            e.preventDefault();
            downloadChart();
            return;
        case "Ctrl C":
            editor.copy();
            return;
        case "Ctrl V":
            editor.paste();
            return;
    }
}
function preventContextMenu(e: MouseEvent) {
    e.preventDefault();
}
/**
 * 该函数用于在含有object-fit:contain的canvas上获取点击位置
 * 该函数根据MouseEvent对象计算出点击位置在canvas绘制上下文中的坐标
 * 解决了由于canvas外部尺寸与内部绘制尺寸不一致导致的坐标偏移问题
 */
function getClickedPosition({ offsetX: x, offsetY: y }: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) throw new Error("canvas is null");

    const innerWidth = canvas.width;
    const innerHeight = canvas.height;
    const innerRatio = innerWidth / innerHeight;

    const outerWidth = cachedRect.width;
    const outerHeight = cachedRect.height;
    const outerRatio = outerWidth / outerHeight;

    // 计算缩放比和边距
    const { ratio, padding } = (() => {
        if (innerRatio > outerRatio) {
            const width = outerWidth;
            const height = width / innerRatio;
            const padding = (outerHeight - height) / 2;
            return { padding, ratio: innerWidth / width };
        } else {
            const height = outerHeight;
            const width = height * innerRatio;
            const padding = (outerWidth - width) / 2;
            return { padding, ratio: innerHeight / height };
        }
    })();

    // 根据宽高比返回调整后的坐标
    if (innerRatio > outerRatio) {
        return { x: x * ratio, y: (y - padding) * ratio };
    } else {
        return { y: y * ratio, x: (x - padding) * ratio };
    }
}
/**
 * 将键盘事件转换为按键字符串
 * 如果有Ctrl、Shift等修饰键，则将修饰键加上
 */
function formatKey(e: KeyboardEvent) {
    let str = "";
    if (e.ctrlKey) str += "Ctrl ";
    if (e.shiftKey) str += "Shift ";
    if (e.altKey) str += "Alt ";
    if (e.metaKey) str += "Meta ";
    function formatSingleKey(key: string) {
        switch (key) {
            case " ":
                return "Space";
            case "Escape":
                return "Esc";
            case "Delete":
                return "Del";
            case "ArrowLeft":
                return "Left";
            case "ArrowRight":
                return "Right";
            case "ArrowUp":
                return "Up";
            case "ArrowDown":
                return "Down";
            default:
                return key.toUpperCase();
        }
    }
    if (e.key != "Control" && e.key != "Shift" && e.key != "Alt" && e.key != "Meta")
        str += formatSingleKey(e.key);
    return str;
}
onMounted(() => {
    const canvas = canvasRef.value!;
    const audio = audioRef.value!;
    const renderer = new ChartRenderer({ chartPackage, resourcePackage });
    cachedRect = canvas.getBoundingClientRect();

    canvas.addEventListener('mousedown', canvasMouseDown);
    canvas.addEventListener('mousemove', canvasMouseMove);
    canvas.addEventListener('mouseup', canvasMouseUp);
    canvas.addEventListener('resize', canvasOnResize);
    window.addEventListener('wheel', windwoOnWheel, {
        passive: false
    });
    window.addEventListener('keydown', windowOnKeyDown);
    document.oncontextmenu = preventContextMenu;

    let fpsHistory = [];
    let renderTime = performance.now();
    const interval = setInterval(() => {
        if (editor.state.canvas == CanvasState.Editing) {
            editor.render();
        }
        else {
            renderer.renderChart();
        }
        const now = performance.now();
        const delta = now - renderTime;

        if (delta > 0) {
            const currentFPS = Math.min(1000 / delta, fpsLimit);
            fpsHistory.push(currentFPS);
            // 限制FPS历史数组的大小
            if (fpsHistory.length > 10) {
                fpsHistory.shift();
            }
            // 计算平均FPS
            fps.value = math.average(fpsHistory);
        } else {
            fps.value = 0; // 或者设置为一个合理的默认值
        }
        renderTime = now;
        time.value = audio.currentTime;
        audioIsPlaying.value = !audio.paused;
    }, 1000 / fpsLimit);
    onBeforeUnmount(() => {
        const canvas = canvasRef.value;
        const audio = audioRef.value;
        if (audio) {
            audio.pause();
        }
        if (canvas) {
            canvas.removeEventListener('mousedown', canvasMouseDown);
            canvas.removeEventListener('mousemove', canvasMouseMove);
            canvas.removeEventListener('mouseup', canvasMouseUp);
            canvas.removeEventListener("resize", canvasOnResize);
        }
        window.removeEventListener("wheel", windwoOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        clearInterval(interval);
        audioRef.value = null;
        canvasRef.value = null;
    });
});
</script>
<style>
.el-upload,
.el-upload>.el-button {
    width: 100%;
}

.el-button+.el-button {
    margin-left: 0;
    margin-right: 0;
}

.el-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
        "header header header"
        "left main right";
}

.el-header {
    grid-area: header;
}

.el-aside.left {
    grid-area: left;
}

.el-main {
    grid-area: main;
    --el-main-padding: 0;
}

.el-aside.right {
    grid-area: right;
}


.el-header>.el-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 10px;
}

.left-inner,
.right-inner {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
}


.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}
</style>
