<template>
    <div class="judgeline-panel">
        <Teleport :to="props.titleTeleport">
            判定线编辑
        </Teleport>
        <ElButtonGroup>
            <MyButton
                :disabled="stateManager.state.currentJudgeLineNumber <= 0"
                @click="globalEventEmitter.emit('PREVIOUS_JUDGE_LINE'), update()"
            >
                -
            </MyButton>
            <MyButton style="flex: 1">
                当前判定线编号：{{ stateManager.state.currentJudgeLineNumber }}
            </MyButton>
            <MyButton
                :disabled="stateManager.state.currentJudgeLineNumber >= stateManager.judgeLinesCount - 1"
                @click="globalEventEmitter.emit('NEXT_JUDGE_LINE'), update()"
            >
                +
            </MyButton>
        </ElButtonGroup>
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
                    默认值为-1，表示没有父线。<br>
                    如果设置为非负整数，表示把对应编号的判定线设为该判定线的父线。<br>
                    有父线的判定线上的所有移动事件都将以父线为坐标系，而非屏幕坐标系。<br>
                    例如：<br>
                    0号线在（200，0）处，角度为30度。<br>
                    1号线的父线为0，坐标为（-100，100），则1号线实际会在<br>
                    从（200，0）向左偏上30度方向移动100px，再向上偏右30度方向移动100px的位置。<br>
                    父线不会继承角度、透明度、速度等其他事件。<br>
                    可以有多重父子线，例如，0号线是1号线的父线，1号线是2号线的父线，<br>
                    则会先计算0号线的坐标，再根据0号线的坐标计算1号线的坐标，再根据1号线的坐标计算2号线的坐标。<br>
                    <em>但是，截至目前，Phira 仍未支持多重父子线，请谨慎使用。</em>
                </MyQuestionMark>
            </template>
        </MyInputNumber>
        <MySwitch
            ref="isCoverInput"
            v-model="judgeLine.isCover"
            :active-value="JudgeLineCover.Cover"
            :inactive-value="JudgeLineCover.Uncover"
        >
            判定线遮罩
            <MyQuestionMark>
                如果开启，则<em>由于速度事件值为负数</em>而产生的位于判定线下方的音符将不会显示。<br>
                例如：使用负数速度事件做出谱面倒退的效果时，<br>
                如果开启了遮罩，则音符会在退出判定线时才显示。<br>
                如果关闭遮罩，则音符在判定线下方时就会显示。<br>
                该属性<em>不会</em>影响<em>由于反向音符、音符速度为负数等其他原因</em>而产生的位于判定线下方的音符是否显示。<br>
                “判定线下方”的定义：音符在判定线的反面。<br>
                “判定线正反面”的定义：判定线的角度为0时，判定线上面为正面，下面为反面。角度为90时，判定线右面为正面，左面为反面。其他角度以此类推。<br>
            </MyQuestionMark>
        </MySwitch>
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
        />
        <MyButton
            type="danger"
            @click="confirm(handleDeleteJudgeLine, '确定删除此判定线？（该操作不可逆）', '删除判定线'), update()"
        >
            删除当前判定线
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import { ElButtonGroup } from 'element-plus';
import MyButton from '@/myElements/MyButton.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySelect from '../myElements/MySelect.vue';
import MySwitch from '../myElements/MySwitch.vue';
import store from '@/store';
import globalEventEmitter from '@/eventEmitter';
import MyQuestionMark from '@/myElements/MyQuestionMark.vue';
import { confirm } from '@/tools/catchError';
import { computed, useTemplateRef } from 'vue';
import { JudgeLineCover } from '@/models/judgeLine';
const props = defineProps<{
    titleTeleport: string
}>();
const chartPackage = store.useChartPackage();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
const judgeLine = computed(() => {
    return chart.judgeLineList[stateManager.state.currentJudgeLineNumber];
})
const fatherInput = useTemplateRef("fatherInput");
const isCoverInput = useTemplateRef("isCoverInput");
const zOrderInput = useTemplateRef("zOrderInput");
const textureSelect = useTemplateRef("textureSelect");
function update() {
    fatherInput.value?.updateShowedValue();
    isCoverInput.value?.updateShowedValue();
    zOrderInput.value?.updateShowedValue();
    textureSelect.value?.updateShowedValue();
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