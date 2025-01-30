<template>
    <ElSelect
        v-model="inputData"
        @change="onChange"
    >
        <template
            v-for="option in props.options"
            :key="option"
        >
            <ElOption
                v-if="isString(option)"
                :value="option"
                :label="option"
            >
                {{ option }}
            </ElOption>
            <ElOption
                v-else
                :value="option.value"
                :label="option.label"
            >
                {{ option.text }}
            </ElOption>
        </template>
    </ElSelect>
</template>
<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus';
import { isString } from 'lodash';
import { ref, watch } from 'vue';
const inputData = ref('');
const model = defineModel<string>({
    required: true
});
const props = defineProps<{
    options: (string | {
        value: string,
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
</script>