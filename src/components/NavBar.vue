<template>
    <nav>
        <a href="/">
            <ElButton :class="{ active: $route.name == 'Index' }">PhiEdit 2573 Online</ElButton>
        </a>
        <a href="/about">
            <ElButton :class="{ active: $route.name == 'About' }">关于</ElButton>
        </a>
    </nav>
</template>

<script setup>
import ElButton from './ElButton.vue';
</script>

<style scoped>
nav {
    background: #dddddd;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    width: 100%;
    padding: 10px;
    gap: 10px;
}

a {
    text-decoration: none;
}

.button {
    width: 80px;
    height: 100%;
}
</style>
