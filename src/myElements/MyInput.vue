<!-- 
此组件可支持用存取器（getter/setter）封装过的属性
此组件需要传入两个v-model：
一个是封装过后的属性，有getter和setter（v-model，必选）
一个是封装前的属性 ，用于在外部更新数据时更新输入框显示的值（v-model:when，可选）
给个例子：
const data = {
    date: [2085, 1, 1]
    get formattedDate(){ return this.date.join("-"); }
    set formattedDate(str){ this.date = str.split("-"); }
}
这里date属性存数据，formattedDate属性实现了把日期格式化
如果要输入这种格式的日期就可以用此组件，使用方法如下：
<MyInput v-model="data.formattedDate" v-model:when="data.date">
    <template #prepend>请输入日期</template>
</MyInput>
你可能需要在setter里面增加错误处理，比如如果输入的日期不合法，就不要把数据更新
-->
<template>
    <ElInput
        v-model="inputData"
        v-bind="$attrs"
        @input="inputHandler"
        @change="emit('change', model)"
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
import { isEmpty } from "lodash";
import { ref, watch, useSlots } from "vue";
const inputData = ref('');
const emit = defineEmits<{
    input: [string],
    change: [string]
}>();
const slots: ReturnType<typeof useSlots> = useSlots();
const model = defineModel<string>({
    required: true,
});
const modelWhen = defineModel<unknown>("when", {
    required: false
});
let isInternalUpdate = false;

if (isEmpty(modelWhen.value)) {
    watch(model, () => {
        if (!isInternalUpdate) updateShowedValue();
    }, { immediate: true });
}
else {
    watch(modelWhen, () => {
        if (!isInternalUpdate) updateShowedValue();
    }, { immediate: true });
}

function updateShowedValue() {
    inputData.value = model.value;
    isInternalUpdate = false;
}
function inputHandler() {
    model.value = inputData.value;
    isInternalUpdate = true;
    emit("input", model.value);
}
defineExpose({
    updateShowedValue
});
</script>