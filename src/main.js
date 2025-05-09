import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import router from './router';
import App from './App.vue';

// 创建Vue应用
const app = createApp(App);

// 使用Element Plus
app.use(ElementPlus);

// 使用路由
app.use(router);

// 挂载应用
app.mount('#app');

/**
 * Fastlane
 * 开源作者：猫咪老师
 */ 