<template>
    <div
        v-if="u || !u"
        class="BPMListEditor"
    >
        <ElRow
            v-for="(bpm, i) of model"
            :key="i"
        >
            <MyInput
                v-model="bpm.startString"
                v-model:when="bpm.startTime"
            />
            <MyInputNumber v-model="bpm.bpm" />
            <ElButton
                :disabled="model.length == 1"
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
import MyInput from './MyInput.vue';
import MyInputNumber from './MyInputNumber.vue';
import { onBeforeUnmount, ref } from 'vue';
const model = defineModel<BPM[]>({
    required: true
})
const u = ref(false);
// 比较函数，根据 startTime 属性进行比较
function compareBPM(a: BPM, b: BPM): number {
    return getBeatsValue(a.startTime) - getBeatsValue(b.startTime);
}
// 修改后的 addBPM 函数
function addBPM() {
    const newBPM = model.value.length > 0 ? new BPM(model.value[model.value.length - 1].toObject()) : new BPM(null);
    model.value.push(newBPM);
    update();
}
function deleteBPM(index:number){
    model.value.splice(index, 1);
    update();
}
function update() {
    u.value = !u.value;
}
onBeforeUnmount(() => {
    model.value.sort(compareBPM);
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