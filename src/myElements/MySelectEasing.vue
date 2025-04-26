<template>
    <MySelect
        v-model="model"
        :options="easingOptions"
    />
</template>
<script setup lang="ts">
import { EasingType } from '@/models/easing';
import MySelect from './MySelect.vue';

const model = defineModel<EasingType>({
    required: true
});
const easingOptions = Object.keys(EasingType)
    // 过滤掉字符串，保留数字键
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        label: EasingType[+key],
        text: EasingType[+key],
        value: +key
    }));
</script>