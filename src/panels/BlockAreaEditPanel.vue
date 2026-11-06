<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="block-area-panel left-inner">
        <Teleport :to="props.titleTeleport">
            噪域编辑
        </Teleport>
        <ElButtonGroup>
            <ElTooltip placement="top">
                <MyButton
                    :disabled="stateManager.state.currentBlockAreaNumber <= 0"
                    @click="switchBlockArea(-1)"
                >
                    -
                </MyButton>
                <template #content>
                    切换到上一个噪域
                </template>
            </ElTooltip>
            <MyButton
                style="flex: 1"
                @click="changeBlockAreaNumber()"
            >
                当前噪域编号：{{ stateManager.state.currentBlockAreaNumber }}
            </MyButton>
            <ElTooltip placement="top">
                <MyButton
                    :disabled="stateManager.state.currentBlockAreaNumber >= stateManager.blockAreasCount - 1"
                    @click="switchBlockArea(1)"
                >
                    +
                </MyButton>
                <template #content>
                    切换到下一个噪域
                </template>
            </ElTooltip>
        </ElButtonGroup>
        <template v-if="blockArea">
            <MyInput
                ref="nameInput"
                v-model="blockArea.Name"
            >
                <template #prepend>
                    噪域名称
                </template>
            </MyInput>
            <MyInputBeats
                ref="appearTimeInput"
                v-model="blockArea.appearTime"
            >
                <template #prepend>
                    出现时间
                    <MyQuestionMark>
                        噪域从第几拍开始出现。<br>
                        出现在编辑器中时，噪域方块从这个时间开始向下显示。<br>
                    </MyQuestionMark>
                </template>
            </MyInputBeats>
            <MyInputBeats
                ref="disappearTimeInput"
                v-model="blockArea.disappearTime"
            >
                <template #prepend>
                    消失时间
                    <MyQuestionMark>
                        噪域到第几拍消失。<br>
                        消失时间应该不早于出现时间。<br>
                    </MyQuestionMark>
                </template>
            </MyInputBeats>
            <MyInputVector
                ref="bottomLeftInput"
                :model-value="pointOf('bottomLeft')"
                @update:model-value="(value) => setPoint('bottomLeft', value)"
            >
                <template #prepend>
                    左下角坐标
                    <MyQuestionMark>
                        噪域矩形的左下角在屏幕坐标系中的坐标，两个数字用逗号或空格隔开。<br>
                        屏幕可以显示的X、Y坐标范围分别为[-675, 675]和[-450, 450]。<br>
                    </MyQuestionMark>
                </template>
            </MyInputVector>
            <MyInputVector
                ref="topRightInput"
                :model-value="pointOf('topRight')"
                @update:model-value="(value) => setPoint('topRight', value)"
            >
                <template #prepend>
                    右上角坐标
                    <MyQuestionMark>
                        噪域矩形的右上角在屏幕坐标系中的坐标，两个数字用逗号或空格隔开。<br>
                    </MyQuestionMark>
                </template>
            </MyInputVector>
            <MyInputNumber
                ref="editorPositionXInput"
                v-model="blockArea.editorPositionX"
            >
                <template #prepend>
                    编辑器中的X坐标
                    <MyQuestionMark>
                        只影响噪域方块在噪域编辑区中显示的位置，不影响谱面实际显示的效果。<br>
                    </MyQuestionMark>
                </template>
            </MyInputNumber>
            <MySwitch
                ref="isInvertInput"
                v-model="blockArea.isInvert"
            >
                反转
                <MyQuestionMark>
                    如果开启，噪域与其他噪域叠加时，相交的部分会变为没有噪域。<br>
                </MyQuestionMark>
            </MySwitch>
            <MyButton
                type="danger"
                @click="deleteBlockArea()"
            >
                删除此噪域
            </MyButton>
        </template>
        <p v-else>
            当前谱面没有噪域
        </p>
    </div>
</template>
<script setup lang="ts">
import { ElButtonGroup, ElMessageBox, ElTooltip } from "element-plus";
import { computed, useTemplateRef, watch } from "vue";
import MyButton from "@/myElements/MyButton.vue";
import MyInput from "@/myElements/MyInput.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputVector from "@/myElements/MyInputVector.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MySwitch from "@/myElements/MySwitch.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import { createCatchErrorByMessage } from "@/tools/catchError";
import store from "@/store";

const props = defineProps<{
    titleTeleport: string
}>();
const stateManager = store.useManager("stateManager");
const selectionManager = store.useManager("selectionManager");
const historyManager = store.useManager("historyManager");
const blockArea = computed(() => stateManager.currentBlockArea);

const nameInput = useTemplateRef("nameInput");
const appearTimeInput = useTemplateRef("appearTimeInput");
const disappearTimeInput = useTemplateRef("disappearTimeInput");
const bottomLeftInput = useTemplateRef("bottomLeftInput");
const topRightInput = useTemplateRef("topRightInput");
const editorPositionXInput = useTemplateRef("editorPositionXInput");
const isInvertInput = useTemplateRef("isInvertInput");

/** 切换当前编辑的噪域 */
function switchBlockArea(delta: number) {
    stateManager.selectBlockArea(stateManager.state.currentBlockAreaNumber + delta);
}

/** 删除当前编辑的噪域 */
function deleteBlockArea() {
    if (!blockArea.value) {
        throw new Error("当前谱面没有噪域");
    }

    const chart = store.useChart();
    const position = chart.blockAreaList.indexOf(blockArea.value);
    if (position === -1) {
        throw new Error(`噪域“${blockArea.value.Name}”不在噪域列表中`);
    }

    const blockAreaObject = blockArea.value.toObject();
    const blockAreaIndex = blockArea.value.index;

    historyManager.group("删除噪域");
    try {
        store.removeBlockArea(blockArea.value);
        historyManager.recordRemoveBlockArea(blockAreaObject, blockAreaIndex, position);
        stateManager.notifyBlockAreaListChanged({ removedPosition: position });

        // 删除后立即切换到相邻噪域；最后一个噪域被删除时清空选择
        if (chart.blockAreaList.length > 0) {
            stateManager.selectBlockArea(Math.min(position, chart.blockAreaList.length - 1));
        }
        else {
            selectionManager.unselectAll();
        }
    }
    finally {
        historyManager.ungroup();
    }
}

/** 重新显示各个输入框中的值，切换噪域后调用 */
function update() {
    nameInput.value?.updateShowedValue();
    appearTimeInput.value?.updateShowedValue();
    disappearTimeInput.value?.updateShowedValue();
    bottomLeftInput.value?.updateShowedValue();
    topRightInput.value?.updateShowedValue();
    editorPositionXInput.value?.updateShowedValue();
    isInvertInput.value?.updateShowedValue();
}
watch(() => [stateManager.state.currentBlockAreaNumber, stateManager.state.blockAreaListVersion], update);

/** 取噪域某个点的坐标，作为坐标输入框的值 */
function pointOf(key: "bottomLeft" | "topRight") {
    const area = blockArea.value;
    if (!area) {
        return [0, 0];
    }
    return [area[key].x, area[key].y];
}

/** 把坐标输入框的值写回噪域 */
function setPoint(key: "bottomLeft" | "topRight", value?: number[]) {
    const area = blockArea.value;
    if (!area || !Array.isArray(value) || value.length < 2) {
        return;
    }

    if (isNaN(value[0]) || isNaN(value[1])) {
        return;
    }
    area[key] = { x: value[0], y: value[1] };
}

/** 输入编号切换当前编辑的噪域 */
const changeBlockAreaNumber = createCatchErrorByMessage(async () => {
    const { value } = await ElMessageBox.prompt("请输入要切换的噪域编号", "切换噪域");
    const num = parseInt(value);
    if (isNaN(num)) {
        throw new Error("请输入数字");
    }

    if (num < 0 || num >= stateManager.blockAreasCount) {
        throw new Error(`噪域编号超出0~${stateManager.blockAreasCount - 1}的范围：${num}`);
    }
    stateManager.selectBlockArea(num);
}, "切换噪域");
</script>
