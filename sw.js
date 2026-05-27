const CACHE_NAME = 'hyakumasu-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './register-sw.js',
  './icon-192.png',
  './icon-512.png',
  './Character/apple.png',
  './Character/grape.png',
  './Character/lemon.png',
  './Character/melon.png',
  './Character/orange.png',
  './Character/strawberry.jpg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Kosugi+Maru&display=swap'
];

// Install Service Worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch events: Network-First for HTML, Cache-First for other assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/');

  if (isHtml) {
    // Network-First strategy for HTML
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !event.request.url.startsWith('https://fonts.gstatic.com') && !event.request.url.startsWith('https://cdn.tailwindcss.com')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          return new Response('Offline mode: resource not cached.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
  }
});
