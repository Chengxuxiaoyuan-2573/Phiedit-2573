<template>
    <MyInput
        ref="inputVector"
        v-model="inputData.vector"
        v-bind="$attrs"
        @input="emit('input', inputData.vector)"
        @change="emit('change', inputData.vector)"
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
import MyInput from "./MyInput.vue";
import { reactive, useSlots, useTemplateRef, watch } from "vue";
const inputBeats = useTemplateRef("inputVector");
const inputData = reactive({
    get vector() {
        return model.value?.join(",") || "";
    },
    set vector(value: string) {
        const vector = value.split(/(?:\s|,)+/g).map(parseFloat);
        model.value = vector;
        isInternalUpdate = true;
    }
});
let isInternalUpdate = false;
const emit = defineEmits<{
    input: [string]
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<number[] | undefined>();
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