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
        caches.open(CACHE_NAME).then(async (cache) => {
            // Try to get the response from the cache
            const cachedResponse = await cache.match(event.request);

            // Fetch from the network in parallel
            const networkResponsePromise = fetch(event.request)
                .then(networkResponse => {
                    // If we get a valid response, update the cache
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    // This will be hit when offline. The promise resolves to null.
                    console.warn(`Fetch failed for ${event.request.url}.`, error);
                    return null;
                });

            // Return the cached response immediately if it exists.
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise, wait for the network response.
            const networkResponse = await networkResponsePromise;
            if (networkResponse) {
                return networkResponse;
            }

            // If we're offline and the item wasn't in the cache,
            // return the main app shell for navigation requests.
            if (event.request.mode === 'navigate') {
                return cache.match('/');
            }

            // For other assets, return a simple 404 response.
            return new Response('Not Found', {
                status: 404,
                statusText: 'Not Found',
            });
        })
    );
});
