// service-worker.js
'use strict';

const CACHE_NAME = 'uipc-pwa-cache-v1';
// urlsToCache 路径是不带 static 的
const urlsToCache = [
  'icon/icon_192.png',
  'icon/icon_512.png',
  'css/purecss-3.0.0-min.css',
  'js/xlsx-0.20.3.full.min.js',
  'js/crypto-js-4.1.1.min.js'
];

self.addEventListener('install', (event) => {
  console.log('Service worker 正在安装...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('打开缓存');
      return cache.addAll(urlsToCache);
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
    }),
  );
});

self.addEventListener('fetch', (event) => {
  console.log('正在用网络获取:', event.request.url);
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    }),
  );
});