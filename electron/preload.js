const { contextBridge, ipcRenderer } = require('electron');

// 在window对象上暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  uploadFile: (filePath, expiryDays) => ipcRenderer.invoke('upload-file', filePath, expiryDays),
  getSharedFiles: () => ipcRenderer.invoke('get-shared-files'),
  deleteFile: (fileId) => ipcRenderer.invoke('delete-file', fileId),
  getFileById: (fileId) => ipcRenderer.invoke('get-file-by-id', fileId),

  // 监听事件
  onFilesUpdated: (callback) => {
    ipcRenderer.on('files-updated', (_event, files) => callback(files));
    return () => {
      ipcRenderer.removeAllListeners('files-updated');
    };
  }
});

// 添加文件拖放支持
document.addEventListener('DOMContentLoaded', () => {
  // 启用整个文档的文件拖放
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
  
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
}); 