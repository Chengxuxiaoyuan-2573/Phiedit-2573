<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElHeader class="header">
        <h1 class="top-title">
            欢迎使用 Phiedit 2573 谱面编辑器！
        </h1>
        <em class="version">
            当前版本：{{ version }}
        </em>
    </ElHeader>
    <MyGridContainer
        :columns="3"
        :gap="50"
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
            导入谱面（支持 RPE、官方谱面格式）
        </MyButton>
        <MyButton
            type="primary"
            @click="catchErrorByMessage(clearCache, '清理')"
        >
            清空缓存（{{ MathUtils.formatData(cacheSize) }}）
        </MyButton>
    </MyGridContainer>
    <div class="chart-menu-bar">
        <ElMenu
            :key="isManaging ? 'managing' : 'browsing'"
            mode="horizontal"
            :default-active="menuOption"
            class="chart-menu"
            :ellipsis="false"
            :collapse="false"
            @select="onMenuSelect"
        >
            <template v-if="!isManaging">
                <ElMenuItem index="undeleted">
                    我的谱面
                </ElMenuItem>
                <ElMenuItem index="deleted">
                    最近删除
                </ElMenuItem>
                <div class="seperator" />
                <ElLink
                    index="manage"
                    @click="toggleManage"
                >
                    谱面管理
                </ElLink>
            </template>
            <template v-else>
                <ElLink @click="exportSelectedCharts">
                    全部导出
                </ElLink>
                <ElLink @click="deleteSelectedCharts">
                    全部删除
                </ElLink>
                <div>
                    <ElCheckbox
                        :model-value="isAllSelected"
                        @click="toggleSelectAll"
                    />
                    全选
                </div>
                <div class="seperator" />
                <ElLink
                    index="cancel"
                    @click="toggleManage"
                >
                    取消
                </ElLink>
            </template>
        </ElMenu>
    </div>
    <div class="main-area">
        <div
            v-if="menuOption === 'undeleted'"
            class="chart-list"
        >
            <component
                :is="isManaging ? 'div' : RouterLink"
                v-for="chartId in chartList"
                :key="chartId"
                class="chart-wrapper"
                :class="{ 'chart-selectable': isManaging }"
                :to="isManaging ? undefined : `/editor?chartId=${encodeURIComponent(chartId)}`"
                @click="isManaging ? toggleSelect(chartId) : undefined"
            >
                <ElCard
                    class="chart-card"
                    :class="{ 'chart-card-selected': isSelected(chartId) }"
                >
                    <div class="image-container">
                        <img :src="backgroundSrcs[chartId]">
                        <div
                            v-if="isManaging"
                            class="chart-select-mark"
                            :class="{ checked: isSelected(chartId) }"
                        >
                            {{ isSelected(chartId) ? "✓" : "" }}
                        </div>
                        <MyGridContainer
                            v-else
                            class="chart-card-buttons-container"
                            :columns="3"
                            :gap="30"
                        >
                            <p
                                type="primary"
                                @click.stop.prevent="exportChart(chartId)"
                            >
                                导出
                            </p>
                            <p
                                type="success"
                                @click.stop.prevent="gotoChart(chartId)"
                            >
                                进入
                            </p>
                            <p
                                type="danger"
                                @click.stop.prevent="deleteChart(chartId)"
                            >
                                删除
                            </p>
                        </MyGridContainer>
                    </div>
                    <div class="chart-info">
                        <h2 class="chart-title">
                            {{ chartNames[chartId] }}
                        </h2>
                        <span class="chart-level">
                            {{ levels[chartId] }}
                        </span>
                    </div>
                </ElCard>
            </component>
        </div>
        <template v-else>
            <div class="chart-list deleted-chart-list">
                <div
                    v-for="chartId in deletedCharts"
                    :key="chartId"
                    class="chart-wrapper"
                    :class="{ 'chart-selectable': isManaging }"
                    @click="isManaging ? toggleSelect(chartId) : undefined"
                >
                    <ElCard
                        class="chart-card"
                        :class="{ 'chart-card-selected': isSelected(chartId) }"
                    >
                        <div class="image-container">
                            <img :src="backgroundSrcs[chartId]">
                            <div
                                v-if="isManaging"
                                class="chart-select-mark"
                                :class="{ checked: isSelected(chartId) }"
                            >
                                {{ isSelected(chartId) ? "✓" : "" }}
                            </div>
                            <MyGridContainer
                                v-else
                                class="chart-card-buttons-container"
                                :columns="2"
                                :gap="50"
                            >
                                <p
                                    type="primary"
                                    @click.stop.prevent="restoreChart(chartId)"
                                >
                                    恢复
                                </p>
                                <p
                                    type="danger"
                                    @click.stop.prevent="confirm(() => permentlydeleteChart(chartId), '确定要永久删除该谱面吗？', '删除')"
                                >
                                    删除
                                </p>
                            </MyGridContainer>
                        </div>
                        <div class="chart-info">
                            <h2 class="chart-title">
                                {{ chartNames[chartId] }}
                            </h2>
                            <span class="chart-level">
                                {{ levels[chartId] }}
                            </span>
                        </div>
                    </ElCard>
                </div>
            </div>
        </template>
    </div>
    <SelectChartFormatDialog ref="formatDialogRef" />
    <BatchExportDialog ref="batchExportDialogRef" />
</template>
<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { ElCard, ElCheckbox, ElHeader, ElInput, ElLink, ElMenu, ElMenuItem, ElMessage } from "element-plus";
import MyButton from "@/myElements/MyButton.vue";
import { computed, h, inject, onBeforeUnmount, ref } from "vue";
import MediaUtils from "@/tools/mediaUtils";
import MyDialog from "@/myElements/MyDialog.vue";
import { catchErrorByMessage, confirm } from "@/tools/catchError";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MathUtils from "@/tools/mathUtils";
import SelectChartFormatDialog from "@/myElements/SelectChartFormatDialog.vue";
import BatchExportDialog from "@/myElements/BatchExportDialog.vue";

const router = useRouter();
const musicFileUrl = ref<string | undefined>();
const backgroundFileUrl = ref<string | undefined>();
const menuOption = ref<string>("undeleted");
const version = await window.electronAPI.getVersion();

const name = ref("");
const formatDialogRef = ref<InstanceType<typeof SelectChartFormatDialog>>();
const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});
const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});

loadStart();
const chartList = await window.electronAPI.readChartList();
const allCharts = await window.electronAPI.readAllCharts();
const cacheSize = ref(await window.electronAPI.getCacheSize());
const backgroundSrcs: Record<string, string> = {};
const chartNames: Record<string, string> = {};
const levels: Record<string, string> = {};
for (let i = 0; i < allCharts.length; i++) {
    const chartId = allCharts[i];
    const chartObject = await window.electronAPI.loadChart(chartId);
    const chartInfo = await window.electronAPI.readChartInfo(chartId);
    const src = await MediaUtils.createObjectURL(chartObject.backgroundData);
    backgroundSrcs[chartId] = src;
    chartNames[chartId] = chartInfo.name;
    levels[chartId] = chartInfo.level;
}
loadEnd();

/** 是否处于“谱面管理”状态（此时谱面可以被选中） */
const isManaging = ref(false);

/** 处于选中状态的谱面 ID */
const selectedChartIds = ref<Set<string>>(new Set());

/** 上次导出用的文件夹，下次导出时默认用它 */
const lastExportFolder = ref("");
const batchExportDialogRef = ref<InstanceType<typeof BatchExportDialog>>();

/** 最近删除里的谱面 */
const deletedCharts = computed(() => {
    return allCharts.filter(chartId => !chartList.includes(chartId));
});

const currentCharts = computed(() => {
    switch (menuOption.value) {
        case "deleted":
            return [...deletedCharts.value];
        case "undeleted":
            return [...chartList];
        default:
            return [];
    }
});

const isAllSelected = computed(() => {
    return currentCharts.value.every(chartId => selectedChartIds.value.has(chartId));
});

function onMenuSelect(index: string) {
    if (isManaging.value) {
        if (index === "export-all") {
            void exportSelectedCharts();
        }
        else if (index === "delete-all") {
            void deleteSelectedCharts();
        }
        return;
    }
    menuOption.value = index;
}

function toggleManage() {
    if (isManaging.value) {
        exitManage();
        return;
    }
    selectedChartIds.value = new Set();
    isManaging.value = true;
}

function exitManage() {
    isManaging.value = false;
    selectedChartIds.value = new Set();
}

function isSelected(chartId: string) {
    return selectedChartIds.value.has(chartId);
}

function toggleSelect(chartId: string) {
    if (!isManaging.value) {
        return;
    }

    const next = new Set(selectedChartIds.value);
    if (next.has(chartId)) {
        next.delete(chartId);
    }
    else {
        next.add(chartId);
    }
    selectedChartIds.value = next;
}

function toggleSelectAll() {
    if (isAllSelected.value) {
        selectedChartIds.value = new Set();
    }
    else {
        selectedChartIds.value = new Set(currentCharts.value);
    }
}

/** 从 Electron 抛出的错误里取出可读的信息 */
function getErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    // 去掉 IPC 自动加上的前缀
    return message.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, "");
}

/** 全部删除：最近删除里的谱面会被永久删除，我的谱面里的谱面会被移到最近删除 */
async function deleteSelectedCharts() {
    const chartIds = [...selectedChartIds.value];
    if (chartIds.length === 0) {
        ElMessage.warning("请先选择要删除的谱面");
        return;
    }

    const isPermanent = menuOption.value === "deleted";
    const message = isPermanent ?
        `确定要永久删除选中的 ${chartIds.length} 个谱面吗？删除后无法恢复。` :
        `确定要删除选中的 ${chartIds.length} 个谱面吗？删除后可以在“最近删除”里恢复。`;
    await confirm(async () => {
        loadStart();
        try {
            for (const chartId of chartIds) {
                if (isPermanent) {
                    await window.electronAPI.permentlyDeleteChart(chartId);
                }
                else {
                    await window.electronAPI.deleteChart(chartId);
                }
            }
        }
        finally {
            loadEnd();
        }
        router.go(0);
    }, message, isPermanent ? "永久删除谱面" : "删除谱面");
}

/** 全部导出：弹窗里填好文件夹和文件名后再真正开始导出 */
async function exportSelectedCharts() {
    const chartIds = [...selectedChartIds.value];
    if (chartIds.length === 0) {
        ElMessage.warning("请先选择要导出的谱面");
        return;
    }

    const charts = chartIds.map(chartId => ({
        chartId,
        chartName: chartNames[chartId] ?? chartId
    }));
    const options = await batchExportDialogRef.value?.open(charts, lastExportFolder.value);
    if (!options) {
        // 用户取消了导出
        return;
    }
    lastExportFolder.value = options.folder;
    loadStart();
    try {
        await window.electronAPI.batchExportCharts(options.folder, options.requests);
        ElMessage.success(`已导出 ${options.requests.length} 个谱面到 ${options.folder}`);
    }
    catch (error) {
        ElMessage.error(`导出失败：${getErrorMessage(error)}`);
    }
    finally {
        loadEnd();
    }
}

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

    // 选好文件后，立即弹出格式选择弹窗，让用户选择用哪种格式读取
    const format = await formatDialogRef.value?.open();
    if (!format) {
        throw new Error("操作已取消");
    }

    const result = await window.electronAPI.importChart(filePath, format);

    // 官方谱面转谱出错时，提示用户，并提供日志文件的入口
    if (result.convertErrorMessages.length > 0) {
        ElMessage.warning({
            message: h("p", null, [
                `本次官方谱面转谱出现了 ${result.convertErrorMessages.length} 个错误，如有异常请查看`,
                h("a", {
                    href: "#",
                    onClick: (e) => {
                        e.preventDefault();
                        if (result.convertLogPath) {
                            window.electronAPI.openPath(result.convertLogPath);
                        }
                    }
                }, [
                    "日志文件"
                ]),
                "。"
            ]),
            dangerouslyUseHTMLString: true,
            duration: 0,
            showClose: true
        });
    }

    const encodedId = encodeURIComponent(result.chartId);
    router.push(`/editor?chartId=${encodedId}`);
}

async function addChart() {
    if (!musicFileUrl.value || !backgroundFileUrl.value) {
        throw new Error("请先选择音乐和背景");
    }

    if (name.value.trim() === "") {
        throw new Error("请填写名称");
    }

    const chartId = await window.electronAPI.addChart(musicFileUrl.value, backgroundFileUrl.value, name.value);
    const encodedId = encodeURIComponent(chartId);
    router.push(`/editor?chartId=${encodedId}`);
}

async function exportChart(chartId: string) {
    const chartName = chartNames[chartId];

    // 使用预加载的 API 替代直接导入
    const filePath = await window.electronAPI.showSaveDialog(chartName);
    if (filePath === null) {
        throw new Error("未选择导出路径");
    }
    await window.electronAPI.exportChart(chartId, filePath);
}

async function deleteChart(chartId: string) {
    await window.electronAPI.deleteChart(chartId);
    router.go(0);
}

async function restoreChart(chartId: string) {
    await window.electronAPI.restoreChart(chartId);
    router.go(0);
}

async function permentlydeleteChart(chartId: string) {
    await window.electronAPI.permentlyDeleteChart(chartId);
    router.go(0);
}

async function gotoChart(chartId: string) {
    const url = `/editor?chartId=${encodeURIComponent(chartId)}`;
    router.push(url);
}

async function clearCache() {
    await window.electronAPI.clearCache();
    cacheSize.value = await window.electronAPI.getCacheSize();
}

onBeforeUnmount(() => {
    for (const chartId of allCharts) {
        URL.revokeObjectURL(backgroundSrcs[chartId]);
    }
});
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

.chart-menu-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
}

.chart-menu {
    flex: 1;
    min-width: 0;
}

.chart-menu .menu-item-danger {
    color: var(--el-color-danger);
}

.main-area {
    position: relative;
}

/* 谱面卡片外面那层（普通状态是链接，管理状态下是可点击的容器） */
.chart-wrapper {
    display: block;
}

.chart-selectable {
    cursor: pointer;
}

.chart-card-selected {
    outline: 3px solid var(--el-color-primary);
    outline-offset: -3px;
}

.chart-select-mark {
    position: absolute;
    top: 8px;
    right: 8px;
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #0007;
    color: #fff;
    font-weight: bold;
    transition: 0.1s;
}

.chart-select-mark.checked {
    background: var(--el-color-primary);
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

.chart-card .image-container {
    position: relative;
}

.chart-card .image-container img {
    display: block;
    width: var(--card-width);
    height: calc(var(--card-width) * 2 / 3);
    object-fit: cover;
}

.chart-card-buttons-container {
    box-sizing: border-box;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0007;
    padding: 5px;
    cursor: initial;
}

.chart-card-buttons-container p {
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.1s;
    color: #fffa;
    border-radius: 5px;
    cursor: pointer;
}

.chart-card-buttons-container p:hover {
    background: #fff7;
}

.chart-info {
    width: 100%;
    height: 50px;
    display: flex;
    position: relative;
    box-sizing: border-box;
    padding: 0 10px;
    overflow: hidden;
}

.chart-title {
    display: block;
    white-space: nowrap;
    align-self: center;
    position: absolute;
    left: 10px;
    max-width: calc(100% - 80px);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chart-level {
    display: block;
    white-space: nowrap;
    align-self: flex-end;
    position: absolute;
    right: 10px;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
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

.chart-menu>* {
    align-self: center;
}

.chart-menu .seperator {
    margin-left: auto;
}

.chart-menu .el-link {
    padding: 0 20px;
}

.chart-menu .el-link:hover::after {
    content: none;
}
</style>