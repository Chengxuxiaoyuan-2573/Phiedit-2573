<template>
    <ElContainer>
        <ElHeader>
            <ElButton
                type="primary"
                :plain="ui.right != RightState.Settings"
                @click="ui.right == RightState.Settings ? ui.right = RightState.Default : ui.right = RightState.Settings"
            >
                设置
            </ElButton>
            <audio
                ref="audio"
                :src="chartPackage.musicSrc"
                controls
            />
            <ElInputNumber
                v-model="ui.segmentsPerBeat"
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
        <ElAside class="left">
            <ElSelect v-model="ui.currentNoteType">
                <ElOption
                    :value="NoteType.Tap"
                    label="Tap"
                />
                <ElOption
                    :value="NoteType.Hold"
                    label="Hold"
                />
                <ElOption
                    :value="NoteType.Drag"
                    label="Drag"
                />
                <ElOption
                    :value="NoteType.Flick"
                    label="Flick"
                />
            </ElSelect>
        </ElAside>
        <ElMain>
            <canvas
                ref="canvas"
                class="canvas"
                width="1350"
                height="900"
            />
        </ElMain>
        <ElAside class="right">
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
                    <template #suffix>
                        像素每秒每单位
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.lineWidth"
                    :min="0"
                >
                    <template #prefix>
                        判定线宽度
                    </template>
                    <template #suffix>
                        像素
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.textSize"
                    :min="0"
                >
                    <template #prefix>
                        文字大小
                    </template>
                    <template #suffix>
                        像素
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.backgroundDarkness"
                    :min="0"
                    :max="100"
                    :step="1"
                >
                    <template #prefix>
                        背景黑暗度
                    </template>
                    <template #suffix>
                        %
                    </template>
                </ElInputNumber>
                <ElInputNumber
                    v-model="chartSettings.noteSize"
                    :min="0"
                    :step="1"
                >
                    <template #prefix>
                        note大小
                    </template>
                    <template #suffix>
                        像素
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
                    <template #suffix>
                        秒
                    </template>
                </ElInputNumber>
                <ElCheckbox v-model="resourcePackage.hitFxRotate">
                    打击特效随判定线旋转
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdKeepHead">
                    Hold正在判定时显示头部
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.hideParticles">
                    隐藏粒子（现在根本没有粒子因为不支持）
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdCompact">
                    Hold中间与头尾重叠（不支持，懒得做）
                </ElCheckbox>
                <ElCheckbox v-model="resourcePackage.holdRepeat">
                    Hold中间重复式拉伸
                </ElCheckbox>
            </template>
            <template v-else>
                <ElUpload
                    id="chartPackageFileInput"
                    ref="chartPackageFileInput"
                    :before-upload="function (file) {
                        return ChartPackage.load(file, setLoadingText)
                            .then(setChartPackage)
                            .then(removeLoadingText, removeLoadingText)
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
                            .then(setResourcePackage)
                            .then(removeLoadingText, removeLoadingText)
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
import render, { data, setCanvas, setChartPackage, setResourcePackage } from "@/ts/render";
import { downloadText } from "@/ts/tools";
import { MainState, NoteType, RightState } from "@/ts/typeDefinitions";
import { ElAside, ElButton, ElCheckbox, ElContainer, ElHeader, ElInputNumber, ElMain, ElOption, ElSelect, ElUpload } from "element-plus";
import { onBeforeUnmount, onMounted, ref, Ref } from "vue";
import NoteEditor from "./NoteEditor.vue";
import NumberEventEditor from "./NumberEventEditor.vue";
const { chartPackage, resourcePackage, chartSettings, ui } = data;
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
function download() {
    const { chart } = chartPackage!;
    downloadText(JSON.stringify(chart.toObject()), chart.META.name + ".json", "application/json");
}
onMounted(() => {
    setCanvas(canvas.value!);
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
        const { ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta } = e;
        if (ctrl || shift || alt || meta)
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
            case "delete":
                ui.selection.forEach(x => x.delete());
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
    grid-area: main;
    --el-main-padding: 0;
}


.el-header {
    background: white;
    grid-area: header;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
}

.el-aside {
    background: white;
    display: flex;
    flex-direction: column;
    align-content: stretch;
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

.el-aside.right>* {
    width: 100%;
}
</style>