<template>
    <div class="chartmeta-editor">
        <MyInput v-model="editor.chart.META.name">
            <template #prepend>
                曲名
            </template>
        </MyInput>
        <MyInput v-model="editor.chart.META.composer">
            <template #prepend>
                曲师
            </template>
        </MyInput>
        <MyInput v-model="editor.chart.META.charter">
            <template #prepend>
                谱师
            </template>
        </MyInput>
        <MyInput v-model="editor.chart.META.illustrator">
            <template #prepend>
                画师
            </template>
        </MyInput>
        <MyInput v-model="editor.chart.META.level">
            <template #prepend>
                等级
            </template>
        </MyInput>
        <MyInputNumber v-model="editor.chart.META.offset">
            <template #prepend>
                偏移
            </template>
        </MyInputNumber>
    </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { Editor } from '../editor';
import MyInput from '../myElements/MyInput.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
const editor = inject('editor') as Editor;
</script>
<style scoped>
.chartmeta-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>