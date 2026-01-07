const CACHE_VERSION = 'weekflow-v3.1';
const CRITICAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './icon-32x32.png',
    './icon-72x72.png',
    './icon-192x192.png',
    './icon-512x512.png',
    './404.html',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;350;400;450;500&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(CRITICAL_ASSETS))
            .then(() => self.skipWaiting())
            .catch(error => console.error('SW install error:', error))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.map(key => {
                    if (key !== CACHE_VERSION) {
                        return caches.delete(key);
                    }
                })
            ))
            .then(() => self.clients.claim())
            .catch(error => console.error('SW activate error:', error))
    );
});

const getResourceType = (request) => {
    const url = new URL(request.url);
    
    if (url.pathname.endsWith('.html') || url.pathname === '/') return 'document';
    if (url.pathname.endsWith('.js')) return 'script';
    if (url.pathname.endsWith('.css')) return 'style';
    if (url.pathname.includes('manifest')) return 'manifest';
    if (url.pathname.includes('icon')) return 'icon';
    if (url.pathname.includes('font') || url.host.includes('fonts')) return 'font';
    if (url.pathname.includes('image') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url.pathname)) return 'image';
    
    return 'other';
};

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = event.request.url;
    if (url.includes('chrome-extension://') || url.includes('browser-sync')) return;
    
    const resourceType = getResourceType(event.request);
    
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_VERSION);
            const cachedResponse = await cache.match(event.request);
            
            if (cachedResponse && ['manifest', 'icon', 'font', 'style'].includes(resourceType)) {
                return cachedResponse;
            }
            
            try {
                const networkResponse = await fetch(event.request);
                if (networkResponse.ok) {
                    await cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }
                throw new Error('Fetch failed');
            } catch (error) {
                if (cachedResponse) return cachedResponse;
                
                if (resourceType === 'document') {
                    const fallback = await cache.match('./index.html');
                    if (fallback) return fallback;
                }
                
                return new Response('Offline', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            }
            
            fetch(event.request)
                .then(async (networkResponse) => {
                    if (networkResponse.ok) {
                        await cache.put(event.request, networkResponse.clone());
                    }
                })
                .catch(() => {});
        })()
    );
});

self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'GET_CACHE_INFO':
            event.ports[0]?.postMessage({
                type: 'CACHE_INFO',
                version: CACHE_VERSION
            });
            break;
            
        case 'CLEAR_CACHE':
            caches.delete(CACHE_VERSION).then(() => {
                event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
    }
});