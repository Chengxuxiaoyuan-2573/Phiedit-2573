<template>
    <ElContainer>
        <ElHeader id="header">
            <ElRow>
                <audio
                    ref="audioRef"
                    :src="store.chartPackageRef.value?.musicSrc"
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
                            const beats = secondsToBeats(store.useChart().BPMList, seconds);
                            return `第${beats.toFixed(2)}拍`;
                        }"
                        @input="audioRef.pause(), audioRef.currentTime = typeof time == 'number' ? time : time[0]"
                    />
                </template>
                <ElButton
                    type="primary"
                    @click="globalEventEmitter.emit(stateManager.isPreviewing ? 'STOP_PREVIEW' : 'PREVIEW')"
                >
                    {{ stateManager.isPreviewing ? '取消预览' : '预览' }}
                </ElButton>
                <p
                    :style="{
                        color: (() => {
                            if (fps >= 60) {
                                return 'green';
                            }
                            else if (fps >= 30) {
                                return 'blue';
                            }
                            else if (fps >= 15) {
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
                <MySelect
                    v-model="stateManager.currentNoteType"
                    :options="[
                        {
                            label: '当前音符类型：Tap',
                            value: NoteType.Tap,
                            text: 'Tap（Q）'
                        },
                        {
                            label: '当前音符类型：Drag',
                            value: NoteType.Drag,
                            text: 'Drag（W）'
                        },
                        {
                            label: '当前音符类型：Flick',
                            value: NoteType.Flick,
                            text: 'Flick（E）'
                        },
                        {
                            label: '当前音符类型：Hold',
                            value: NoteType.Hold,
                            text: 'Hold（R）'
                        }
                    ]"
                />
                <MyInputNumber
                    v-model="stateManager.currentJudgeLineNumber"
                    :min="0"
                    :max="store.useChart().judgeLineList.length - 1"
                >
                    <template #prepend>
                        当前判定线号
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.currentEventLayerNumber"
                    :min="0"
                    :max="store.useChart().judgeLineList[stateManager.currentJudgeLineNumber].eventLayers.length - 1"
                >
                    <template #prepend>
                        当前事件层级号
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.horizonalLineCount"
                    :min="1"
                    :max="64"
                >
                    <template #prepend>
                        横线数
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.verticalLineCount"
                    :min="2"
                    :max="100"
                >
                    <template #prepend>
                        竖线数
                    </template>
                </MyInputNumber>
                <MyDialog>
                    <template #header>
                        我是标题
                    </template>
                    我是内容
                    <template #footer>
                        我是底部
                    </template>
                </MyDialog>
                <!-- 右键放置，
                左键选择，
                选择之后按住拖动，
                QWER切换note种类，
                方括号或Ctrl+B切换判定线，
                短按空格播放或暂停，
                长按空格预览谱面 -->
            </ElRow>
        </ElHeader>
        <ElAside id="left">
            <div
                v-if="selectionManager.selectedElements.length == 0"
                class="left-inner"
            >
                <h1>Phiedit 2573 线上制谱器</h1>
                <!-- eslint-disable-next-line vue/first-attribute-linebreak -->
                <ElUpload :before-upload="uploadChartPackage">
                    <template #trigger>
                        <ElButton type="primary">
                            上传谱面文件（zip或pez格式）
                        </ElButton>
                    </template>
                </ElUpload>
                <ElUpload
                    :before-upload="uploadResourcePackage"
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
            <template v-else>
                <MyBackHeader
                    class="title-left"
                    @back="selectionManager.unselectAll()"
                />
                <ElScrollbar @wheel.stop>
                    <MutipleEditor
                        v-if="selectionManager.selectedElements.length > 1"
                        title-teleport=".title-left"
                    />
                    <NoteEditor
                        v-else-if="selectionManager.selectedElements[0] instanceof Note"
                        v-model="selectionManager.selectedElements[0]"
                        title-teleport=".title-left"
                    />
                    <NumberEventEditor
                        v-else-if="selectionManager.selectedElements[0] instanceof NumberEvent"
                        v-model="selectionManager.selectedElements[0]"
                        title-teleport=".title-left"
                    />
                </ElScrollbar>
            </template>
        </ElAside>
        <ElMain id="main">
            <canvas
                ref="canvasRef"
                class="canvas"
                :width="1350"
                :height="900"
            />
        </ElMain>
        <ElAside id="right">
            <ElScrollbar @wheel.stop>
                <div
                    v-if="stateManager.right == RightPanelState.Default"
                    class="right-inner"
                >
                    <ElButton
                        type="primary"
                        @click="stateManager.right = RightPanelState.Settings"
                    >
                        设置
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.right = RightPanelState.BPMList"
                    >
                        BPM编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.right = RightPanelState.Meta"
                    >
                        谱面基本信息
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.right = RightPanelState.JudgeLine"
                    >
                        判定线编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.right = RightPanelState.Effect"
                    >
                        一键生成特效
                    </ElButton>
                </div>
                <template v-else>
                    <MyBackHeader
                        class="title-right"
                        @back="stateManager.right = RightPanelState.Default"
                    />
                    <BPMListEditor
                        v-if="stateManager.right == RightPanelState.BPMList"
                        title-teleport=".title-right"
                    />
                    <ChartMetaEditor
                        v-else-if="stateManager.right == RightPanelState.Meta"
                        title-teleport=".title-right"
                    />
                    <JudgeLineEditor
                        v-else-if="stateManager.right == RightPanelState.JudgeLine"
                        title-teleport=".title-right"
                    />
                    <SettingsEditor
                        v-else-if="stateManager.right == RightPanelState.Settings"
                        title-teleport=".title-right"
                    />
                    <EffectEditor
                        v-else-if="stateManager.right == RightPanelState.Effect"
                        title-teleport=".title-right"
                    />
                </template>
            </ElScrollbar>
        </ElAside>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElButton, ElScrollbar, ElContainer, ElHeader, ElIcon, ElMain, ElMessageBox, ElRow, ElSlider, ElUpload } from "element-plus";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { clamp } from "lodash";

import { ChartPackage } from "./classes/chartPackage";
import { NumberEvent } from "./classes/event";
import { Note, NoteType } from "./classes/note";
import { ResourcePackage } from "./classes/resourcePackage";


import globalEventEmitter from "./eventEmitter";
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
import MathUtils from "./tools/math";

import chartPackageURL from "@/assets/DefaultChartPackage.zip";
import resourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import { catchErrorByMessage } from "./tools/catchError";
import { secondsToBeats } from "./classes/beats";
import MySelect from "./myElements/MySelect.vue";
import MyDialog from "./myElements/MyDialog.vue";
import EffectEditor from "./editorComponents/EffectEditor.vue";

import { RightPanelState } from "@/types";
import MyBackHeader from "./myElements/MyBackHeader.vue";
import store, { audioRef, canvasRef } from "./store";

import stateManager from "./services/managers/state";
import selectionManager from "./services/managers/selection";
import chartRenderer from "./services/managers/render/chartRenderer";
import editorRenderer from "./services/managers/render/editorRenderer";

store.chartPackageRef.value = await fetch(chartPackageURL)
    .then(res => res.blob())
    .then(blob => ChartPackage.load(blob, str => {
        loadingText.show(str)
    }));
store.resourcePackageRef.value = await fetch(resourcePackageURL)
    .then(res => res.blob())
    .then(blob => ResourcePackage.load(blob, str => {
        loadingText.show(str)
    }));
loadingText.hide();


const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);


let cachedRect: DOMRect;
async function uploadChartPackage(file: File) {
    const chartPackage = await ChartPackage.load(file, str => loadingText.show(str));
    store.chartPackageRef.value = chartPackage;
    loadingText.hide();
}
async function uploadResourcePackage(file: File) {
    const resourcePackage = await ResourcePackage.load(file, str => loadingText.show(str));
    store.resourcePackageRef.value = resourcePackage;
    loadingText.hide();
}
function downloadChart() {
    const chart = store.useChart();
    mediaUtils.downloadText(JSON.stringify(chart.toObject()), chart.META.name + '.json', 'application/json');
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
            globalEventEmitter.emit("MOUSE_LEFT_CLICK", x, y, options);
            return;
        case 2:
            globalEventEmitter.emit("MOUSE_RIGHT_CLICK", x, y);
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
    globalEventEmitter.emit("MOUSE_MOVE", x, y, options);
}
function canvasMouseUp() {
    globalEventEmitter.emit("MOUSE_UP");
}
function windwoOnWheel(e: WheelEvent) {
    const audio = audioRef.value;
    if (!audio) throw new Error("audio is null");
    if (e.ctrlKey) {
        e.preventDefault();
        stateManager.pxPerSecond = clamp(stateManager.pxPerSecond + e.deltaY * -0.05, 1, 1000);
    } else {
        audio.currentTime += e.deltaY / -stateManager.pxPerSecond;
    }
}
function canvasOnResize() {
    const canvas = canvasRef.value;
    if (!canvas) throw new Error("canvas is null");
    cachedRect = canvas.getBoundingClientRect();
}
async function windowOnKeyDown(e: KeyboardEvent) {
    const audio = audioRef.value;
    if (!audio) throw new Error("audio is null");
    if (e.repeat) {
        return;
    }
    const key = formatKey(e);
    console.debug(key);
    switch (key) {
        case "Space":
            mediaUtils.togglePlay(audio);
            return;
        case "Q":
            globalEventEmitter.emit("CHANGE_TYPE", "Tap");
            return;
        case "W":
            globalEventEmitter.emit("CHANGE_TYPE", "Drag");
            return;
        case "E":
            globalEventEmitter.emit("CHANGE_TYPE", "Flick");
            return;
        case "R":
            globalEventEmitter.emit("CHANGE_TYPE", "Hold");
            return;
        case "T": {
            globalEventEmitter.emit("PREVIEW");
            // 松开T键时停止预览
            const keyUpHandler = (e: KeyboardEvent) => {
                const key = formatKey(e);
                if (key === "T") {
                    globalEventEmitter.emit("STOP_PREVIEW");
                    window.removeEventListener("keyup", keyUpHandler);
                }
            }
            window.addEventListener("keyup", keyUpHandler);
            return;
        }
        case "[":
            globalEventEmitter.emit("PREVIOUS_JUDGE_LINE");
            return;
        case "]":
            globalEventEmitter.emit("NEXT_JUDGE_LINE");
            return;
        case "Esc":
            globalEventEmitter.emit("UNSELECT_ALL");
            return;
        case "Del":
            globalEventEmitter.emit("DELETE");
            return;
        case "Up":
            globalEventEmitter.emit("MOVE_UP");
            return;
        case "Down":
            globalEventEmitter.emit("MOVE_DOWN");
            return;
        case "Left":
            globalEventEmitter.emit("MOVE_LEFT");
            return;
        case "Right":
            globalEventEmitter.emit("MOVE_RIGHT");
            return;
        case "Ctrl B":
            globalEventEmitter.emit("CHANGE_JUDGE_LINE", parseInt((await ElMessageBox.prompt("请输入判定线号", "切换判定线")).value))
            return;
        case "Ctrl S":
            e.preventDefault();
            catchErrorByMessage(downloadChart, "下载");
            return;
        case "Ctrl A":
            globalEventEmitter.emit("SELECT_ALL");
            return;
        case "Ctrl X":
            globalEventEmitter.emit("CUT");
            return;
        case "Ctrl C":
            globalEventEmitter.emit("COPY");
            return;
        case "Ctrl V":
            globalEventEmitter.emit("PASTE");
            return;
    }
}
function prevent(e: Event) {
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
 * 将键盘事件对象格式化为可读的按键组合字符串
 * 
 * 功能说明：
 * 1. 检测并拼接修饰键（Ctrl、Shift、Alt、Meta）
 * 2. 转换特殊按键的显示名称（如 Space、Esc 等）
 * 3. 自动排除修饰键自身事件（如单独按下 Control 键）
 * 
 * @param e - 键盘事件对象，包含按键信息和修饰键状态
 * @returns 格式化后的组合按键字符串（例如 "Ctrl Shift S"）
 */
function formatKey(e: KeyboardEvent) {

    // 特殊情况，修饰键自身事件
    if (e.key == "Control") {
        return "Ctrl";
    }
    if (e.key == "Shift") {
        return "Shift";
    }
    if (e.key == "Alt") {
        return "Alt";
    }
    if (e.key == "Meta") {
        return "Meta";
    }

    let str = "";

    // 处理修饰键：按固定顺序拼接 Ctrl/Shift/Alt/Meta
    if (e.ctrlKey) str += "Ctrl ";
    if (e.shiftKey) str += "Shift ";
    if (e.altKey) str += "Alt ";
    if (e.metaKey) str += "Meta ";

    /**
     * 格式化单个按键的显示文本
     * @param key - 原始按键值
     * @returns 转换后的标准按键名称（全大写，特殊按键转换）
     */
    function formatSingleKey(key: string) {
        switch (key) {
            case " ": return "Space";
            case "Escape": return "Esc";
            case "Delete": return "Del";
            case "ArrowLeft": return "Left";
            case "ArrowRight": return "Right";
            case "ArrowUp": return "Up";
            case "ArrowDown": return "Down";
            default:
                // 判断按键是否为单个字符，如果是则转换为大写，否则返回原始值
                // 避免将Home、End等按键转换为大写
                if (key.length == 1)
                    return key.toUpperCase();
                else
                    return key;
        }
    }

    str += formatSingleKey(e.key);

    return str;
}
onMounted(() => {
    const canvas = canvasRef.value!;
    const audio = audioRef.value!;
    cachedRect = canvas.getBoundingClientRect();

    canvas.addEventListener('mousedown', canvasMouseDown);
    canvas.addEventListener('mousemove', canvasMouseMove);
    canvas.addEventListener('mouseup', canvasMouseUp);
    const resizeObserver = new ResizeObserver(canvasOnResize);
    resizeObserver.observe(canvas);
    window.addEventListener('wheel', windwoOnWheel, { passive: false });
    window.addEventListener('keydown', windowOnKeyDown);
    document.oncontextmenu = prevent;

    let fpsHistory = [];
    let renderTime = performance.now();
    const interval = setInterval(() => {
        if (stateManager.isPreviewing) {
            chartRenderer.renderChart();
        }
        else {
            editorRenderer.render();
        }
        const now = performance.now();
        const delta = now - renderTime;

        if (delta > 0) {
            const currentFPS = 1000 / delta;
            fpsHistory.push(currentFPS);
            // 限制FPS历史数组的大小
            if (fpsHistory.length > 10) {
                fpsHistory.shift();
            }
            // 计算平均FPS
            fps.value = MathUtils.average(fpsHistory);
        } else {
            fps.value = 0;
        }
        renderTime = now;
        time.value = audio.currentTime;
        audioIsPlaying.value = !audio.paused;
    }, 0);
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
        resizeObserver.disconnect();
        window.removeEventListener("wheel", windwoOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        clearInterval(interval);
        globalEventEmitter.destroy();
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
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: 80px auto;
    grid-template-areas:
        "header header header"
        "left main right";
}

/*
.el-container>* {
    width: 100%;
    height: 100%;
}
*/

#header {
    grid-area: header;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#main {
    grid-area: main;
    --el-main-padding: 0;
}

.el-aside {
    padding: 10px;
}

#left {
    grid-area: left;
}


#right {
    grid-area: right;
}


.el-header>.el-row {
    flex-grow: 1;
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
