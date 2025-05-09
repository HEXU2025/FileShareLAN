const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');
const schedule = require('node-schedule');
const crypto = require('crypto');

// 打印环境变量
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());

// 配置存储
const store = new Store({
  name: 'file-share-data',
  defaults: {
    sharedFiles: []
  }
});

// 创建存储目录
const userDataPath = app.getPath('userData');
const uploadDir = path.join(userDataPath, 'uploads');
console.log('Upload directory:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许加载本地文件
      webSecurity: false
    }
  });

  // 移除菜单栏
  mainWindow.setMenu(null);

  // 设置应用图标
  try {
    // 支持文件拖放到窗口
    mainWindow.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });
  } catch (error) {
    console.error('设置拖放功能时出错:', error);
  }

  // 添加窗口事件监听器，记录错误信息
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
  });

  // 仅在开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 加载应用
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading development URL...');
      mainWindow.loadURL('http://localhost:3720');
    } else {
      const indexHtml = path.join(__dirname, '../dist/index.html');
      console.log('Loading file:', indexHtml);
      
      // 检查文件是否存在
      if (fs.existsSync(indexHtml)) {
        console.log('Index HTML file exists');
      } else {
        console.error('Index HTML file does not exist!');
      }
      
      mainWindow.loadFile(indexHtml);
    }
  } catch (error) {
    console.error('加载页面时出错:', error);
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // 设置定时任务，检查过期文件
  schedule.scheduleJob('0 0 * * *', () => {
    // 每天午夜检查过期文件
    checkExpiredFiles();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 获取本地IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过非IPv4和内部IP
      if (iface.family !== 'IPv4' || iface.internal) {
        continue;
      }
      return iface.address;
    }
  }
  return 'localhost';
}

// 检查过期文件
function checkExpiredFiles() {
  const sharedFiles = store.get('sharedFiles');
  const now = new Date();
  const expiredFiles = [];
  const validFiles = [];

  sharedFiles.forEach(file => {
    const expiryDate = new Date(file.expiryDate);
    if (now > expiryDate) {
      expiredFiles.push(file);
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`删除文件失败: ${file.path}`, err);
      }
    } else {
      validFiles.push(file);
    }
  });

  if (expiredFiles.length > 0) {
    // 更新存储中的文件列表
    store.set('sharedFiles', validFiles);
    // 通知渲染进程更新文件列表
    if (mainWindow) {
      mainWindow.webContents.send('files-updated', validFiles);
    }
  }
}

// IPC 事件处理
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  
  return null;
});

ipcMain.handle('upload-file', async (event, filePath, expiryDays) => {
  try {
    // 生成唯一ID
    const fileId = crypto.randomUUID();
    
    // 获取文件信息
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    // 复制文件到上传目录
    const destPath = path.join(uploadDir, fileId + path.extname(fileName));
    fs.copyFileSync(filePath, destPath);
    
    // 计算过期日期
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
    
    // 保存文件信息
    const fileInfo = {
      id: fileId,
      name: fileName,
      size: stats.size,
      path: destPath,
      uploadDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      expiryDays: parseInt(expiryDays)
    };
    
    const sharedFiles = store.get('sharedFiles');
    sharedFiles.push(fileInfo);
    store.set('sharedFiles', sharedFiles);
    
    // 创建分享链接
    const localIP = getLocalIP();
    const shareLink = `http://${localIP}:${process.env.PORT || 3720}/download/${fileId}`;
    
    return {
      ...fileInfo,
      shareLink
    };
  } catch (error) {
    console.error('文件上传错误:', error);
    throw error;
  }
});

ipcMain.handle('get-shared-files', () => {
  return store.get('sharedFiles');
});

ipcMain.handle('delete-file', (event, fileId) => {
  const sharedFiles = store.get('sharedFiles');
  const fileIndex = sharedFiles.findIndex(file => file.id === fileId);
  
  if (fileIndex !== -1) {
    const file = sharedFiles[fileIndex];
    
    // 删除文件
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('删除文件错误:', error);
    }
    
    // 更新文件列表
    sharedFiles.splice(fileIndex, 1);
    store.set('sharedFiles', sharedFiles);
    
    return true;
  }
  
  return false;
});

ipcMain.handle('get-file-by-id', (event, fileId) => {
  const sharedFiles = store.get('sharedFiles');
  const file = sharedFiles.find(file => file.id === fileId);
  
  if (file) {
    // 检查文件是否已过期
    const now = new Date();
    const expiryDate = new Date(file.expiryDate);
    
    if (now > expiryDate) {
      // 文件已过期
      return { expired: true };
    }
    
    return {
      ...file,
      content: fs.readFileSync(file.path)
    };
  }
  
  return null;
});

// Express 服务器，处理下载请求
const express = require('express');
const expressApp = express();
const PORT = process.env.PORT || 3720;

// 静态文件
expressApp.use(express.static(path.join(__dirname, '../dist')));

// 下载路由
expressApp.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const sharedFiles = store.get('sharedFiles');
  const file = sharedFiles.find(file => file.id === fileId);
  
  if (!file) {
    return res.status(404).send('文件不存在');
  }
  
  // 检查是否过期
  const now = new Date();
  const expiryDate = new Date(file.expiryDate);
  
  if (now > expiryDate) {
    return res.status(410).send('文件已过期');
  }
  
  res.download(file.path, file.name);
});

// 启动 Express 服务器
let server;
app.whenReady().then(() => {
  server = expressApp.listen(PORT, () => {
    console.log(`文件共享服务器运行在 http://${getLocalIP()}:${PORT}`);
  });
});

// 应用退出时关闭服务器
app.on('will-quit', () => {
  if (server) {
    server.close();
  }
}); 