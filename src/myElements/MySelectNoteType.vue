<template>
    <MySelect
        v-model="model"
        :options="[
            {
                label: 'Tap',
                value: NoteType.Tap,
                text: 'Tap',
            },
            {
                label: 'Drag',
                value: NoteType.Drag,
                text: 'Drag',
            },
            {
                label: 'Flick',
                value: NoteType.Flick,
                text: 'Flick',
            },
            {
                label: 'Hold',
                value: NoteType.Hold,
                text: 'Hold',
            },
        ]"
    />
</template>
<script setup lang="ts">
import MySelect from './MySelect.vue';
import { NoteType } from '@/models/note';
const model = defineModel<NoteType>({
    required: true
});
</script>