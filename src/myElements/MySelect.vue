<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="my-select">
        <p class="my-select-label">
            <slot />
        </p>
        <ElSelect
            ref="select"
            v-model="inputData"
            v-bind="$attrs"
            :filterable="props.filterable"
            :filter-method="filterMethod"
            :class="props.class"
            :multiple="props.multiple"
            placeholder="暂无可用的选项"
            @change="onChange"
            @keydown.stop="onKeyDown"
        >
            <template
                v-for="option in filteredOptions"
                :key="String(isObject(option) ? option.value : option)"
            >
                <ElOption
                    v-if="isObject(option)"
                    :value="option.value === undefined ? UNDEFINED : option.value"
                    :label="option.label"
                    :disabled="option.isDisabled"
                    @wheel.passive.stop
                >
                    {{ option.text }}
                </ElOption>
                <ElOption
                    v-else
                    :value="option === undefined ? UNDEFINED : option"
                    :label="String(option)"
                    :disabled="false"
                    @wheel.passive.stop
                >
                    {{ option }}
                </ElOption>
            </template>
        </ElSelect>
    </div>
</template>
<script setup lang="ts">
import { ElOption, ElSelect } from "element-plus";
import { isArray, isObject } from "lodash";
import { ref, useTemplateRef, watch } from "vue";

const UNDEFINED = -1;

type A = string | number | boolean | undefined;
type B = string | number | boolean | typeof UNDEFINED;

/** 单选时类型为 `B`，多选时类型为 `B[]` */
const inputData = ref<B | B[]>("");

const select = useTemplateRef("select");
const model = defineModel<A | A[]>({
    required: true
});

const props = withDefaults(defineProps<{
    options: readonly (A | {
        value: A,
        label: string,
        text: string,
        isDisabled?: boolean
    })[],
    multiple?: boolean,
    filterable?: boolean,
    class?: string,
}>(), {
    filterable: false,
    class: "",
    multiple: false
});
const emit = defineEmits<{
    change: [A | A[]]
}>();
const filteredOptions = ref([...props.options]);

function isUNDEFINED(value: unknown): value is typeof UNDEFINED {
    return value === UNDEFINED;
}

function a2b(a: A): B {
    if (a === undefined) {
        return UNDEFINED;
    }
    return a;
}

function b2a(b: B): A {
    if (isUNDEFINED(b)) {
        return undefined;
    }
    return b;
}

function aa2bb(aa: A | A[]) {
    if (isArray(aa)) {
        return aa.map(a2b);
    }
    return a2b(aa);
}

function bb2aa(bb: B | B[]) {
    if (isArray(bb)) {
        return bb.map(b2a);
    }
    return b2a(bb);
}

watch(model, () => {
    inputData.value = aa2bb(model.value);
}, {
    immediate: true
});

function onChange() {
    model.value = bb2aa(inputData.value);
    emit("change", model.value);
    select.value?.$el?.blur();
}

function getLabel(option: (A | {
    value: A,
    label: string,
    text: string
})) {
    return isObject(option) ? option.label : String(option);
}

function getValue(option: (A | {
    value: A,
    label: string,
    text: string
})) {
    return isObject(option) ? option.value : option;
}

function filterMethod(value: string) {
    // 不区分大小写，可以跳字符，有子序列即可
    // 如value="ace", option="abcde"也可以
    if (value === "") {
        filteredOptions.value = [...props.options];
        return;
    }
    filteredOptions.value = [];
    for (const option of props.options) {
        const lowerValue = value.toLocaleLowerCase();
        const lowerLabel = getLabel(option).toLocaleLowerCase();

        let valueIndex = 0;
        for (let i = 0; i < lowerLabel.length; i++) {
            if (lowerLabel[i] === lowerValue[valueIndex]) {
                valueIndex++;
                if (valueIndex === lowerValue.length) {
                    filteredOptions.value.push(option);
                    break;
                }
            }
        }
    }

    if (filteredOptions.value.length > 0) {
        inputData.value = aa2bb(getValue(filteredOptions.value[0]));
    }
    onChange();
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
        onChange();
        select.value?.blur();
    }
}

function updateShowedValue() {
    inputData.value = aa2bb(model.value);
}

defineExpose({
    updateShowedValue
});
</script>
<style scoped>
.my-select {
    display: flex;
    align-items: center;
}

.my-select-label {
    white-space: nowrap;
}

/* 有子元素时，添加间距 */
.my-select-label:not(:empty) {
    margin-right: 10px;
}
</style>