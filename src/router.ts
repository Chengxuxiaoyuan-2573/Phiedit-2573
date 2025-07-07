import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from './views/HomePage.vue'
import EditorPage from './views/EditorPage.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage
    },
    {
        path: '/editor',
        name: "Editor",
        component: EditorPage
    },
    // 添加通配符路由兜底
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHashHistory(process.env.BASE_URL), // 使用history模式
    routes
})

export default router