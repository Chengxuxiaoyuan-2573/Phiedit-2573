<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="active-interval-panel left-inner">
        <Teleport :to="props.titleTeleport">
            激活区间编辑
        </Teleport>
        <template v-if="props.modelValue">
            <MyInputBeats
                ref="startTimeInput"
                :model-value="props.modelValue.startTime"
                @update:model-value="(value) => setTime('startTime', value)"
            >
                <template #prepend>
                    激活时间
                    <MyQuestionMark>
                        噪域从第几拍开始激活。<br>
                    </MyQuestionMark>
                </template>
            </MyInputBeats>
            <MyInputBeats
                ref="endTimeInput"
                :model-value="props.modelValue.endTime"
                @update:model-value="(value) => setTime('endTime', value)"
            >
                <template #prepend>
                    取消激活时间
                    <MyQuestionMark>
                        噪域到第几拍取消激活。<br>
                    </MyQuestionMark>
                </template>
            </MyInputBeats>
            <MyInputNumber
                ref="readyFlashInput"
                :model-value="props.modelValue.readyFlash"
                :min="0"
                :step="0.1"
                @update:model-value="(value) => setReadyFlash(value)"
            >
                <template #prepend>
                    反应时间
                    <MyQuestionMark>
                        噪域被激活之前，提前多久开始闪烁提示，单位为秒。<br>
                    </MyQuestionMark>
                </template>
                <template #append>
                    秒
                </template>
            </MyInputNumber>
            <MyButton
                type="danger"
                @click="deleteInterval()"
            >
                删除此激活区间
            </MyButton>
        </template>
        <p v-else>
            没有选中激活区间
        </p>
    </div>
</template>
<script setup lang="ts">
import { useTemplateRef, watch } from "vue";
import MyButton from "@/myElements/MyButton.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import { ActiveInterval } from "@/models/rpe/blockArea";
import { Beats } from "@/models/rpe/beats";
import store from "@/store";

const props = defineProps<{

    /** 正在编辑的激活区间 */
    modelValue: ActiveInterval | null

    titleTeleport: string
}>();
const selectionManager = store.useManager("selectionManager");

const startTimeInput = useTemplateRef("startTimeInput");
const endTimeInput = useTemplateRef("endTimeInput");
const readyFlashInput = useTemplateRef("readyFlashInput");

/** 重新显示各个输入框中的值，切换激活区间后调用 */
function update() {
    startTimeInput.value?.updateShowedValue();
    endTimeInput.value?.updateShowedValue();
    readyFlashInput.value?.updateShowedValue();
}
watch(() => props.modelValue, update);

/** 修改激活区间的起止时间 */
function setTime(attribute: "startTime" | "endTime", value?: Beats) {
    const interval = props.modelValue;
    if (!interval || value === undefined) {
        return;
    }
    interval[attribute] = value;
    interval.makeSureTimeValid();
}

/** 修改激活区间的反应时间 */
function setReadyFlash(value?: number) {
    const interval = props.modelValue;
    if (!interval || value === undefined) {
        return;
    }
    interval.readyFlash = value;
}

/** 删除当前激活区间 */
function deleteInterval() {
    if (!props.modelValue) {
        throw new Error("没有选中激活区间");
    }

    // 激活区间是可选中的元素，删除它等同于删除选中的元素（会写入历史记录）
    selectionManager.select([props.modelValue]);
    selectionManager.deleteSelection();
}
</script>
