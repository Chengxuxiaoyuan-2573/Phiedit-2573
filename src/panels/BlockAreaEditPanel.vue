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
                当前噪域编号：{{ blockArea?.index ?? "无" }}
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
                :model-value="blockArea.Name"
                @update:model-value="value => editArea('Name', value)"
            >
                <template #prepend>
                    噪域名称
                </template>
            </MyInput>
            <MyInputBeats
                ref="appearTimeInput"
                :model-value="blockArea.appearTime"
                @update:model-value="value => editArea('appearTime', value)"
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
                :model-value="blockArea.disappearTime"
                @update:model-value="value => editArea('disappearTime', value)"
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
                :model-value="blockArea.editorPositionX"
                @update:model-value="value => editArea('editorPositionX', value)"
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
                :model-value="blockArea.isInvert"
                @update:model-value="value => editArea('isInvert', value)"
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
import { ElButtonGroup, ElMessage, ElMessageBox, ElTooltip } from "element-plus";
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { isEqual } from "lodash";
import MyButton from "@/myElements/MyButton.vue";
import MyInput from "@/myElements/MyInput.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputVector from "@/myElements/MyInputVector.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MySwitch from "@/myElements/MySwitch.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { beatsCompare } from "@/models/rpe/beats";
import { IBlockArea } from "@/models/rpe/blockArea";
import { BlockAreaEditableAttribute } from "@/managers/renderer/history";
import globalEventEmitter, { HistoryType } from "@/eventEmitter";
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

    selectionManager.deleteSelection([blockArea.value]);
    if (stateManager.currentBlockArea) {
        stateManager.selectBlockArea(stateManager.state.currentBlockAreaNumber);
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

function onHistoryUpdate(type: HistoryType) {
    if (type === "UNDO" || type === "REDO") {
        update();
    }
}
onMounted(() => globalEventEmitter.on("HISTORY_UPDATE", onHistoryUpdate));
onBeforeUnmount(() => globalEventEmitter.off("HISTORY_UPDATE", onHistoryUpdate));

function editArea<K extends BlockAreaEditableAttribute>(key: K, value: IBlockArea[K] | undefined) {
    const area = blockArea.value;
    if (!area || value === undefined || isEqual(area[key], value)) {
        return;
    }

    const next = { appearTime: area.appearTime, disappearTime: area.disappearTime, [key]: value };
    if (beatsCompare(next.appearTime, next.disappearTime) > 0 && (key === "appearTime" || key === "disappearTime")) {
        update();
        ElMessage.error("噪域的出现时间不能晚于消失时间");
        return;
    }

    store.useManager("mouseManager").checkMouseUp();
    const previous = area[key];
    area[key] = value;
    historyManager.recordModifyBlockArea(area.index, key, area[key], previous);
}

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

    if (!Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
        return;
    }
    editArea(key, { x: value[0], y: value[1] });
}

/** 输入编号切换当前编辑的噪域 */
const changeBlockAreaNumber = createCatchErrorByMessage(async () => {
    const { value } = await ElMessageBox.prompt("请输入要切换的噪域编号", "切换噪域");
    const num = parseInt(value);
    if (isNaN(num)) {
        throw new Error("请输入数字");
    }

    const position = store.useChart().blockAreaList.findIndex(area => area.index === num);
    if (position === -1) {
        throw new Error(`噪域编号不存在：${num}`);
    }
    stateManager.selectBlockArea(position);
}, "切换噪域");
</script>
