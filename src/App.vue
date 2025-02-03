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
                    <ElIcon size="30">
                        <VideoPlay
                            v-if="!audioIsPlaying"
                            @click="audioRef.play()"
                        />
                        <VideoPause
                            v-else
                            @click="audioRef.pause()"
                        />
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
                <ElText
                    :style="{
                        color: fps > 30 ? 'green' : fps > 20 ? 'orange' : 'red',
                        display: 'block',
                        whiteSpace: 'nowrap'
                    }"
                    useless-attribute
                >
                    FPS: {{ fps.toFixed(1) }}
                </ElText>
            </ElRow>
            <ElRow>
                右键放置，左键选择，选择之后按住拖动，按Alt拖动尾部，QWER切换note种类，方括号切换判定线
            </ElRow>
        </ElHeader>
        <ElAside
            class="left"
            @wheel.stop
            @keydown.stop
        >
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
                        上传谱面文件压缩包
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
                        上传资源包
                    </ElButton>
                </template>
            </ElUpload>
            <ElButton
                type="primary"
                @click="mediaUtils.downloadText(JSON.stringify(chartPackage.chart.toObject()), chartPackage.chart.META.name + '.json', 'application/json')"
            >
                下载谱面文件
            </ElButton>
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
                <template v-if="editor.state.right == RightState.Editing && editor.selection.length == 1">
                    <NoteEditor
                        v-if="(editor.selection[0] instanceof Note)"
                        v-model="editor.selection[0]"
                    />
                    <NumberEventEditor
                        v-else-if="(editor.selection[0] instanceof NumberEvent)"
                        v-model="editor.selection[0]"
                    />
                </template>
                <template v-else-if="editor.state.right == RightState.Editing && editor.selection.length > 1">
                    暂不支持多选编辑
                </template>
                <BPMListEditor v-else-if="editor.state.right == RightState.BPMList" />
                <ChartMetaEditor v-else-if="editor.state.right == RightState.Meta" />
                <JudgeLineEditor v-else-if="editor.state.right == RightState.JudgeLine" />
                <template v-else-if="editor.state.right == RightState.Settings">
                    <MyInputNumber
                        v-model="chartPackage.config.chartSpeed"
                        :min="0"
                    >
                        <template #prepend>
                            谱面流速
                        </template>
                        <template #append>
                            像素每秒
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="chartPackage.config.lineWidth"
                        :min="0"
                    >
                        <template #prepend>
                            判定线宽度
                        </template>
                        <template #append>
                            像素
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="chartPackage.config.textSize"
                        :min="0"
                    >
                        <template #prepend>
                            文字大小
                        </template>
                        <template #append>
                            像素
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="chartPackage.config.backgroundDarkness"
                        :min="0"
                        :max="100"
                    >
                        <template #prepend>
                            背景黑暗度
                        </template>
                        <template #append>
                            %
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="chartPackage.config.noteSize"
                        :min="0"
                    >
                        <template #prepend>
                            note大小
                        </template>
                        <template #append>
                            像素
                        </template>
                    </MyInputNumber>
                    <MyInputNumber
                        v-model="resourcePackage.config.hitFxDuration"
                        :min="0"
                    >
                        <template #prepend>
                            打击特效时间
                        </template>
                        <template #append>
                            秒
                        </template>
                    </MyInputNumber>
                    <ElCheckbox v-model="resourcePackage.config.hitFxRotate">
                        打击特效随判定线旋转
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.config.holdKeepHead">
                        Hold正在判定时显示头部
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.config.hideParticles">
                        隐藏粒子
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.config.holdCompact">
                        Hold中间与头尾重叠（不支持，懒得做）
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.config.holdRepeat">
                        Hold中间重复式拉伸
                    </ElCheckbox>
                </template>
            </template>
        </ElAside>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElButton, ElContainer, ElHeader, ElIcon, ElMain, ElRow, ElSlider, ElText, ElUpload } from "element-plus";
import { onMounted, onUnmounted, provide, reactive, Ref, ref } from "vue";

import { Chart } from "./classes/chart";
import { ChartPackage } from "./classes/chartPackage";
import { NumberEvent } from "./classes/event";
import { Note } from "./classes/note";
import { ResourcePackage } from "./classes/resourcePackage";
import { CanvasState, Editor, RightState } from "./editor";
import { chartPackage, resourcePackage } from "./store";

import ChartRenderer from "./chartRenderer";
import eventEmitter from "./eventEmitter";

import BPMListEditor from "./editorComponents/BPMListEditor.vue";
import ChartMetaEditor from "./editorComponents/ChartMetaEditor.vue";
import JudgeLineEditor from "./editorComponents/JudgeLineEditor.vue";
import NoteEditor from "./editorComponents/NoteEditor.vue";
import NumberEventEditor from "./editorComponents/NumberEventEditor.vue";

import MyInputNumber from "./myElements/MyInputNumber.vue";

import loadingText from "./tools/loadingText";
import mediaUtils from "./tools/mediaUtils";
import math from "./tools/math";
import { clamp } from "lodash";
import MyCalculator from "./myElements/MyCalculator.vue";

const canvasRef: Ref<HTMLCanvasElement | null> = ref(null);
const audioRef: Ref<HTMLAudioElement | null> = ref(null);
const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);
const editor = reactive(new Editor(chartPackage, resourcePackage));

provide("editor", editor);
provide("textures", chartPackage.textures);

onMounted(() => {
    const canvas = canvasRef.value!;
    const audio = audioRef.value!;
    const renderer = new ChartRenderer({
        canvasRef: canvasRef as Ref<HTMLCanvasElement>,
        chartPackage,
        resourcePackage,
    });
    let cachedRect = canvas.getBoundingClientRect();
    function getClickedPosition({ offsetX: x, offsetY: y }: MouseEvent) {
        /** canvas的内宽度（单位为canvas绘制上下文的像素） */
        const innerWidthCanvasPixels = canvas.width;
        /** canvas的内高度（单位为canvas绘制上下文的像素） */
        const innerHeightCanvasPixels = canvas.height;
        /** canvas内部的宽高比 */
        const innerRatio = innerWidthCanvasPixels / innerHeightCanvasPixels;
        /** canvas的外宽度（单位为浏览器像素） */
        const outerWidthBrowserPixels = cachedRect.width;
        /** canvas的外高度（单位为浏览器像素） */
        const outerHeightBrowserPixels = cachedRect.height;
        /** canvas外部的宽高比 */
        const outerRatio = outerWidthBrowserPixels / outerHeightBrowserPixels;
        /** canvas的缩放比和单边边距 */
        const { browserToCanvasRatio, padding } = (() => {
            if (innerRatio > outerRatio) {
                const width = outerWidthBrowserPixels;
                const height = width / innerRatio;
                const padding = (outerHeightBrowserPixels - height) / 2;
                return { padding, browserToCanvasRatio: innerWidthCanvasPixels / width };
            }
            else {
                const height = outerHeightBrowserPixels;
                const width = height * innerRatio;
                const padding = (outerWidthBrowserPixels - width) / 2;
                return { padding, browserToCanvasRatio: innerHeightCanvasPixels / height };
            }
        })();
        if (innerRatio > outerRatio) {
            return { x: x * browserToCanvasRatio, y: (y - padding) * browserToCanvasRatio };
        }
        else {
            return { y: y * browserToCanvasRatio, x: (x - padding) * browserToCanvasRatio };
        }
    }
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
    canvas.onmousedown = e => {
        const { x, y } = getClickedPosition(e);
        const options = {
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey
        }
        const seconds = audio.currentTime - chartPackage.chart.META.offset / 1000;
        switch (e.button) {
            case 0:
                eventEmitter.emit("MOUSE_LEFT_CLICK", x, y, seconds, options);
                return;
            case 2:
                eventEmitter.emit("MOUSE_RIGHT_CLICK", x, y, seconds);
                return;
        }
    };
    canvas.onmousemove = e => {
        const options = {
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey
        }
        const { x, y } = getClickedPosition(e);
        const seconds = audio.currentTime - chartPackage.chart.META.offset / 1000;
        eventEmitter.emit("MOUSE_MOVE", x, y, seconds, options);
    }
    canvas.onmouseup = () => {
        eventEmitter.emit("MOUSE_UP");
    }
    window.onresize = () => {
        cachedRect = canvas.getBoundingClientRect();
    }
    window.addEventListener('wheel', e => {
        if (e.ctrlKey) {
            e.preventDefault();
            editor.pxPerSecond = clamp(editor.pxPerSecond + e.deltaY * 0.05, 1, 1000);
        } else {
            audio.currentTime += e.deltaY / -editor.pxPerSecond;
        }
    }, {
        passive: false
    });
    window.onkeydown = e => {
        //const { ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta } = e;
        const key = formatKey(e);
        console.log(key);
        switch (key) {
            case "Space":
                mediaUtils.togglePlay(audio);
                return;
            case "Esc":
                editor.unselect();
                return;
            case "Del":
                editor.deleteSelection();
                editor.unselect();
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
        }
    }
    document.oncontextmenu = e => e.preventDefault();
    editor.provideCanvas(canvasRef as Ref<HTMLCanvasElement>);

    let fpsHistory = [];
    let renderTime = performance.now();
    setInterval(() => {
        if (editor.state.canvas == CanvasState.Editing) {
            editor.renderUI(audio.currentTime);
        }
        else {
            renderer.renderChart(audio.currentTime);
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
            fps.value = math.average(fpsHistory);
        } else {
            fps.value = 0; // 或者设置为一个合理的默认值
        }
        renderTime = now;
        time.value = audio.currentTime;
        audioIsPlaying.value = !audio.paused;
    }, 0);
});
onUnmounted(() => {
    if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value = null;
    }
    if (canvasRef.value) {
        canvasRef.value = null;
    }
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

.el-container>* {
    width: 100%;
    height: 100%;
}

.el-main {
    grid-area: main;
    --el-main-padding: 0;
}


.el-header {
    grid-area: header;
}

.el-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
}

.el-aside {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
}

.el-aside.left {
    grid-area: left;
}

.el-aside.right {
    grid-area: right;
}

.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}
</style>
