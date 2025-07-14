<template>
    <div
        v-if="model == model"
        class="number-event-editor"
    >
        <Teleport :to="props.titleTeleport">
            {{ model.type }}事件编辑
        </Teleport>
        事件ID： {{ model.id }}
        <MyInput
            ref="inputStartEndTime"
            v-model="inputEvent.startEndTime"
            @update:model-value="updateModel('startTime', 'endTime')"
        >
            <template #prepend>
                时间
            </template>
        </MyInput>
        <MyInput
            ref="inputStartEnd"
            v-model="inputEvent.startEnd"
            @update:model-value="updateModel('start', 'end')"
        >
            <template #prepend>
                数值
            </template>
        </MyInput>
        <MySwitch
            v-model="inputEvent.bezier"
            :active-value="1"
            :inactive-value="0"
            @update:model-value="updateModel('bezier')"
        >
            使用Bezier曲线
        </MySwitch>
        <span v-if="model.bezier"> 不支持Bezier曲线，请关闭Bezier曲线 </span>
        <template v-else>
            <MySelectEasing 
                v-model="inputEvent.easingType" 
                @update:model-value="updateModel('easingType')"
            />
            <ElSlider
                v-model="inputEvent.easingLeftRight"
                range
                :min="0"
                :max="1"
                :step="0.01"
                @update:model-value="updateModel('easingLeft', 'easingRight')"
            />
        </template>
        <ElButton @click="reverse">
            反转（Alt + A）
        </ElButton>
        <ElButton @click="swap">
            交换（Alt + S）
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { ElButton } from "element-plus";
import { IEvent, NumberEvent } from "../models/event";
import MyInput from "../myElements/MyInput.vue";
import MySwitch from "../myElements/MySwitch.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import { addBeats, formatBeats, parseBeats, validateBeats } from "@/models/beats";
import { onBeforeUnmount, onMounted, reactive, useTemplateRef } from "vue";
import { Ref, watch } from "vue";
import globalEventEmitter from "@/eventEmitter";
const model = defineModel<NumberEvent>({
    required: true,
}) as Ref<NumberEvent>;
const props = defineProps<{
    titleTeleport: string;
}>();
const inputStartEndTime = useTemplateRef("inputStartEndTime");
const inputStartEnd = useTemplateRef("inputStartEnd");
interface EventExtends {
    startEndTime: string;
    startEnd: string;
    easingLeftRight: number[];
}
const seperator = " ";
const attributes = [
    "startTime",
    "endTime",
    "start",
    "end",
    "bezier",
    "easingType",
    "easingLeft",
    "easingRight"
] as const;
watch(model, () => {
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (inputEvent[attr] as any) = model.value[attr];
    }
    inputStartEndTime.value?.updateShowedValue();
    inputStartEnd.value?.updateShowedValue();
});
const inputEvent: IEvent<number> & EventExtends = reactive({
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    start: model.value.start,
    end: model.value.end,
    bezier: model.value.bezier,
    bezierPoints: model.value.bezierPoints,
    easingType: model.value.easingType,
    easingLeft: model.value.easingLeft,
    easingRight: model.value.easingRight,
    get startEndTime() {
        // 如果开始时间和结束时间相同，返回这个相同的时间
        if (model.value.startTime === model.value.endTime) {
            return formatBeats(model.value.startTime);
        }
        // 否则返回开始时间和结束时间的组合
        return formatBeats(this.startTime) + seperator + formatBeats(this.endTime);
    },
    set startEndTime(value: string) {
        const [start, end] = value.split(seperator);
        if (!start) return;
        this.startTime = validateBeats(parseBeats(start));
        // 如果只输入了一个时间，则将结束时间设置为开始时间加1拍
        if (!end) {
            this.endTime = addBeats(this.startTime, [1, 0, 1]);
            return;
        }
        this.endTime = validateBeats(parseBeats(end));
    },
    get startEnd() {
        // 如果开始数值和结束数值相同，返回这个相同的数值
        if (this.start === this.end) {
            return this.start.toString();
        }
        return this.start + seperator + this.end;
    },
    set startEnd(value: string) {
        const [start, end] = value.split(seperator);
        if (!start) return;
        this.start = parseFloat(start);
        // 如果只输入了一个数值，则将结束数值设置为开始数值
        if (!end) {
            this.end = this.start;
            return;
        }
        this.end = parseFloat(end);
    },
    get easingLeftRight() {
        return [this.easingLeft, this.easingRight];
    },
    set easingLeftRight(value: number[]) {
        this.easingLeft = value[0];
        this.easingRight = value[1];
    }
});

function updateModel<K extends keyof IEvent<number>>(...attrNames: K[]) {
    for (const attrName of attrNames) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model.value[attrName] as any) = inputEvent[attrName];
    }
}
onMounted(() => {
    globalEventEmitter.on("REVERSE", reverse);
    globalEventEmitter.on("SWAP", swap);
});
onBeforeUnmount(() => {
    globalEventEmitter.off("REVERSE", reverse);
    globalEventEmitter.off("SWAP", swap);
});
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
