<template>
    <ElSelect
        v-model="inputData"
        @change="onChange"
        @wheel.stop="onWheel"
    >
        <template
            v-for="option in props.options"
            :key="option"
        >
            <ElOption
                v-if="isObject(option)"
                :value="option.value"
                :label="option.label"
            >
                {{ option.text }}
            </ElOption>
            <ElOption
                v-else
                :value="option"
                :label="option.toString()"
            >
                {{ option }}
            </ElOption>
        </template>
    </ElSelect>
</template>
<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus';
import { isObject } from 'lodash';
import { ref, watch } from 'vue';
const inputData = ref<A>('');
type A = string | number | boolean;
const model = defineModel<A>({
    required: true
});
const props = defineProps<{
    options: (A | {
        value: A,
        label: string,
        text: string
    })[],
}>()
watch(model, () => {
    inputData.value = model.value;
}, { 
    immediate: true 
})
function onChange() {
    model.value = inputData.value;
}
function onWheel(e: WheelEvent) {
    e.stopPropagation();
}
</script>