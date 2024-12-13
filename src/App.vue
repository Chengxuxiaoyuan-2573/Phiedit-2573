<template>
    <ElMenu
        mode="horizontal"
        router
        :default-active="$route.name?.toString()"
    >
        <ElMenuItem
            :route="$route"
            index="Index"
        >
            <RouterLink
                to="/"
                style="display:block;margin:auto"
            >
                PhiEdit 2573 Online
            </RouterLink>
        </ElMenuItem>
        <ElMenuItem
            :route="$route"
            index="About"
        >
            <RouterLink
                to="/about"
                style="display:block;margin:auto"
            >
                关于
            </RouterLink>
        </ElMenuItem>
        <ElMenuItem
            :route="$route"
            index="Document"
        >
            <RouterLink
                to="/document"
                style="display:block;margin:auto"
            >
                文档
            </RouterLink>
        </ElMenuItem>
    </ElMenu>
    <Suspense>
        <template #default>
            <router-view />
        </template>

        <template #fallback>
            <h1>Loading...</h1>
        </template>
    </Suspense>
</template>

<script setup lang="ts">
import PhigrosFontURL from "@/assets/PhigrosGameFont.ttf";
import { ElMenu, ElMenuItem } from "element-plus";
const fontImportant = false;
const styleElement = document.createElement('style');
const fontFaceRule = `
@font-face {
    font-family: 'PhiFont';
    src: url('${PhigrosFontURL}') ;
    font-weight: normal;
    font-style: normal;
}
body * {
    font-family: PhiFont ${fontImportant ? "!important" : ""};
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
