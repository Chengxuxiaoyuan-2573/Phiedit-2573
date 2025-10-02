<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MyInput
        ref="inputColor"
        v-model="inputData.colorString"
        v-bind="$attrs"
        @input="emit('input', inputData.colorString)"
        @change="emit('change', inputData.colorString)"
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
import { formatRGBcolor, parseRGBcolor, RGBcolor } from "@/tools/color";
const inputColor = useTemplateRef("inputColor");
const inputData = reactive({
    get colorString() {
        return model.value === undefined ? "" : formatRGBcolor(model.value);
    },
    set colorString(value: string) {
        const color = parseRGBcolor(value);
        if (!color) return;
        model.value = color;
        isInternalUpdate = true;
    }
});
let isInternalUpdate = false;
const emit = defineEmits<{
    input: [string]
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<RGBcolor | undefined>({
    required: true
});
watch(model, () => {
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
function updateShowedValue() {
    inputColor.value?.updateShowedValue();
    isInternalUpdate = false;
}
defineExpose({
    updateShowedValue
});
</script>