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
import { computed, ref, useTemplateRef, watch } from "vue";

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

/**
 * 当前的过滤关键字。
 * 为空时表示不进行过滤，直接展示全部选项。
 */
const filterKeyword = ref("");

/**
 * 实际展示的选项。
 *
 * 注意：这里必须是 computed 而不是普通的 ref。
 * 之前用 ref 只在初始化时赋值一次，且该 ref 只在模板的 v-for 中被读取，
 * 导致外部传入的 props.options 变化时（例如批量编辑面板切换选中事件后
 * 重新生成事件类型列表），下拉菜单中的选项永远不会更新。
 */
const filteredOptions = computed(() => {
    if (filterKeyword.value === "") {
        return props.options;
    }
    return props.options.filter(option => isSubsequence(filterKeyword.value.toLocaleLowerCase(), getLabel(option).toLocaleLowerCase()));
});

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

/**
 * 把外部传入的 model 同步到组件内部的 inputData。
 *
 * 多选时额外剔除掉已经不在候选列表中的值。
 * 否则当候选列表收缩后（例如批量编辑面板中取消选中了某类事件），
 * 已失效的值仍会被 ElSelect 当成选中项，导致输入框里显示出错误的标签。
 */
function syncFromModel() {
    const bb = aa2bb(model.value);
    if (isArray(bb)) {
        const validValues = new Set(props.options.map(option => isObject(option) ? a2b(option.value) : a2b(option)));
        inputData.value = bb.filter(value => validValues.has(value));
    }
    else {
        inputData.value = bb;
    }
}

watch(model, () => {
    syncFromModel();
}, {
    immediate: true
});

// 候选列表变化时重新同步一次，避免残留已失效的选中值
watch(() => props.options, () => {
    if (isArray(inputData.value)) {
        syncFromModel();
    }
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

/**
 * 判断 value 是否为 label 的子序列（不区分大小写）
 * 如 value="ace", label="abcde" 也可以匹配
 */
function isSubsequence(value: string, label: string) {
    if (value === "") {
        return true;
    }

    let valueIndex = 0;
    for (let i = 0; i < label.length; i++) {
        if (label[i] === value[valueIndex]) {
            valueIndex++;
            if (valueIndex === value.length) {
                return true;
            }
        }
    }
    return false;
}

function filterMethod(value: string) {
    filterKeyword.value = value;

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
    syncFromModel();
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