<template>
    <h1 class="top-title">
        欢迎来到Phiedit 2573！
    </h1>
    <MyDialog open-text="添加谱面">
        <ElUpload
            drag
            @change="file => {
                musicFileUrl = file.url;
            }"
        >
            点击此处导入音乐
        </ElUpload>
        <ElUpload
            drag
            @change="file => {
                backgroundFileUrl = file.url;
            }"
        >
            点击此处导入曲绘
        </ElUpload>
        <ElInput
            v-model="name"
            placeholder="请输入谱面名称"
        />
        <ElButton
            type="success"
            @click="catchErrorByMessage(addChart, '添加谱面')"
        >
            创建
        </ElButton>
    </MyDialog>
    <ElUpload
        drag
        @change="catchErrorByMessage(() => loadChart($event.url), '导入谱面')"
    >
        点击此处导入谱面
    </ElUpload>
    <div class="chart-list">
        <RouterLink
            v-for="chartId in chartList"
            :key="chartId"
            :to="`/editor?chartId=${chartId}`"
        >
            <ElCard class="chart-card">
                <img :src="backgroundSrcs[chartId]">
                <h2 class="chart-title">
                    {{ chartId }}
                </h2>
            </ElCard>
        </RouterLink>
    </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ElCard, ElInput, ElUpload, ElButton } from 'element-plus';
import { inject, onErrorCaptured, ref } from 'vue';
import MediaUtils from '@/tools/mediaUtils';
import MyDialog from '@/myElements/MyDialog.vue';
import { catchErrorByMessage } from '@/tools/catchError';

const router = useRouter();
let musicFileUrl: string | undefined;
let backgroundFileUrl: string | undefined;
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
for (let i = 0; i < chartList.length; i++) {
    const chartId = chartList[i];
    const chartObject = await window.electronAPI.readChart(chartId);
    const src = await MediaUtils.createObjectURL(chartObject.backgroundData);
    backgroundSrcs[chartId] = src;
}
loadEnd();

async function loadChart(fileUrl: string | undefined) {
    if (!fileUrl) {
        throw new Error("请选择谱面文件");
    }
    const chartId = await window.electronAPI.loadChart(fileUrl);
    router.push(`/editor?chartId=${chartId}`);
}
async function addChart() {
    console.log(1);
    if (!musicFileUrl || !backgroundFileUrl) {
        throw new Error("请先选择音乐和背景");
    }
    if (name.value.trim() === "") {
        throw new Error("请填写名称");
    }
    const chartId = await window.electronAPI.addChart(musicFileUrl, backgroundFileUrl, name.value);
    router.push(`/editor?chartId=${chartId}`);
}
onErrorCaptured((err) => {
    console.error('组件初始化错误:', err)
    // 这里可以添加用户友好的错误提示
    return false // 阻止错误继续传播
})
</script>
<style scoped>
.top-title {
    font-size: revert;
}

.chart-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    /* Adjust as needed */
}

.chart-card {
    --el-card-padding: 0;
    --card-width: 300px;
    width: var(--card-width);
    height: calc(var(--card-width) * 2 / 3 + 50px);
}

.chart-card img {
    width: var(--card-width);
    height: calc(var(--card-width) * 2 / 3);
}

.chart-title {
    width: 100%;
    height: 50px;
    font-size: 20px;
    margin-block-start: 0;
    margin-block-end: 0;
    /* 不换行 */
    white-space: nowrap;
}

a {
    text-decoration: none;
}
</style>