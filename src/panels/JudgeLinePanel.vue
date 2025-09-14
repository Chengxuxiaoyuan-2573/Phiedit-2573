<template>
    <div class="judgeline-panel right-inner">
        <Teleport :to="props.titleTeleport">
            判定线编辑
        </Teleport>
        <ElButtonGroup>
            <ElTooltip placement="top">
                <MyButton
                    :disabled="stateManager.state.currentJudgeLineNumber <= 0"
                    @click="globalEventEmitter.emit('PREVIOUS_JUDGE_LINE')"
                >
                    -
                </MyButton>
                <template #content>
                    切换到上一条判定线<br>
                    快捷键：A 或 左方括号[<br>
                </template>
            </ElTooltip>
            <MyButton
                style="flex: 1"
                @click="globalEventEmitter.emit('CHANGE_JUDGE_LINE')"
            >
                当前判定线编号：{{ stateManager.state.currentJudgeLineNumber }}
            </MyButton>
            <ElTooltip placement="top">
                <MyButton
                    :disabled="stateManager.state.currentJudgeLineNumber >= stateManager.judgeLinesCount - 1"
                    @click="globalEventEmitter.emit('NEXT_JUDGE_LINE')"
                >
                    +
                </MyButton>
                <template #content>
                    切换到下一条判定线<br>
                    快捷键：D 或 右方括号]<br>
                </template>
            </ElTooltip>
        </ElButtonGroup>
        <MyInput
            ref="nameInput"
            v-model="judgeLine.Name"
        >
            <template #prepend>
                判定线名称
            </template>
        </MyInput>
        <MyInputNumber
            ref="fatherInput"
            v-model="judgeLine.father"
            :min="-1"
            :max="chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                父线号
                <MyQuestionMark>
                    -1表示没有父线。如果设置为非负整数，表示把对应编号的判定线设为该判定线的父线。<br>
                    有父线的判定线上的所有移动事件都将以父线为坐标系，而非屏幕坐标系。<br>
                    你可以使用父线方便地做出多条判定线一起运动的效果，不用分别控制每一条判定线。<br>
                    父线不会继承角度、透明度、速度等其他事件。<br>
                    可以有多重父子线，会递归计算每条线的坐标。<br>
                </MyQuestionMark>
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="zOrderInput"
            v-model="judgeLine.zOrder"
            :step="1"
        >
            <template #prepend>
                显示层号
                <MyQuestionMark>
                    显示层号，数字越大，越靠前。<br>
                    层号一样的，判定线编号越大，越靠前。<br>
                    默认值为0。必须是整数。<br>
                </MyQuestionMark>
            </template>
        </MyInputNumber>
        <MySelect
            ref="textureSelect"
            v-model="judgeLine.Texture"
            :options="[
                {
                    label: '无贴图',
                    value: 'line.png',
                    text: '无贴图'
                },
                ...Object.keys(chartPackage.textures)
            ]"
        >
            判定线贴图
            <MyQuestionMark>
                如果有贴图，则判定线将不会显示，取而代之的是一张图片。<br>
                判定线贴图和UI绑定不能同时存在。<br>
                你可以点击界面左侧的“添加判定线贴图”按钮，将一张图片添加为判定线贴图。<br>
            </MyQuestionMark>
        </MySelect>
        <MyInputCoordinate
            ref="anchorInput"
            v-model="judgeLine.anchor"
        >
            <template #prepend>
                判定线锚点
                <MyQuestionMark>
                    默认为 (0.5, 0.5)，表示锚点在中间位置。<br>
                    如果设为 (0, 0)，表示锚点在左上角。<br>
                    如果设为 (1, 1)，表示锚点在右下角。<br>
                </MyQuestionMark>
            </template>
        </MyInputCoordinate>
        <MySelect
            ref="UISelect"
            v-model="judgeLine.attachUI"
            class="ui-select"
            :options="uiOptions"
        >
            UI绑定
            <MyQuestionMark>
                如果绑定了UI，则判定线将不会显示，取而代之的是对应的UI。<br>
                绑定UI后，UI实际上显示的位置会是<em>原坐标加上判定线的坐标</em>。<br>
                你可以通过微调的方式让UI显示在你想要的位置。<br>
                由于篇幅限制，UI的原坐标不能在这里显示，请自行查看源代码中的 src/constants.ts。<br>
            </MyQuestionMark>
        </MySelect>
        <MySwitch
            ref="isCoverInput"
            v-model="judgeLine.isCover"
            :active-value="JudgeLineCover.Cover"
            :inactive-value="JudgeLineCover.Uncover"
        >
            判定线遮罩
            <MyQuestionMark>
                如果开启，则位于该判定线反面的正向音符和正面的反向音符将会被隐藏。<br>
                如果你想了解这个属性的具体逻辑，你可以自己试一试，调整该属性，<br>
                在音符前放置负数速度事件，观察音符是否隐藏。<br>
            </MyQuestionMark>
        </MySwitch>

        <MyButton
            v-if="judgeLine.isUseful"
            type="danger"
            @click="confirm(handleDeleteJudgeLine, '确定删除当前判定线？（该操作不可逆）', '删除判定线'), update()"
        >
            删除当前判定线
        </MyButton>
        <MyButton
            v-else
            type="warning"
            @click="handleDeleteJudgeLine(), update()"
        >
            删除当前判定线
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import { ElButtonGroup, ElTooltip } from "element-plus";
import MyButton from "@/myElements/MyButton.vue";
import MyInputNumber from "../myElements/MyInputNumber.vue";
import MySelect from "../myElements/MySelect.vue";
import MySwitch from "../myElements/MySwitch.vue";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import { confirm } from "@/tools/catchError";
import { computed, useTemplateRef } from "vue";
import { JudgeLineCover } from "@/models/judgeLine";
import MyInput from "@/myElements/MyInput.vue";
import { watch } from "vue";
import MyInputCoordinate from "@/myElements/MyInputCoordinate.vue";
const props = defineProps<{
    titleTeleport: string
}>();
const chartPackage = store.useChartPackage();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
const judgeLine = computed(() => {
    return chart.judgeLineList[stateManager.state.currentJudgeLineNumber];
});
const nameInput = useTemplateRef("nameInput");
const fatherInput = useTemplateRef("fatherInput");
const isCoverInput = useTemplateRef("isCoverInput");
const zOrderInput = useTemplateRef("zOrderInput");
const textureSelect = useTemplateRef("textureSelect");
const UISelect = useTemplateRef("UISelect");
const anchorInput = useTemplateRef("anchorInput");
function update() {
    nameInput.value?.updateShowedValue();
    fatherInput.value?.updateShowedValue();
    isCoverInput.value?.updateShowedValue();
    zOrderInput.value?.updateShowedValue();
    textureSelect.value?.updateShowedValue();
    UISelect.value?.updateShowedValue();
    anchorInput.value?.updateShowedValue();
}
watch(() => stateManager.state.currentJudgeLineNumber, update);
const uiOptions = [
    {
        label: "不绑定",
        value: "none",
        text: "不绑定",
    },
    {
        label: "连击数",
        value: "combonumber",
        text: "连击数",
    },
    {
        label: "COMBO字样",
        value: "combo",
        text: "COMBO字样",
    },
    {
        label: "分数",
        value: "score",
        text: "分数",
    },
    {
        label: "曲名",
        value: "name",
        text: "曲名",
    },
    {
        label: "难度",
        value: "level",
        text: "难度",
    },
    {
        label: "暂停键",
        value: "pause",
        text: "暂停键",
    },
    {
        label: "进度条",
        value: "bar",
        text: "进度条",
    }
] as const;
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