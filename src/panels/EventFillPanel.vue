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
        <MyDialog open-text="不会写？点这里">
            <h3>找一个AI（例如Deepseek），复制下面的提示词，输入你想要的效果，并发送：</h3>
            <MyButton
                type="primary"
                @click="copyPromptText"
            >
                复制提示词
            </MyButton>
            <pre>{{ prompt }}</pre>
            <h3>复制AI输出的代码到文本框内，并点击“填充”按钮。</h3>
            <h3>如果生成的效果不合你的预期，也可以向AI继续提出。</h3>
        </MyDialog>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from "@/eventEmitter";
import MyDialog from "@/myElements/MyDialog.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import store from "@/store";
import { catchErrorByMessage } from "@/tools/catchError";
import MyButton from "@/myElements/MyButton.vue";
import { easingFuncs, EasingType } from "@/models/easing";

import { Codemirror } from "vue-codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";

const props = defineProps<{
    titleTeleport: string
}>();
const stateManager = store.useManager("stateManager");

// 更新extensions配置
const extensions = [
    javascript(),
    autocompletion()
];
const prompt = `\
用Javascript代码实现一个动画，让一条直线以特定的轨迹运动。
接收一个参数t表示时间，位于0和1之间，0表示动画刚开始，1表示动画结束。
使用return语句返回一个对象，对象包含属性x、y、angle。
x和y分别表示锚点的X轴和Y轴的坐标。直线必定经过锚点。
屏幕上可显示的范围是x:[-675,675]，y:[-450,450]。
angle表示角度，angle=0表示直线水平，angle增大表示直线顺时针旋转，angle是角度而非弧度。
尽量让angle的变化连续，例如不要直接从-180跳转到180，虽然他们的方向是相同的。
X轴正方向朝向右侧，Y轴正方向朝向上方。
只能使用原生Javascript，不能使用第三方库。
但已经提供了一些缓动函数，它们接收一个0~1之间的参数，返回一个0~1之间的结果，可直接使用。
可用缓动函数列表：
${
    Object.keys(easingFuncs)
        .map(key => EasingType[+key])
        .join(",")
}
只输出Javascript代码，不要混入任何HTML、CSS以及Typescript的类型标注等内容。
本需求与canvas无关，请忘记关于canvas的所有内容。
不要输出函数头和末尾的大括号，仅输出中间的代码部分即可。
请把可以调整的参数放在代码最前面，以变量的形式定义，并解释其含义。
动画的内容是xxx（在此处描述你想生成的曲线轨迹）`;
function copyPromptText() {
    navigator.clipboard.writeText(prompt);
}
</script>