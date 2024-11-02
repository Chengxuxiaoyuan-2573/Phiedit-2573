<template>
    <div class="content">
        <header>
            <ElButton
                @click="UiState.rightState == 'settings' ? UiState.rightState = 'none' : UiState.rightState = 'settings'"
            >
                <svg
                    class="icon"
                    viewBox="0 0 1024 1024"
                >
                    <path
                        d="M512 664.977939C427.501813 664.977939 359.012502 596.488629 359.012502 512 359.012502 427.501813 427.501813 359.012502 512 359.012502 596.488629 359.012502 664.987501 427.501813 664.987501 512 664.987501 596.488629 596.488629 664.977939 512 664.977939M883.539699 397.319111 810.825958 388.220335 855.813286 330.368563C885.680589 300.510816 885.680589 252.10189 855.813286 222.234586L801.755859 168.186714C771.898112 138.328967 723.489184 138.328967 693.631437 168.186714L635.770107 213.183599 626.680889 140.460298C626.680889 98.235098 592.455348 64 550.220591 64L473.779409 64C431.554209 64 397.319111 98.235098 397.319111 140.460298L388.229893 213.183599 330.37812 168.186714C300.520374 138.328967 252.111448 138.319409 222.253701 168.186714L168.186714 222.234586C138.328967 252.092333 138.338525 300.510816 168.186714 330.368563L213.193156 388.220335 140.460298 397.319111C98.235098 397.319111 64 431.544652 64 473.779409L64 550.220591C64 592.445791 98.235098 626.680889 140.460298 626.680889L213.193156 635.770107 168.186714 693.621882C138.338525 723.479629 138.328967 771.88855 168.186714 801.755859L222.253701 855.803731C252.10189 885.661478 300.520374 885.661478 330.37812 855.803731L388.229893 810.816403 397.319111 883.530144C397.319111 925.755347 431.544652 959.990445 473.779409 959.990445L550.220591 959.990445C592.445791 959.990445 626.680889 925.755347 626.680889 883.530144L635.770107 810.806842 693.621882 855.79417C723.479629 885.651917 771.88855 885.661478 801.746298 855.803731L855.813286 801.746298C885.661478 771.898112 885.661478 723.470067 855.813286 693.61232L810.816403 635.770107 883.539699 626.680889C925.764902 626.680889 960 592.455348 960 550.220591L960 473.779409C960 431.554209 925.764902 397.319111 883.539699 397.319111"
                        :fill="UiState.rightState == 'settings' ? '#000000' : '#777777'"
                    />
                </svg>
                <span>设置</span>
            </ElButton>
            <audio
                ref="audio"
                :src="chartData.chartPackage?.music.src"
                controls
            />
            <select
                v-if="audio"
                v-model="UiState.playbackRate"
                @change="audio.playbackRate = UiState.playbackRate;"
            >
                <option value="0.125">
                    0.125x
                </option>
                <option value="0.25">
                    0.25x
                </option>
                <option value="0.5">
                    0.5x
                </option>
                <option
                    value="1"
                    selected
                >
                    原速
                </option>
                <option value="2">
                    2x
                </option>
                <option value="4">
                    4x
                </option>
            </select>
            <svg
                class="icon"
                viewBox="0 0 1024 1024"
            >
                <path
                    d="M41.106 146.286l941.86 7.533a41.033 41.033 0 0 1 0 82.067l-941.933-7.534a41.033 41.033 0 0 1 0.073-82.066z m0 319.56l941.86 7.535a41.033 41.033 0 0 1 0 82.066l-941.933-7.534a41.033 41.033 0 0 1 0-82.066z m0 319.562l941.86 7.534a41.033 41.033 0 0 1 0 82.066l-941.933-7.607a41.033 41.033 0 0 1 0-81.993z"
                />
            </svg>
            <input
                v-model="UiState.horzionalLines"
                type="number"
            >
            <svg
                class="icon"
                viewBox="0 0 1024 1024"
            >
                <path
                    d="M256 981.333333V42.666667c0-25.6-17.066667-42.666667-42.666667-42.666667S170.666667 17.066667 170.666667 42.666667v938.666666c0 25.6 17.066667 42.666667 42.666666 42.666667s42.666667-17.066667 42.666667-42.666667zM469.333333 42.666667v938.666666c0 25.6 17.066667 42.666667 42.666667 42.666667s42.666667-17.066667 42.666667-42.666667V42.666667c0-25.6-17.066667-42.666667-42.666667-42.666667s-42.666667 17.066667-42.666667 42.666667zM768 42.666667v938.666666c0 25.6 17.066667 42.666667 42.666667 42.666667s42.666667-17.066667 42.666666-42.666667V42.666667c0-25.6-17.066667-42.666667-42.666666-42.666667s-42.666667 17.066667-42.666667 42.666667z"
                />
            </svg>
            <input
                v-model="UiState.verticalLines"
                type="number"
            >
            <ElButton
                @click="UiState.mainState == 'editing' ? UiState.mainState = 'playing' : UiState.mainState = 'editing'"
            >
                <span v-if="UiState.mainState == 'editing'">切换到播放器界面</span>
                <span v-else>切换到编辑器界面</span>
            </ElButton>
        </header>
        <div class="canvasWrapper">
            <canvas
                ref="canvas"
                class="canvas"
                width="1350"
                height="900"
            />
        </div>
        <aside
            v-if="UiState.rightState == 'none'"
            class="sideBar"
        >
        </aside>
        <aside
            v-else-if="UiState.rightState == 'settings'"
            class="sideBar"
        >
            <div>
                <input
                    id="chartPackageFileInput"
                    ref="chartPackageFileInput"
                    type="file"
                    @change="readChartPackage(chartPackageFileInput!.files![0]).then(chartpkg => chartData.chartPackage = chartpkg)"
                >
                <label for="chartPackageFileInput">
                    <ElButton>上传谱面文件（仅支持RPE格式）</ElButton>
                </label>
            </div>
            <div>
                <input
                    id="resourcePackageFileInput"
                    ref="resourcePackageFileInput"
                    type="file"
                    @change="readResourcePackage(resourcePackageFileInput!.files![0]).then(respkg => chartData.resourcePackage = respkg)"
                >
                <label for="resourcePackageFileInput">
                    <ElButton>上传资源包</ElButton>
                </label>
            </div>
            <div>
                <span>谱面流速：</span><input
                    v-model="chartData.chartSpeed"
                    type="number"
                >
            </div>
            <div>
                <span>判定线宽度：</span><input
                    v-model="chartData.lineWidth"
                    type="number"
                >
            </div>
            <div>
                <span>文字大小：</span><input
                    v-model="chartData.textSize"
                    type="number"
                >
            </div>
            <div>
                <span>背景黑暗度：</span><input
                    v-model="chartData.backgroundDarkness"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                >
            </div>
            <div>
                <input
                    v-model="chartData.autoplay"
                    type="checkbox"
                ><span>Autoplay</span>
            </div>
        </aside>
    </div>
</template>
<script setup lang="ts">
import ElButton from '@/components/ElButton.vue';
import { onMounted, ref, Ref, reactive, onBeforeUnmount, shallowReactive, ShallowReactive } from 'vue';
import renderChart from '@/ts/render';
import { readChartPackage, readResourcePackage } from '@/ts/loadFile';
import { ChartData } from '@/ts/typeDefinitions';
import DefaultChartPackageURL from "@/assets/DefaultChartPackage.zip";
import DefaultResourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import renderEditorUI from '@/ts/editor';

const chartPackageFileInput: Ref<HTMLInputElement | null> = ref(null);
const resourcePackageFileInput: Ref<HTMLInputElement | null> = ref(null);
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
const chartData: ShallowReactive<ChartData> = shallowReactive({
    backgroundDarkness: 0.8,
    lineWidth: 5,
    textSize: 50,
    chartSpeed: 120,
    chartPackage: await fetch(DefaultChartPackageURL)
        .then(response => response.blob())
        .then(readChartPackage),
    resourcePackage: await fetch(DefaultResourcePackageURL)
        .then(response => response.blob())
        .then(readResourcePackage),
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
const UiState = reactive({
    mainState: "playing" as "playing" | "editing",
    playbackRate: 1.0,
    rightState: "none" as "none" | "settings",
    viewSize: 3,
    horzionalLines: 4,
    verticalLines: 21,
    selectedJudgeLine: 0
})

onMounted(() => {
    const interval = setInterval(() => {
        if (UiState.mainState == 'editing') {
            renderEditorUI(canvas.value!, chartData, audio.value!.currentTime, UiState);
        } else if (UiState.mainState == 'playing') {
            renderChart(canvas.value!, chartData,  audio.value!.currentTime);
        }
    }, 16);
    onBeforeUnmount(() => {
        clearInterval(interval);
    })
});
</script>
<style scoped>
.content {
    display: grid;
    grid-template-areas:
        "header header"
        "main sidebar";
    grid-template-columns: 12fr 4fr;
    grid-template-rows: 100px 8fr;
    background: #eee;
}

header {
    grid-area: header;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
}

header>* {
    height: 40px;
    margin-top: 5px;
    margin-bottom: 5px;
}

header>.button {
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

.canvasWrapper {
    grid-area: main;
    position: relative;
}

.canvas {
    object-fit: contain;
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
}

.sideBar {
    grid-area: sidebar;
}
</style>