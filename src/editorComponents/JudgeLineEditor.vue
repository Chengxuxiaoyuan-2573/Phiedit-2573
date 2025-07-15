<template>
    <div class="judgeline-editor">
        <Teleport :to="props.titleTeleport">
            判定线编辑
        </Teleport>
        <ElButtonGroup>
            <ElButton
                :disabled="stateManager.state.currentJudgeLineNumber <= 0"
                @click="globalEventEmitter.emit('PREVIOUS_JUDGE_LINE')"
            >
                -
            </ElButton>
            <ElButton 
                style="flex: 1"
                @click="console.log('没用的按钮')"
            >
                当前判定线号：{{ stateManager.state.currentJudgeLineNumber }}
            </ElButton>
            <ElButton
                :disabled="stateManager.state.currentJudgeLineNumber >= stateManager.judgeLinesCount - 1"
                @click="globalEventEmitter.emit('NEXT_JUDGE_LINE')"
            >
                +
            </ElButton>
        </ElButtonGroup>
        <MyInputNumber
            v-model="chart.judgeLineList[stateManager.state.currentJudgeLineNumber].father"
            :min="-1"
            :max="chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                父线号
            </template>
        </MyInputNumber>
        <MySwitch
            v-model="chart.judgeLineList[stateManager.state.currentJudgeLineNumber].isCover"
            :active-value="1"
            :inactive-value="0"
        >
            隐藏在此判定线下方的note
        </MySwitch>
        <MyInputNumber
            v-model="chart.judgeLineList[stateManager.state.currentJudgeLineNumber].zOrder"
            :step="1"
        >
            <template #prepend>
                显示层号
            </template>
        </MyInputNumber>
        <MySelect
            v-model="chart.judgeLineList[stateManager.state.currentJudgeLineNumber].Texture"
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
import { ElButtonGroup, ElButton } from 'element-plus';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySelect from '../myElements/MySelect.vue';
import MySwitch from '../myElements/MySwitch.vue';
import store from '@/store';
import globalEventEmitter from '@/eventEmitter';
const props = defineProps<{
    titleTeleport: string
}>();
const chartPackage = store.useChartPackage();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
</script>
<style scoped>
.judgeline-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>