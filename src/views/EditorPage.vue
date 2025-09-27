<template>
    <ElContainer>
        <ElHeader id="header">
            <ElScrollbar
                id="header-inner"
                @wheel.passive.stop
            >
                <div class="audio-player">
                    <audio
                        ref="audioRef"
                        :src="store.chartPackageRef.value?.musicSrc"
                    />
                    <template v-if="audioRef">
                        <ElIcon
                            class="play-icon"
                            size="30"
                            @click="globalEventEmitter.emit('TOGGLE_PLAY')"
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
                            @input="store.pauseAudio(), store.setTime(time as number)"
                        />
                    </template>
                </div>
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
                <p class="info">
                    <span
                        :style="{
                            color: fpsColor,
                            display: 'block',
                            whiteSpace: 'nowrap',
                        }"
                        useless-attribute
                    >
                        FPS: {{ fps.toFixed(2) }}
                    </span>
                    <span v-show="mouseIsInCanvas">
                        ({{ mouseX.toFixed(0) }}, {{ mouseY.toFixed(0) }})
                    </span>
                </p>
                <MySelect
                    v-if="audioRef"
                    v-model="audioRef.playbackRate"
                    class="speed-select"
                    :options="[
                        {
                            label: '1.0x',
                            value: 1,
                            text: '1.0x',
                        },
                        {
                            label: '0.5x',
                            value: 0.5,
                            text: '0.5x',
                        },
                        {
                            label: '0.25x',
                            value: 0.25,
                            text: '0.25x',
                        },
                        {
                            label: '0.125x',
                            value: 0.125,
                            text: '0.125x',
                        },
                        {
                            label: '0.0x',
                            value: 0,
                            text: '0.0x',
                        },
                        {
                            label: '1.5x',
                            value: 1.5,
                            text: '1.5x',
                        },
                        {
                            label: '2.0x',
                            value: 2,
                            text: '2.0x',
                        },
                        {
                            label: '3.0x',
                            value: 3,
                            text: '3.0x',
                        },
                    ]"
                >
                    倍速
                </MySelect>
                <MyInputNumber
                    v-model="stateManager.state.horizonalLineCount"
                    class="horizontal-input"
                    :min="1"
                    :max="64"
                >
                    <template #prepend>
                        横线数
                        <MyQuestionMark>
                            一拍内有多少条横线。在写一些奇怪的节奏时可能需要临时修改。<br>
                            假如a分音符为一拍，横线数为b，则每个格子代表（a×b）分音。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.state.verticalLineCount"
                    class="vertical-input"
                    :min="0"
                    :max="100"
                >
                    <template #prepend>
                        竖线数
                        <MyQuestionMark>
                            左边的音符编辑区域内有多少条竖线。用于让排键更规整。<br>
                            建议调为19或21。如果要取消竖线，请设为0。取消竖线后你的排键可能会很乱。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
                <p class="event-layer-hint-text">
                    点击右侧按钮切换事件层级
                    <MyQuestionMark>
                        事件层级是用来叠加不同的事件的，例如：<br>
                        在0号事件层上写绕定点的圆周运动，1号事件层上写平移运动，<br>
                        则实际效果会显示为判定线一边旋转一边平移。<br>
                        内部实现逻辑为：把每个事件层级的事件值加一起作为最终事件值。<br>
                        <br>
                        上述说明针对的是普通事件层级，还有一层特殊事件层级。<br>
                        特殊事件层级也被称为故事板，是用来写出一些比较高级的功能的。<br>
                    </MyQuestionMark>
                </p>
                <MyGridContainer
                    class="event-layer-select"
                    :columns="5"
                    :gap="5"
                >
                    <MyButton
                        v-for="i in min([stateManager.eventLayersCount, 4])"
                        :key="i - 1 + (u ? 0 : 0)"
                        type="primary"
                        :plain="i - 1 != parseInt(stateManager.state.currentEventLayerId)"
                        @click="stateManager.state.currentEventLayerId = (i - 1).toString(), update()"
                    >
                        {{ i - 1 }}
                    </MyButton>
                    <MyButton
                        type="warning"
                        :plain="stateManager.state.currentEventLayerId != 'X'"
                        @click="stateManager.state.currentEventLayerId = 'X', update()"
                    >
                        特殊
                    </MyButton>
                </MyGridContainer>
                <MyInputNumber
                    v-model="chart.META.offset"
                    class="offset-input"
                >
                    <template #prepend>
                        偏移
                        <MyQuestionMark>
                            谱面的偏移量，单位为毫秒。<br>
                            正数表示谱面比音乐延后，负数表示谱面比音乐提前。<br>
                            建议控制在-500~500之间。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
            </ElScrollbar>
        </ElHeader>
        <ElAside
            id="left"
            @wheel.passive.stop
        >
            <div
                v-if="selectionManager.selectedElements.length == 0"
                class="left-inner default-panel"
                style="justify-content: space-between;"
            >
                <div style="display: flex;flex-direction: column;gap: 10px;">
                    <h1>Phiedit 2573</h1>
                    <MyButton
                        type="primary"
                        class="save-chart-button"
                        @click="globalEventEmitter.emit('SAVE')"
                    >
                        保存谱面
                    </MyButton>
                    <ElTooltip placement="right">
                        <template #default>
                            <MyButton
                                type="primary"
                                @click="catchErrorByMessage(exportChart, '导出')"
                            >
                                导出谱面
                            </MyButton>
                        </template>
                        <template #content>
                            <em>导出的谱面有bug，无法直接导入进Re:PhiEdit，请按以下步骤操作</em><br>
                            导出后请把文件的后缀名pez改为zip并解压缩到一个文件夹中，<br>
                            打开你的Re:PhiEdit，点击“添加谱面”，选择文件夹中的音乐和曲绘文件，<br>
                            并进入谱面，点击左上角的齿轮按钮，点击“导入谱面”，选择文件夹中的json文件，<br>
                            加载完成后按Ctrl+S保存，然后点“退出谱面”，再点击“导出谱面”，<br>
                            导出完毕后，方可正常使用。<br>
                        </template>
                    </ElTooltip>
                    <MyButton
                        type="primary"
                        @click="catchErrorByMessage(addTextures, '添加判定线贴图')"
                    >
                        添加判定线贴图
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="catchErrorByMessage(openChartFolder, '打开谱面文件夹')"
                    >
                        打开谱面文件夹
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="checkForUpdates"
                    >
                        检查更新
                    </MyButton>
                    <!-- <p style="overflow-y: auto;">
                        A和[：切换到上一条判定线<br>
                        D和]：切换到下一条判定线<br>
                        T、U、I：预览谱面<br>
                    </p> -->
                </div>
                <div style="display: flex;flex-direction: column;gap: 10px;">
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
                        @click="confirm(deleteChart, '确定要删除此谱面吗？', '删除谱面')"
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
                    v-else-if="isNoteLike(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <NumberEventEditPanel
                    v-else-if="isNumberEventLike(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <ColorEventEditPanel
                    v-else-if="isColorEventLike(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <TextEventEditPanel
                    v-else-if="isTextEventLike (selectionManager.selectedElements[0])"
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
        <ElAside
            id="right"
            @wheel.passive.stop
        >
            <div
                v-if="stateManager.state.right == RightPanelState.Default"
                class="right-inner default-panel"
            >
                <MyGridContainer
                    :columns="2"
                    :gap="10"
                >
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
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Error"
                    >
                        谱面纠错
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Shader"
                    >
                        shader编辑
                    </MyButton>
                </MyGridContainer>
                <h3>
                    快速切换判定线
                </h3>
                <MyInput
                    v-model="judgeLineFilter"
                    class="judge-line-filter-input"
                    placeholder="筛选判定线"
                    clearable
                />
                <MyGridContainer
                    :columns="5"
                    :gap="5"
                >
                    <MyButton
                        v-for="judgeLine in filteredJudgeLines"
                        :key="judgeLine.id + (u ? 0 : 0)"
                        :type="(['primary', 'warning', 'danger', 'success', 'info'] as const)[Math.floor((judgeLine.id) / 10) % 5]"
                        :plain="judgeLine.id != stateManager.state.currentJudgeLineNumber"
                        flex
                        @click="stateManager.state.currentJudgeLineNumber = judgeLine.id, update()"
                    >
                        {{ judgeLine.id }}
                    </MyButton>
                    <MyButton
                        type="success"
                        @click="chart.addNewJudgeLine(), update()"
                    >
                        +
                    </MyButton>
                </MyGridContainer>
            </div>
            <template v-else>
                <MyBackHeader
                    class="title-right"
                    @back="stateManager.state.right = RightPanelState.Default"
                />
                <BPMListPanel
                    v-if="stateManager.state.right === RightPanelState.BPMList"
                    title-teleport=".title-right"
                />
                <ChartMetaPanel
                    v-else-if="stateManager.state.right === RightPanelState.Meta"
                    title-teleport=".title-right"
                />
                <JudgeLinePanel
                    v-else-if="stateManager.state.right === RightPanelState.JudgeLine"
                    title-teleport=".title-right"
                />
                <SettingsPanel
                    v-else-if="stateManager.state.right === RightPanelState.Settings"
                    title-teleport=".title-right"
                />
                <HistoryPanel
                    v-else-if="stateManager.state.right === RightPanelState.History"
                    title-teleport=".title-right"
                />
                <ClipboardPanel
                    v-else-if="stateManager.state.right === RightPanelState.Clipboard"
                    title-teleport=".title-right"
                />
                <CalculatorPanel
                    v-else-if="stateManager.state.right === RightPanelState.Calculator"
                    title-teleport=".title-right"
                />
                <NoteFillPanel
                    v-else-if="stateManager.state.right === RightPanelState.NoteFill"
                    title-teleport=".title-right"
                />
                <EventFillPanel
                    v-else-if="stateManager.state.right === RightPanelState.EventFill"
                    title-teleport=".title-right"
                />
                <FastBindPanel
                    v-else-if="stateManager.state.right === RightPanelState.FastBind"
                    title-teleport=".title-right"
                />
                <ErrorPanel
                    v-else-if="stateManager.state.right === RightPanelState.Error"
                    title-teleport=".title-right"
                />
                <ShaderPanel
                    v-else-if="stateManager.state.right === RightPanelState.Shader"
                    title-teleport=".title-right"
                />
            </template>
        </ElAside>
        <ElFooter id="footer">
            <div class="footer-left">
                <MyLink href="https://github.com/Chengxuxiaoyuan-2573/Phiedit-2573">
                    Phiedit 2573
                </MyLink>
                Made By
                <MyLink href="https://space.bilibili.com/522248560">
                    @程序小袁_2573
                </MyLink>
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
    ElSlider,
    ElFooter,
    ElTooltip,
    ElRadioButton,
    ElRadioGroup,
    ElMessage,
} from "element-plus";
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { isNumber, mean, min } from "lodash";

import MediaUtils from "@/tools/mediaUtils";
import KeyboardUtils from "@/tools/keyboardUtils";
import { catchErrorByMessage, confirm } from "@/tools/catchError";

import { isNumberEventLike, isColorEventLike, isTextEventLike } from "@/models/event";
import { isNoteLike, NoteType } from "@/models/note";

import MyButton from "@/myElements/MyButton.vue";
import MySelect from "@/myElements/MySelect.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyBackHeader from "@/myElements/MyBackHeader.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MyImage from "@/myElements/MyImage.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";

import BPMListPanel from "@/panels/BPMListPanel.vue";
import ChartMetaPanel from "@/panels/ChartMetaPanel.vue";
import JudgeLinePanel from "@/panels/JudgeLinePanel.vue";
import NoteEditPanel from "@/panels/NoteEditPanel.vue";
import NumberEventEditPanel from "@/panels/NumberEventEditPanel.vue";
import MutipleEditPanel from "@/panels/MutipleEditPanel.vue";
import SettingsPanel from "@/panels/SettingsPanel.vue";
import HistoryPanel from "@/panels/HistoryPanel.vue";
import ClipboardPanel from "@/panels/ClipboardPanel.vue";
import CalculatorPanel from "@/panels/CalculatorPanel.vue";
import NoteFillPanel from "@/panels/NoteFillPanel.vue";
import EventFillPanel from "@/panels/EventFillPanel.vue";
import FastBindPanel from "@/panels/FastBindPanel.vue";
import ColorEventEditPanel from "@/panels/ColorEventEditPanel.vue";
import TextEventEditPanel from "@/panels/TextEventEditPanel.vue";
import ErrorPanel from "@/panels/ErrorPanel.vue";

import globalEventEmitter from "@/eventEmitter";
import store, { audioRef, canvasRef, managersMap, resourcePackageRef } from "@/store";
import Constants from "@/constants";
import ShaderPanel from "@/panels/ShaderPanel.vue";
import MyLink from "@/myElements/MyLink.vue";
import MyInput from "@/myElements/MyInput.vue";
import { ArrayedObject } from "@/tools/algorithm";
import { RightPanelState } from "@/managers/state";
import { SEC_TO_MS } from "@/tools/mathUtils";
import getKeyHandler from "@/keyHandlers";

const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});
const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});
store.route = useRoute();
const router = useRouter();

// 先获取全局的 chartPackageLoader 和 resourcePackageLoader 管理器
const chartPackageLoader = store.useGlobalManager("chartPackageLoader");
const resourcePackageLoader = store.useGlobalManager("resourcePackageLoader");

loadStart();

const chartId = store.getChartId();

// 使用 chartPackageLoader 加载 chartPackage
const readResult = await window.electronAPI.loadChart(chartId);
store.chartPackageRef.value = await chartPackageLoader.load(readResult);

// 使用 resourcePackageLoader 加载 resourcePackage
const respackArrayBuffer = await window.electronAPI.loadResourcePackage();
store.resourcePackageRef.value = await resourcePackageLoader.load(respackArrayBuffer);

loadEnd();

// 创建并设置非全局的 managers
new ArrayedObject(managersMap).forEach((managerName, managerConstructor) => {
    store.setManager(managerName, new managerConstructor());
});

const { chart, textures } = store.chartPackageRef.value;

const stateManager = store.useManager("stateManager");
const settingsManager = store.useManager("settingsManager");
const selectionManager = store.useManager("selectionManager");
const autoplayManager = store.useManager("autoplayManager");
const mouseManager = store.useManager("mouseManager");
const coordinateManager = store.useManager("coordinateManager");

const fps = ref(0);
const time = ref(0);
const combo = ref(0);
const score = ref(0);
const u = ref(false);
const audioIsPlaying = ref(false);
const tip = ref(Constants.tips[Math.floor(Math.random() * Constants.tips.length)]);
const mouseIsInCanvas = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);
const judgeLineFilter = ref("");

const filteredJudgeLines = computed(() => {
    // 如果过滤条件为空，就直接返回所有的判定线
    if (judgeLineFilter.value === "") {
        return [...chart.judgeLineList];
    }

    const result = chart.judgeLineList.filter(judgeLine => {
        return judgeLine.id
            .toString()
            .toLowerCase()
            .includes(
                judgeLineFilter.value
                    .toLowerCase()
            ) || judgeLine.Name
            .toLowerCase()
            .includes(
                judgeLineFilter.value
                    .toLowerCase()
            );
    });
    const parseRanges = (input: string) => {
        /** 分隔符可以是空格、英文逗号、英文分号、中文逗号、中文顿号、中文分号、英文斜杠、英文反斜杠，英文竖线 */
        const parts = input.split(/[\s,;，、；/\\|]+/);
        const result: ({ start: number, end: number } | number)[] = [];

        for (const part of parts) {
            const rangeMatch = part.match(/^(\d+)(?:-|~)(\d+)$/);
            if (rangeMatch) {
                result.push({
                    start: parseInt(rangeMatch[1]),
                    end: parseInt(rangeMatch[2])
                });
            }
            else if (/^\d+$/.test(part)) {
                result.push(parseInt(part));
            }
        }

        return result;
    };

    const ranges = parseRanges(judgeLineFilter.value);

    // 处理范围匹配
    if (ranges.length > 0) {
        result.push(...chart.judgeLineList.filter(judgeLine =>
            ranges.some(range => {
                if (isNumber(range)) {
                    return range === judgeLine.id;
                }
                else {
                    return judgeLine.id >= range.start && judgeLine.id <= range.end;
                }
            })
        ));
    }

    // 根据父线筛选
    const fatherMatch = judgeLineFilter.value.match(/^(father|parent|dad|daddy):(\d+)/);
    if (fatherMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => judgeLine.father === +fatherMatch[2]));
    }

    // 根据绑定的 UI 筛选
    const uiMatch = judgeLineFilter.value.match(/^ui(:(.*))?/);
    if (uiMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => {
            if (uiMatch[2]) {
                return judgeLine.attachUI.includes(uiMatch[2]);
            }
            else {
                return judgeLine.attachUI && judgeLine.attachUI !== "none";
            }
        }));
    }

    // 根据贴图筛选
    const textureMatch = judgeLineFilter.value.match(/^(texture|picture|image)(:(.*))?/);
    if (textureMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => {
            if (textureMatch[3]) {
                return judgeLine.Texture.includes(textureMatch[3]);
            }
            else {
                return Object.keys(textures).includes(judgeLine.Texture);
            }
        }));
    }

    // 根据是否有文字事件筛选
    const textMatch = judgeLineFilter.value.match(/^text/);
    if (textMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => {
            return judgeLine.extended.textEvents.length > 0;
        }));
    }

    // 根据是否有颜色事件筛选
    const colorMatch = judgeLineFilter.value.match(/^color/);
    if (colorMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => {
            return judgeLine.extended.colorEvents.length > 0;
        }));
    }

    // 根据是否有音符筛选
    const noteMatch = judgeLineFilter.value.match(/^note/);
    if (noteMatch) {
        result.push(...chart.judgeLineList.filter(judgeLine => {
            return judgeLine.notes.length > 0;
        }));
    }
    return result;
});

const FPS_THRESHOLDS = {
    HIGH: 60,
    MEDIUM: 40,
    LOW: 20
};
const MOUSE_LEFT = 0;
const MOUSE_RIGHT = 2;

/** 每条 tip 显示 10 秒 */
const TIP_SHOW_TIME = 10000;

const fpsColor = computed(() => {
    if (fps.value >= FPS_THRESHOLDS.HIGH) {
        return "#00dd00";
    }
    else if (fps.value >= FPS_THRESHOLDS.MEDIUM) {
        return "#99aa00";
    }
    else if (fps.value >= FPS_THRESHOLDS.LOW) {
        return "#ff6600";
    }
    else {
        return "#ff0000";
    }
});

let windowIsFocused = true;
let cachedRect: DOMRect;

function checkForUpdates() {
    window.electronAPI.checkForUpdates();
}

function update() {
    u.value = !u.value;
}

function openChartFolder() {
    window.electronAPI.openChartFolder(store.getChartId());
}

async function exportChart() {
    const chartName = store.chartPackageRef.value?.chart.META.name || "untitled";

    // 使用预加载的 API 替代直接导入
    const filePath = await window.electronAPI.showSaveDialog(chartName);
    if (!filePath) return;
    globalEventEmitter.emit("EXPORT", filePath);
}

async function deleteChart() {
    window.electronAPI.deleteChart(store.getChartId());
    router.push("/");
}

async function addTextures() {
    const texturePaths = await window.electronAPI.showOpenImageDialog(true);
    if (!texturePaths) {
        throw new Error("操作已取消");
    }

    const textureArrayBuffers = await window.electronAPI.addTextures(store.getChartId(), texturePaths);
    const textures: Record<string, HTMLImageElement> = {};
    for (const [name, arrayBuffer] of Object.entries(textureArrayBuffers)) {
        const image = await MediaUtils.createImage(arrayBuffer);
        textures[name] = image;
    }

    const chartPackage = store.useChartPackage();
    chartPackage.textures = { ...chartPackage.textures, ...textures };
}

function canvasMouseDown(e: MouseEvent) {
    const canvas = store.useCanvas();
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
        return;
    }

    switch (e.button) {
        case MOUSE_LEFT:
            globalEventEmitter.emit("MOUSE_LEFT_CLICK", x, y, options);
            return;
        case MOUSE_RIGHT:
            globalEventEmitter.emit("MOUSE_RIGHT_CLICK", x, y, options);
            return;
    }
}

function canvasMouseMove(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    mouseX.value = coordinateManager.convertXToChart(mouseManager.mouseX);
    mouseY.value = coordinateManager.convertYToChart(mouseManager.mouseY);
    globalEventEmitter.emit("MOUSE_MOVE", x, y, options);
}

function canvasMouseUp(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = calculatePosition(e);
    globalEventEmitter.emit("MOUSE_UP", x, y, options);
}

function canvasMouseEnter() {
    mouseIsInCanvas.value = true;
    globalEventEmitter.emit("MOUSE_ENTER");
}

function canvasMouseLeave() {
    mouseIsInCanvas.value = false;
    globalEventEmitter.emit("MOUSE_LEAVE");
}

function windowOnWheel(e: WheelEvent) {
    if (e.ctrlKey) {
        e.preventDefault();
        globalEventEmitter.emit("CTRL_WHEEL", e.deltaY);
    }
    else {
        globalEventEmitter.emit("WHEEL", e.deltaY);
    }
}

function canvasOnResize() {
    const canvas = store.useCanvas();
    cachedRect = canvas.getBoundingClientRect();
}

async function windowOnKeyDown(e: KeyboardEvent) {
    if (e.repeat) {
        return;
    }

    const handler = getKeyHandler(e, "keydown");
    handler();
}

async function windowOnKeyUp(e: KeyboardEvent) {
    const handler = getKeyHandler(e, "keyup");
    handler();
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
 * 该函数用于在含有 object-fit:contain 样式的 canvas 上，
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
        }
        else {
            const height = outerHeight;
            const width = height * innerRatio;
            const padding = (outerWidth - width) / 2;
            return { padding, ratio: innerHeight / height };
        }
    })();

    // 根据宽高比返回调整后的坐标
    if (innerRatio > outerRatio) {
        return { x: x * ratio, y: (y - padding) * ratio };
    }
    else {
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
    canvas.addEventListener("mouseenter", canvasMouseEnter);
    canvas.addEventListener("mouseleave", canvasMouseLeave);
    const resizeObserver = new ResizeObserver(canvasOnResize);
    resizeObserver.observe(canvas);
    window.addEventListener("wheel", windowOnWheel);
    window.addEventListener("keydown", windowOnKeyDown);
    window.addEventListener("keyup", windowOnKeyUp);
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
                if (settingsManager._settings.autoHighlight) {
                    chart.highlightNotes();
                }

                try {
                    globalEventEmitter.emit("RENDER_FRAME");
                    globalEventEmitter.emit("AUTOPLAY");
                    if (stateManager.state.isPreviewing) {
                        globalEventEmitter.emit("RENDER_CHART");
                    }
                    else {
                        globalEventEmitter.emit("RENDER_EDITOR");
                    }
                }
                catch (error) {
                    ElMessage.error(error as Error);
                }

                const now = performance.now();
                const delta = now - renderTime;

                if (delta > 0) {
                    const currentFPS = SEC_TO_MS / delta;
                    fpsList.push(currentFPS);
                    if (fpsList.length >= showFpsFrequency) {
                        fps.value = mean(fpsList);
                        fpsList.length = 0;
                    }
                }
                else {
                    fps.value = 0;
                }
                renderTime = now;
                if (combo.value !== autoplayManager.combo) {
                    combo.value = autoplayManager.combo;
                }

                if (score.value !== autoplayManager.score) {
                    score.value = autoplayManager.score;
                }
                audio.volume = settingsManager._settings.musicVolume;
            }

            if (settingsManager._settings.unlimitFps) {
                setTimeout(renderLoop);
            }
            else {
                requestAnimationFrame(renderLoop);
            }
        }
    };

    const tipInterval = setInterval(() => {
        tip.value = Constants.tips[Math.floor(Math.random() * Constants.tips.length)];
    }, TIP_SHOW_TIME);
    renderLoop();
    onBeforeUnmount(() => {
        // 停止播放音乐
        audio.pause();

        // 清除事件监听器
        canvas.removeEventListener("mousedown", canvasMouseDown);
        canvas.removeEventListener("mousemove", canvasMouseMove);
        canvas.removeEventListener("mouseup", canvasMouseUp);
        canvas.removeEventListener("mouseenter", canvasMouseEnter);
        canvas.removeEventListener("mouseleave", canvasMouseLeave);
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        window.removeEventListener("wheel", windowOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        window.removeEventListener("blur", windowOnBlur);
        window.removeEventListener("focus", windowOnFocus);
        audio.removeEventListener("timeupdate", audioOnTimeUpdate);
        audio.removeEventListener("pause", audioOnPause);
        audio.removeEventListener("play", audioOnPlay);

        // 停止渲染循环
        isRendering = false;
        requestAnimationFrame(() => {
            isRendering = false;
        });

        // 移除 canvas
        canvas.remove();

        // 清理 store
        store.chartPackageRef.value = null;
        store.resourcePackageRef.value = null;
        store.canvasRef.value = null;
        store.audioRef.value = null;
        store.route = null;

        // 销毁所有非全局的 managers
        for (const key in store.managers) {
            store.managers[key as keyof typeof store.managers] = null;
        }

        // 销毁发布订阅的事件监听器
        globalEventEmitter.destroy();

        // 移除 tip 的计时器
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
    grid-template-rows: 120px 1fr 30px;
    grid-template-areas:
        "header header header"
        "left main right"
        "footer footer footer";
}

#header {
    --el-header-padding: 0 10px;
    grid-area: header;
    width: 100%;
    height: 100%;
}

#header-inner {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1.5fr repeat(3, 1fr);
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
        "audio-player audio-player audio-player info"
        "note-type-select speed-select horizontal-input vertical-input"
        "note-type-select hint-text event-layer-select offset-input";
    gap: 10px;
}

.audio-player {
    grid-area: audio-player;
    display: flex;
    align-items: center;
    gap: 20px;
}

.info {
    grid-area: info;
    display: flex;
    justify-content: space-between;
}

.event-layer-hint-text {
    grid-area: hint-text;
    display: flex;
    align-items: center;
}

.note-type-select {
    grid-area: note-type-select;
}

.speed-select {
    grid-area: speed-select;
}

.horizontal-input {
    grid-area: horizontal-input;
}

.vertical-input {
    grid-area: vertical-input;
}

.event-layer-select {
    grid-area: event-layer-select;
}

.offset-input {
    grid-area: offset-input;
}

.none {
    grid-area: none;
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
    position: relative;
}

.back-header {
    position: sticky;
    background-color: white;
    z-index: 10;
    left: 0;
    top: 0;
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
    width: 100%;
}

.default-panel {
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
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 35vw;
}

.footer-right {
    max-width: 65vw;
}
</style>