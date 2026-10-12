<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->
<!-- 导入谱面时，让用户选择压缩包内谱面文件使用的格式（RPE 或官方） -->

<template>
    <ElDialog
        v-model="isShow"
        title="选择谱面格式"
        width="420px"
        :close-on-click-modal="false"
        :close-on-press-escape="true"
        append-to-body
        @closed="handleClosed"
    >
        <p class="tip">
            请选择压缩包内谱面文件使用的格式：
        </p>
        <div class="format-options">
            <MyButton
                type="primary"
                flex
                class="format-option"
                @click="choose('rpe')"
            >
                RPE 谱面格式
            </MyButton>
            <MyButton
                type="success"
                flex
                class="format-option"
                @click="choose('official')"
            >
                官方谱面格式
            </MyButton>
        </div>
        <div class="format-hints">
            <em>RPE 谱面格式：Re:PhiEdit 谱面，会按照原有逻辑读取。</em>
            <em>官方谱面格式：Phigros 官方谱面，会先转换为 RPE 格式再导入。</em>
        </div>
    </ElDialog>
</template>
<script setup lang="ts">
import { ElDialog } from "element-plus";
import { ref } from "vue";
import MyButton from "./MyButton.vue";
import type { ChartFormat } from "@/managers/main/convert";

const isShow = ref(false);
let resolve: ((format: ChartFormat | null) => void) | null = null;

/** 打开弹窗，返回用户选择的谱面格式；用户未选择便关闭弹窗时返回 null */
function open() {
    isShow.value = true;
    return new Promise<ChartFormat | null>(res => {
        resolve = res;
    });
}

function choose(format: ChartFormat) {
    isShow.value = false;
    resolve?.(format);
    resolve = null;
}

function handleClosed() {
    // 用户没有点任何选项就关掉了弹窗
    resolve?.(null);
    resolve = null;
}

defineExpose({ open });
</script>
<style scoped>
.tip {
    margin: 0 0 12px;
}

.format-options {
    display: flex;
    gap: 12px;
}

.format-option {
    flex: 1;
    height: 64px;
    font-size: 16px;
}

.format-hints {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 12px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}
</style>
