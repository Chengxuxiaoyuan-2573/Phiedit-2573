<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <!-- 这里变量u的作用是触发vue的响应式系统，使得当u的值发生变化时，会重新渲染组件 -->
    <div
        v-if="u || !u"
        class="bpmlist-panel right-inner"
    >
        <Teleport :to="props.titleTeleport">
            BPM编辑
        </Teleport>
        <ElRow>
            <h3>
                时间
            </h3>
            <h3>
                BPM
            </h3>
        </ElRow>
        <ElRow
            v-for="(bpm, i) of chart.BPMList"
            :key="i"
        >
            <MyInputBeats
                v-model="bpm.startTime"
                @input="chart.calculateSeconds()"
                @change="sortBPMList()"
            />
            <MyInputNumber
                v-model="bpm.bpm"
                :min="0.01"
                @input="chart.calculateSeconds()"
            />
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
        <p class="extra-description">
            请填写音乐的 BPM。如果音乐的 BPM 会变化，请添加多个 BPM。如果你不知道 BPM，请查找歌曲相关信息，也可以使用在线测 BPM 的工具。
        </p>
    </div>
</template>
<script setup lang="ts">
import { ElRow } from "element-plus";
import { beatsCompare, BPM } from "../models/rpe/beats";
import MyButton from "@/myElements/MyButton.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "../myElements/MyInputNumber.vue";
import { onBeforeUnmount, ref } from "vue";
import store from "@/store";

const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
const chart = store.useChart();

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

/** 手动触发状态更新  */
function update() {
    u.value = !u.value;
}

function sortBPMList() {
    chart.BPMList.sort((a, b) => beatsCompare(a.startTime, b.startTime));
    update();
}

onBeforeUnmount(() => {
    sortBPMList();
    chart.calculateSeconds();
});
</script>
<style scoped>
.el-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr;
    grid-template-rows: 1fr;
    gap: 10px;
}
</style>