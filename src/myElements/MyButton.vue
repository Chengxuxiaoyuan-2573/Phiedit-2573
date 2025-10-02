<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElButton
        ref="button"
        v-bind="$attrs"
        :class="props.class + (props.flex ? ' flex-button' : '')"
        :type="props.type"
        :color="props.color"
        @click="onClick"
    >
        <slot />
    </ElButton>
</template>
<script setup lang="ts">
import { ElButton } from "element-plus";
import { useTemplateRef } from "vue";
const props = defineProps<{
    class?: string;
    flex?: boolean;
    type?: "" | "default" | "text" | "primary" | "success" | "warning" | "info" | "danger" | undefined;
    color?: string;
}>();
const emit = defineEmits(["click"]);
const button = useTemplateRef("button");
function onClick(e: MouseEvent) {
    emit("click", e);

    // 点击后自动失焦，使其无法被聚焦，避免按空格键触发按钮的问题
    button.value?.$el?.blur();
}
</script>
<style scoped>
.flex-button {
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>