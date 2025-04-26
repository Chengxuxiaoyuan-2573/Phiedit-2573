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
                        @click="MediaUtils.togglePlay(audioRef)"
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
                    @click="globalEventEmitter.emit(stateManager.state.isPreviewing ? 'STOP_PREVIEW' : 'PREVIEW')"
                >
                    {{ stateManager.state.isPreviewing ? '停止预览' : '预览谱面' }}（P）
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
                    v-if="audioRef"
                    v-model="audioRef.playbackRate"
                    :options="[
                        {
                            label: '播放速度：1.0x',
                            value: 1,
                            text: '1.0x'
                        },
                        {
                            label: '播放速度：0.5x',
                            value: 0.5,
                            text: '0.5x'
                        },
                        {
                            label: '播放速度：0.25x',
                            value: 0.25,
                            text: '0.25x'
                        },
                        {
                            label: '播放速度：0.125x',
                            value: 0.125,
                            text: '0.125x'
                        },
                        {
                            label: '播放速度：0.0625x',
                            value: 0.0625,
                            text: '0.0625x'
                        },
                        {
                            label: '播放速度：0.0x',
                            value: 0,
                            text: '0.0x'
                        },
                        {
                            label: '播放速度：2.0x',
                            value: 2,
                            text: '2.0x'
                        },
                        {
                            label: '播放速度：4.0x',
                            value: 4,
                            text: '4.0x'
                        }
                    ]"
                />
                <MySelect
                    v-model="stateManager.state.currentNoteType"
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
                    v-model="stateManager.state.currentJudgeLineNumber"
                    :min="0"
                    :max="chartPackageRef!.chart.judgeLineList.length - 1"
                >
                    <template #prepend>
                        当前判定线号
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.state.currentEventLayerNumber"
                    :min="0"
                    :max="chartPackageRef!.chart.judgeLineList[stateManager.state.currentJudgeLineNumber].eventLayers.length - 1"
                >
                    <template #prepend>
                        当前事件层级号
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.state.horizonalLineCount"
                    :min="1"
                    :max="64"
                >
                    <template #prepend>
                        横线数
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.state.verticalLineCount"
                    :min="2"
                    :max="100"
                >
                    <template #prepend>
                        竖线数
                    </template>
                </MyInputNumber>
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
                    @click="globalEventEmitter.emit('DOWNLOAD')"
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
                    v-if="stateManager.state.right == RightPanelState.Default"
                    class="right-inner"
                >
                    <ElButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Settings"
                    >
                        设置
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.BPMList"
                    >
                        BPM编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Meta"
                    >
                        谱面基本信息
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.JudgeLine"
                    >
                        判定线编辑
                    </ElButton>
                    <ElButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.History"
                    >
                        历史记录
                    </ElButton>
                </div>
                <template v-else>
                    <MyBackHeader
                        class="title-right"
                        @back="stateManager.state.right = RightPanelState.Default"
                    />
                    <BPMListEditor
                        v-if="stateManager.state.right == RightPanelState.BPMList"
                        title-teleport=".title-right"
                    />
                    <ChartMetaEditor
                        v-else-if="stateManager.state.right == RightPanelState.Meta"
                        title-teleport=".title-right"
                    />
                    <JudgeLineEditor
                        v-else-if="stateManager.state.right == RightPanelState.JudgeLine"
                        title-teleport=".title-right"
                    />
                    <SettingsEditor
                        v-else-if="stateManager.state.right == RightPanelState.Settings"
                        title-teleport=".title-right"
                    />
                    <HistoryEditor
                        v-else-if="stateManager.state.right == RightPanelState.History"
                        title-teleport=".title-right"
                    />
                </template>
            </ElScrollbar>
        </ElAside>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElButton, ElScrollbar, ElContainer, ElHeader, ElIcon, ElMain, ElMessageBox, ElRow, ElSlider, ElUpload } from "element-plus";
import { inject, onBeforeUnmount, onMounted, ref } from "vue";
import { clamp, debounce } from "lodash";

import chartPackageURL from "./assets/DefaultChartPackage.zip";
import resourcePackageURL from "./assets/DefaultResourcePackage.zip";

import MediaUtils from "./tools/mediaUtils";

import { ChartPackage } from "./models/chartPackage";
import { NumberEvent } from "./models/event";
import { Note, NoteType } from "./models/note";
import { ResourcePackage } from "./models/resourcePackage";
import { secondsToBeats } from "./models/beats";

import MySelect from "./myElements/MySelect.vue";
import MyInputNumber from "./myElements/MyInputNumber.vue";
import MyBackHeader from "./myElements/MyBackHeader.vue";

import stateManager from "./services/managers/state";
import selectionManager from "./services/managers/selection";
import chartRenderer from "./services/managers/render/chartRenderer";
import editorRenderer from "./services/managers/render/editorRenderer";
import "./services/managers/clipboard";
import "./services/managers/clone";
import "./services/managers/download";
import "./services/managers/mouse";
import "./services/managers/move";
import "./services/managers/settings";
import "./services/managers/history";

import BPMListEditor from "./editorComponents/BPMListEditor.vue";
import ChartMetaEditor from "./editorComponents/ChartMetaEditor.vue";
import JudgeLineEditor from "./editorComponents/JudgeLineEditor.vue";
import NoteEditor from "./editorComponents/NoteEditor.vue";
import NumberEventEditor from "./editorComponents/NumberEventEditor.vue";
import MutipleEditor from "./editorComponents/MutipleEditor.vue";
import SettingsEditor from "./editorComponents/SettingsEditor.vue";
import HistoryEditor from "./editorComponents/HistoryEditor.vue"

import globalEventEmitter from "./eventEmitter";
import { RightPanelState } from "./types";
import store, { audioRef, canvasRef, chartPackageRef, resourcePackageRef } from "./store";

const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});
const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});
loadStart();
store.chartPackageRef.value = await fetch(chartPackageURL)
    .then(res => res.blob())
    .then(blob => ChartPackage.load(blob));
store.resourcePackageRef.value = await fetch(resourcePackageURL)
    .then(res => res.blob())
    .then(blob => ResourcePackage.load(blob));
loadEnd();


const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);

let cachedRect: DOMRect;
async function uploadChartPackage(file: File) {
    loadStart();
    const chartPackage = await ChartPackage.load(file);
    store.chartPackageRef.value = chartPackage;
    loadEnd();
}
async function uploadResourcePackage(file: File) {
    loadStart();
    const resourcePackage = await ResourcePackage.load(file);
    store.resourcePackageRef.value = resourcePackage;
    loadEnd();
}
function canvasMouseDown(e: MouseEvent) {
    const options = createKeyOptions(e);
    const { x, y } = calculatePosition(e);
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
    const options = createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    globalEventEmitter.emit("MOUSE_MOVE", x, y, options);
}
function canvasMouseUp() {
    globalEventEmitter.emit("MOUSE_UP");
}
function windowOnWheel(e: WheelEvent) {
    const audio = store.useAudio();
    if (e.ctrlKey) {
        e.preventDefault();
        stateManager.state.pxPerSecond = clamp(stateManager.state.pxPerSecond + e.deltaY * -0.05, 1, 1000);
    } else {
        audio.currentTime += e.deltaY / -stateManager.state.pxPerSecond;
    }
}
function canvasOnResize() {
    const canvas = store.useCanvas();
    cachedRect = canvas.getBoundingClientRect();
}
async function windowOnKeyDown(e: KeyboardEvent) {
    const audio = store.useAudio();
    if (e.repeat) {
        return;
    }
    const key = formatKey(e);
    console.debug(key);
    switch (key) {
        case "Space":
            MediaUtils.togglePlay(audio);
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
        case "P": {
            globalEventEmitter.emit("PREVIEW");
            // 松开P键时停止预览
            const keyUpHandler = (e: KeyboardEvent) => {
                const key = formatKey(e);
                if (key === "P") {
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
            globalEventEmitter.emit("DOWNLOAD");
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
        case "Ctrl M":
            globalEventEmitter.emit("MOVE_TO_JUDGE_LINE", parseInt((await ElMessageBox.prompt("请输入判定线号", "移动到指定判定线")).value))
            return;
        case "Ctrl R":
            // not implemented
            return;
        case "Ctrl Z":
            globalEventEmitter.emit("UNDO");
            return;
        case "Ctrl Y":
            globalEventEmitter.emit("REDO");
            return;
    }
}
function documentOnContextmenu(e: Event) {
    e.preventDefault();
}



function createKeyOptions(e: KeyboardEvent | MouseEvent) {
    return {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
    };
}
/**
 * 该函数用于在含有object-fit:contain的canvas上，
 * 根据MouseEvent对象计算出点击位置在canvas绘制上下文中的坐标
 * 
 * 解决了由于canvas外部尺寸与内部绘制尺寸不一致导致的坐标偏移问题
 */
function calculatePosition({ offsetX: x, offsetY: y }: MouseEvent) {
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
    const canvas = store.useCanvas();
    const audio = store.useAudio();
    cachedRect = canvas.getBoundingClientRect();

    canvas.addEventListener('mousedown', canvasMouseDown);
    canvas.addEventListener('mousemove', canvasMouseMove);
    canvas.addEventListener('mouseup', canvasMouseUp);
    const resizeObserver = new ResizeObserver(debounce(canvasOnResize, 100));
    resizeObserver.observe(canvas);
    window.addEventListener('wheel', windowOnWheel, { passive: false });
    window.addEventListener('keydown', windowOnKeyDown);
    document.oncontextmenu = documentOnContextmenu;
    audio.addEventListener('timeupdate', () => {
        time.value = audio.currentTime;
    })
    audio.addEventListener('pause', () => {
        audioIsPlaying.value = false;
    })
    audio.addEventListener('play', () => {
        audioIsPlaying.value = true;
    })
    let renderTime = performance.now();
    let isRendering = true;
    const renderLoop = () => {
        if (stateManager.state.isPreviewing) {
            chartRenderer.renderChart();
        }
        else {
            editorRenderer.render();
        }
        const now = performance.now();
        const delta = now - renderTime;

        if (delta > 0) {
            const currentFPS = 1000 / delta;
            fps.value = currentFPS;
        } else {
            fps.value = 0;
        }
        renderTime = now;
        if (isRendering) {
            requestAnimationFrame(renderLoop);
        }
    };
    renderLoop();
    onBeforeUnmount(() => {
        audio.pause();
        canvas.removeEventListener('mousedown', canvasMouseDown);
        canvas.removeEventListener('mousemove', canvasMouseMove);
        canvas.removeEventListener('mouseup', canvasMouseUp);
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        window.removeEventListener("wheel", windowOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        isRendering = false;
        // globalEventEmitter.destroy();
        chartPackageRef.value = null;
        resourcePackageRef.value = null;
        canvasRef.value = null;
        audioRef.value = null;
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
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: 100%;
}


#right {
    grid-area: right;
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: 100%;
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
