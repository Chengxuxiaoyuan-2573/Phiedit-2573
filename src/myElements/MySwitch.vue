<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="my-switch">
        <div class="label">
            <slot />
        </div>
        <ElSwitch
            v-model="inputData"
            v-bind="$attrs"
            :active-value="props.activeValue"
            :inactive-value="props.inactiveValue"
            @change="changeHandler"
        />
    </div>
</template>
<script setup lang="ts">
import { ElSwitch } from "element-plus";
import { ref, watch } from "vue";
const inputData = ref<A>(false);
type A = string | number | boolean;
const props = withDefaults(defineProps<{
    activeValue?: A,
    inactiveValue?: A
}>(), {
    activeValue: true,
    inactiveValue: false
});
const model = defineModel<A>({
    required: true
});
const emit = defineEmits<{
    change: [A]
}>();
watch(model, () => {
    inputData.value = model.value;
}, {
    immediate: true
});
function changeHandler() {
    model.value = inputData.value;
    emit("change", model.value);
}

function updateShowedValue() {
    inputData.value = model.value;
}

defineExpose({
    updateShowedValue
});
</script>
<style scoped>
.my-switch {
    display: flex;
    align-items: center;
}

.label{
    flex: 1;
}
</style>