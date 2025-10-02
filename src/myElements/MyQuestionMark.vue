<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElTooltip trigger="click">
        <ElIcon
            size="15"
            @click="handleIconClick"
        >
            <QuestionFilled class="question-mark" />
        </ElIcon>
        <template #content>
            <slot />
        </template>
    </ElTooltip>
</template>
<script setup lang="ts">
import { ElIcon, ElTooltip } from "element-plus";
import { QuestionFilled } from "@element-plus/icons-vue";

const handleIconClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
};
</script>
<style scoped>
.question-mark {
    color: var(--el-color-primary);
    transition: 0.3s;
}

.question-mark:hover {
    color: var(--el-color-primary-dark);
}
</style>