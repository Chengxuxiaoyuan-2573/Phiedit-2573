<template>
    <ElLink
        :class="'my-link ' + props.class"
        :href="props.href"
        @click="openLink"
    >
        <slot />
    </ElLink>
</template>

<script setup lang="ts">
import { ElLink } from "element-plus";

const props = defineProps<{
    class?: string
    href: string
}>();
function openLink(e: MouseEvent) {
    e.preventDefault();
    window.electronAPI.openExternalLink(props.href);
}
</script>
<style scoped>
.my-link {
    color: var(--el-color-primary);
    font-size: 1em;
    line-height: 1;
}
</style>