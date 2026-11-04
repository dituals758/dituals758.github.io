// Импортируем конфиг для получения версии
importScripts('./config.js');

const CACHE = `mbbla-${APP_CONFIG.VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './config.js',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1. API-запросы к Google НЕ кэшируем и НЕ перехватываем
  if (url.includes('script.google.com') || url.includes('googleusercontent.com')) {
    return;
  }

  // 2. Network First для config.js (чтобы изменения подхватывались сразу)
  if (url.includes('config.js')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3. Cache First для всего остального (офлайн-режим)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});