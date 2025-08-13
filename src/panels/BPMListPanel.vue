<template>
    <!-- 这里变量u的作用是触发vue的响应式系统，使得当u的值发生变化时，会重新渲染组件 -->
    <div
        v-if="u || !u"
        class="bpmlist-panel"
    >
        <Teleport :to="props.titleTeleport">
            BPM编辑
        </Teleport>
        <ElRow
            v-for="(bpm, i) of chart.BPMList"
            :key="i"
        >
            <MyInputBeats
                v-model="bpm.startTime"
                @input="chart.calculateSeconds()"
            >
                <template #prefix>
                    时间
                </template>
            </MyInputBeats>
            <MyInputNumber
                v-model="bpm.bpm"
                :min="0.01"
                @input="chart.calculateSeconds()"
            >
                <template #prefix>
                    BPM
                </template>
            </MyInputNumber>
            <MyButton
                :disabled="chart.BPMList.length == 1"
                type="danger"
                @click="deleteBPM(i)"
            >
                删除
            </MyButton>
        </ElRow>
        <MyButton
            type="success"
            @click="addBPM"
        >
            添加
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import { ElRow } from 'element-plus';
import { BPM, getBeatsValue } from '../models/beats';
import MyButton from '@/myElements/MyButton.vue';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import { onBeforeUnmount, ref } from 'vue';
import store from "@/store";

const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
const chart = store.useChart();
// 比较函数，根据 startTime 属性进行比较
function compareBPM(a: BPM, b: BPM): number {
    return getBeatsValue(a.startTime) - getBeatsValue(b.startTime);
}
// 修改后的 addBPM 函数
function addBPM() {
    const newBPM = new BPM(chart.BPMList.length > 0 ? chart.BPMList[chart.BPMList.length - 1].toObject() : null);
    chart.BPMList.push(newBPM);
    update();
    chart.calculateSeconds();
}
function deleteBPM(index: number) {
    chart.BPMList.splice(index, 1);
    update();
    chart.calculateSeconds();
}
/**
 * 手动触发状态更新
 */
function update() {
    u.value = !u.value;
}

onBeforeUnmount(() => {
    chart.BPMList.sort(compareBPM);
    chart.calculateSeconds();
})
</script>
<style scoped>
.bpmlist-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.el-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 10px;
}
</style>