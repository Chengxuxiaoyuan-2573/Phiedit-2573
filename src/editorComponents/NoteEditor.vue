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
        <MyInputBeats v-model="model.startTime">
            <template #prepend>
                开始时间
            </template>
        </MyInputBeats>
        <MyInputBeats v-model="model.endTime">
            <template #prepend>
                结束时间
            </template>
        </MyInputBeats>
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
import { Note, NoteAbove } from '../models/note';
import MyInputBeats from '../myElements/MyInputBeats.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySwitch from '../myElements/MySwitch.vue';
const props = defineProps<{
    titleTeleport: string
}>();
const model = defineModel<Note>({
    required: true
});
</script>
<style scoped>
.note-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>