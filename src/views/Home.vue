<template>
  <div class="app-container">
    <el-container>
      <el-main>
        <div 
          class="author-button-container" 
          ref="authorButtonRef"
          :style="{ left: authorPosition.x + 'px', top: authorPosition.y + 'px' }"
          @mousedown="startDrag"
        >
          <el-tooltip content="开源作者: 猫咪老师Aigc" placement="bottom">
            <el-button
              class="author-button"
              type="primary"
              circle
              size="small"
              @click="openAuthorLink"
            >
              <el-icon><Link /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
        
        <el-card class="upload-card">
          <template #header>
            <div class="card-header">
              <h3>上传文件</h3>
            </div>
          </template>
          
          <div 
            class="drop-zone" 
            @dragover.prevent="onDragOver" 
            @dragleave.prevent="onDragLeave" 
            @drop.prevent="onDrop"
            :class="{ 'drop-zone-active': isDragging }"
          >
            <div class="drop-zone-content">
              <el-icon class="drop-icon"><Upload /></el-icon>
              <p>拖拽文件到此处或</p>
              <el-button type="primary" @click="openFileDialog" :icon="Plus">选择文件</el-button>
              <p v-if="selectedFile" class="selected-file">已选择: {{ selectedFile }}</p>
            </div>
          </div>
          
          <div class="expiry-slider-container">
            <div class="expiry-slider-label">
              <span>文件有效期:</span>
              <span class="expiry-value">{{ expiryDays }} 天</span>
            </div>
            <el-slider 
              v-model="expiryDays" 
              :step="1" 
              :min="1" 
              :max="30"
              :marks="sliderMarks"
              :format-tooltip="(val) => `${val} 天`"
              class="expiry-slider"
            />
          </div>
          
          <div class="upload-action">
            <el-button 
              type="primary" 
              @click="uploadFile" 
              :disabled="!selectedFile || !expiryDays"
              :loading="uploading"
              class="upload-button"
              size="large"
              :icon="Upload"
            >
              上传并分享
            </el-button>
          </div>
        </el-card>
        
        <el-card v-if="shareInfo" class="share-card">
          <template #header>
            <div class="card-header">
              <h3>分享链接</h3>
              <el-tag type="success" effect="dark" size="small">成功</el-tag>
            </div>
          </template>
          
          <div class="share-info">
            <div class="file-details">
              <div class="file-info-row">
                <el-icon><Document /></el-icon>
                <strong>文件名:</strong> 
                <span>{{ shareInfo.name }}</span>
              </div>
              <div class="file-info-row">
                <el-icon><Files /></el-icon>
                <strong>文件大小:</strong> 
                <span>{{ formatFileSize(shareInfo.size) }}</span>
              </div>
              <div class="file-info-row">
                <el-icon><Timer /></el-icon>
                <strong>过期时间:</strong> 
                <span>{{ formatDate(shareInfo.expiryDate) }}</span>
              </div>
            </div>
            
            <div class="share-link-container">
              <p class="share-tip">
                <el-icon><InfoFilled /></el-icon>
                将此链接分享给局域网内的其他用户。链接将在 {{ shareInfo.expiryDays }} 天后过期。
              </p>
              <div class="link-copy-box">
                <el-input
                  v-model="shareInfo.shareLink"
                  readonly
                  class="share-link-input"
                >
                  <template #append>
                    <el-button @click="copyShareLink" :icon="CopyDocument">
                      复制
                    </el-button>
                  </template>
                </el-input>
              </div>
            </div>
          </div>
        </el-card>
        
        <el-card class="files-card">
          <template #header>
            <div class="card-header">
              <h3>我的共享文件</h3>
              <el-button @click="refreshFiles" size="small" text type="primary" :icon="Refresh">
                刷新
              </el-button>
            </div>
          </template>
          
          <div class="files-list">
            <el-table
              :data="sharedFiles"
              stripe
              style="width: 100%"
              v-loading="loading"
              row-class-name="file-table-row"
            >
              <el-table-column label="文件" min-width="200">
                <template #default="scope">
                  <div class="file-name-cell">
                    <el-icon><Document /></el-icon>
                    <span class="file-name">{{ scope.row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="大小" width="100">
                <template #default="scope">
                  {{ formatFileSize(scope.row.size) }}
                </template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="scope">
                  {{ formatDate(scope.row.uploadDate) }}
                </template>
              </el-table-column>
              <el-table-column label="过期时间" width="180">
                <template #default="scope">
                  <div class="expiry-cell">
                    <el-icon><Timer /></el-icon>
                    {{ formatDate(scope.row.expiryDate) }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" fixed="right">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button 
                      size="small" 
                      @click="copyFileLink(scope.row)"
                      :icon="Link"
                      circle
                      type="primary"
                      title="复制链接"
                    />
                    <el-button 
                      size="small" 
                      @click="confirmDelete(scope.row)"
                      :icon="Delete"
                      circle
                      type="danger"
                      title="删除文件"
                    />
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="sharedFiles.length === 0 && !loading" description="暂无共享文件" />
          </div>
        </el-card>
      </el-main>
      
      <el-footer class="app-footer">
        开源作者：猫咪老师 &copy; {{ new Date().getFullYear() }}
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Upload, 
  Plus, 
  Document, 
  Timer, 
  Link, 
  Delete, 
  Refresh, 
  InfoFilled,
  CopyDocument,
  Files
} from '@element-plus/icons-vue';

// 页面状态
const selectedFile = ref('');
const selectedFilePath = ref('');
const expiryDays = ref(3);
const uploading = ref(false);
const shareInfo = ref(null);
const sharedFiles = ref([]);
const loading = ref(false);
const isDragging = ref(false);

// 滑杆标记
const sliderMarks = computed(() => {
  return {
    1: '1天',
    7: '7天',
    30: '30天'
  };
});

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

// 拖拽事件处理
const onDragOver = (e) => {
  isDragging.value = true;
};

const onDragLeave = (e) => {
  isDragging.value = false;
};

const onDrop = (e) => {
  isDragging.value = false;
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    selectedFile.value = file.name;
    selectedFilePath.value = file.path;
    ElMessage.success(`已选择文件: ${file.name}`);
  }
};

// 选择文件
const openFileDialog = async () => {
  try {
    const filePath = await window.electronAPI.openFileDialog();
    if (filePath) {
      selectedFilePath.value = filePath;
      selectedFile.value = filePath.split(/[/\\]/).pop(); // 提取文件名
    }
  } catch (error) {
    ElMessage.error('选择文件失败：' + error.message);
  }
};

// 上传文件
const uploadFile = async () => {
  if (!selectedFilePath.value || !expiryDays.value) {
    ElMessage.warning('请选择文件并设置有效期');
    return;
  }
  
  try {
    uploading.value = true;
    const result = await window.electronAPI.uploadFile(selectedFilePath.value, expiryDays.value);
    shareInfo.value = result;
    await refreshFiles();
    ElMessage.success('文件上传成功');
    
    // 重置文件选择
    selectedFile.value = '';
    selectedFilePath.value = '';
  } catch (error) {
    ElMessage.error('文件上传失败：' + error.message);
  } finally {
    uploading.value = false;
  }
};

// 复制分享链接
const copyShareLink = () => {
  if (shareInfo.value && shareInfo.value.shareLink) {
    navigator.clipboard.writeText(shareInfo.value.shareLink)
      .then(() => {
        ElMessage.success('分享链接已复制到剪贴板');
      })
      .catch(() => {
        ElMessage.error('复制失败，请手动复制');
      });
  }
};

// 复制文件链接
const copyFileLink = (file) => {
  const localIP = window.location.hostname;
  const port = window.location.port || '3720';
  const shareLink = `http://${localIP}:${port}/download/${file.id}`;
  
  navigator.clipboard.writeText(shareLink)
    .then(() => {
      ElMessage.success('分享链接已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
};

// 刷新文件列表
const refreshFiles = async () => {
  try {
    loading.value = true;
    sharedFiles.value = await window.electronAPI.getSharedFiles();
  } catch (error) {
    ElMessage.error('获取文件列表失败：' + error.message);
  } finally {
    loading.value = false;
  }
};

// 确认删除
const confirmDelete = (file) => {
  ElMessageBox.confirm(
    `确定要删除文件"${file.name}"吗？该操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        const result = await window.electronAPI.deleteFile(file.id);
        if (result) {
          await refreshFiles();
          ElMessage.success('文件已删除');
        } else {
          ElMessage.error('删除失败');
        }
      } catch (error) {
        ElMessage.error('删除失败：' + error.message);
      }
    })
    .catch(() => {
      // 用户取消删除，不做任何操作
    });
};

// 作者按钮拖拽功能
const authorButtonRef = ref(null);
const authorPosition = ref({ x: 15, y: 15 });
let dragStartX = 0;
let dragStartY = 0;

const startDrag = (event) => {
  isDragging.value = true;
  dragStartX = event.clientX - authorPosition.value.x;
  dragStartY = event.clientY - authorPosition.value.y;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event) => {
  if (!isDragging.value) return;
  
  authorPosition.value.x = event.clientX - dragStartX;
  authorPosition.value.y = event.clientY - dragStartY;
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 监听文件列表更新
let unsubscribe;
onMounted(async () => {
  await refreshFiles();
  
  // 订阅文件更新事件
  unsubscribe = window.electronAPI.onFilesUpdated((files) => {
    sharedFiles.value = files;
  });
  
  // 清理拖拽事件监听器
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  });
});

// 打开作者链接
const openAuthorLink = () => {
  window.open('https://www.xiaohongshu.com/user/profile/59f1fcc411be101aba7f048f', '_blank');
};
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.author-button-container {
  position: fixed;
  z-index: 100;
  cursor: move;
}

.author-button {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.app-title {
  margin: 0;
  color: #409EFF;
  font-size: 1.8rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.el-main {
  padding: 30px 20px;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #303133;
}

.upload-card,
.share-card,
.files-card {
  margin-bottom: 25px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.upload-card:hover,
.share-card:hover,
.files-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* 拖拽区域样式 */
.drop-zone {
  border: 2px dashed #c0c4cc;
  border-radius: 8px;
  padding: 40px 30px;
  text-align: center;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  background-color: #f8f9fc;
}

.drop-zone-active {
  border-color: #409EFF;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.01);
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.2);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.drop-icon {
  font-size: 56px;
  color: #909399;
  margin-bottom: 10px;
}

.selected-file {
  margin-top: 5px;
  color: #409EFF;
  font-weight: 600;
  padding: 8px 16px;
  background-color: rgba(64, 158, 255, 0.1);
  border-radius: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 有效期滑杆样式 */
.expiry-slider-container {
  margin: 20px 0;
  padding: 0 10px;
}

.expiry-slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
  color: #606266;
}

.expiry-value {
  color: #409EFF;
  font-weight: 600;
  background-color: rgba(64, 158, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.expiry-slider {
  margin-top: 15px;
}

.upload-action {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.upload-button {
  width: 180px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

/* 分享卡片样式 */
.share-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-details {
  margin-top: 10px;
  background-color: #f8f9fc;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.file-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.file-info-row:last-child {
  margin-bottom: 0;
}

.file-info-row strong {
  margin-right: 5px;
  color: #606266;
}

.share-link-container {
  margin-top: 10px;
}

.share-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.5;
}

.link-copy-box {
  margin-top: 12px;
}

/* 文件列表样式 */
.files-list {
  margin-top: 10px;
}

.file-table-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.file-table-row:hover {
  background-color: #f5f7fa !important;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expiry-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.app-footer {
  text-align: center;
  color: #909399;
  padding: 25px 0;
  font-size: 0.9em;
  border-top: 1px solid #ebeef5;
  background-color: #fff;
}

/* 表格滚动容器样式 */
.el-table__body-wrapper {
  overflow-y: auto;
  max-height: 400px;
}

@media (max-width: 768px) {
  .upload-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-input,
  .expiry-select,
  .upload-button {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .drop-zone {
    padding: 20px;
  }
  
  .upload-button {
    width: 100%;
  }
}
</style> 