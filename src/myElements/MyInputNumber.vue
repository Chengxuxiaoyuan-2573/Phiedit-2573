<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="input-container">
        <ElInput
            ref="input"
            v-model="inputString"
            v-bind="$attrs"
            :class="props.class"
            @input="inputStringHandler"
            @change="changeStringHandler"
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
        <div
            v-if="errorMessage"
            class="error-message"
        >
            {{ errorMessage }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElInput } from "element-plus";
import { clamp } from "lodash";
import { ref, useSlots, useTemplateRef, watch } from "vue";
const inputString = ref("");
const input = useTemplateRef("input");
const errorMessage = ref("");
const slots: ReturnType<typeof useSlots> = useSlots();
const props = withDefaults(defineProps<{
    min?: number,
    max?: number,
    minInclusive?: boolean,
    maxInclusive?: boolean,
    step?: number,
    controls?: boolean,
    class?: string,
}>(), {
    min: -Infinity,
    max: Infinity,
    minInclusive: true,
    maxInclusive: true,
    step: 0,
    controls: false,
    class: "",
});
let isInternalUpdate = false;
const model = defineModel<number>({
    required: true,
});
const emit = defineEmits<{
    input: [number],
    change: [number]
}>();
watch(model, () => {
    if (!isInternalUpdate) {
        updateShowedValue();
    }
});
updateShowedValue();

function inputStringHandler() {
    // 输入时把输入的内容传给数据
    const inputNum = +inputString.value;
    if (inputString.value && !isNaN(inputNum)) {
        // 根据min, max, step把inputData赋值给v-model
        const min = +props.min;
        const max = +props.max;
        const minInclusive = props.minInclusive ?? true;
        const maxInclusive = props.maxInclusive ?? true;
        const step = +props.step;

        errorMessage.value = "";

        if (minInclusive) {
            if (inputNum < min) {
                errorMessage.value = `数值不能小于${min}`;
            }
        }
        else {
            if (inputNum <= min) {
                errorMessage.value = `数值必须大于${min}`;
            }
        }

        if (maxInclusive) {
            if (inputNum > max) {
                errorMessage.value = `数值不能大于${max}`;
            }
        }
        else {
            if (inputNum >= max) {
                errorMessage.value = `数值必须小于${max}`;
            }
        }

        if (step === 0) {
            model.value = clamp(inputNum, min, max);
        }
        else {
            const attachToStep = (num: number) => {
                return Math.round(num / step) * step;
            };

            if (attachToStep(inputNum) !== inputNum) {
                if (step === 1) {
                    errorMessage.value = "数值必须是整数";
                }
                else {
                    errorMessage.value = `数值必须是${step}的倍数`;
                }
            }
            else {
                errorMessage.value = "";
            }

            model.value = clamp(inputNum, min, max);
        }
        isInternalUpdate = true;
    }
    emit("input", model.value);
}

function changeStringHandler() {
    input.value?.$el?.blur();
    emit("change", model.value);
}

/*
let clickCount = 0;
function clickHandler() {
    if (clickCount === 0) {
        inputString.value = "";
    }
    else if(clickCount === 1) {
        inputString.value = model.value.toString();
    }
    clickCount++;
}

function blurHandler() {
    inputString.value = model.value.toString();
    clickCount = 0;
}
*/
function updateShowedValue() {
    inputString.value = model.value.toString();
    isInternalUpdate = false;
}

defineExpose({
    updateShowedValue
});
</script>
<style scoped>
.input-container {
    width: 100%;
}

.error-message {
    color: #f56c6c;
    font-size: 12px;
    line-height: 1;
    padding-top: 4px;
    text-align: left;
}

.el-input-number {
    width: 100%;
}
</style>