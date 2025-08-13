<template>
    <MyInput
        v-model="inputData.beatsString"
        v-model:when="model"
        v-bind="$attrs"
        @input="emit('input', inputData.beatsString)"
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
import { Beats, formatBeats, parseBeats, validateBeats } from "@/models/beats";
import MyInput from "./MyInput.vue";
import { reactive, useSlots } from "vue";
const inputData = reactive({
    get beatsString() {
        return model.value == undefined ? "" : formatBeats(model.value);
    },
    set beatsString(value: string) {
        model.value = validateBeats(parseBeats(value));
    }
});
const emit = defineEmits<{
    input: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<Beats | undefined>({
    required: true
});
</script>