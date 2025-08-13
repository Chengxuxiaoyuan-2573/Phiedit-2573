<template>
    <ElContainer>
        <ElHeader id="header">
            <div class="audio-player">
                <audio
                    ref="audioRef"
                    :src="store.chartPackageRef.value?.musicSrc"
                />
                <template v-if="audioRef">
                    <ElIcon
                        class="play-icon"
                        size="30"
                        @click="MediaUtils.togglePlay(audioRef)"
                    >
                        <VideoPlay v-if="!audioIsPlaying" />
                        <VideoPause v-else />
                    </ElIcon>
                    <p>
                        {{ Math.floor(time / 60) }}:{{ Math.floor(time % 60).toString().padStart(2, "0") }}
                    </p>
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
            </div>
            <p
                :style="{
                    color: fpsColor,
                    display: 'block',
                    whiteSpace: 'nowrap',
                }"
                class="fps"
            >
                FPS: {{ fps.toFixed(2) }}
            </p>
            <ElRadioGroup
                v-if="resourcePackageRef"
                v-model="stateManager.state.currentNoteType"
                class="note-type-select"
            >
                <ElRadioButton
                    class="note-type-option note-type-tap"
                    :value="NoteType.Tap"
                >
                    <MyImage
                        :image="resourcePackageRef.tap"
                        :width="80"
                        :height="30"
                        shadow
                    />
                    <p>Tap（Q）</p>
                </ElRadioButton>
                <ElRadioButton
                    class="note-type-option note-type-drag"
                    :value="NoteType.Drag"
                >
                    <MyImage
                        :image="resourcePackageRef.drag"
                        :width="80"
                        :height="30"
                        shadow
                    />
                    <p>Drag（W）</p>
                </ElRadioButton>
                <ElRadioButton
                    class="note-type-option note-type-flick"
                    :value="NoteType.Flick"
                >
                    <MyImage
                        :image="resourcePackageRef.flick"
                        :width="80"
                        :height="30"
                        shadow
                    />
                    <p>Flick（E）</p>
                </ElRadioButton>
                <ElRadioButton
                    class="note-type-option note-type-hold"
                    :value="NoteType.Hold"
                >
                    <MyImage
                        :image="resourcePackageRef.hold"
                        rotate="anti-clockwise"
                        :width="80"
                        :height="30"
                        shadow
                    />
                    <p>Hold（R）</p>
                </ElRadioButton>
            </ElRadioGroup>
            <MySelect
                v-if="audioRef"
                v-model="audioRef.playbackRate"
                class="speed-select"
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
                        label: '播放速度：1.5x',
                        value: 1.5,
                        text: '1.5x',
                    },
                    {
                        label: '播放速度：2.0x',
                        value: 2,
                        text: '2.0x',
                    },
                    {
                        label: '播放速度：3.0x',
                        value: 3,
                        text: '3.0x',
                    },
                ]"
            />
            <MyInputNumber
                v-model="stateManager.state.horizonalLineCount"
                class="horizontal-input"
                :min="1"
                :max="64"
            >
                <template #prepend>
                    横线数
                </template>
            </MyInputNumber>
            <MyInputNumber
                v-model="stateManager.state.verticalLineCount"
                class="vertical-input"
                :min="2"
                :max="100"
            >
                <template #prepend>
                    竖线数
                </template>
            </MyInputNumber>
            <p>
                COMBO: {{ combo }}
            </p>
            <p>
                SCORE: {{ round(score).toString().padStart(7, '0') }}
            </p>
        </ElHeader>
        <ElAside id="left">
            <div
                v-if="selectionManager.selectedElements.length == 0"
                class="left-inner"
            >
                <div>
                    <h1>Phiedit 2573</h1>
                    <MyButton
                        type="primary"
                        class="save-chart-button"
                        @click="globalEventEmitter.emit('SAVE')"
                    >
                        保存谱面
                    </MyButton>
                    <ElTooltip>
                        <template #default>
                            <MyButton
                                type="primary"
                                @click="handleExport"
                            >
                                导出谱面
                            </MyButton>
                        </template>
                        <template #content>
                            <em>导出的谱面有bug，无法直接导入进Phira，请按以下步骤操作</em><br>
                            导出后请把文件的后缀名pez改为zip并解压缩到一个文件夹中，<br>
                            打开你的<em>Re:PhiEdit软件</em>，点击“添加谱面”，选择文件夹中的音乐和曲绘文件，<br>
                            并进入谱面，点击左上角的齿轮按钮，点击“导入谱面”，选择文件夹中的json文件，<br>
                            加载完成后按Ctrl+S保存，然后点“退出谱面”，再点击“导出谱面”，<br>
                            并在你的<em>Re:PhiEdit软件</em>的安装目录中找到Resources文件夹，把导出的谱面文件拖到桌面上，方可正常使用。<br>
                            <em>注意，我说的是Re:PhiEdit，不是本软件！请在bilibili上搜索Re:PhiEdit以获取该软件！</em>
                        </template>
                    </ElTooltip>
                </div>
                <div>
                    <MyButton
                        type="warning"
                        class="exit-button"
                        @click="confirm(() => $router.push('/'), '退出编辑后未保存的谱面将会丢失', '退出编辑')"
                    >
                        退出编辑
                    </MyButton>
                    <MyButton
                        type="danger"
                        class="delete-chart-button"
                        @click="confirm(handleDeleteChart, '确定要删除此谱面吗？', '删除谱面')"
                    >
                        删除谱面
                    </MyButton>
                </div>
            </div>
            <template v-else>
                <MyBackHeader
                    class="title-left"
                    @back="selectionManager.unselectAll()"
                />
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
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Settings"
                        >
                            设置
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.BPMList"
                        >
                            BPM编辑
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Meta"
                        >
                            谱面基本信息
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.JudgeLine"
                        >
                            判定线编辑
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.History"
                        >
                            历史记录
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Clipboard"
                        >
                            剪贴板管理
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.NoteFill"
                        >
                            填充曲线音符
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.EventFill"
                        >
                            生成曲线轨迹
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.Calculator"
                        >
                            计算器
                        </MyButton>
                        <MyButton
                            type="primary"
                            @click="stateManager.state.right = RightPanelState.FastBind"
                        >
                            快速绑线
                        </MyButton>
                    </MyGridContainer>
                    <h3>
                        快速切换判定线
                    </h3>
                    <MyGridContainer
                        :columns="5"
                        :gap="5"
                    >
                        <MyButton
                            v-for="i in stateManager.judgeLinesCount"
                            :key="i - 1 + (u ? 0 : 0)"
                            :type="(['primary', 'warning', 'danger'] as const)[Math.floor((i - 1) / 10) % 3]"
                            :plain="i - 1 != stateManager.state.currentJudgeLineNumber"
                            @click="stateManager.state.currentJudgeLineNumber = i - 1"
                        >
                            {{ i - 1 }}
                        </MyButton>
                        <MyButton
                            type="success"
                            @click="chartPackageRef?.chart.addNewJudgeLine(), update()"
                        >
                            +
                        </MyButton>
                    </MyGridContainer>
                    <h3>
                        快速切换事件层级
                    </h3>
                    <MyGridContainer
                        :columns="5"
                        :gap="5"
                    >
                        <MyButton
                            v-for="i in stateManager.eventLayersCount"
                            :key="i - 1 + (u ? 0 : 0)"
                            type="primary"
                            :plain="i - 1 != stateManager.state.currentEventLayerNumber"
                            @click="stateManager.state.currentEventLayerNumber = i - 1"
                        >
                            {{ i - 1 }}
                        </MyButton>
                        <MyButton
                            type="success"
                            @click="stateManager.currentJudgeLine.addEventLayer(), update()"
                        >
                            +
                        </MyButton>
                        <ElTooltip>
                            <template #default>
                                <MyButton
                                    type="warning"
                                    plain
                                    disabled
                                >
                                    特殊
                                </MyButton>
                            </template>
                            <template #content>
                                暂不支持特殊事件层级编辑
                            </template>
                        </ElTooltip>
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
                    <EventFillPanel
                        v-else-if="stateManager.state.right == RightPanelState.EventFill"
                        title-teleport=".title-right"
                    />
                    <FastBindPanel
                        v-else-if="stateManager.state.right == RightPanelState.FastBind"
                        title-teleport=".title-right"
                    />
                </template>
            </ElScrollbar>
        </ElAside>
        <ElFooter id="footer">
            <div class="footer-left">
                <span @click="copyLink($event, 'https://github.com/Chengxuxiaoyuan-2573/Phiedit-2573')">
                    <a href="https://github.com/Chengxuxiaoyuan-2573/Phiedit-2573">
                        Phiedit 2573
                    </a>
                </span>
                Made By
                <span @click="copyLink($event, 'https://space.bilibili.com/522248560')">
                    <a href="https://space.bilibili.com/522248560">
                        @程序小袁_2573
                    </a>
                </span>
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
    ElScrollbar,
    ElContainer,
    ElHeader,
    ElIcon,
    ElMain,
    ElMessageBox,
    ElSlider,
    ElFooter,
    ElMessage,
    ElTooltip,
    ElRadioButton,
    ElRadioGroup,
} from "element-plus";
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clamp, mean, round } from "lodash";

import MediaUtils from "@/tools/mediaUtils";
import KeyboardUtils from "@/tools/keyboardUtils";

import { NumberEvent } from "@/models/event";
import { Note, NoteType } from "@/models/note";
import { ResourcePackage } from "@/models/resourcePackage";
import { ChartPackage } from "@/models/chartPackage";

import MyButton from "@/myElements/MyButton.vue";
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
import store, { audioRef, canvasRef, chartPackageRef, resourcePackageRef } from "@/store";
import BoxesManager from "@/managers/boxes";
import { confirm } from "@/tools/catchError";
import CalculatorPanel from "@/panels/CalculatorPanel.vue";
import NoteFiller from "@/managers/noteFiller";
import NoteFillPanel from "@/panels/NoteFillPanel.vue";
import Constants from "@/constants";
import EventFillPanel from "@/panels/EventFillPanel.vue";
import EventFiller from "@/managers/eventFiller";
import LineBinder from "@/managers/lineBinder";
import FastBindPanel from "@/panels/FastBindPanel.vue";
import MyImage from "@/myElements/MyImage.vue";
import AutoplayManager from "@/managers/autoplay";

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
    store.setManager("eventFiller", new EventFiller());
    store.setManager("lineBinder", new LineBinder());
    store.setManager("autoplayManager", new AutoplayManager());

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
const settingsManager = store.useManager("settingsManager");
const autoplayManager = store.useManager("autoplayManager");

const fps = ref(60);
const time = ref(0);
const combo = ref(0);
const score = ref(0);
const u = ref(false);
const audioIsPlaying = ref(false);
const tip = ref(Constants.tips[Math.floor(Math.random() * Constants.tips.length)]);
const fpsColor = computed(() => {
    if (fps.value >= 60) {
        return '#00dd00';
    } else if (fps.value >= 40) {
        return '#99aa00';
    } else if (fps.value >= 20) {
        return '#ff6600';
    } else {
        return '#ff0000';
    }
});
let windowIsFocused = true;
let cachedRect: DOMRect;

function update() {
    u.value = !u.value;
}

function copyLink(e: MouseEvent, link: string) {
    e.preventDefault();
    navigator.clipboard.writeText(link);
    ElMessage.success("已复制链接至剪贴板，请粘贴至浏览器网址栏打开")
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
    const arrayBuffer = await window.electronAPI.readResourcePackage();
    const blob = MediaUtils.arrayBufferToBlob(arrayBuffer);
    return await ResourcePackage.load(blob);
}
function canvasMouseDown(e: MouseEvent) {
    const canvas = store.useCanvas();
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
        return;
    }
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
            (e.deltaY * settingsManager.settings.wheelSpeed) / -stateManager.state.pxPerSecond;
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
            // 松开T键时停止预览
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
            // 松开U键时停止预览
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
        case "Ctrl [":
            globalEventEmitter.emit("MOVE_TO_PREVIOUS_JUDGE_LINE");
            return;
        case "Ctrl ]":
            globalEventEmitter.emit("MOVE_TO_NEXT_JUDGE_LINE");
            return;
        case "Ctrl Shift V":
            globalEventEmitter.emit("REPEAT");
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
    const showFpsFrequency = 20;
    const fpsList: number[] = [];
    const renderLoop = () => {
        if (isRendering) {
            if (windowIsFocused) {
                try {
                    if (stateManager.state.isPreviewing) {
                        globalEventEmitter.emit("RENDER_CHART");
                    } else {
                        globalEventEmitter.emit("RENDER_EDITOR");
                    }
                } catch (error) {
                    console.error(error);
                }
                const now = performance.now();
                const delta = now - renderTime;

                if (delta > 0) {
                    const currentFPS = 1000 / delta;
                    fpsList.push(currentFPS);
                    if (fpsList.length >= showFpsFrequency) {
                        fps.value = mean(fpsList);
                        fpsList.length = 0;
                    }
                } else {
                    fps.value = 0;
                }
                renderTime = now;
                if (combo.value !== autoplayManager.combo) {
                    combo.value = autoplayManager.combo;
                }
                if (score.value !== autoplayManager.score) {
                    score.value = autoplayManager.score;
                }
            }
            requestAnimationFrame(renderLoop);
        }
    };
    const tipInterval = setInterval(() => {
        tip.value = Constants.tips[Math.floor(Math.random() * Constants.tips.length)] || "Tip: tip加载失败";
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
.el-button+.el-button {
    margin-left: 0;
    margin-right: 0;
}

.el-container {
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    grid-template-rows: 100px 1fr 30px;
    grid-template-areas:
        "header header header"
        "left main right"
        "footer footer footer";
}

#header {
    grid-area: header;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
        "audio-player audio-player audio-player fps"
        "note-type-select speed-select horizontal-input vertical-input"
        "note-type-select none none none";
    gap: 10px;
}

.audio-player {
    grid-area: audio-player;
    display: flex;
    gap: 20px;
}

.fps {
    grid-area: fps;
}

.note-type-select {
    grid-area: note-type-select;
    /* display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: 2fr 1fr;
    grid-template-areas:
        "tap drag flick hold"
        "x x x hold"; */
}

/* .note-type-tap {
    grid-area: tap;
}

.note-type-drag {
    grid-area: drag;
}

.note-type-flick {
    grid-area: flick;
}

.note-type-hold {
    grid-area: hold;
} */

.speed-select {
    grid-area: speed-select;
}

.horizontal-input {
    grid-area: horizontal-input;
}

.vertical-input {
    grid-area: vertical-input;
}

/* .note-type-select .el-radio-button {
    border-radius: var(--el-border-radius-base) !important;
    overflow: hidden;
    --el-border: 100px solid black; 
} */

.note-type-select .el-radio-button p {
    text-align: center;
}

.play-icon {
    color: black;
    transition: 0.2s;
    cursor: pointer;
}

.play-icon:hover {
    color: var(--el-color-primary);
}

.play-icon:active {
    color: var(--el-color-primary-dark);
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
.right-inner,
.left-inner div {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    min-height: 100%;
}

.delete-chart-button {
    justify-self: flex-end;
}

.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}

.el-button-group,
.el-radio-group {
    display: flex;
    flex-wrap: nowrap;
}

#footer {
    grid-area: footer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
    height: 30px;
}

.footer-left,
.footer-right {
    white-space: nowrap;
}

.footer-left {
    max-width: 35vw;
}

.footer-right {
    max-width: 65vw;
}
</style>