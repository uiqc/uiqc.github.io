// service-worker.js
'use strict';

const CACHE_NAME = 'uniwon-ipc-pwa-cache-v2';
const urlsToCache = [
  'icon/icon_192.png',
  'icon/icon_512.png',
  'css/purecss-3.0.0-min.css',
  'js/crypto-js-4.1.1.min.js',
  'js/xlsx-0.20.3.full.min.js',

  'manifest.json',
  '/', // 确保包含根路径，因为会默认引导到 index.html 
  'app.js',
  'index.html',
  'css/index.css',
  'js/index.js',
  'js/excel_search.js',
  'upload.html',
  'css/upload.css',
  'js/upload.js',
];

// 首先检查缓存中是否存在请求的资源。 如果存在，则直接从缓存返回资源。 
// 如果缓存中没有资源，则从网络获取资源，将其添加到缓存中，然后返回。
const cacheFirstFiles = [
  'icon/icon_192.png',
  'icon/icon_512.png',
  'css/purecss-3.0.0-min.css',
  'js/crypto-js-4.1.1.min.js',
  'js/xlsx-0.20.3.full.min.js'
];

// 首先尝试从网络获取请求的资源。 如果网络请求成功，则将资源添加到缓存中，然后返回。
// 如果网络请求失败，则从缓存中获取资源（如果存在）。
const networkFirstFiles = [
  'manifest.json',
  'app.js',
  'index.html',
  'css/index.css',
  'js/index.js',
  'js/excel_search.js',
  'upload.html',
  'css/upload.css',
  'js/upload.js',
];

self.addEventListener('install', (event) => {
  console.log('Service worker 正在安装...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('打开缓存');
      return cache.addAll(urlsToCache)
        .then(() => console.log('所有资源已成功添加到缓存'))
        .catch(error => console.error('缓存资源时发生错误:', error));
    }),
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service worker 正在激活...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除过时的缓存:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }).then(() => {
      console.log('所有过时的缓存已成功删除');
      return self.clients.claim(); // 控制所有客户端
    })
  );
});

self.addEventListener('fetch', (event) => {
  console.log('正在处理 fetch 请求:', event.request.url);

  // 检查是否是根路径请求
  const isRootPath = event.request.url.endsWith('/');

  const isNetworkFirst = networkFirstFiles.some(file => event.request.url.includes(file)) || isRootPath;
  const isCacheFirst = cacheFirstFiles.some(file => event.request.url.includes(file));
  
  if (isNetworkFirst) {
    // 对指定文件和根路径使用 "Network, then cache" 策略
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // 检查响应是否有效
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            console.log('无效的响应，不缓存:', event.request.url);
            return networkResponse;
          }

          // 克隆 response
          const responseToCache = networkResponse.clone();

          // 更新缓存
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .then(() => {
              console.log('已缓存:', event.request.url);
            });

          console.log('从网络（Network First）返回:', event.request.url);
          return networkResponse;
        })
        .catch(() => {
          // 网络错误处理
          console.log('获取网络资源失败:', event.request.url);
          // 尝试从缓存中获取资源
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('网络错误，返回缓存:', event.request.url);
                return cachedResponse;
              }

              // 否则，返回一个默认的离线页面或图像
              console.log('网络错误且缓存中没有资源，返回离线页面:', event.request.url);
              return new Response('<h1>离线模式</h1>', {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
  } else if (isCacheFirst) {
    // 对其他资源使用 "Cache-first" 策略
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('从缓存返回 (Cache-first):', event.request.url);
            return cachedResponse; // 缓存命中，直接返回
          }

          console.log('从网络获取:', event.request.url);
          return fetch(event.request)
            .then((networkResponse) => {
              // 检查响应是否有效
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                console.log('无效的响应，不缓存:', event.request.url);
                return networkResponse;
              }

              // 克隆 response
              const responseToCache = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .then(() => {
                  console.log('已缓存:', event.request.url);
                });

              return networkResponse;
            })
            .catch(() => {
              // 网络错误处理
              console.log('获取网络资源失败:', event.request.url);
              // 可以返回一个默认的离线页面或图像
              // return caches.match('/offline.html');
              return new Response('<h1>离线模式</h1>', {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
  } else { 
    console.log('跳过 Service Worker，直接从网络获取:', event.request.url);
    return fetch(event.request); // 直接从网络获取
  }
});
