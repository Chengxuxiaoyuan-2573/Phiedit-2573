<!-- 此组件的意义是避免ElInput受控总是显示绑定值所带来的bug -->
<template>
    <ElInput
        v-model="inputData"
        @input="inputHandler"
    >
        <template #prepend>
            <slot name="prepend" />
        </template>
        <template #append>
            <slot name="append" />
        </template>
        <template #prefix>
            <slot name="prefix" />
        </template>
        <template #suffix>
            <slot name="suffix" />
        </template>
    </ElInput>
</template>

<script setup lang="ts">
import { ElInput } from "element-plus";
import { ref } from "vue";
const inputData = ref('');
const model = defineModel<string>({
    required: true,
});

// 初始化把数据拿到
inputData.value = model.value;
function inputHandler() {
    // 输入时把输入的内容传给数据
    model.value = inputData.value;
}
</script>