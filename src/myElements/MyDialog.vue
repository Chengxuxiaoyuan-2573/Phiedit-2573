<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <MyButton
        v-if="props.showTrigger"
        type="primary"
        @click="isShow = true"
    >
        {{ openText }}
    </MyButton>
    <ElDialog
        v-model="isShow"
        :title="title || openText"
        :width="width"
        v-bind="$attrs"
        :close-on-click-modal="props.closeOnClickModal"
        :close-on-press-escape="props.closeOnPressEscape"
        :show-close="props.showClose"
        :draggable="props.draggable"
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
            <div class="dialog-content">
                <slot
                    name="default"
                    :close="close"
                />
            </div>
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
import { ElDialog } from "element-plus";
import MyButton from "./MyButton.vue";
const isShow = defineModel<boolean>();
const props = withDefaults(defineProps<{
    title?: string,
    openText?: string,
    width?: string | number
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    showClose?: boolean
    draggable?: boolean

    /** 是否显示用来打开弹窗的按钮。只在需要由代码控制弹窗时设为 false */
    showTrigger?: boolean
}>(), {
    title: "",
    openText: "打开",
    width: "50%",
    closeOnClickModal: true,
    closeOnPressEscape: true,
    showClose: true,
    draggable: false,
    showTrigger: true
});
const emit = defineEmits(["open", "opened", "close", "closed", "open-auto-focus", "close-auto-focus"]);
function close() {
    isShow.value = false;
}
</script>
<style scoped>
.el-dialog {
    --el-dialog-min-width: 300px;
}

.dialog-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>