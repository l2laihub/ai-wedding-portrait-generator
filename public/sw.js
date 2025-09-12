// Service Worker for AI Wedding Portrait Generator
const CACHE_NAME = 'wedding-ai-v1';
const STATIC_CACHE = 'wedding-ai-static-v1';
const DYNAMIC_CACHE = 'wedding-ai-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add critical CSS/JS files here when available
];

// Runtime caching patterns
const RUNTIME_CACHE_PATTERNS = {
  // Cache images with stale-while-revalidate
  images: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
  // Cache API responses for a short time
  api: /\/api\//,
  // Cache external resources
  external: /^https:/
};

// Install event - cache static assets
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
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old versions of caches
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    handleFetch(request, url)
  );
});

async function handleFetch(request, url) {
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Strategy 2: Stale While Revalidate for images
    if (RUNTIME_CACHE_PATTERNS.images.test(url.pathname)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Strategy 3: Network First for API calls
    if (RUNTIME_CACHE_PATTERNS.api.test(url.pathname)) {
      return await networkFirst(request, DYNAMIC_CACHE, 5000); // 5s timeout
    }
    
    // Strategy 4: Cache First for external resources
    if (url.origin !== location.origin) {
      return await cacheFirst(request, DYNAMIC_CACHE);
    }
    
    // Default: Network First with cache fallback
    return await networkFirst(request, DYNAMIC_CACHE, 3000); // 3s timeout
    
  } catch (error) {
    console.error('[SW] Fetch handler error:', error);
    
    // Return offline fallback for navigation requests
    if (request.destination === 'document') {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Generic network error response
    return new Response('Network error occurred', {
      status: 408,
      statusText: 'Request Timeout'
    });
  }
}

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Network First Strategy with timeout
async function networkFirst(request, cacheName, timeout = 3000) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cache
    return null;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return await fetchPromise;
}

// Helper function to identify static assets
function isStaticAsset(url) {
  const staticPaths = ['/', '/index.html', '/manifest.json'];
  return staticPaths.includes(url.pathname) || url.pathname.startsWith('/static/');
}

// Background sync for failed requests (when online again)
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(
      retryFailedRequests()
    );
  }
});

async function retryFailedRequests() {
  // Implementation for retrying failed API requests
  // This would typically involve checking IndexedDB for failed requests
  console.log('[SW] Retrying failed requests...');
}

// Push notifications support (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'wedding-ai-notification',
      actions: [
        {
          action: 'view',
          title: 'View App',
          icon: '/icons/icon-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Wedding AI', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});