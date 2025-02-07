<template>
    <div class="judgeline-editor">
        <MyInputNumber
            v-model="editor.currentJudgeLineNumber"
            :min="0"
            :max="editor.chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                当前线号
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.chart.judgeLineList[editor.currentJudgeLineNumber].father"
            :min="-1"
            :max="editor.chart.judgeLineList.length - 1"
            :step="1"
        >
            <template #prepend>
                父线号
            </template>
        </MyInputNumber>
        <MySwitch
            v-model="editor.chart.judgeLineList[editor.currentJudgeLineNumber].isCover"
            :active-value="1"
            :inactive-value="0"
        >
            隐藏在此判定线下方的note
        </MySwitch>
        <MyInputNumber
            v-model="editor.chart.judgeLineList[editor.currentJudgeLineNumber].zOrder"
            :step="1"
        >
            <template #prepend>
                显示层号
            </template>
        </MyInputNumber>
        <MySelect
            v-model="editor.chart.judgeLineList[editor.currentJudgeLineNumber].Texture"
            :options="[
                {
                    label: '无贴图',
                    value: 'line.png',
                    text: '无贴图'
                },
                ...Object.keys(textures)
            ]"
        />
    </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { Editor } from '../editor';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySelect from '../myElements/MySelect.vue';
import MySwitch from '../myElements/MySwitch.vue';
type Image = HTMLImageElement | HTMLCanvasElement;
const editor = inject('editor') as Editor;
const textures = inject('textures') as Record<string, Image>;
</script>
<style scoped>
.judgeline-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>