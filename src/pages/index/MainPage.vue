<template>
    <ElContainer :style="{ position: 'relative' }">
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
                @change="audio.playbackRate = ui.playbackRate;"
                style="width:300px;"
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
            <ElInputNumber v-model="ui.verticalLines" />
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
                    :on-success="function (_, uploadFile) {
                        loadChartPackage(uploadFile.raw!, setLoadingText)
                            .then(chartPackage => chartData.chartPackage = chartPackage)
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                />
                <ElButton>上传谱面文件（仅支持RPE格式）</ElButton>
            </label>
            <label for="resourcePackageFileInput">
                <ElUpload
                    id="resourcePackageFileInput"
                    ref="resourcePackageFileInput"
                    type="file"
                    @change="loadResourcePackage(resourcePackageFileInput!.files![0], setLoadingText)
                        .then(resourcePackage => chartData.resourcePackage = resourcePackage)
                        .then(removeLoadingText, removeLoadingText)
                        .catch(err => console.error(err))"
                />
                <ElButton>上传资源包</ElButton>
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
                Autoplay
                <ElCheckbox v-model="chartData.autoplay" />
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
import { loadChartPackage, loadResourcePackage } from '@/ts/loadFile';
import { ChartData, MainState, RightState, TopState, UIState } from '@/ts/typeDefinitions';
import DefaultChartPackageURL from "@/assets/DefaultChartPackage.zip";
import DefaultResourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import renderEditorUI from '@/ts/editor';

const chartPackageFileInput: Ref<HTMLInputElement | null> = ref(null);
const resourcePackageFileInput: Ref<HTMLInputElement | null> = ref(null);
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
        .then(blob => loadChartPackage(blob, setLoadingText)),
    resourcePackage: await fetch(DefaultResourcePackageURL)
        .then(response => response.blob())
        .then(blob => loadResourcePackage(blob, setLoadingText)),
    autoplay: true,
    judgement: {
        tap: {
            perfect: 0.08,
            good: 0.16,
            bad: 0.18
        },
        hold: {
            perfect: 0.08,
            good: 0.16,
            bad: 0.18
        },
        drag: {
            perfect: 0.18
        },
        flick: {
            perfect: 0.18
        },
    }
});
removeLoadingText();
const ui: UIState = reactive({
    main: MainState.Playing,
    right: RightState.Default,
    top: TopState.Default,
    rightOpen: false,
    topOpen: true,
    playbackRate: 1.0,
    viewSize: 3,
    horzionalLines: 4,
    verticalLines: 21,
    selectedJudgeLine: 0
})

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
});
</script>
<style scoped>
.el-container {
    position: relative;
    overflow: hidden;
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
}

.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}

.el-header {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    background: white;
}

.el-header.open {
    transform: translateY(100%);
}

span.handle {
    text-align: center;
    position: absolute;
    background: white;
    opacity: 0.3;
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

.open>span.handle,
span.handle:hover {
    opacity: 1;
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