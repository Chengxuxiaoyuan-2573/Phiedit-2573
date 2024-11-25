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
            <RouterLink to="/">
                PhiEdit 2573 Online
            </RouterLink>
        </ElMenuItem>
        <ElMenuItem
            :route="$route"
            index="About"
        >
            <RouterLink to="/about">
                关于
            </RouterLink>
        </ElMenuItem>
        <ElMenuItem
            :route="$route"
            index="Document"
        >
            <RouterLink to="/document">
                文档
            </RouterLink>
        </ElMenuItem>
    </ElMenu>
    <div
        ref="loadingMask"
        class="loadingMask hidden"
    >
        <h1 ref="loadingText">
            Loading...
        </h1>
    </div>
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
import { onMounted, provide, Ref, ref } from 'vue';
const loadingText: Ref<HTMLElement | null> = ref(null);
const loadingMask: Ref<HTMLElement | null> = ref(null);
onMounted(() => {
    provide("setLoadingText", function (string: string) {
        loadingMask.value!.classList.remove("hidden");
        loadingText.value!.innerHTML = string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");
    })
    provide("removeLoadingText", function () {
        loadingMask.value!.classList.add("hidden");
    })
})
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

.loadingMask {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #2228;
    backdrop-filter: blur(10px);
    z-index: 6;
}

.loadingMask>h1 {
    color: white;
}

.hidden {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
}
</style>
