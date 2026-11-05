<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="fast-bind-panel right-inner">
        <Teleport :to="props.titleTeleport">
            快速绑线
        </Teleport>
        <p v-if="selectableLines.length === 0">
            暂无可选择的判定线
        </p>
        <p v-else>
            请选择要绑线的判定线：
        </p>
        <MyGridContainer
            :columns="5"
            :gap="5"
        >
            <template
                v-for="(line, i) in chart.judgeLineList"
                :key="i - 1"
            >
                <MyButton
                    :disabled="!selectableLines.includes(line)"
                    :type="(['primary', 'warning', 'danger', 'success', 'info'] as const)[Math.floor(line.id / 10) % 5]"
                    :plain="!stateManager.cache.fastBind.judgeLinesIsSelected[line.id]"
                    @click="stateManager.cache.fastBind.judgeLinesIsSelected[line.id] = !stateManager.cache.fastBind.judgeLinesIsSelected[line.id]"
                >
                    {{ line.id }}
                </MyButton>
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
                    绑线后，被绑的线上会生成事件，这个值为事件的持续时间。<br>
                    一般要大于音符显示在屏幕上的时间。<br>
                </MyQuestionMark>
            </template>
        </MyInputBeats>
        <MyInputNumber v-model="stateManager.cache.fastBind.precision">
            <template #prepend>
                精度
                <MyQuestionMark>
                    事件的填充密度，表示一拍内放多少个事件。<br>
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
        <p class="extra-description">
            请先框选要绑线的音符，然后选择要绑线的判定线，然后确认绑线，此时选中的音符就会被绑线到你选择的判定线上，但显示效果几乎没有差别。你可以在被绑线的判定线的其他事件层级上新增事件，以控制每一个单独的音符。<br>
            绑线时，程序会按照时间先后顺序，将音符轮流移到每一条判定线上，并给其加上事件以让音符沿原来的轨迹运动。如果这些事件出现了重叠，请增加绑线的判定线数量。
        </p>
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
import { computed, onMounted, ref } from "vue";

const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const stateManager = store.useManager("stateManager");
const u = ref(false);

const selectableLines = computed(() => {
    return chart.judgeLineList.filter(judgeLine => judgeLine.id !== stateManager.state.currentJudgeLineNumber);
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