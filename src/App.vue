<template>
  <router-view></router-view>
</template>

<script setup>
// App 组件作为路由容器
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f5f7fa;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background: #ffffff;
  border-radius: 5px;
  border: 1px solid #dddddd;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #f5f5f5;
  border-color: #cccccc;
}

/* Firefox 滚动条 */
* {
  scrollbar-width: thin;
  scrollbar-color: #ffffff #f1f1f1;
}
</style> 