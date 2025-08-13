<template>
    <ElButton
        ref="button"
        v-bind="$attrs"
        :class="props.class"
        :type="props.type"
        @focus="onFocus"
        @click="onClick"
    >
        <slot />
    </ElButton>
</template>
<script setup lang="ts">
import { ElButton } from 'element-plus';
import { useTemplateRef } from 'vue';
const props = defineProps<{
    class?: string;
    type?: "" | "default" | "text" | "primary" | "success" | "warning" | "info" | "danger" | undefined;
}>();
const emit = defineEmits(['click']);
const button = useTemplateRef('button');
function onFocus() {
    // 聚焦时自动失焦，使其无法被聚焦，避免按空格键触发按钮的问题
    button.value?.$el?.blur();
}
function onClick() {
    emit('click');
}
</script>