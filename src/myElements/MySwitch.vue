<template>
    <div class="my-switch">
        <div class="label">
            <slot />
        </div>
        <ElSwitch
            v-model="inputData"
            :active-value="props.activeValue"
            :inactive-value="props.inactiveValue"
            @change="changeHandler"
        />
    </div>
</template>
<script setup lang="ts">
import { ElSwitch } from 'element-plus'
import { ref, watch } from 'vue';
const inputData = ref<A>(false);
type A = string | number | boolean;
const props = withDefaults(defineProps<{
    activeValue?: A,
    inactiveValue?: A
}>(),{
    activeValue: true,
    inactiveValue: false
})
const model = defineModel<A>({
    required: true
});
watch(model, () => {
    inputData.value = model.value;
},{
    immediate: true
})
function changeHandler() {
    model.value = inputData.value;
}
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