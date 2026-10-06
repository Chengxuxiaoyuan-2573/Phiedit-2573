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
        <em style="font-size: 0.8em;">
            提示：大多数音乐的BPM都是一定的，因此只需填写一个BPM，不需要添加多个BPM。<br>
            如果你的音乐含有变速，请添加多个BPM，并输入BPM变化的时间和变化后的BPM。<br>
            如果你不知道BPM，可以使用在线测BPM的工具。
        </em>
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
                @change="onBpmChange(bpm, $event)"
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
    </div>
    <ElDialog
        v-model="dialog.visible"
        title="更改 BPM 后音符位置"
        width="440px"
        :close-on-click-modal="false"
        append-to-body
    >
        <div class="bpm-dialog-body">
            <p class="bpm-dialog-tip">
                更改区域 BPM 后，已放置的音符要如何摆放？
            </p>
            <ElRadioGroup
                v-model="dialog.mode"
                class="bpm-dialog-radios"
            >
                <ElRadio value="relative">
                    <span class="bpm-dialog-option">保持相对位置（当前情况）</span>
                    <span class="bpm-dialog-hint">音符保留原有拍数，BPM 改变后落在新的格点上</span>
                </ElRadio>
                <ElRadio value="absolute">
                    <span class="bpm-dialog-option">保持绝对位置</span>
                    <span class="bpm-dialog-hint">音符保留相对于 0:00 的绝对时间，可能导致音符偏离格点</span>
                </ElRadio>
            </ElRadioGroup>
            <ElCheckbox
                v-model="dialog.remember"
                class="bpm-dialog-remember"
            >
                记住我的决定（本铺面内有效）
            </ElCheckbox>
        </div>
        <template #footer>
            <MyButton @click="cancelBpmDialog">
                取消
            </MyButton>
            <MyButton
                type="primary"
                @click="confirmBpmDialog"
            >
                确定
            </MyButton>
        </template>
    </ElDialog>
</template>
<script setup lang="ts">
import { ElCheckbox, ElDialog, ElRadio, ElRadioGroup, ElRow } from "element-plus";
import { beatsCompare, beatsToSeconds, BPM, secondsToBeats, toBeats } from "../models/beats";
import MyButton from "@/myElements/MyButton.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "../myElements/MyInputNumber.vue";
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import store from "@/store";

const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
const chart = store.useChart();

/** 记住每段 BPM 上一次提交的 bpm 值，用于重建改动前的 BPMList 以计算绝对位置 */
const lastCommittedBpm = new WeakMap<BPM, number>();

/** 待用户确认的一次 BPM 改动 */
const pending = ref<{
    bpm: BPM;
    oldVal: number;
    newVal: number;
    index: number;
} | null>(null);

/** 弹框状态 */
const dialog = reactive({
    visible: false,
    mode: "relative" as "relative" | "absolute",
    remember: false,
});

/** 把当前所有段位的 bpm 值记录为「上一次提交值」基线 */
function seedBpmMemory() {
    const c = store.useChart();
    for (const b of c.BPMList) {
        lastCommittedBpm.set(b, b.bpm);
    }
}

onMounted(seedBpmMemory);

// 铺面（chart 实例）切换时重新建立基线
watch(() => store.useChart(), seedBpmMemory);

/** 用户提交某段 BPM 的 bpm 值时触发 */
function onBpmChange(bpm: BPM, newVal: number) {
    const c = store.useChart();
    const oldVal = lastCommittedBpm.get(bpm) ?? newVal;
    lastCommittedBpm.set(bpm, newVal);
    const index = c.BPMList.indexOf(bpm);

    // 若已记住决定，直接套用，不再询问
    if (c.bpmRepositionMode === "relative" || c.bpmRepositionMode === "absolute") {
        applyBpmMode(c.bpmRepositionMode, oldVal, index);
        return;
    }

    pending.value = { bpm, oldVal, newVal, index };
    dialog.mode = "relative";
    dialog.remember = false;
    dialog.visible = true;
}

/**
 * 应用一次 BPM 改动后的音符重定位方式
 * @param mode relative 保持相对位置（当前默认）；absolute 保持绝对时间（可能偏离格点）
 * @param oldVal 改动前该段的 bpm 值
 * @param index 该段在 BPMList 中的下标
 */
function applyBpmMode(mode: "relative" | "absolute", oldVal: number, index: number) {
    const c = store.useChart();
    if (mode === "relative") {
        // 相对位置为当前默认行为（@input 已按新 BPM 重算秒数），无需额外处理
        c.calculateSeconds();
        return;
    }

    // 绝对位置：保持每个音符相对于 0:00 的绝对时间不变
    // 用改动前的 bpm 重建该段的 BPMList，反算每个音符当前的绝对秒数
    const oldBPMList = c.BPMList.map((b, i) =>
        new BPM(i === index ? { bpm: oldVal, startTime: b.startTime } : { bpm: b.bpm, startTime: b.startTime }));
    const newBPMList = c.BPMList;
    for (const note of c.getAllNotes()) {
        const startSeconds = beatsToSeconds(oldBPMList, note.startTime);
        note._startTime = toBeats(secondsToBeats(newBPMList, startSeconds));
        const endSeconds = beatsToSeconds(oldBPMList, note.endTime);
        note._endTime = toBeats(secondsToBeats(newBPMList, endSeconds));
    }
    c.calculateSeconds();
}

/** 弹框确定：按选择应用，若勾选记住则写入 chart.bpmRepositionMode */
function confirmBpmDialog() {
    if (dialog.remember) {
        store.useChart().bpmRepositionMode = dialog.mode;
    }

    const p = pending.value;
    if (p) {
        applyBpmMode(dialog.mode, p.oldVal, p.index);
    }
    dialog.visible = false;
}

/** 弹框取消：保持当前（相对）结果，不记住 */
function cancelBpmDialog() {
    dialog.visible = false;
}

function addBPM() {
    const newBPM = new BPM(chart.BPMList.length > 0 ? chart.BPMList[chart.BPMList.length - 1].toObject() : null);
    chart.BPMList.push(newBPM);
    lastCommittedBpm.set(newBPM, newBPM.bpm);
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
.bpm-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.bpm-dialog-tip {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
}
.bpm-dialog-radios {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.bpm-dialog-radios :deep(.el-radio) {
    height: auto;
    align-items: flex-start;
    margin-right: 0;
    white-space: normal;
}
.bpm-dialog-option {
    font-size: 14px;
    font-weight: 600;
}
.bpm-dialog-hint {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 400;
    color: #909399;
    line-height: 1.4;
}
.bpm-dialog-remember {
    margin-top: 4px;
}
</style>