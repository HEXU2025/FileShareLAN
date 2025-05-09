<template>
  <div class="download-container">
    <div class="download-card">
      <template v-if="loading">
        <div class="loading-state">
          <el-skeleton style="width: 100%" :rows="3" animated />
        </div>
      </template>
      
      <template v-else-if="error">
        <div class="error-state">
          <el-result
            icon="error"
            title="下载失败"
            :sub-title="error"
          >
            <template #extra>
              <el-button type="primary" @click="goBack">返回</el-button>
            </template>
          </el-result>
        </div>
      </template>
      
      <template v-else-if="expired">
        <div class="expired-state">
          <el-result
            icon="warning"
            title="文件已过期"
            sub-title="该文件分享链接已失效，无法下载"
          >
            <template #extra>
              <el-button type="primary" @click="goBack">返回</el-button>
            </template>
          </el-result>
        </div>
      </template>
      
      <template v-else-if="fileInfo">
        <div class="file-info">
          <h2>文件下载</h2>
          
          <div class="file-details">
            <p><strong>文件名:</strong> {{ fileInfo.name }}</p>
            <p><strong>文件大小:</strong> {{ formatFileSize(fileInfo.size) }}</p>
            <p><strong>上传时间:</strong> {{ formatDate(fileInfo.uploadDate) }}</p>
            <p><strong>过期时间:</strong> {{ formatDate(fileInfo.expiryDate) }}</p>
          </div>
          
          <div class="download-action">
            <el-button type="primary" size="large" @click="downloadFile" :loading="downloading">
              下载文件
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();

const fileInfo = ref(null);
const loading = ref(true);
const error = ref(null);
const expired = ref(false);
const downloading = ref(false);

// 文件大小格式化
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 日期格式化
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// 返回上一页
const goBack = () => {
  router.push('/');
};

// 下载文件
const downloadFile = () => {
  if (!fileInfo.value) return;
  
  downloading.value = true;
  
  // 直接通过浏览器下载
  const fileId = route.params.id;
  const downloadUrl = `/download/${fileId}`;
  
  // 创建临时链接并模拟点击下载
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', fileInfo.value.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  downloading.value = false;
  ElMessage.success('文件下载已开始');
};

// 获取文件信息
onMounted(async () => {
  const fileId = route.params.id;
  
  if (!fileId) {
    error.value = '无效的文件ID';
    loading.value = false;
    return;
  }
  
  try {
    const fileData = await window.electronAPI.getFileById(fileId);
    
    if (!fileData) {
      error.value = '找不到该文件';
    } else if (fileData.expired) {
      expired.value = true;
    } else {
      fileInfo.value = fileData;
    }
  } catch (err) {
    error.value = '获取文件信息失败: ' + err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.download-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.download-card {
  width: 100%;
  max-width: 500px;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-info {
  text-align: center;
}

.file-info h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #409EFF;
}

.file-details {
  margin: 20px 0;
  text-align: left;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.download-action {
  margin-top: 30px;
}

.loading-state,
.error-state,
.expired-state {
  padding: 20px 0;
}
</style> 