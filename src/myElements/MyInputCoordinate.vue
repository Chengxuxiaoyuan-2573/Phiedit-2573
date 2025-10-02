<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MyInput
        ref="inputCoordinate"
        v-model="inputData.coordinate"
        v-bind="$attrs"
        @input="emit('input', inputData.coordinate)"
        @change="emit('change', inputData.coordinate)"
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
const inputBeats = useTemplateRef("inputCoordinate");
const inputData = reactive({
    get coordinate() {
        return model.value === undefined ? "" : formatCoordinate(model.value);
    },
    set coordinate(value: string) {
        const coordinate = parseCoordinate(value);
        if (coordinate === null) return;
        model.value = coordinate;
        isInternalUpdate = true;
    }
});
let isInternalUpdate = false;
const emit = defineEmits<{
    input: [string]
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<[number, number] | undefined>();
watch(model, () => {
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
function updateShowedValue() {
    inputBeats.value?.updateShowedValue();
    isInternalUpdate = false;
}

function formatCoordinate(coordinate: [number, number]) {
    return `(${coordinate[0]}, ${coordinate[1]})`;
}

function parseCoordinate(coordinate: string): [number, number] | null {
    const match = coordinate.match(/^\((.*), (.*)\)$/);
    if (!match) return null;
    const [, x, y] = match;
    const numX = parseFloat(x), numY = parseFloat(y);
    if (isNaN(numX) || isNaN(numY)) {
        return null;
    }
    return [numX, numY];
}
defineExpose({
    updateShowedValue
});
</script>