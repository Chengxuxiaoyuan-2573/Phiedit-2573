<template>
    <ElTooltip>
        <ElIcon size="15">
            <QuestionFilled class="question-mark" />
        </ElIcon>
        <template #content>
            <slot />
        </template>
    </ElTooltip>
</template>
<script setup lang="ts">
import { ElIcon, ElTooltip } from 'element-plus';
import { QuestionFilled } from '@element-plus/icons-vue';
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