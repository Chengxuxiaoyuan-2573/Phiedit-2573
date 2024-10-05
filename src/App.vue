<template>
    <NavBar />
    <router-view />
</template>

<script setup>
import NavBar from '@/components/NavBar.vue';
</script>

<style scoped>
body {
    background: #eee;
}
nav{
    height: 50px;
}
.content{
    height: calc(100% - 50px);
}
</style>
