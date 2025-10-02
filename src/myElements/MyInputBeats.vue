<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MyInput
        ref="inputBeats"
        v-model="inputData.beatsString"
        v-bind="$attrs"
        @input="emit('input', inputData.beatsString)"
        @change="emit('change', inputData.beatsString)"
    >
        <template
            v-if="slots.prepend"
            #prepend
        >
            <slot name="prepend" />
        </template>
        <template
            v-if="slots.append"
            #append
        >
            <slot name="append" />
        </template>
        <template
            v-if="slots.prefix"
            #prefix
        >
            <slot name="prefix" />
        </template>
        <template
            v-if="slots.suffix"
            #suffix
        >
            <slot name="suffix" />
        </template>
    </MyInput>
</template>

<script setup lang="ts">
import { Beats, formatBeats, parseBeats, makeSureBeatsValid } from "@/models/beats";
import MyInput from "./MyInput.vue";
import { reactive, useSlots, useTemplateRef, watch } from "vue";
const inputBeats = useTemplateRef("inputBeats");
const inputData = reactive({
    get beatsString() {
        return model.value === undefined ? "" : formatBeats(model.value);
    },
    set beatsString(value: string) {
        model.value = makeSureBeatsValid(parseBeats(value));
        isInternalUpdate = true;
    }
});
let isInternalUpdate = false;
const emit = defineEmits<{
    input: [string]
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<Beats | undefined>();
watch(model, () => {
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
function updateShowedValue() {
    inputBeats.value?.updateShowedValue();
    isInternalUpdate = false;
}
defineExpose({
    updateShowedValue
});
</script>