<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MyInput
        ref="inputBezier"
        v-model="inputData.bezierPoints"
        v-bind="$attrs"
        @input="emit('input', inputData.bezierPoints)"
        @change="emit('change', inputData.bezierPoints)"
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
import { BezierPoints, formatBezierPoints, parseBezierPoints } from "@/models/easing";
const inputBezier = useTemplateRef("inputBezier");
const inputData = reactive({
    get bezierPoints() {
        return model.value === undefined ? "" : formatBezierPoints(model.value);
    },
    set bezierPoints(value: string) {
        const points = parseBezierPoints(value);
        if (points === null) return;
        model.value = points;
        isInternalUpdate = true;
    }
});
let isInternalUpdate = false;
const emit = defineEmits<{
    input: [string]
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<BezierPoints | undefined>({
    required: true
});
watch(model, () => {
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
function updateShowedValue() {
    inputBezier.value?.updateShowedValue();
    isInternalUpdate = false;
}
defineExpose({
    updateShowedValue
});
</script>