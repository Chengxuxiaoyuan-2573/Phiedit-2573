<template>
    <ElContainer>
        <ElHeader :class="{ open: ui.topOpen }">
            <span
                class="handle"
                @click="ui.topOpen = !ui.topOpen"
            >
                <span v-if="ui.topOpen">点击收起</span>
                <span v-else>点击展开</span>
            </span>
            <audio
                ref="audio"
                :src="chartData.chartPackage?.music.src"
                controls
            />
            <ElSelect
                v-model="ui.playbackRate"
                style="width:100px;"
                @change="audio.playbackRate = ui.playbackRate;"
            >
                <ElOption value="0.125">
                    0.125x
                </ElOption>
                <ElOption value="0.25">
                    0.25x
                </ElOption>
                <ElOption value="0.5">
                    0.5x
                </ElOption>
                <ElOption
                    value="1"
                    selected
                >
                    原速
                </ElOption>
                <ElOption value="2">
                    2x
                </ElOption>
                <ElOption value="4">
                    4x
                </ElOption>
            </ElSelect>
            <ElInputNumber v-model="ui.horzionalLines" />
            <ElInputNumber v-model="ui.verticalSpace" />
            <ElButton @click="ui.main == MainState.Editing ? ui.main = MainState.Playing : ui.main = MainState.Editing">
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
            <span
                class="handle"
                @click="ui.rightOpen = !ui.rightOpen"
            >
                <span v-if="ui.rightOpen">点击收起</span>
                <span v-else>点击展开</span>
            </span>
            <label for="chartPackageFileInput">
                <ElUpload
                    id="chartPackageFileInput"
                    ref="chartPackageFileInput"
                    :before-upload="function (file) {
                        ChartPackage.load(file, setLoadingText)
                            .then(chartPackage => chartData.chartPackage = chartPackage)
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                >
                    <ElButton>上传谱面文件（仅支持RPE格式）</ElButton>
                </ElUpload>
            </label>
            <label for="resourcePackageFileInput">
                <ElUpload
                    id="resourcePackageFileInput"
                    ref="resourcePackageFileInput"
                    :before-upload="function (file) {
                        ResourcePackage.load(file, setLoadingText)
                            .then(resourcePackage => chartData.resourcePackage = resourcePackage)
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                >
                    <ElButton>上传资源包</ElButton>
                </ElUpload>
            </label>
            <label>
                谱面流速：
                <ElInputNumber v-model="chartData.chartSpeed" />
            </label>
            <label>
                判定线宽度：
                <ElInputNumber v-model="chartData.lineWidth" />
            </label>
            <label>
                文字大小：
                <ElInputNumber v-model="chartData.textSize" />
            </label>
            <label>
                背景黑暗度：
                <input
                    v-model="chartData.backgroundDarkness"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                >
            </label>
            <label>
                hitFxDuration
                <ElInputNumber v-model="chartData.resourcePackage.hitFxDuration" />
            </label>
            <label>
                hitFxRotate
                <ElCheckbox v-model="chartData.resourcePackage.hitFxRotate" />
            </label>
            <label>
                holdKeepHead
                <ElCheckbox v-model="chartData.resourcePackage.holdKeepHead" />
            </label>
            <label>
                hideParticles(不支持)
                <ElCheckbox v-model="chartData.resourcePackage.hideParticles" />
            </label>
            <label>
                holdCompact(不支持)
                <ElCheckbox v-model="chartData.resourcePackage.holdCompact" />
            </label>
            <label>
                holdRepeat(不支持)
                <ElCheckbox v-model="chartData.resourcePackage.holdRepeat" />
            </label>
        </ElAside>
    </ElContainer>
</template>
<script setup lang="ts">
import { onMounted, ref, Ref, reactive, onBeforeUnmount, shallowReactive, ShallowReactive, inject } from 'vue';
import { ElContainer, ElAside, ElHeader, ElButton, ElMain, ElInputNumber, ElCheckbox, ElSelect, ElOption, ElUpload } from 'element-plus';
import renderChart from '@/ts/render';
import { ChartData, MainState, RightState, TopState, UI } from '@/ts/typeDefinitions';
import DefaultChartPackageURL from "@/assets/DefaultChartPackage.zip";
import DefaultResourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import renderEditorUI from '@/ts/editor';
import { ChartPackage } from '@/ts/classes/chartPackage';
import { ResourcePackage } from '@/ts/classes/resourcePackage';
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
const setLoadingText = inject("setLoadingText", () => {
    console.error("Failed to get function setLoadingText");
})
const removeLoadingText = inject("removeLoadingText", () => {
    console.error("Failed to get function removeLoadingText");
})
const chartData: ShallowReactive<ChartData> = shallowReactive({
    backgroundDarkness: 0.9,
    lineWidth: 5,
    lineLength: 2000,
    textSize: 50,
    chartSpeed: 120,
    chartPackage: await fetch(DefaultChartPackageURL)
        .then(response => response.blob())
        .then(blob => ChartPackage.load(blob, setLoadingText)),
    resourcePackage: reactive(await fetch(DefaultResourcePackageURL)
        .then(response => response.blob())
        .then(blob => ResourcePackage.load(blob, setLoadingText))),
    autoplay: true
});
removeLoadingText();
const ui: UI = reactive({
    main: MainState.Playing,
    right: RightState.Default,
    top: TopState.Default,
    rightOpen: true,
    topOpen: true,
    playbackRate: 1.0,
    verticalStretch: 300,
    horzionalLines: 4,
    verticalSpace: 50,
    selectedJudgeLine: 0,
    selectedEventLayer: 0,
    wheelSpeed: 1
})
/*
function handleDown(e: TouchEvent | MouseEvent) {
    if (e instanceof TouchEvent) {

    }
    else {
        
    }
}
function handleMove(e: TouchEvent | MouseEvent) {
    if (e instanceof TouchEvent) {

    }
    else {

    }
}
function handleUp(e: TouchEvent | MouseEvent) {
    if (e instanceof TouchEvent) {

    }
    else {

    }
}
*/
onMounted(() => {
    const interval = setInterval(() => {
        if (ui.main == MainState.Editing) {
            renderEditorUI(canvas.value!, chartData, audio.value!.currentTime, ui);
        }
        else if (ui.main == MainState.Playing) {
            renderChart(canvas.value!, chartData, audio.value!.currentTime);
        }
    }, 16);
    onBeforeUnmount(() => {
        clearInterval(interval);
    })
    window.onwheel = e => {
        audio.value!.currentTime += e.deltaY * ui.wheelSpeed * 0.01;
    }
});
</script>
<style scoped>
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
    opacity: 0.8;
    overflow: visible;
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
    align-items: flex-start;
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
}

.el-aside.right.open {
    transform: translateX(-100%);
}

span.handle {
    text-align: center;
    position: absolute;
    background: white;
}

.el-header>span.handle {
    width: 200px;
    height: 30px;
    border-bottom-left-radius: 30px;
    border-bottom-right-radius: 30px;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
}

.el-aside.right>span.handle {
    width: 30px;
    height: 200px;
    border-top-left-radius: 30px;
    border-bottom-left-radius: 30px;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    writing-mode: vertical-rl;
}

.el-aside.left>span.handle {
    width: 30px;
    height: 200px;
    border-top-right-radius: 30px;
    border-bottom-right-radius: 30px;
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    writing-mode: vertical-rl;
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