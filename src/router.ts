/**
 * @license
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { createRouter, createWebHashHistory } from "vue-router";
import HomePage from "./views/HomePage.vue";
import EditorPage from "./views/EditorPage.vue";

const routes = [
    // 首页
    {
        path: "/",
        name: "Home",
        component: HomePage
    },

    // 编辑器界面
    {
        path: "/editor",
        name: "Editor",
        component: EditorPage
    },

    // 如果没有此页面，就返回首页
    {
        path: "/:pathMatch(.*)*",
        redirect: "/"
    }
];

const router = createRouter({
    // 使用 Hash History 模式
    history: createWebHashHistory(process.env.BASE_URL),
    routes
});

export default router;