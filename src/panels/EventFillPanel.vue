<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="event-fill-panel right-inner">
        <Teleport :to="props.titleTeleport">
            生成曲线轨迹
        </Teleport>
        <MyInputBeats v-model="stateManager.cache.eventFill.startTime">
            <template #prepend>
                开始时间
            </template>
        </MyInputBeats>
        <MyInputBeats v-model="stateManager.cache.eventFill.endTime">
            <template #prepend>
                结束时间
            </template>
        </MyInputBeats>
        <MyInputNumber v-model="stateManager.cache.eventFill.density">
            <template #prepend>
                填充密度
                <MyQuestionMark>
                    一拍内放多少个事件。移动速度过快的轨迹需要更高的密度。
                </MyQuestionMark>
            </template>
        </MyInputNumber>

        <MyDialog open-text="编辑曲线轨迹代码">
            <Codemirror
                v-model="stateManager.cache.eventFill.code"
                class="code-input"
                :extensions="extensions"
                :tab-size="4"
                @keydown.stop
            />
            <p>
                代码为Javascript语言，根据时间t，使用return语句返回x、y、angle三个结果，将会被自动填入moveX、moveY、rotate事件的值中。<br>
                t的范围为0~1，0表示曲线轨迹刚开始，1表示曲线轨迹结束。<br>
                你可以直接使用缓动函数，例如 OutQuad(t)。注意缓动函数每个单词的首字母都要大写。<br>
                如果要使用三角函数等数学工具，请使用 Math 对象。<br>
                本功能暂时没有对代码进行安全检查，所以请不要轻易粘贴其他人提供的曲线轨迹代码。<br>
            </p>
        </MyDialog>
        <p>
            请点击“编辑曲线轨迹代码”按钮，并输入代码，
            点击“填充”按钮，就会自动生成事件
        </p>
        <MyButton
            type="primary"
            @click="catchErrorByMessage(() => globalEventEmitter.emit('FILL_EVENTS'), '填充事件')"
        >
            填充
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import MyDialog from "@/myElements/MyDialog.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import store from "@/store";
import { catchErrorByMessage } from "@/tools/catchError";
import MyButton from "@/myElements/MyButton.vue";

import { Codemirror } from "vue-codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import globalEventEmitter from "@/eventEmitter";

const props = defineProps<{
    titleTeleport: string
}>();
const stateManager = store.useManager("stateManager");

// 更新extensions配置
const extensions = [
    javascript(),
    autocompletion()
];
</script>