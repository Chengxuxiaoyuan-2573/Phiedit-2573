<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElHeader class="header">
        <h1 class="top-title">
            欢迎使用 Phiedit 2573 谱面编辑器！
        </h1>
        <em class="version">
            当前版本：v0.2.0
        </em>
    </ElHeader>
    <MyGridContainer
        :columns="2"
        :gap="100"
        class="button-container"
    >
        <MyDialog open-text="创建新的谱面">
            <div class="add-chart-dialog">
                <MyButton
                    type="primary"
                    @click="catchErrorByMessage(loadMusic, '导入音乐')"
                >
                    导入音乐（{{ musicFileUrl ? musicFileUrl.split('/').pop() : '未选择' }}）
                </MyButton>

                <MyButton
                    type="primary"
                    @click="catchErrorByMessage(loadBackground, '导入曲绘')"
                >
                    导入背景（{{ backgroundFileUrl ? backgroundFileUrl.split('/').pop() : '未选择' }}）
                </MyButton>

                <ElInput
                    v-model="name"
                    placeholder="请输入谱面名称"
                />
                <em>注意：在点击“确定”添加谱面之后，请先进入谱面，填写好BPM，调整好偏移后再开始写谱！</em>
                <MyButton
                    type="success"
                    @click="catchErrorByMessage(addChart, '添加谱面')"
                >
                    确定
                </MyButton>
            </div>
        </MyDialog>

        <MyButton
            type="primary"
            @click="catchErrorByMessage(loadChart, '导入谱面')"
        >
            导入谱面（仅支持RPE格式，不支持官方谱面格式）
        </MyButton>
    </MyGridContainer>

    <div class="chart-list">
        <RouterLink
            v-for="chartId in chartList"
            :key="chartId"
            :to="`/editor?chartId=${chartId}`"
        >
            <ElCard class="chart-card">
                <img
                    :src="backgroundSrcs[chartId]"
                    @load="imageOnLoad(chartId)"
                >
                <div class="chart-info">
                    <h2 class="chart-title">
                        {{ chartNames[chartId] }}
                    </h2>
                    <span class="chart-level">
                        {{ levels[chartId] }}
                    </span>
                </div>
            </ElCard>
        </RouterLink>
    </div>
    <ElFooter>
        <MyLink
            href="https://teamflos.github.io/phira-docs/index.html"
            class="phira-link"
        >
            点击此链接以进入 Phira 文档，可查看关于谱面文件格式的更多信息。该文档不是本软件的文档，仅供参考
        </MyLink>
    </ElFooter>
</template>
<script setup lang="ts">
import { useRouter } from "vue-router";
import { ElCard, ElFooter, ElHeader, ElInput } from "element-plus";
import MyButton from "@/myElements/MyButton.vue";
import { inject, ref } from "vue";
import MediaUtils from "@/tools/mediaUtils";
import MyDialog from "@/myElements/MyDialog.vue";
import { catchErrorByMessage } from "@/tools/catchError";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MyLink from "@/myElements/MyLink.vue";

const router = useRouter();
const musicFileUrl = ref<string | undefined>();
const backgroundFileUrl = ref<string | undefined>();

const name = ref("");
const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});
const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});

loadStart();
const chartList = await window.electronAPI.readChartList();
const backgroundSrcs: Record<string, string> = {};
const chartNames: Record<string, string> = {};
const levels: Record<string, string> = {};
for (let i = 0; i < chartList.length; i++) {
    const chartId = chartList[i];
    const chartObject = await window.electronAPI.loadChart(chartId);
    const chartInfo = await window.electronAPI.readChartInfo(chartId);
    const src = await MediaUtils.createObjectURL(chartObject.backgroundData);
    backgroundSrcs[chartId] = src;
    chartNames[chartId] = chartInfo.name;
    levels[chartId] = chartInfo.level;
}
loadEnd();

async function loadMusic() {
    const filePaths = await window.electronAPI.showOpenMusicDialog();
    if (!filePaths) {
        throw new Error("操作已取消");
    }

    if (filePaths.length === 0) {
        throw new Error("未选择音乐文件");
    }
    musicFileUrl.value = filePaths[0];
}

async function loadBackground() {
    const filePaths = await window.electronAPI.showOpenImageDialog();
    if (!filePaths) {
        throw new Error("操作已取消");
    }

    if (filePaths.length === 0) {
        throw new Error("未选择背景文件");
    }
    backgroundFileUrl.value = filePaths[0];
}

async function loadChart() {
    const filePaths = await window.electronAPI.showOpenChartDialog();
    if (!filePaths) {
        throw new Error("操作已取消");
    }

    if (filePaths.length === 0) {
        throw new Error("未选择谱面文件");
    }

    const filePath = filePaths[0];
    const chartId = await window.electronAPI.importChart(filePath);
    router.push(`/editor?chartId=${chartId}`);
}

async function addChart() {
    if (!musicFileUrl.value || !backgroundFileUrl.value) {
        throw new Error("请先选择音乐和背景");
    }

    if (name.value.trim() === "") {
        throw new Error("请填写名称");
    }

    const chartId = await window.electronAPI.addChart(musicFileUrl.value, backgroundFileUrl.value, name.value);
    router.push(`/editor?chartId=${chartId}`);
}

function imageOnLoad(chartId: string) {
    URL.revokeObjectURL(backgroundSrcs[chartId]);
}
</script>
<style>
.header {
    display: flex;
    justify-content: center;
    padding: 10px 0;
}

.top-title {
    font-size: revert;
    align-self: center;
}

.version {
    align-self: flex-end;
}

.button-container {
    box-sizing: border-box;
    padding: 20px 100px;
}

.chart-list {
    display: grid;
    padding: 0 10px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 10px;
}

.chart-card {
    --el-card-padding: 0;
    --card-width: 300px;
    width: var(--card-width);
    height: calc(var(--card-width) * 2 / 3 + 50px);
}

.chart-card img {
    display: block;
    width: var(--card-width);
    height: calc(var(--card-width) * 2 / 3);
}

.chart-info {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: space-between;
    box-sizing: border-box;
    padding: 0 10px;
}

.chart-title {
    display: block;
    white-space: nowrap;
    align-self: center;
    max-width: calc(100% - 60px);
}

.chart-level {
    display: block;
    white-space: nowrap;
    align-self: flex-end;
    max-width: 60px;
}

a {
    text-decoration: none;
}

.add-chart-dialog {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.el-footer {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>