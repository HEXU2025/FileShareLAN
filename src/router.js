import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './views/Home.vue';
import Download from './views/Download.vue';

const routes = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/download/:id',
    component: Download,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router; 