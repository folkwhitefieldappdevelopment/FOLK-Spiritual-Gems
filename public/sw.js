/**
 * FOLK Gems - High Performance Offline Service Worker
 * Caches the application shell and static assets for instant native-like loading.
 */

const CACHE_NAME = 'folk-gems-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon',
  '/dashboard',
  '/contacts'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching static shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isInternal = url.origin === self.location.origin;
  const isImage = event.request.destination === 'image';

  // Strategy: Cache First for assets/images, Network First for others
  if (isInternal || isImage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => {
          // Fallback for offline images or routes
          return null;
        });
      })
    );
  }
});