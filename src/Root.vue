<template>
    <Suspense>
        <App />
        <template #fallback>
            <ElSkeleton />
        </template>
    </Suspense>
</template>
<script setup lang="ts">
import { ElSkeleton } from 'element-plus';
import App from './App.vue'
defineOptions({
    name: 'MainRoot'
})
</script>