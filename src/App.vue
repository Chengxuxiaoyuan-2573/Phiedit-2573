<template>
    <NavBar />
    <Suspense>
        <template #default>
            <router-view />
        </template>
        
        <template #fallback>
            <div>Loading...</div>
        </template>
    </Suspense>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue';
import PhigrosFontURL from "@/assets/PhigrosGameFont.ttf";
const styleElement = document.createElement('style');
const fontFaceRule = `
@font-face {
    font-family: 'PhiFont';
    src: url('${PhigrosFontURL}') ;
    font-weight: normal;
    font-style: normal;
}
html {
    font-family: PhiFont;
}`;
styleElement.textContent = fontFaceRule;
document.head.appendChild(styleElement);
</script>

<style scoped>
body {
    background: #eee;
}

nav {
    height: 50px;
}

.content {
    height: calc(100% - 50px);
}
</style>
