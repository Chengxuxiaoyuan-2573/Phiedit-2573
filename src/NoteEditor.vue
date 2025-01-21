<template>
    <h1>
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
    </h1>
    <MyInput
        v-model="model.startString"
        v-model:when="model.startTime"
    >
        <template #prepend>
            开始时间
        </template>
    </MyInput>
    <MyInput
        v-model="model.endString"
        v-model:when="model.endTime"
    >
        <template #prepend>
            结束时间
        </template>
    </MyInput>
    <ElSwitch
        v-model="model.isFake"
        active-text="假音符"
        inactive-text="真音符"
        :active-value="1"
        :inactive-value="0"
    />
    <ElSwitch
        v-model="model.above"
        active-text="正落"
        inactive-text="倒落"
        :active-value="NoteAbove.Above"
        :inactive-value="NoteAbove.Below"
    />
    <MyInputNumber
        v-model="model.positionX"
    >
        <template #prepend>
            X坐标
        </template>
    </MyInputNumber>
    <MyInputNumber
        v-model="model.speed"
    >
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
    <MyInputNumber
        v-model="model.yOffset"
    >
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
</template>
<script setup lang='ts'>
import { ElSwitch } from 'element-plus';
import { Note, NoteAbove } from './classes/note';
import MyInput from './MyInput.vue';
import MyInputNumber from './MyInputNumber.vue';
const model = defineModel<Note>({
    required: true
});
</script>