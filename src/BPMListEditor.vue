<template>
    <div
        v-if="u || !u"
        class="BPMListEditor"
    >
        <ElRow
            v-for="(bpm, i) of editor.chart.BPMList"
            :key="i"
        >
            <MyInput
                v-model="bpm.startString"
                v-model:when="bpm.startTime"
                @input="editor.chart.calculateSeconds()"
            />
            <MyInputNumber
                v-model="bpm.bpm"
                @input="editor.chart.calculateSeconds()"
            />
            <ElButton
                :disabled="editor.chart.BPMList.length == 1"
                type="danger"
                @click="deleteBPM(i)"
            >
                删除
            </ElButton>
        </ElRow>
        <ElButton
            type="success"
            @click="addBPM"
        >
            添加
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { ElButton, ElRow } from 'element-plus';
import { BPM, getBeatsValue } from './classes/beats';
import MyInput from './myElements/MyInput.vue';
import MyInputNumber from './myElements/MyInputNumber.vue';
import { inject, onBeforeUnmount, ref } from 'vue';
import { Editor } from './classes/editor';
const editor = inject('editor') as Editor;

const u = ref(false);
// 比较函数，根据 startTime 属性进行比较
function compareBPM(a: BPM, b: BPM): number {
    return getBeatsValue(a.startTime) - getBeatsValue(b.startTime);
}
// 修改后的 addBPM 函数
function addBPM() {
    const newBPM = editor.chart.BPMList.length > 0 ? new BPM(editor.chart.BPMList[editor.chart.BPMList.length - 1].toObject()) : new BPM(null);
    editor.chart.BPMList.push(newBPM);
    update();
    editor.chart.calculateSeconds();
}
function deleteBPM(index: number) {
    editor.chart.BPMList.splice(index, 1);
    update();
    editor.chart.calculateSeconds();
}
function update() {
    u.value = !u.value;
}

onBeforeUnmount(() => {
    editor.chart.BPMList.sort(compareBPM);
    editor.chart.calculateSeconds();
})
</script>
<style scoped>
.BPMListEditor {
    display: flex;
    flex-direction: column;
}

.el-row {
    display: flex;
    flex-wrap: nowrap;
}
</style>