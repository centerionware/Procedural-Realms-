
const CACHE_NAME = 'procedural-realms-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/manifest.json',
    '/icon.svg',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Precaching app shell');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((cacheName) => {
                if (!cacheWhitelist.includes(cacheName)) {
                    return caches.delete(cacheName);
                }
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // 1. Try to get the response from the cache first (Cache-First).
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 2. If not in cache, try to fetch from the network.
      try {
        const networkResponse = await fetch(event.request);
        
        // On success, cache the new resource and return it.
        // This will cache scripts, assets from the CDN, etc., on the first online visit.
        if (networkResponse && networkResponse.status === 200) {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;

      } catch (error) {
        // 3. If the network fails (offline), provide a fallback.
        console.log('Fetch failed; returning offline fallback for', event.request.url);
        
        // For page navigations, serving the main app shell is critical for installability.
        if (event.request.mode === 'navigate') {
          // Return the precached app shell ('/').
          const fallbackResponse = await cache.match('/');
          if (fallbackResponse) {
              return fallbackResponse;
          }
        }
        
        // For other assets that are not cached and fail to fetch,
        // we return a custom error. This prevents the browser from showing its default offline page.
        return new Response('Resource not available offline.', {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
