<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="chartmeta-panel right-inner">
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
        <MyInput
            v-model="chartId"
            disabled
        >
            <template #prepend>
                ID
            </template>
        </MyInput>
    </div>
</template>
<script setup lang="ts">
import store from "@/store";
import MyInput from "../myElements/MyInput.vue";
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const chartId = store.getChartId();
</script>