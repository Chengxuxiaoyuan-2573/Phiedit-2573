<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MySelect
        ref="select"
        v-model="model"
        v-bind="$attrs"
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
        @change="emit('change', model)"
    >
        音符类型
    </MySelect>
</template>
<script setup lang="ts">
import { useTemplateRef } from "vue";
import MySelect from "./MySelect.vue";
import { NoteType } from "@/models/note";
const model = defineModel<NoteType>({
    required: true
});
const select = useTemplateRef("select");
const emit = defineEmits<{
    change: [NoteType]
}>();

defineExpose({
    updateShowedValue: () => {
        select.value?.updateShowedValue();
    }
});
</script>