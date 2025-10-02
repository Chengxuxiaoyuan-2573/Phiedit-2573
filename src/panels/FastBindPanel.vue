<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="fast-bind-panel right-inner">
        <Teleport :to="props.titleTeleport">
            快速绑线
        </Teleport>
        <em>提示：被绑线的判定线必须是该线的子线</em>
        <p>
            当前为{{ stateManager.state.currentJudgeLineNumber }}号线
        </p>
        <p v-if="childLines.length === 0">
            暂无满足条件的判定线
        </p>
        <p v-else>
            有以下判定线可以绑线：（请选择想绑线的判定线）
        </p>
        <MyGridContainer
            :columns="5"
            :gap="5"
        >
            <template
                v-for="(line, i) in childLines"
                :key="i - 1"
            >
                <ElCheckboxButton v-model="stateManager.cache.fastBind.judgeLinesIsSelected[line.id]">
                    {{ line.id }}
                </ElCheckboxButton>
            </template>
            <MyButton
                type="success"
                @click="addNewJudgeLine(), update()"
            >
                +
            </MyButton>
            <MyButton
                type="success"
                @click="addNewJudgeLine(8), update()"
            >
                +8
            </MyButton>
        </MyGridContainer>
        <MyInputBeats v-model="stateManager.cache.fastBind.eventLength">
            <template #prepend>
                事件长度
                <MyQuestionMark>
                    绑线后，被绑线的线上会生成事件，这个值为事件的长度。<br>
                    一般要大于音符从出现在屏幕上，到被判定的时间。<br>
                    同时出现在屏幕上的音符数量越多，事件长度越长，<br>
                    选择的判定线数量就要越多。否则会出bug。
                </MyQuestionMark>
            </template>
        </MyInputBeats>
        <MyInputNumber v-model="stateManager.cache.fastBind.precision">
            <template #prepend>
                精度
                <MyQuestionMark>
                    相当于事件的填充密度，表示一拍内放多少个事件。<br>
                    精度太低会导致运动不平滑，太高又会影响性能。
                </MyQuestionMark>
            </template>
        </MyInputNumber>
        <MyButton
            type="primary"
            @click="bindLine"
        >
            绑线
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from "@/eventEmitter";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MyButton from "@/myElements/MyButton.vue";
import store from "@/store";
import { ElCheckboxButton } from "element-plus";
import { computed, onMounted, ref } from "vue";

const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
const u = ref(false);

const childLines = computed(() => {
    return chart.judgeLineList.filter(judgeLine => judgeLine.father === stateManager.state.currentJudgeLineNumber + (u.value ? 0 : 0));
});
function update() {
    u.value = !u.value;
}

function addNewJudgeLine(count = 1) {
    for (let i = 0; i < count; i++) {
        const judgeLine = chart.addNewJudgeLine();
        judgeLine.father = stateManager.state.currentJudgeLineNumber;
        stateManager.cache.fastBind.judgeLinesIsSelected.push(true);
    }
}

function bindLine() {
    const selectedLineNumbers = [];
    for (let i = 0; i < stateManager.cache.fastBind.judgeLinesIsSelected.length; i++) {
        if (stateManager.cache.fastBind.judgeLinesIsSelected[i]) {
            selectedLineNumbers.push(i);
        }
    }
    globalEventEmitter.emit("BIND_LINE");
}

function updateArrayLength() {
    stateManager.cache.fastBind.judgeLinesIsSelected = new Array(stateManager.judgeLinesCount).fill(false);
}
onMounted(() => {
    updateArrayLength();
});
</script>