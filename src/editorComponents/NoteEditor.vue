<template>
    <div class="note-editor">
        <Teleport :to="props.titleTeleport">
            <ElSelect
                v-model="model.type"
                style="width: 100px;"
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
            v-model="startEndTime"
            v-model:when1="model._startTime"
            v-model:when2="model._endTime"
        >
            <template #prepend>
                时间
            </template>
        </MyInput>
        <MySwitch
            v-model="model.isFake"
            :active-value="1"
            :inactive-value="0"
        >
            假音符
        </MySwitch>
        <MySwitch
            v-model="model.above"
            :active-value="NoteAbove.Below"
            :inactive-value="NoteAbove.Above"
        >
            反向音符
        </MySwitch>
        <MyInputNumber v-model="model.positionX">
            <template #prepend>
                X坐标
            </template>
        </MyInputNumber>
        <MyInputNumber v-model="model.speed">
            <template #prepend>
                速度倍率
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.size"
            :min="0"
        >
            <template #prepend>
                大小
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.alpha"
            :min="0"
            :max="255"
        >
            <template #prepend>
                透明度
            </template>
        </MyInputNumber>
        <MyInputNumber v-model="model.yOffset">
            <template #prepend>
                纵向偏移
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="model.visibleTime"
            :min="0"
        >
            <template #prepend>
                可见时间
            </template>
        </MyInputNumber>
    </div>
</template>
<script setup lang='ts'>
import { formatBeats, validateBeats, parseBeats, addBeats } from '@/models/beats';
import { computed } from 'vue';
import { Note, NoteAbove } from '../models/note';
import MyInput from '@/myElements/MyInput.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySwitch from '../myElements/MySwitch.vue';
const props = defineProps<{
    titleTeleport: string
}>();
const model = defineModel<Note>({
    required: true
});

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
</script>
<style scoped>
.note-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>