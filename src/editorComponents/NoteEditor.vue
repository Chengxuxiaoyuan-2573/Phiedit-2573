<template>
    <div class="note-editor">
        <Teleport :to="props.titleTeleport">
            <ElSelect
                v-model="inputNote.type"
                style="width: 100px;"
                @update:model-value="updateModel('type')"
            >
                <ElOption
                    :value="1"
                    label="Tap"
                />
                <ElOption
                    :value="2"
                    label="Hold"
                />
                <ElOption
                    :value="3"
                    label="Flick"
                />
                <ElOption
                    :value="4"
                    label="Drag"
                />
            </ElSelect>
            音符编辑
        </Teleport>
        音符ID： {{ model.id }}
        <MyInput
            ref="inputStartEndTime"
            v-model="inputNote.startEndTime"
            @update:model-value="updateModel('startTime', 'endTime')"
        >
            <template #prepend>
                时间
            </template>
        </MyInput>
        <MySwitch
            v-model="model.isFake"
            :active-value="NoteFake.Fake"
            :inactive-value="NoteFake.Real"
            @update:model-value="updateModel('isFake')"
        >
            假音符
        </MySwitch>
        <MySwitch
            v-model="model.above"
            :active-value="NoteAbove.Below"
            :inactive-value="NoteAbove.Above"
            @update:model-value="updateModel('above')"
        >
            反向音符
        </MySwitch>
        <MyInputNumber
            v-model="model.positionX"
            @update:model-value="updateModel('positionX')"
        >
            <template #prepend>
                X坐标
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.speed"
            @update:model-value="updateModel('speed')"
        >
            <template #prepend>
                速度倍率
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.size"
            :min="0"
            @update:model-value="updateModel('size')"
        >
            <template #prepend>
                大小
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.alpha"
            :min="0"
            :max="255"
            @update:model-value="updateModel('alpha')"
        >
            <template #prepend>
                透明度
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.yOffset"
            @update:model-value="updateModel('yOffset')"
        >
            <template #prepend>
                纵向偏移
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.visibleTime"
            :min="0"
            @update:model-value="updateModel('visibleTime')"
        >
            <template #prepend>
                可见时间
            </template>
        </MyInputNumber>
        <ElButton @click="reverse">
            X坐标镜像（Alt + A）
        </ElButton>
    </div>
</template>
<script setup lang='ts'>
import { formatBeats, validateBeats, parseBeats } from '@/models/beats';
import { onBeforeUnmount, onMounted, reactive, useTemplateRef, watch } from 'vue';
import { INote, Note, NoteAbove, NoteFake } from '../models/note';
import MyInput from '@/myElements/MyInput.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySwitch from '../myElements/MySwitch.vue';
import { ElButton } from 'element-plus';
import globalEventEmitter from '@/eventEmitter';
const props = defineProps<{
    titleTeleport: string
}>();
const model = defineModel<Note>({
    required: true
});
const inputStartEndTime = useTemplateRef('inputStartEndTime');
interface NoteExtends {
    startEndTime: string;
}
const seperator = " ";
const attributes = [
    'startTime',
    'endTime',
    'positionX',
    'speed',
    'size',
    'alpha',
    'yOffset',
    'visibleTime',
    'isFake',
    'above',
    'type'
] as const;
watch(model, () => {
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (inputNote[attr] as any) = model.value[attr];
    }
    inputStartEndTime.value?.updateShowedValue();
});
const inputNote: INote & NoteExtends = reactive({
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    positionX: model.value.positionX,
    speed: model.value.speed,
    size: model.value.size,
    alpha: model.value.alpha,
    yOffset: model.value.yOffset,
    visibleTime: model.value.visibleTime,
    isFake: model.value.isFake,
    above: model.value.above,
    type: model.value.type,
    get startEndTime() {
        // 如果开始时间和结束时间相同，返回这个相同的时间
        if (model.value.startTime === model.value.endTime) {
            return formatBeats(model.value.startTime);
        }
        // 否则返回开始时间和结束时间的组合
        return formatBeats(model.value.startTime) + seperator + formatBeats(model.value.endTime);
    },
    set startEndTime(value: string) {
        const [start, end] = value.split(seperator);
        // 如果连开始时间都没有输入，就不进行任何操作，因为用户可能还没有输入完
        if (!start) return;
        const startTime = validateBeats(parseBeats(start));
        // 如果只输入了一个时间，则将结束时间设置为与开始时间相同
        if (!end) {
            model.value.startTime = startTime;
            model.value.endTime = startTime;
            return;
        }
        const endTime = validateBeats(parseBeats(end));
        model.value.startTime = startTime;
        model.value.endTime = endTime;
    }
});
function updateModel<K extends keyof INote>(...attrNames: K[]) {
    for (const attrName of attrNames) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model.value[attrName] as any) = inputNote[attrName];
    }
}
onMounted(() => {
    globalEventEmitter.on("REVERSE", reverse);
});
onBeforeUnmount(() => {
    globalEventEmitter.off("REVERSE", reverse);
});
function reverse() {
    model.value.positionX = -model.value.positionX;
}
</script>
<style scoped>
.note-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>