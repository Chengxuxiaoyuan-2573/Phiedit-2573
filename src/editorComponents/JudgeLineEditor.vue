<template>
    <div class="judgeline-editor">
        <Teleport :to="props.titleTeleport">
            判定线编辑
        </Teleport>
        <MyInputNumber
            v-model="stateManager.currentJudgeLineNumber"
            :min="0"
            :max="chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                当前线号
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="chart.judgeLineList[stateManager.currentJudgeLineNumber].father"
            :min="-1"
            :max="chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                父线号
            </template>
        </MyInputNumber>
        <MySwitch
            v-model="chart.judgeLineList[stateManager.currentJudgeLineNumber].isCover"
            :active-value="1"
            :inactive-value="0"
        >
            隐藏在此判定线下方的note
        </MySwitch>
        <MyInputNumber
            v-model="chart.judgeLineList[stateManager.currentJudgeLineNumber].zOrder"
            :step="1"
        >
            <template #prepend>
                显示层号
            </template>
        </MyInputNumber>
        <MySelect
            v-model="chart.judgeLineList[stateManager.currentJudgeLineNumber].Texture"
            :options="[
                {
                    label: '无贴图',
                    value: 'line.png',
                    text: '无贴图'
                },
                ...Object.keys(chartPackage.textures)
            ]"
        />
    </div>
</template>
<script setup lang="ts">
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySelect from '../myElements/MySelect.vue';
import MySwitch from '../myElements/MySwitch.vue';
import store from '@/store';
import stateManager from '@/services/managers/state';
const props = defineProps<{
    titleTeleport: string
}>();
const chartPackage = store.useChartPackage();
const chart = store.useChart();
</script>
<style scoped>
.judgeline-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>