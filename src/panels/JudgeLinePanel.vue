<template>
    <div 
        v-if="u || !u"
        class="judgeline-panel"
    >
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
            判定线遮罩
            <MyQuestionMark>
                如果开启，则由于速度事件值为负数而产生的位于判定线下方的音符将不会显示。<br>
                例如：使用负数速度事件做出谱面倒退的效果时，<br>
                如果开启了遮罩，则音符会在退出判定线时才显示。<br>
                如果关闭遮罩，则音符在判定线下方时就会显示。<br>
                默认值为开启。建议别动这个选项。
            </MyQuestionMark>
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
        <ElButton
            type="danger"
            @click="confirm(handleDeleteJudgeLine, '删除判定线'), update()"
        >
            删除当前判定线
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { ElButtonGroup, ElButton } from 'element-plus';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySelect from '../myElements/MySelect.vue';
import MySwitch from '../myElements/MySwitch.vue';
import store from '@/store';
import globalEventEmitter from '@/eventEmitter';
import MyQuestionMark from '@/myElements/MyQuestionMark.vue';
import { confirm } from '@/tools/catchError';
import { ref } from 'vue';
const props = defineProps<{
    titleTeleport: string
}>();
const chartPackage = store.useChartPackage();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
const u = ref(false);
function update(){
    u.value = !u.value;
}
function handleDeleteJudgeLine() {
    const currentLine = stateManager.state.currentJudgeLineNumber;
    if (stateManager.judgeLinesCount <= 1) {
        throw new Error("无法删除最后一条判定线");
    }
    chart.deleteJudgeLine(stateManager.state.currentJudgeLineNumber);
    if (currentLine >= stateManager.judgeLinesCount) {
        stateManager.state.currentJudgeLineNumber = stateManager.judgeLinesCount - 1;
    }
}
</script>
<style scoped>
.judgeline-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>