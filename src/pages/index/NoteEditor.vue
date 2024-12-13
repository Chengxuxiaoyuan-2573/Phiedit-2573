<template>
    <ElSelect v-model="model.type">
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
    <MyInput v-model="model.startString" />
    <MyInput v-model="model.endString" />
    <ElCheckbox v-model="model.isFake">
        假音符
    </ElCheckbox>
    <ElSwitch
        v-model="model.above"
        active-text="正落"
        inactive-text="倒落"
    >
        <template #default>
            下落方向
        </template>
    </ElSwitch>
    <ElInputNumber v-model="model.positionX">
        <template #prefix>
            X坐标
        </template>
    </ElInputNumber>
    <ElInputNumber v-model="model.speed">
        <template #prefix>
            速度倍率
        </template>
    </ElInputNumber>
    <ElInputNumber
        v-model="model.size"
        :min="0"
    >
        <template #prefix>
            大小
        </template>
    </ElInputNumber>
    <ElInputNumber
        v-model="model.alpha"
        :min="0"
        :max="255"
    >
        <template #prefix>
            透明度
        </template>
    </ElInputNumber>
    <ElInputNumber v-model="model.yOffset">
        <template #prefix>
            纵向偏移
        </template>
    </ElInputNumber>
    <ElInputNumber
        v-model="model.visibleTime"
        :min="0"
    >
        <template #prefix>
            可见时间
        </template>
    </ElInputNumber>
</template>
<script setup lang='ts'>
import { Note } from '@/ts/classes/note';
import MyInput from './MyInput.vue';
const model = defineModel<Note>({
    required: true
});
</script>