<template>
    <div class="number-event-editor">
        <Teleport :to="props.titleTeleport">
            {{ model.type }}事件编辑
        </Teleport>
        事件ID： {{ model.id }}
        <MyInput
            v-model="startEndTime"
            v-model:when1="model._startTime"
            v-model:when2="model._endTime"
        >
            <template #prepend>
                时间
            </template>
        </MyInput>
        <MyInput
            v-model="startEnd"
            v-model:when1="model.start"
            v-model:when2="model.end"
        >
            <template #prepend>
                数值
            </template>
        </MyInput>
        <MySwitch
            v-model="model.bezier"
            :active-value="1"
            :inactive-value="0"
        >
            使用Bezier曲线
        </MySwitch>
        <span v-if="model.bezier"> 不支持Bezier曲线，请关闭Bezier曲线 </span>
        <template v-else>
            <MySelectEasing v-model="model.easingType" />
            <ElSlider
                v-model="model.easingLeftRight"
                range
                :min="0"
                :max="1"
                :step="0.01"
            />
        </template>
        <ElButton @click="reverse">
            反转
        </ElButton>
        <ElButton @click="swap">
            交换
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { ElButton } from "element-plus";
import { NumberEvent } from "../models/event";
import MyInput from "../myElements/MyInput.vue";
import MySwitch from "../myElements/MySwitch.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import { addBeats, formatBeats, parseBeats, validateBeats } from "@/models/beats";
import { computed } from "vue";
const model = defineModel<NumberEvent>({
    required: true,
});
const props = defineProps<{
    titleTeleport: string;
}>();
const startEndTime = computed({
    get() {
        const start = formatBeats(model.value.startTime);
        const end = formatBeats(model.value.endTime);
        if (start === end) {
            return start;
        }
        else {
            return `${formatBeats(model.value.startTime)} ~ ${formatBeats(model.value.endTime)}`;
        }
    },
    set(value: string) {
        const [start, end] = value.split("~");
        if (!start) return;
        const startTime = validateBeats(parseBeats(start));
        // 如果只输入了一个时间，则将结束时间设置为开始时间加1拍
        if (!end) {
            model.value.startTime = startTime;
            model.value.endTime = addBeats(startTime, [1, 0, 1]);
            return;
        }
        const endTime = validateBeats(parseBeats(end));
        model.value.startTime = startTime;
        model.value.endTime = endTime;
    }
})
const startEnd = computed({
    get() {
        if (model.value.start === model.value.end) {
            return model.value.start.toString();
        } 
        else {
            return `${model.value.start} ~ ${model.value.end}`;
        }
    },
    set(value: string) {
        const [start, end] = value.split("~");
        if (!start) return;
        const startValue = parseFloat(start);
        if (!end) {
            model.value.start = startValue;
            model.value.end = startValue;
            return;
        }
        const endValue = parseFloat(end);
        if (isNaN(startValue) || isNaN(endValue)) {
            return;
        }
        model.value.start = startValue;
        model.value.end = endValue;
    }
})

function reverse() {
    model.value.start = -model.value.start;
    model.value.end = -model.value.end;
}
function swap() {
    [model.value.start, model.value.end] = [model.value.end, model.value.start];
}
</script>
<style scoped>
.number-event-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
