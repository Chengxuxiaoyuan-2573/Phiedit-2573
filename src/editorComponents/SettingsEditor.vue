<template>
    <div class="settings-editor">
        <Teleport :to="props.titleTeleport">
            设置
        </Teleport>
        <MyInputNumber
            v-model="editor.chartPackage.config.chartSpeed"
            :min="0"
        >
            <template #prepend>
                谱面流速
            </template>
            <template #append>
                像素每秒
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.chartPackage.config.lineWidth"
            :min="0"
        >
            <template #prepend>
                判定线宽度
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.chartPackage.config.textSize"
            :min="0"
        >
            <template #prepend>
                文字大小
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.chartPackage.config.backgroundDarkness"
            :min="0"
            :max="100"
        >
            <template #prepend>
                背景黑暗度
            </template>
            <template #append>
                %
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.chartPackage.config.noteSize"
            :min="0"
        >
            <template #prepend>
                note大小
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="editor.resourcePackage.config.hitFxDuration"
            :min="0"
        >
            <template #prepend>
                打击特效时间
            </template>
            <template #append>
                秒
            </template>
        </MyInputNumber>
        <ElCheckbox v-model="editor.resourcePackage.config.hitFxRotate">
            打击特效随判定线旋转
        </ElCheckbox>
        <ElCheckbox v-model="editor.resourcePackage.config.holdKeepHead">
            Hold正在判定时显示头部
        </ElCheckbox>
        <ElCheckbox v-model="editor.resourcePackage.config.hideParticles">
            隐藏粒子
        </ElCheckbox>
        <ElCheckbox v-model="editor.resourcePackage.config.holdCompact">
            Hold中间与头尾重叠（不支持，懒得做）
        </ElCheckbox>
        <ElCheckbox v-model="editor.resourcePackage.config.holdRepeat">
            Hold中间重复式拉伸
        </ElCheckbox>
    </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import Editor from '@/services/editor';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import { ElCheckbox } from 'element-plus';
const editor = inject('editor') as Editor;
const props = defineProps<{
    titleTeleport: string
}>();
</script>
<style scoped>
.settings-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>