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
                v-model="userOperation.playbackRate"
                style="width:100px;"
                @change="audio.playbackRate = userOperation.playbackRate;"
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
                v-model="ui.horzionalLines"
                :min="1"
            />
            <ElInputNumber
                v-model="ui.verticalSpace"
                :min="1"
                :max="675"
            />
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
                @click="canvasClickHandler"
            />
        </ElMain>
        <ElAside
            class="right"
            :class="{ open: ui.rightOpen }"
        >
            <template v-if="ui.selectedNotes.length == 1">
                <ElSelect v-model="ui.selectedNotes[0].type">
                    <ElOption
                        :value="1"
                        label="Tap"
                    />
                    <ElOption
                        :value="2"
                        label="Hold"
                    />
                    <ElOption
                        :value="3"
                        label="Flick"
                    />
                    <ElOption
                        :value="4"
                        label="Drag"
                    />
                </ElSelect>
                <ElInput
                    v-model="userOperation.startString"
                    @input="ui.selectedNotes[0].startString = userOperation.startString;"
                    @change="userOperation.startString = ui.selectedNotes[0].startString;"
                >
                    <template #prepend>
                        开始时间
                    </template>
                </ElInput>
                <ElInput
                    v-model="userOperation.endString"
                    @input="ui.selectedNotes[0].endString = userOperation.endString;"
                    @change="userOperation.endString = ui.selectedNotes[0].endString;"
                >
                    <template #prepend>
                        结束时间
                    </template>
                </ElInput>
                <ElCheckbox v-model="ui.selectedNotes[0].isFake">
                    假音符
                </ElCheckbox>
                <ElSwitch
                    v-model="ui.selectedNotes[0].above"
                    active-text="正落"
                    inactive-text="倒落"
                >
                    <template #default>
                        下落方向
                    </template>
                </ElSwitch>
                <ElInputNumber v-model="ui.selectedNotes[0].positionX">
                    <template #prefix>
                        X坐标
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model="ui.selectedNotes[0].speed">
                    <template #prefix>
                        速度倍率
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model="ui.selectedNotes[0].size">
                    <template #prefix>
                        大小
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model="ui.selectedNotes[0].alpha">
                    <template #prefix>
                        透明度
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model="ui.selectedNotes[0].yOffset">
                    <template #prefix>
                        纵向偏移
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model="ui.selectedNotes[0].visibleTime">
                    <template #prefix>
                        可见时间
                    </template>
                </ElInputNumber>
            </template>
            <template v-else-if="ui.right == RightState.Default">
                <ElUpload
                    id="chartPackageFileInput"
                    ref="chartPackageFileInput"
                    :before-upload="function (file) {
                        return ChartPackage.load(file, setLoadingText)
                            .then(chartPackage => chartData.chartPackage = chartPackage)
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                >
                    <ElButton>上传谱面文件压缩包</ElButton>
                </ElUpload>
                <ElUpload
                    id="resourcePackageFileInput"
                    ref="resourcePackageFileInput"
                    :before-upload="function (file) {
                        return ResourcePackage.load(file, setLoadingText)
                            .then(resourcePackage => chartData.resourcePackage = resourcePackage)
                            .then(removeLoadingText, removeLoadingText)
                            .catch(err => console.error(err))
                    }"
                >
                    <ElButton>上传资源包</ElButton>
                </ElUpload>
                <ElButton @click="download">
                    下载谱面文件
                </ElButton>
            </template>
            <template v-else-if="ui.right == RightState.Settings">
                <ElInputNumber v-model.lazy="chartData.chartSpeed">
                    <template #prefix>
                        谱面流速
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model.lazy="chartData.lineWidth">
                    <template #prefix>
                        判定线宽度
                    </template>
                </ElInputNumber>
                <ElInputNumber v-model.lazy="chartData.textSize">
                    <template #prefix>
                        文字大小
                    </template>
                </ElInputNumber>
                <ElSlider
                    v-model.lazy="chartData.backgroundDarkness"
                    :min="0"
                    :max="1"
                    :step="0.01"
                >
                    <template #prefix>
                        背景黑暗度
                    </template>
                </ElSlider>
                <ElInputNumber v-model.lazy="chartData.resourcePackage.hitFxDuration">
                    <template #prefix>
                        打击特效时间
                    </template>
                </ElInputNumber>
                <ElCheckbox v-model.lazy="chartData.resourcePackage.hitFxRotate">
                    <template #prefix>
                        打击特效随判定线旋转
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model.lazy="chartData.resourcePackage.holdKeepHead">
                    <template #prefix>
                        Hold正在判定时显示头部
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model.lazy="chartData.resourcePackage.hideParticles">
                    <template #prefix>
                        隐藏粒子（现在根本没有粒子因为不支持）
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model.lazy="chartData.resourcePackage.holdCompact">
                    <template #prefix>
                        Hold中间与头尾重叠（不支持，懒得做）
                    </template>
                </ElCheckbox>
                <ElCheckbox v-model.lazy="chartData.resourcePackage.holdRepeat">
                    <template #prefix>
                        Hold中间重复式拉伸（不支持，不知道怎么做）
                    </template>
                </ElCheckbox>
            </template>
        </ElAside>
    </ElContainer>
</template>
<script setup lang="ts">
import DefaultChartPackageURL from "@/assets/DefaultChartPackage.zip";
import DefaultResourcePackageURL from "@/assets/DefaultResourcePackage.zip";
import { Box } from '@/ts/classes/box';
import { ChartPackage } from '@/ts/classes/chartPackage';
import { ResourcePackage } from '@/ts/classes/resourcePackage';
import renderEditorUI from '@/ts/editor';
import renderChart from '@/ts/render';
import { downloadText } from "@/ts/tools";
import { ChartData, MainState, RightState, TopState, UI } from '@/ts/typeDefinitions';
import { ElAside, ElButton, ElCheckbox, ElSwitch, ElContainer, ElHeader, ElInput, ElSlider, ElInputNumber, ElMain, ElOption, ElSelect, ElUpload } from 'element-plus';
import { inject, onBeforeUnmount, onMounted, reactive, ref, Ref, shallowReactive } from 'vue';
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
const setLoadingText = inject("setLoadingText", () => {
    console.error("Failed to get function setLoadingText");
})
const removeLoadingText = inject("removeLoadingText", () => {
    console.error("Failed to get function removeLoadingText");
})
const chartData: ChartData = shallowReactive({
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
        .then(blob => ResourcePackage.load(blob, setLoadingText)))
});
removeLoadingText();
const ui: UI = reactive({
    main: MainState.Playing,
    right: RightState.Default,
    top: TopState.Default,
    rightOpen: true,
    topOpen: true,
    verticalStretch: 300,
    horzionalLines: 4,
    verticalSpace: 50,
    selectedJudgeLine: 0,
    selectedEventLayer: 0,
    boxes: {
        noteBoxes: [],
        moveXEventBoxes: [],
        moveYEventBoxes: [],
        rotateEventBoxes: [],
        alphaEventBoxes: [],
        speedEventBoxes: []
    },
    selectedNotes: [],
    selectedMoveXEvents: [],
    selectedMoveYEvents: [],
    selectedRotateEvents: [],
    selectedAlphaEvents: [],
    selectedSpeedEvents: [],
})

const userOperation = reactive({
    wheelSpeed: 1,
    playbackRate: 1.0,
    startString: '',
    endString: ''
})
/**
 * 把用户点击坐标转换成canvas坐标系下的坐标。
 */
function clickPosition(x: number, y: number) {
    const innerWidthCanvasPixels = canvas.value!.width;
    const innerHeightCanvasPixels = canvas.value!.height;
    const innerRatio = innerWidthCanvasPixels / innerHeightCanvasPixels;
    const { width: outerWidthBrowserPixels, height: outerHeightBrowserPixels } = canvas.value!.getBoundingClientRect();
    const outerRatio = outerWidthBrowserPixels / outerHeightBrowserPixels;
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
function canvasClickHandler(e: MouseEvent) {
    const { x, y } = clickPosition(e.offsetX, e.offsetY);
    if (!ui.boxes) return;
    function _select<T>(boxes: Box<T>[]) {
        for (const box of boxes) {
            if (box.touch(x, y)) {
                console.debug("touched");
                return [box.data];
            }
        }
        return [];
    }
    ui.selectedNotes = _select(ui.boxes.noteBoxes);
    /**
     * 这里的startString和endString是要经过手动处理的，所以要单独赋值
     */
    if (ui.selectedNotes.length == 1) {
        userOperation.startString = ui.selectedNotes[0].startString;
        userOperation.endString = ui.selectedNotes[0].endString;
    }

    ui.selectedMoveXEvents = _select(ui.boxes.moveXEventBoxes);
    ui.selectedMoveYEvents = _select(ui.boxes.moveYEventBoxes);
    ui.selectedRotateEvents = _select(ui.boxes.rotateEventBoxes);
    ui.selectedAlphaEvents = _select(ui.boxes.alphaEventBoxes);
    ui.selectedSpeedEvents = _select(ui.boxes.speedEventBoxes);
}
function download() {
    const { chartPackage: { chart } } = chartData;
    downloadText(JSON.stringify(chart.toObject()), chart.META.name + ".json", "application/json");
}
onMounted(() => {
    const interval = setInterval(() => {
        if (ui.main == MainState.Editing) {
            ui.boxes = renderEditorUI(canvas.value!, chartData, audio.value!.currentTime, ui);
        }
        else if (ui.main == MainState.Playing) {
            renderChart(canvas.value!, chartData, audio.value!.currentTime);
        }
    }, 16);
    onBeforeUnmount(() => {
        clearInterval(interval);
        window.onwheel = null;
        window.onkeydown = null;
    })
    window.onwheel = e => {
        audio.value!.currentTime += e.deltaY * userOperation.wheelSpeed * -0.01;
    }
    window.onkeydown = e => {
        switch (e.key) {
            case ' ':
                if (audio.value!.paused) audio.value!.play();
                else audio.value!.pause();
                return;
            default:
                console.log(e.key);
        }
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

.el-aside>* {
    width: 100%;
}

.el-upload>.el-button {
    width: 100%;
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