const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch'); // 如果使用 Node.js 18 以上版本，可以改用内置 fetch
const url = require('url');

// 配置远端静态文件服务器和本地缓存目录
const remoteServer = 'https://example.com/static'; // 远端服务器的 URL
const cacheDir = path.join(__dirname, 'cache'); // 本地缓存目录
const PORT = process.env.PORT || 3000;

// 确保本地缓存目录存在
fs.mkdir(cacheDir, { recursive: true }).catch(console.error);

// 获取文件的 content-type
function getContentType(filePath) {
  const extname = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4'
  };
  return contentType[extname] || 'application/octet-stream';
}

// 处理请求文件
async function serveFile(filePath, remoteUrl, res) {
  try {
    // 检查文件是否存在于本地缓存中
    const fileContent = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(fileContent, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 本地缓存中不存在，向远端服务器请求文件
      try {
        const response = await fetch(remoteUrl);

        if (response.ok) {
          // 远端请求成功，获取文件内容
          const data = await response.buffer();

          // 将文件缓存到本地
          await fs.writeFile(filePath, data);

          // 返回文件内容
          res.writeHead(200, { 'Content-Type': getContentType(filePath) });
          res.end(data, 'utf-8');
        } else {
          // 远端文件未找到或错误，返回 404
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end(`Error 404: File not found at ${remoteUrl}`);
        }
      } catch (fetchErr) {
        // 处理请求错误
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: Unable to fetch ${remoteUrl}`);
      }
    } else {
      // 其他文件系统错误
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.message}`);
    }
  }
}

// 创建 HTTP 服务器
http.createServer(async (req, res) => {
  let reqPath = req.url;

  // 如果路径是根路径 `/`，将其设置为 `index.html`
  if (reqPath === '/') reqPath = '/index.html';

  // 构建本地缓存路径和远端 URL
  const localFilePath = path.join(cacheDir, reqPath); // 本地文件路径
  const remoteFileUrl = url.resolve(remoteServer, reqPath); // 远端文件 URL

  // 根据请求路径处理文件或返回 index.html（单页面应用处理）
  await serveFile(localFilePath, remoteFileUrl, res);

  // 单页面应用的路由处理
  if (res.headersSent) return; // 如果响应已发送，不再处理

  // 如果未匹配到任何文件，返回 index.html
  const indexFilePath = path.join(cacheDir, 'index.html');
  const indexRemoteUrl = url.resolve(remoteServer, '/index.html');
  await serveFile(indexFilePath, indexRemoteUrl, res);
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
