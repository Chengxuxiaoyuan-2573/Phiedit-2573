<template>
    <ElContainer>
        <ElHeader :class="{ open: ui.topOpen }">
            <ElButton
                type="primary"
                :plain="ui.right != RightState.Settings"
                @click="ui.right == RightState.Settings ?
                    ui.right = RightState.Default : ui.right = RightState.Settings"
            >
                设置
            </ElButton>
            <audio
                ref="audio"
                :src="chartPackage?.music"
                controls
            />
            <ElSelect
                v-model="ui.playbackRate"
                style="width:100px;"
                @change="audio.playbackRate = ui.playbackRate;"
            >
                <ElOption
                    :value="0"
                    label="0x"
                />
                <ElOption
                    :value="0.125"
                    label="0.125x"
                />
                <ElOption
                    :value="0.25"
                    label="0.25x"
                />
                <ElOption
                    :value="0.5"
                    label="0.5x"
                />
                <ElOption
                    :value="1"
                    label="原速"
                    selected
                />
                <ElOption
                    :value="2"
                    label="2x"
                />
                <ElOption
                    :value="4"
                    label="4x"
                />
            </ElSelect>
            <ElInputNumber
                v-model="ui.segmentPerBeat"
                :min="1"
            />
            <ElInputNumber
                v-model="ui.trackSpace"
                :min="1"
                :max="675"
            />
            <ElButton
                type="primary"
                plain
                @click="ui.main == MainState.Editing ? ui.main = MainState.Playing : ui.main = MainState.Editing"
            >
                <span v-if="ui.main == MainState.Editing">切换到播放器界面</span>
                <span v-else>切换到编辑器界面</span>
            </ElButton>
        </ElHeader>
        <ElMain>
            <canvas
                ref="canvas"
                class="canvas"
                width="1350"
                height="900"
            />
        </ElMain>
        <ElAside
            class="right"
            :class="{ open: ui.rightOpen }"
        >
            <template v-if="ui.right == RightState.Editing && ui.selection.length == 1">
                <NoteEditor
                    v-if="ui.selection[0] instanceof Note"
                    v-model="ui.selection[0]"
                />
                <NumberEventEditor
                    v-else-if="ui.selection[0] instanceof NumberEvent"
                    v-model="ui.selection[0]"
                />
            </template>
            <template v-else-if="ui.right == RightState.Editing && ui.selection.length > 1">
                <!-- nothing -->
            </template>
            <template v-else-if="ui.right == RightState.Settings">
                <ElInputNumber
                    v-model="chartSettings.chartSpeed"
                    :min="0"
                >
                    <template #prefix>
                        谱面流速
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.lineWidth"
                    :min="0"
                >
                    <template #prefix>
                        判定线宽度
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.textSize"
                    :min="0"
                >
                    <template #prefix>
                        文字大小
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.backgroundDarkness"
                    :min="0"
                    :max="1"
                    :step="0.01"
                >
                    <template #prefix>
                        背景黑暗度
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="resourcePackage.hitFxDuration"
                    :min="0"
                    :step="0.1"
                >
                    <template #prefix>
                        打击特效时间
                    </template>
                </ElInputNumber>
                <ElCheckbox v-model="resourcePackage.hitFxRotate">
                    <template #default>
                        打击特效随判定线旋转
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdKeepHead">
                    <template #default>
                        Hold正在判定时显示头部
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.hideParticles">
                    <template #default>
                        隐藏粒子（现在根本没有粒子因为不支持）
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdCompact">
                    <template #default>
                        Hold中间与头尾重叠（不支持，懒得做）
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdRepeat">
                    <template #default>
                        Hold中间重复式拉伸
                    </template>
                </ElCheckbox>
            </template>
            <template v-else>
                <ElUpload
                    id="chartPackageFileInput"
                    ref="chartPackageFileInput"
                    :before-upload="function (file) {
                        return ChartPackage.load(file, setLoadingText)
                            .then(chartPackage => setChartPackage(chartPackage))
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                    drag
                >
                    上传谱面文件压缩包
                </ElUpload>
                <ElUpload
                    id="resourcePackageFileInput"
                    ref="resourcePackageFileInput"
                    :before-upload="function (file) {
                        return ResourcePackage.load(file, setLoadingText)
                            .then(resourcePackage => setResourcePackage(resourcePackage))
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                    drag
                >
                    上传资源包
                </ElUpload>
                <ElButton @click="download">
                    下载谱面文件
                </ElButton>
            </template>
        </ElAside>
    </ElContainer>
</template>
<script setup lang="ts">
import { ChartPackage } from "@/ts/classes/chartPackage";
import { NumberEvent } from "@/ts/classes/event";
import { Note } from "@/ts/classes/note";
import { ResourcePackage } from "@/ts/classes/resourcePackage";
import { removeLoadingText, setLoadingText } from "@/ts/components/loadingText";
import render, { data, setCanvas, setChartPackage, setResourcePackage, setUI } from "@/ts/render";
import { downloadText } from "@/ts/tools";
import { MainState, RightState, TopState, UI } from "@/ts/typeDefinitions";
import { ElAside, ElButton, ElCheckbox, ElContainer, ElHeader, ElInputNumber, ElMain, ElOption, ElSelect, ElUpload } from "element-plus";
import { onBeforeUnmount, onMounted, reactive, ref, Ref } from "vue";
import NoteEditor from "./NoteEditor.vue";
import NumberEventEditor from "./NumberEventEditor.vue";
const { chartPackage, resourcePackage, chartSettings } = data;
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
const ui: UI = reactive({
    main: MainState.Playing,
    right: RightState.Default,
    top: TopState.Default,
    rightOpen: true,
    topOpen: true,
    pxPerSecond: 300,
    segmentPerBeat: 4,
    trackSpace: 50,
    currentJudgeLineNumber: 0,
    currentEventLayerNumber: 0,
    selection: [],
    wheelSpeed: 1,
    playbackRate: 1.0,
})
function download() {
    const { chart } = chartPackage!;
    downloadText(JSON.stringify(chart.toObject()), chart.META.name + ".json", "application/json");
}
onMounted(() => {
    setCanvas(canvas.value!);
    setUI(ui);
    const interval = setInterval(() => {
        render(audio.value!.currentTime);
    }, 16);
    onBeforeUnmount(() => {
        clearInterval(interval);
        window.onwheel = null;
        window.onkeydown = null;
    })
    window.onwheel = e => {
        audio.value!.currentTime += e.deltaY * ui.wheelSpeed * -0.01;
    }
    window.onkeydown = e => {
        e.preventDefault();
        switch (e.key.toLowerCase()) {
            case " ":
                if (audio.value!.paused) audio.value!.play();
                else audio.value!.pause();
                return;
            case "escape":
                ui.selection = [];
                ui.right = RightState.Default;
                return;
            default:
                console.log(e.key);
        }
    }
});
</script>
<style>
li {
    list-style: none;
}

.el-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: calc(100% - var(--el-menu-horizontal-height));
    background: black;
    user-select: none;
}


.el-header>.button {
    padding: 5px;
}

svg,
svg~* {
    vertical-align: middle;
}

svg {
    width: 30px;
    height: 30px;
    text-align: center;
}

input[type=file] {
    display: none;
}

i {
    font: 1.5em sans-serif;
}

.el-main {
    width: 100%;
    height: 100%;
    --el-main-padding: 0;
}

.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}

.el-header,
.el-aside {
    background: white;
}

.el-header:hover,
.el-aside:hover {
    opacity: 1;
}

.el-header {
    height: fit-content;
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}


.el-header.open {
    transform: translateY(100%);
}

.el-aside.right {
    position: absolute;
    left: 100%;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-content: stretch;
}

.el-aside.right>* {
    width: 100%;
}


.el-aside.right.open {
    transform: translateX(-100%);
}

.el-aside.left {
    position: absolute;
    right: 100%;
    top: 0;
    bottom: 0;
}

input[type=number] {
    width: 50px;
}
</style>