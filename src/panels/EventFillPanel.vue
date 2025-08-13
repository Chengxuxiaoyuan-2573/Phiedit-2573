<template>
    <div class="event-fill-panel">
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

        <ElInput
            v-model="stateManager.cache.eventFill.code"
            class="code-input"
            type="textarea"
            :rows="12"
        />
        <MyButton
            type="primary"
            @click="catchErrorByMessage(() => globalEventEmitter.emit('FILL_EVENTS', stateManager.cache.eventFill.startTime, stateManager.cache.eventFill.endTime, stateManager.cache.eventFill.density, stateManager.cache.eventFill.code), '填充事件')"
        >
            填充
        </MyButton>
        <MyDialog open-text="不会写？点这里">
            <h3>找一个AI（例如Deepseek），复制下面的提示词，输入你想要的效果，并发送：</h3>
            <pre>{{ prompt }}</pre>
            <MyButton
                type="primary"
                @click="copyText"
            >
                复制提示词
            </MyButton>
            <h3>AI的输出可能是这样的：</h3>
            <pre>{{ response }}</pre>
            <h3>仅复制中间的代码部分到文本框内，并点击“填充”按钮。</h3>
            <h3>如果生成的效果不合你的预期，也可以向AI继续提出。</h3>
        </MyDialog>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from '@/eventEmitter';
import MyDialog from '@/myElements/MyDialog.vue';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import MyQuestionMark from '@/myElements/MyQuestionMark.vue';
import store from '@/store';
import { catchErrorByMessage } from '@/tools/catchError';
import { ElInput } from 'element-plus';
import MyButton from '@/myElements/MyButton.vue';
const props = defineProps<{
    titleTeleport: string
}>();
const stateManager = store.useManager("stateManager");
const prompt = `\
用Javascript代码实现一个动画函数，让一条直线以特定的轨迹运动。
接收一个参数t表示时间，位于0和1之间，0表示动画刚开始，1表示动画结束。
返回一个对象，对象包含属性x、y、angle，
x和y分别表示控制点的X轴和Y轴的坐标。直线必定经过控制点。
屏幕上可显示的范围是x:[-675,675]，y:[-450,450]。
angle表示角度，angle=0表示直线水平，angle=90表示直线垂直，
angle=45表示直线两端朝向左上-右下方向，以此类推。
只能使用原生Javascript，不能使用第三方库。
动画的内容是xxx（在此处描述你想生成的曲线轨迹，不要产生歧义和模棱两可的描述）`;
const response = `\
function 函数名(t){
    这里是代码
}`;
function copyText() {
    navigator.clipboard.writeText(prompt);
}
</script>
<style scoped>
.code-input textarea {
    min-height: 300px;
}

.event-fill-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

h3{
    margin-block: 0.8em;
}
</style>