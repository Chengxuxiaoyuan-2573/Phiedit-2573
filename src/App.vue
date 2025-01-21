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
                    {{ editor.canvasState == CanvasState.Editing ? "切换到播放器界面" : "切换到编辑器界面" }}
                </ElButton>
                <ElText :style="{ color: fps > 30 ? 'green' : fps > 20 ? 'orange' : 'red' }">
                    FPS: {{ fps.toFixed(5) }}
                </ElText>
            </ElRow>
            <ElRow>
                12345
            </ElRow>
        </ElHeader>
        <ElAside
            class="left"
            @wheel.stop
            @keydown.stop
        >
            <h1>Phiedit 2573 线上制谱器</h1>
            <!-- eslint-disable-next-line vue/first-attribute-linebreak -->
            <ElUpload :before-upload="file => ChartPackage.load(file).then(a => {
                chartPackage.chart = new Chart(a.chart);
                chartPackage.background = a.background;
                chartPackage.textures = a.textures;
                chartPackage.musicSrc = a.musicSrc;
                // eslint-disable-next-line vue/html-closing-bracket-newline
            })">
                <template #trigger>
                    <ElButton type="primary">
                        上传谱面文件压缩包
                    </ElButton>
                </template>
            </ElUpload>
            <!-- eslint-disable-next-line vue/first-attribute-linebreak -->
            <ElUpload :before-upload="file => ResourcePackage.load(file).then(a => {
                resourcePackage.tap = a.tap;
                resourcePackage.flick = a.flick;
                resourcePackage.drag = a.drag;
                resourcePackage.holdHead = a.holdHead;
                resourcePackage.holdEnd = a.holdEnd;
                resourcePackage.holdBody = a.holdBody;
                resourcePackage.tapHL = a.tapHL;
                resourcePackage.flickHL = a.flickHL;
                resourcePackage.dragHL = a.dragHL;
                resourcePackage.holdHLHead = a.holdHLHead;
                resourcePackage.holdHLEnd = a.holdHLEnd;
                resourcePackage.holdHLBody = a.holdHLBody;
                resourcePackage.tapSound = a.tapSound;
                resourcePackage.dragSound = a.dragSound;
                resourcePackage.flickSound = a.flickSound;
                resourcePackage.perfectHitFxFrames = a.perfectHitFxFrames;
                resourcePackage.goodHitFxFrames = a.goodHitFxFrames;
                resourcePackage.hitFxDuration = a.hitFxDuration;
                resourcePackage.hitFxRotate = a.hitFxRotate;
                resourcePackage.hideParticles = a.hideParticles;
                resourcePackage.holdKeepHead = a.holdKeepHead;
                resourcePackage.holdRepeat = a.holdRepeat;
                resourcePackage.holdCompact = a.holdCompact;
                resourcePackage.colorPerfect = a.colorPerfect;
                resourcePackage.colorGood = a.colorGood;
                // eslint-disable-next-line vue/html-closing-bracket-newline
            })">
                <template #trigger>
                    <ElButton type="primary">
                        上传资源包
                    </ElButton>
                </template>
            </ElUpload>
            <ElButton
                type="primary"
                @click="downloadText(JSON.stringify(chartPackage.chart.toObject()), chartPackage.chart.META.name + '.json', 'application/json')"
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
            <template v-if="editor.rightState == RightState.Default">
                <ElButton
                    type="primary"
                    @click="editor.rightState = RightState.Settings"
                >
                    设置
                </ElButton>
                <ElButton
                    type="primary"
                    @click="editor.rightState = RightState.BPMList"
                >
                    BPM编辑
                </ElButton>
                <ElSelect v-model="editor.currentNoteType">
                    <ElOption
                        :value="NoteType.Tap"
                        label="放置note的种类：Tap"
                    >
                        Tap
                    </ElOption>
                    <ElOption
                        :value="NoteType.Hold"
                        label="放置note的种类：Hold"
                    >
                        Hold
                    </ElOption>
                    <ElOption
                        :value="NoteType.Drag"
                        label="放置note的种类：Drag"
                    >
                        Drag
                    </ElOption>
                    <ElOption
                        :value="NoteType.Flick"
                        label="放置note的种类：Flick"
                    >
                        Flick
                    </ElOption>
                </ElSelect>
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
                        @click="editor.rightState = RightState.Default"
                    />
                    <span>返回</span>
                </ElHeader>
                <template v-if="editor.rightState == RightState.Editing && editor.selection.length == 1">
                    <NoteEditor
                        v-if="(editor.selection[0] instanceof Note)"
                        v-model="editor.selection[0]"
                    />
                    <NumberEventEditor
                        v-else-if="(editor.selection[0] instanceof NumberEvent)"
                        v-model="editor.selection[0]"
                    />
                </template>
                <template v-else-if="editor.rightState == RightState.Editing && editor.selection.length > 1">
                    <!-- nothing -->
                </template>
                <BPMListEditor
                    v-else-if="editor.rightState == RightState.BPMList"
                    v-model="chartPackage.chart.BPMList"
                />
                <template v-else-if="editor.rightState == RightState.Settings">
                    <MyInputNumber
                        v-model="chartPackage.chartSpeed"
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
                        v-model="chartPackage.lineWidth"
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
                        v-model="chartPackage.textSize"
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
                        v-model="chartPackage.backgroundDarkness"
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
                        v-model="chartPackage.noteSize"
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
                        v-model="resourcePackage.hitFxDuration"
                        :min="0"
                    >
                        <template #prepend>
                            打击特效时间
                        </template>
                        <template #append>
                            秒
                        </template>
                    </MyInputNumber>
                    <ElCheckbox v-model="resourcePackage.hitFxRotate">
                        打击特效随判定线旋转
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.holdKeepHead">
                        Hold正在判定时显示头部
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.hideParticles">
                        隐藏粒子
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.holdCompact">
                        Hold中间与头尾重叠（不支持，懒得做）
                    </ElCheckbox>
                    <ElCheckbox v-model="resourcePackage.holdRepeat">
                        Hold中间重复式拉伸
                    </ElCheckbox>
                </template>
            </template>
        </ElAside>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElIcon, ElButton, ElCheckbox, ElContainer, ElHeader, ElMain, ElOption, ElSelect, ElUpload, ElText, ElRow, ElSlider } from "element-plus";
import { VideoPlay, VideoPause } from "@element-plus/icons-vue"
import { onMounted, Ref, ref } from "vue";

import { NumberEvent } from "./classes/event";
import { Note, NoteType } from "./classes/note";
import { RightState, CanvasState } from "./classes/editor";
import { ChartPackage } from "./classes/chartPackage";
import { ResourcePackage } from "./classes/resourcePackage";
import { cache, chartPackage, editor, resourcePackage } from "./store";
import { Chart } from "./classes/chart";

import Renderer from "./render";
import EventListener from "./eventListener";
import { downloadText } from "./tools";

import NoteEditor from "./NoteEditor.vue";
import NumberEventEditor from "./NumberEventEditor.vue";
import MyInputNumber from "./MyInputNumber.vue";

import loadingText from "./components/loadingText";
import BPMListEditor from "./BPMListEditor.vue";
document.oncontextmenu = e => {
    e.preventDefault();
}
loadingText.hide();

const canvasRef: Ref<HTMLCanvasElement | null> = ref(null);
const audioRef: Ref<HTMLAudioElement | null> = ref(null);
const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);
onMounted(() => {
    const canvas = canvasRef.value!;
    const audio = audioRef.value!;
    const eventListener = new EventListener({
        canvas,
        audio,
        editor,
        chart: chartPackage.chart,
        cache
    })
    const renderer = new Renderer({
        canvas,
        chartPackage,
        resourcePackage,
        editor,
        cache
    });
    canvas.onmousedown = e => eventListener.mouseDown(e);
    canvas.onmousemove = e => eventListener.mouseMove(e);
    canvas.onmouseup = () => eventListener.mouseUp();
    window.onresize = () => eventListener.windowResize();
    window.onwheel = e => eventListener.wheel(e);
    window.onkeydown = e => {
        //const { ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta } = e;
        switch (e.key.toLowerCase()) {
            case " ":
                eventListener.pressSpace();
                return;
            case "escape":
                eventListener.pressEscape();
                return;
            case "delete":
                eventListener.pressDelete();
                return;
            default:
                console.log(e.key);
        }
    }
    setInterval(() => {
        renderer.render(audio.currentTime);
        fps.value = renderer.fps;
        time.value = audio.currentTime;
        audioIsPlaying.value = !audio.paused;
    }, 0);
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
    margin-top: 10px;
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

.el-header>.el-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
}

.el-aside {
    display: flex;
    flex-direction: column;
    align-content: stretch;
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
