<template>
    <ElContainer>
        <ElHeader id="header">
            <ElRow class="header-row header-first-row">
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
                        :format-tooltip="(seconds) => {
                            const min = Math.floor(seconds / 60)
                                .toString()
                                .padStart(2, '0');
                            const sec = Math.round(seconds % 60)
                                .toString()
                                .padStart(2, '0');
                            return `${min}:${sec}`;
                        }"
                        @input="
                            audioRef.pause(),
                            (audioRef.currentTime = typeof time == 'number' ? time : time[0])"
                    />
                </template>
                <p
                    :style="{
                        color: (() => {
                            if (fps >= 60) {
                                return 'green';
                            } else if (fps >= 30) {
                                return 'blue';
                            } else if (fps >= 15) {
                                return 'orange';
                            } else {
                                return 'red';
                            }
                        })(),
                        display: 'block',
                        whiteSpace: 'nowrap',
                    }"
                    useless-attribute
                >
                    FPS: {{ fps.toFixed(0) }}
                </p>
            </ElRow>
            <ElRow class="header-row header-second-row">
                <MySelect
                    v-if="audioRef"
                    v-model="audioRef.playbackRate"
                    :options="[
                        {
                            label: '播放速度：1.0x',
                            value: 1,
                            text: '1.0x',
                        },
                        {
                            label: '播放速度：0.5x',
                            value: 0.5,
                            text: '0.5x',
                        },
                        {
                            label: '播放速度：0.3x',
                            value: 0.3,
                            text: '0.3x',
                        },
                        {
                            label: '播放速度：0.25x',
                            value: 0.25,
                            text: '0.25x',
                        },
                        {
                            label: '播放速度：0.125x',
                            value: 0.125,
                            text: '0.125x',
                        },
                        {
                            label: '播放速度：0.0x',
                            value: 0,
                            text: '0.0x',
                        },
                        {
                            label: '播放速度：2.0x',
                            value: 2,
                            text: '2.0x',
                        },
                        {
                            label: '播放速度：4.0x',
                            value: 4,
                            text: '4.0x',
                        },
                    ]"
                />
                <MySelect
                    v-model="stateManager.state.currentNoteType"
                    :options="[
                        {
                            label: '当前音符类型：Tap',
                            value: NoteType.Tap,
                            text: 'Tap（Q）',
                        },
                        {
                            label: '当前音符类型：Drag',
                            value: NoteType.Drag,
                            text: 'Drag（W）',
                        },
                        {
                            label: '当前音符类型：Flick',
                            value: NoteType.Flick,
                            text: 'Flick（E）',
                        },
                        {
                            label: '当前音符类型：Hold',
                            value: NoteType.Hold,
                            text: 'Hold（R）',
                        },
                    ]"
                />
                <p>COMBO: {{ combo }}</p>
                <p>SCORE: {{ score }}</p>
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
            </ElRow>
        </ElHeader>
        <ElAside id="left">
            <div
                v-if="selectionManager.selectedElements.length == 0"
                class="left-inner"
            >
                <h1>Phiedit 2573</h1>
                <ElButton
                    type="primary"
                    @click="globalEventEmitter.emit('SAVE')"
                >
                    保存谱面
                </ElButton>
                <ElButton
                    type="primary"
                    @click="handleExport"
                >
                    导出谱面
                </ElButton>
                <ElButton
                    type="primary"
                    @click="confirm(() => $router.push('/'), '退出编辑')"
                >
                    退出编辑
                </ElButton>
                <ElButton
                    type="danger"
                    @click="confirm(handleDeleteChart, '删除谱面')"
                >
                    删除谱面
                </ElButton>
            </div>
            <template v-else>
                <MyBackHeader
                    class="title-left"
                    @back="selectionManager.unselectAll()"
                />
                <ElScrollbar @wheel.stop>
                    <MutipleEditPanel
                        v-if="selectionManager.selectedElements.length > 1"
                        title-teleport=".title-left"
                    />
                    <NoteEditPanel
                        v-else-if="selectionManager.selectedElements[0] instanceof Note"
                        v-model="selectionManager.selectedElements[0]"
                        title-teleport=".title-left"
                    />
                    <NumberEventEditPanel
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
                    <MyGridContainer :columns="2">
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
                        <ElButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Clipboard"
                        >
                            剪贴板管理
                        </ElButton>
                        <ElButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Calculator"
                        >
                            计算器
                        </ElButton>
                        <ElButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.NoteFill"
                        >
                            曲线填充音符
                        </ElButton>
                    </MyGridContainer>
                    <h3>
                        判定线
                    </h3>
                    <MyGridContainer
                        :columns="5"
                        :gap="5"
                    >
                        <ElButton
                            v-for="i in stateManager.judgeLinesCount"
                            :key="i - 1 + (u ? 0 : 0)"
                            :type="(['primary', 'warning', 'danger'] as const)[Math.floor((i - 1) / 10) % 3]"
                            :plain="i - 1 != stateManager.state.currentJudgeLineNumber"
                            @click="stateManager.state.currentJudgeLineNumber = i - 1"
                        >
                            {{ i - 1 }}
                        </ElButton>
                        <ElButton
                            type="success"
                            @click="chartPackageRef?.chart.addNewJudgeLine(), update()"
                        >
                            +
                        </ElButton>
                    </MyGridContainer>
                    <h3>
                        事件层级
                    </h3>
                    <MyGridContainer
                        :columns="5"
                        :gap="5"
                    >
                        <ElButton
                            v-for="i in stateManager.eventLayersCount"
                            :key="i - 1 + (u ? 0 : 0)"
                            type="primary"
                            :plain="i - 1 != stateManager.state.currentEventLayerNumber"
                            @click="stateManager.state.currentEventLayerNumber = i - 1"
                        >
                            {{ i - 1 }}
                        </ElButton>
                        <ElButton
                            type="success"
                            @click="stateManager.currentJudgeLine.addEventLayer(), update()"
                        >
                            +
                        </ElButton>
                    </MyGridContainer>
                </div>
                <template v-else>
                    <MyBackHeader
                        class="title-right"
                        @back="stateManager.state.right = RightPanelState.Default"
                    />
                    <BPMListPanel
                        v-if="stateManager.state.right == RightPanelState.BPMList"
                        title-teleport=".title-right"
                    />
                    <ChartMetaPanel
                        v-else-if="stateManager.state.right == RightPanelState.Meta"
                        title-teleport=".title-right"
                    />
                    <JudgeLinePanel
                        v-else-if="stateManager.state.right == RightPanelState.JudgeLine"
                        title-teleport=".title-right"
                    />
                    <SettingsPanel
                        v-else-if="stateManager.state.right == RightPanelState.Settings"
                        title-teleport=".title-right"
                    />
                    <HistoryPanel
                        v-else-if="stateManager.state.right == RightPanelState.History"
                        title-teleport=".title-right"
                    />
                    <ClipboardPanel
                        v-else-if="stateManager.state.right == RightPanelState.Clipboard"
                        title-teleport=".title-right"
                    />
                    <CalculatorPanel
                        v-else-if="stateManager.state.right == RightPanelState.Calculator"
                        title-teleport=".title-right"
                    />
                    <NoteFillPanel
                        v-else-if="stateManager.state.right == RightPanelState.NoteFill"
                        title-teleport=".title-right"
                    />
                </template>
            </ElScrollbar>
        </ElAside>
        <ElFooter id="footer">
            <div class="footer-left">
                Phiedit 2573 Made By <a href="javascript:alert('https://space.bilibili.com/522248560')">@程序小袁_2573</a>
            </div>
            <div class="footer-right">
                {{ tip }}
            </div>
        </ElFooter>
    </ElContainer>
</template>

<script setup lang="ts">
import {
    ElAside,
    ElButton,
    ElScrollbar,
    ElContainer,
    ElHeader,
    ElIcon,
    ElMain,
    ElMessageBox,
    ElRow,
    ElSlider,
    ElFooter,
} from "element-plus";
import { inject, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clamp, round } from "lodash";

import resourcePackageURL from "@/assets/DefaultResourcePackage.zip";

import MediaUtils from "@/tools/mediaUtils";
import KeyboardUtils from "@/tools/keyboardUtils";

import { NumberEvent } from "@/models/event";
import { Note, NoteType } from "@/models/note";
import { ResourcePackage } from "@/models/resourcePackage";
import { ChartPackage } from "@/models/chartPackage";

import MySelect from "@/myElements/MySelect.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyBackHeader from "@/myElements/MyBackHeader.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";

import ChartRenderer from "@/managers/render/chartRenderer";
import SaveManager from "@/managers/save";
import MouseManager from "@/managers/mouse";
import HistoryManager from "@/managers/history";
import CloneManager from "@/managers/clone";
import EditorRenderer from "@/managers/render/editorRenderer";
import ClipboardManager from "@/managers/clipboard";
import StateManager from "@/managers/state";
import MoveManager from "@/managers/move";
import ExportManager from "@/managers/export";
import SelectionManager from "@/managers/selection";
import SettingsManager from "@/managers/settings";
import ParagraphRepeater from "@/managers/paragraphRepeater";
import EventAbillitiesManager from "@/managers/eventAbillities";

import BPMListPanel from "@/panels/BPMListPanel.vue";
import ChartMetaPanel from "@/panels/ChartMetaPanel.vue";
import JudgeLinePanel from "@/panels/JudgeLinePanel.vue";
import NoteEditPanel from "@/panels/NoteEditPanel.vue";
import NumberEventEditPanel from "@/panels/NumberEventEditPanel.vue";
import MutipleEditPanel from "@/panels/MutipleEditPanel.vue";
import SettingsPanel from "@/panels/SettingsPanel.vue";
import HistoryPanel from "@/panels/HistoryPanel.vue";
import ClipboardPanel from "@/panels/ClipboardPanel.vue";


import globalEventEmitter from "@/eventEmitter";
import { RightPanelState } from "@/types";
import store, { audioRef, canvasRef, chartPackageRef } from "@/store";
import BoxesManager from "@/managers/boxes";
import { confirm } from "@/tools/catchError";
import CalculatorPanel from "@/panels/CalculatorPanel.vue";
import NoteFiller from "@/managers/noteFiller";
import NoteFillPanel from "@/panels/NoteFillPanel.vue";
import Constants from "@/constants";

const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});
const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});
store.route = useRoute();
const router = useRouter();

loadStart();
{
    // 读取chartPackage
    const chartId = store.getChartId();
    const readResult = await window.electronAPI.readChart(chartId);
    const musicBlob = MediaUtils.arrayBufferToBlob(readResult.musicData);
    const musicSrc = URL.createObjectURL(musicBlob);
    const backgroundBlob = MediaUtils.arrayBufferToBlob(readResult.backgroundData);
    const backgroundSrc = URL.createObjectURL(backgroundBlob);
    const textureBlobs = readResult.textureDatas.map((textureData) =>
        MediaUtils.arrayBufferToBlob(textureData)
    );
    const textureSrcs = textureBlobs.map((textureBlob) => URL.createObjectURL(textureBlob));
    store.chartPackageRef.value = new ChartPackage({
        musicSrc,
        background: (() => {
            const image = new Image();
            image.src = backgroundSrc;
            return image;
        })(),
        textures: (() => {
            const textures: Record<string, HTMLImageElement> = {};
            for (let i = 0; i < textureSrcs.length; i++) {
                textures[readResult.texturePaths[i]] = (() => {
                    const image = new Image();
                    image.src = textureSrcs[i];
                    return image;
                })();
            }
            return textures;
        })(),
        chart: JSON.parse(readResult.chartContent),
    });

    // 加载resourcePackage
    store.resourcePackageRef.value = await getResourcePackage();

    // 创建并设置managers
    store.setManager("chartRenderer", new ChartRenderer());
    store.setManager("editorRenderer", new EditorRenderer());
    store.setManager("clipboardManager", new ClipboardManager());
    store.setManager("cloneManager", new CloneManager());
    store.setManager("historyManager", new HistoryManager());
    store.setManager("mouseManager", new MouseManager());
    store.setManager("moveManager", new MoveManager());
    store.setManager("saveManager", new SaveManager());
    store.setManager("selectionManager", new SelectionManager());
    store.setManager("settingsManager", new SettingsManager());
    store.setManager("stateManager", new StateManager());
    store.setManager("paragraphRepeater", new ParagraphRepeater());
    store.setManager("exportManager", new ExportManager());
    store.setManager("eventAbillitiesManager", new EventAbillitiesManager());
    store.setManager("boxesManager", new BoxesManager());
    store.setManager("noteFiller", new NoteFiller());

    onBeforeUnmount(() => {
        // 释放资源
        URL.revokeObjectURL(musicSrc);
        URL.revokeObjectURL(backgroundSrc);
        for (const textureSrc of textureSrcs) {
            URL.revokeObjectURL(textureSrc);
        }
    });
}
loadEnd();

const stateManager = store.useManager("stateManager");
const selectionManager = store.useManager("selectionManager");
const chartRenderer = store.useManager("chartRenderer");
const editorRenderer = store.useManager("editorRenderer");
const settingsManager = store.useManager("settingsManager");

const fps = ref(0);
const time = ref(0);
const combo = ref(0);
const score = ref(0);
const u = ref(false);
const audioIsPlaying = ref(false);
const tip = ref(Constants.tips[Math.floor(Math.random() * Constants.tips.length)]);

let windowIsFocused = true;
let cachedRect: DOMRect;

function update() {
    u.value = !u.value;
}

async function handleExport() {
    const chartName = store.chartPackageRef.value?.chart.META.name || "untitled";
    // 使用预加载的 API 替代直接导入
    const filePath = await window.electronAPI.showSaveDialog(chartName);
    if (!filePath) return;
    globalEventEmitter.emit("EXPORT", filePath);
}

async function handleDeleteChart() {
    window.electronAPI.deleteChart(store.getChartId());
    router.push("/");
}

async function getResourcePackage() {
    const res = await fetch(resourcePackageURL);
    const blob = await res.blob();
    return await ResourcePackage.load(blob);
}
function canvasMouseDown(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    switch (e.button) {
        case 0:
            globalEventEmitter.emit("MOUSE_LEFT_CLICK", x, y, options);
            return;
        case 2:
            globalEventEmitter.emit("MOUSE_RIGHT_CLICK", x, y, options);
            return;
    }
}
function canvasMouseMove(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    globalEventEmitter.emit("MOUSE_MOVE", x, y, options);
}
function canvasMouseUp(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    globalEventEmitter.emit("MOUSE_UP", x, y, options);
}
function windowOnWheel(e: WheelEvent) {
    const audio = store.useAudio();
    if (e.ctrlKey) {
        e.preventDefault();
        stateManager.state.pxPerSecond = clamp(
            stateManager.state.pxPerSecond + e.deltaY * -0.05,
            1,
            1000
        );
    } else {
        audio.currentTime +=
            (e.deltaY * settingsManager.wheelSpeed) / -stateManager.state.pxPerSecond;
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
    const key = KeyboardUtils.formatKey(e);
    console.debug(key);
    switch (key) {
        case "Space":
            MediaUtils.togglePlay(audio);
            return;
        case "Q":
            globalEventEmitter.emit("CHANGE_TYPE", NoteType.Tap);
            return;
        case "W":
            globalEventEmitter.emit("CHANGE_TYPE", NoteType.Drag);
            return;
        case "E":
            globalEventEmitter.emit("CHANGE_TYPE", NoteType.Flick);
            return;
        case "R":
            globalEventEmitter.emit("CHANGE_TYPE", NoteType.Hold);
            return;
        case "T": {
            globalEventEmitter.emit("PREVIEW");
            const time = audio.currentTime;
            // 松开P键时停止预览
            const keyUpHandler = (e: KeyboardEvent) => {
                const key = KeyboardUtils.formatKey(e);
                if (key === "T") {
                    globalEventEmitter.emit("STOP_PREVIEW");
                    audio.currentTime = time;
                    window.removeEventListener("keyup", keyUpHandler);
                }
            };
            window.addEventListener("keyup", keyUpHandler);
            return;
        }
        case "U": {
            globalEventEmitter.emit("PREVIEW");
            // 松开P键时停止预览
            const keyUpHandler = (e: KeyboardEvent) => {
                const key = KeyboardUtils.formatKey(e);
                if (key === "U") {
                    globalEventEmitter.emit("STOP_PREVIEW");
                    window.removeEventListener("keyup", keyUpHandler);
                }
            };
            window.addEventListener("keyup", keyUpHandler);
            return;
        }
        case "I": {
            if (stateManager.state.isPreviewing) {
                globalEventEmitter.emit("STOP_PREVIEW");
            } else {
                globalEventEmitter.emit("PREVIEW");
            }
            return;
        }
        case "[":
            globalEventEmitter.emit("PREVIOUS_JUDGE_LINE");
            return;
        case "]":
            globalEventEmitter.emit("NEXT_JUDGE_LINE");
            return;
        case "A":
            globalEventEmitter.emit("PREVIOUS_JUDGE_LINE");
            return;
        case "D":
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
            globalEventEmitter.emit("PASTE_MIRROR");
            return;
        case "Ctrl S":
            globalEventEmitter.emit("SAVE");
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
            globalEventEmitter.emit(
                "MOVE_TO_JUDGE_LINE",
                parseInt((await ElMessageBox.prompt("请输入判定线号", "移动到指定判定线")).value)
            );
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
        case "Ctrl D":
            globalEventEmitter.emit("DISABLE");
            return;
        case "Ctrl E":
            globalEventEmitter.emit("ENABLE");
            return;
        case "Alt A":
            globalEventEmitter.emit("REVERSE");
            return;
        case "Alt S":
            globalEventEmitter.emit("SWAP");
            return;

    }
}
function documentOnContextmenu(e: Event) {
    e.preventDefault();
}

function windowOnBlur() {
    const audio = store.useAudio();
    audio.pause();
    windowIsFocused = false;
}

function windowOnFocus() {
    windowIsFocused = true;
}
function audioOnTimeUpdate() {
    const audio = store.useAudio();
    time.value = audio.currentTime;
}
function audioOnPause() {
    audioIsPlaying.value = false;
}
function audioOnPlay() {
    audioIsPlaying.value = true;
}
/**
     * 该函数用于在含有object-fit:contain的canvas上，
     * 根据MouseEvent对象计算出点击位置在canvas绘制上下文中的坐标
     *
     * 解决了由于canvas外部尺寸与内部绘制尺寸不一致导致的坐标偏移问题
     */
function calculatePosition({ offsetX: x, offsetY: y }: MouseEvent) {
    const canvas = store.useCanvas();
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
onMounted(() => {
    const canvas = store.useCanvas();
    const audio = store.useAudio();
    cachedRect = canvas.getBoundingClientRect();

    canvas.addEventListener("mousedown", canvasMouseDown);
    canvas.addEventListener("mousemove", canvasMouseMove);
    canvas.addEventListener("mouseup", canvasMouseUp);
    const resizeObserver = new ResizeObserver(canvasOnResize);
    resizeObserver.observe(canvas);
    window.addEventListener("wheel", windowOnWheel, { passive: false });
    window.addEventListener("keydown", windowOnKeyDown);
    window.addEventListener("blur", windowOnBlur);
    window.addEventListener("focus", windowOnFocus);
    document.oncontextmenu = documentOnContextmenu;
    audio.addEventListener("timeupdate", audioOnTimeUpdate);
    audio.addEventListener("pause", audioOnPause);
    audio.addEventListener("play", audioOnPlay);
    let renderTime = performance.now();
    let isRendering = true;
    const renderLoop = () => {
        if (isRendering) {
            if (windowIsFocused) {
                try {
                    if (stateManager.state.isPreviewing) {
                        chartRenderer.renderChart();
                    } else {
                        editorRenderer.render();
                    }
                } catch (error) {
                    console.error(error);
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
                if (combo.value !== chartRenderer.combo) {
                    combo.value = chartRenderer.combo;
                }
                if (score.value !== chartRenderer.score) {
                    score.value = round(chartRenderer.score);
                }
            }
            requestAnimationFrame(renderLoop);
        }
    };
    const tipInterval = setInterval(() => {
        tip.value = Constants.tips[Math.floor(Math.random() * Constants.tips.length)];
    }, 10000);
    renderLoop();
    onBeforeUnmount(() => {
        audio.pause();
        canvas.removeEventListener("mousedown", canvasMouseDown);
        canvas.removeEventListener("mousemove", canvasMouseMove);
        canvas.removeEventListener("mouseup", canvasMouseUp);
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        window.removeEventListener("wheel", windowOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        window.removeEventListener("blur", windowOnBlur);
        window.removeEventListener("focus", windowOnFocus);
        audio.removeEventListener("timeupdate", audioOnTimeUpdate);
        audio.removeEventListener("pause", audioOnPause);
        audio.removeEventListener("play", audioOnPlay);
        isRendering = false;
        requestAnimationFrame(() => {
            // 确保在下一个帧结束时停止渲染循环
            isRendering = false;
        });
        // 清理canvas和document事件
        canvas.remove();
        store.chartPackageRef.value = null;
        store.resourcePackageRef.value = null;
        store.audioRef.value = null;
        store.canvasRef.value = null;
        store.route = null;
        for (const key in store.managers) {
            store.managers[key as keyof typeof store.managers] = null;
        }

        isRendering = false;
        globalEventEmitter.destroy();
        clearInterval(tipInterval);
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
    grid-template-columns: auto auto auto;
    grid-template-rows: 80px auto 30px;
    grid-template-areas:
        "header header header"
        "left main right"
        "footer footer footer";
}

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

.el-button-group {
    display: flex;
    flex-wrap: nowrap;
}

#footer {
    grid-area: footer;
}

.footer-left {
    float: left;
}

.footer-right {
    float: right;
}
</style>
