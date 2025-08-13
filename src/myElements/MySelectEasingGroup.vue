<template>
    <MySelect
        v-model="model"
        :options="easingOptions"
        @change="emit('change', model)"
    />
</template>
<script setup lang="ts">
import { EasingTypeGroups } from '@/models/easing';
import MySelect from './MySelect.vue';
const model = defineModel<EasingTypeGroups>({
    required: true
});
const emit = defineEmits<{
    change: [EasingTypeGroups]
}>();
const easingOptions = Object.keys(EasingTypeGroups)
    // 过滤掉字符串，保留数字键
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        label: EasingTypeGroups[+key],
        text: EasingTypeGroups[+key],
        value: +key
    }));
</script>