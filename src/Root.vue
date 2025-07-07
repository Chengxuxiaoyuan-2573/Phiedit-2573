<template>
    <Suspense>
        <RouterView />
    </Suspense>
</template>
<script setup lang="ts">
import { ElLoading } from 'element-plus';
import { RouterView } from 'vue-router';
import { provide } from 'vue';
defineOptions({
    name: 'MainRoot'
})
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null;

function loadStart(){
    loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(255, 255, 255, 0.3)'
    });
}

function loadEnd(){
    loadingInstance?.close();
    loadingInstance = null;
}

provide('loadStart', loadStart);
provide('loadEnd', loadEnd);
</script>