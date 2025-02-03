<template>
    <ElInput
        v-model="inputString"
        @input="inputStringHandler"
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
import { ref, useSlots, watch } from "vue";
const inputString = ref('');
const slots: ReturnType<typeof useSlots> = useSlots();
const props = withDefaults(defineProps<{
    min?: number,
    max?: number,
    step?: number,
    controls?: boolean,
}>(), {
    min: -Infinity,
    max: Infinity,
    step: 0,
    controls: false
});
let isInternalUpdate = false;
const model = defineModel<number>({
    required: true,
});
watch(model, () => {
    if (!isInternalUpdate) {
        inputString.value = model.value.toString();
    }
    isInternalUpdate = false;
}, {
    immediate: true 
});

function inputStringHandler() {
    // 输入时把输入的内容传给数据
    const inputNum = +inputString.value;
    if (inputString.value && !isNaN(inputNum)) {
        // 根据min, max, step把inputData赋值给v-model
        const min = +props.min || -Infinity;
        const max = +props.max || Infinity;
        const step = +props.step || 0;

        if (step == 0) {
            model.value = inputNum;
        } else {
            model.value = Math.round(Math.min(Math.max(inputNum, min), max) / step) * step;
        }
        isInternalUpdate = true;
    }
}
</script>
<style scoped>
.el-input-number {
    width: 100%;
}
</style>