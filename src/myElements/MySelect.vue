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
                :key="option"
            >
                <ElOption
                    v-if="isObject(option)"
                    :value="option.value"
                    :label="option.label"
                    :disabled="option.isDisabled"
                    @wheel.passive.stop
                >
                    {{ option.text }}
                </ElOption>
                <ElOption
                    v-else
                    :value="option"
                    :label="option.toString()"
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
import { isObject } from "lodash";
import { ref, useTemplateRef, watch } from "vue";
const inputData = ref<A | A[]>("");
type A = string | number | boolean;
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
watch(model, () => {
    inputData.value = model.value;
}, {
    immediate: true
});

function onChange() {
    model.value = inputData.value;
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
        inputData.value = getValue(filteredOptions.value[0]);
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
    inputData.value = model.value;
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