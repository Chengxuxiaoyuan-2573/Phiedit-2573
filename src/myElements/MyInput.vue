<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElInput
        ref="input"
        v-model="inputData"
        v-bind="$attrs"
        :type="props.type"
        :placeholder="props.placeholder"
        :clearable="props.clearable"
        @input="inputHandler"
        @change="changeHandler"
        @keydown.stop
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
    </ElInput>
</template>

<script setup lang="ts">
import { ElInput } from "element-plus";
import { ref, useSlots, useTemplateRef, watch } from "vue";
const inputData = ref("");
const emit = defineEmits<{
    input: [string],
    change: [string],
}>();
const input = useTemplateRef("input");
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<string>({
    required: true,
});
const props = defineProps<{
    placeholder?: string,
    type?: string,
    clearable?: boolean,
}>();
let isInternalUpdate = false;
watch(model, () => {
    // 只有外部修改而不是内部修改时才更新
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
updateShowedValue();

function updateShowedValue() {
    if (inputData.value !== model.value) {
        inputData.value = model.value;
    }

    // 把内部修改的标记取消
    isInternalUpdate = false;
}

function inputHandler() {
    model.value = inputData.value;

    // 标记为内部修改
    isInternalUpdate = true;
    emit("input", model.value);
}

function changeHandler() {
    emit("change", model.value);
    input.value?.$el?.blur();
}

function setValueWithoutUpdate(value: string) {
    model.value = value;
    isInternalUpdate = true;
}
defineExpose({
    updateShowedValue,
    setValueWithoutUpdate
});
</script>