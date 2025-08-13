<template>
    <MySelect
        ref="select"
        v-model="model"
        v-bind="$attrs"
        :options="easingOptions"
        filterable
        @change="emit('change', model)"
    />
</template>
<script setup lang="ts">
import { EasingType } from '@/models/easing';
import MySelect from './MySelect.vue';
import { useTemplateRef } from 'vue';

const model = defineModel<EasingType>({
    required: true
});
const emit = defineEmits<{
    change: [EasingType]
}>();
const easingOptions = Object.keys(EasingType)
    // 过滤掉字符串，保留数字键
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        label: `${key}. ${EasingType[+key]}`,
        text: `${key}. ${EasingType[+key]}`,
        value: +key
    }));
const select = useTemplateRef('select');
defineExpose({
    updateShowedValue: () => {
        select.value?.updateShowedValue();
    }
});
</script>