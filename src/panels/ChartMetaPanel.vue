<template>
    <div class="chartmeta-panel">
        <Teleport :to="props.titleTeleport">
            谱面基本信息
        </Teleport>
        <MyInput v-model="chart.META.name">
            <template #prepend>
                曲名
            </template>
        </MyInput>
        <MyInput v-model="chart.META.composer">
            <template #prepend>
                曲师
            </template>
        </MyInput>
        <MyInput v-model="chart.META.charter">
            <template #prepend>
                谱师
            </template>
        </MyInput>
        <MyInput v-model="chart.META.illustration">
            <template #prepend>
                画师
            </template>
        </MyInput>
        <MyInput v-model="chart.META.level">
            <template #prepend>
                等级
            </template>
        </MyInput>
        <MyInputNumber v-model="chart.META.offset">
            <template #prepend>
                偏移
            </template>
        </MyInputNumber>
    </div>
</template>
<script setup lang="ts">
import store from '@/store';
import MyInput from '../myElements/MyInput.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
</script>
<style scoped>
.chartmeta-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>