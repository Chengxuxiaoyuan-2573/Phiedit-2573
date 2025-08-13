<template>
    <ElButton
        type="primary"
        @click="isShow = true"
    >
        {{ openText }}
    </ElButton>
    <ElDialog
        v-model="isShow"
        :title="title || openText"
        :width="width"
        @open="emit('open')"
        @close="emit('close')"
        @opened="emit('opened')"
        @closed="emit('closed')"
        @open-auto-focus="emit('open-auto-focus')"
        @close-auto-focus="emit('close-auto-focus')"
    >
        <template #header>
            <slot
                name="header"
                :close="close"
            />
        </template>
        <template #default>
            <slot
                name="default"
                :close="close"
            />
        </template>
        <template #footer>
            <slot
                name="footer"
                :close="close"
            />
        </template>
    </ElDialog>
</template>
<script setup lang="ts">
import { ElDialog } from 'element-plus'
const isShow = defineModel<boolean>();
withDefaults(defineProps<{
    title?: string,
    openText?: string,
    width?: string | number
}>(), {
    title: '',
    openText: '打开',
    width: '50%'
})
const emit = defineEmits(['open', 'opened', 'close', 'closed', 'open-auto-focus', 'close-auto-focus']);
function close() {
    isShow.value = false;
}
</script>
<style scoped> 
.el-dialog {
    --el-dialog-min-width: 300px; 
}
</style>