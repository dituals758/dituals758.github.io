const CACHE_VERSION = 'weekflow-v4.3.2';
const CRITICAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './icon-32x32.png',
    './icon-72x72.png',
    './icon-96x96.png',      // Добавлена для шорткатов PWA
    './icon-144x144.png',    // Добавлена для browserconfig.xml
    './icon-180x180.png',    // Для Apple Touch Icon
    './icon-192x192.png',
    './icon-512x512.png',
    './404.html'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Установка');
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[Service Worker] Кэширование критических ресурсов');
                // Используем addAll с обработкой ошибок для каждого ресурса
                return Promise.all(
                    CRITICAL_ASSETS.map(asset => {
                        return cache.add(asset).catch(error => {
                            console.warn(`[Service Worker] Не удалось кэшировать ${asset}:`, error);
                        });
                    })
                );
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[Service Worker] Ошибка установки:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Активация');
    
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_VERSION) {
                            console.log('[Service Worker] Удаление старого кэша:', key);
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Пропускаем не-GET запросы
    if (event.request.method !== 'GET') return;
    
    // Пропускаем chrome-extension запросы
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_VERSION);
            
            try {
                // Пробуем получить из сети
                const networkResponse = await fetch(event.request);
                
                // Если ответ успешный - кэшируем
                if (networkResponse.ok) {
                    // Для HTML файлов обновляем кэш
                    if (event.request.destination === 'document' || 
                        event.request.url.endsWith('.html')) {
                        await cache.put(event.request, networkResponse.clone());
                    }
                }
                
                return networkResponse;
            } catch (error) {
                // Если сеть недоступна - пробуем кэш
                const cachedResponse = await cache.match(event.request);
                
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Если нет в кэше - для HTML возвращаем главную страницу
                if (event.request.destination === 'document' || 
                    event.request.url.endsWith('/') ||
                    event.request.url.endsWith('.html')) {
                    const fallback = await cache.match('./index.html');
                    if (fallback) return fallback;
                }
                
                // В противном случае - оффлайн-страница
                return new Response(
                    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Оффлайн</title><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}</style></head><body><div><h1>📶</h1><p>Нет подключения к интернету</p></div></body></html>',
                    {
                        status: 503,
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    }
                );
            }
        })()
    );
});