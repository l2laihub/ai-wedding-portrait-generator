// Simple Service Worker for WedAI
const CACHE_NAME = 'wedai-v1';
const STATIC_CACHE = 'wedai-static-v1';

// Essential assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        self.skipWaiting();
      })
      .catch((error) => {
        console.log('[SW] Failed to cache assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - simple network-first strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    // Simple network-first strategy
    fetch(event.request)
      .then((response) => {
        // If successful, return the response
        if (response.ok) {
          return response;
        }
        // If not ok, try cache
        return caches.match(event.request);
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
      .then((response) => {
        // If we have a response (from network or cache), return it
        if (response) {
          return response;
        }
        // If no response available, return a simple fallback
        return new Response('Resource not available', {
          status: 404,
          statusText: 'Not Found'
        });
      })
  );
});

console.log('[SW] Service worker script loaded');