<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElDialog
        v-model="isShow"
        :modal="false"
        draggable
        append-to-body
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        :style="{
            width: props.width + 'px',
            height: props.height + 'px',
            minWidth: props.width + 'px',
            minHeight: props.height + 'px',
            maxWidth: props.width + 'px',
            maxHeight: props.height + 'px',
        }"
    >
        <slot />
        <template #title>
            <slot name="title" />
        </template>
    </ElDialog>
</template>
<script setup lang="ts">
import { ElDialog } from "element-plus";
const isShow = defineModel<boolean>();
const props = defineProps<{
    width?: number
    height?: number
}>();
function show() {
    isShow.value = true;
}

function hide() {
    isShow.value = false;
}
defineExpose({
    show,
    hide
});
</script>