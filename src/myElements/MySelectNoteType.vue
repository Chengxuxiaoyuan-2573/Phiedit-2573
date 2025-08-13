<template>
    <MySelect
        ref="select"
        v-model="model"
        v-bind="$attrs"
        :options="[
            {
                label: '音符类型：Tap',
                value: NoteType.Tap,
                text: 'Tap',
            },
            {
                label: '音符类型：Drag',
                value: NoteType.Drag,
                text: 'Drag',
            },
            {
                label: '音符类型：Flick',
                value: NoteType.Flick,
                text: 'Flick',
            },
            {
                label: '音符类型：Hold',
                value: NoteType.Hold,
                text: 'Hold',
            },
        ]"
        @change="emit('change', model)"
    />
</template>
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import MySelect from './MySelect.vue';
import { NoteType } from '@/models/note';
const model = defineModel<NoteType>({
    required: true
});
const select = useTemplateRef('select');
const emit = defineEmits<{
    change: [NoteType]
}>();

defineExpose({
    updateShowedValue: () => {
        select.value?.updateShowedValue();
    }
});
</script>