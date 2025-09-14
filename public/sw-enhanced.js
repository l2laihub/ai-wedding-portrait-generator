// Enhanced Service Worker for WedAI Mobile App
const CACHE_NAME = 'wedai-v2.1';
const STATIC_CACHE = 'wedai-static-v2.1';
const IMAGES_CACHE = 'wedai-images-v2.1';
const API_CACHE = 'wedai-api-v2.1';

// Cache versioning
const CACHE_VERSION = {
  static: 2.1,
  images: 2.1,
  api: 2.1
};

// Essential app shell assets
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Static assets to cache
const STATIC_ASSETS = [
  // Icons
  '/icons/icon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other static assets as needed
];

// Routes to cache with network-first strategy
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/'
];

// Routes to serve from cache first
const CACHE_FIRST_ROUTES = [
  '/static/',
  '/assets/',
  '/images/'
];

// Background sync tags
const SYNC_TAGS = {
  IMAGE_UPLOAD: 'image-upload',
  ANALYTICS: 'analytics'
};

// Install event - cache app shell and static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker v2.1');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
    ])
    .then(() => {
      console.log('[SW] Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker v2.1');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('wedai-') && 
                     !Object.values(CACHE_NAME).includes(cacheName) &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== IMAGES_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activation complete');
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: '2.1'
          });
        });
      });
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
  
  // Skip cross-origin requests (except for specific APIs)
  if (url.origin !== self.location.origin && !isAllowedCrossOrigin(url)) {
    return;
  }
  
  // Skip Chrome extension and other protocol requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Handle different types of requests with appropriate strategies
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // API requests - network first with cache fallback
    if (isApiRequest(url)) {
      return await networkFirstStrategy(request, API_CACHE);
    }
    
    // Image requests - cache first with network fallback
    if (isImageRequest(url)) {
      return await cacheFirstStrategy(request, IMAGES_CACHE);
    }
    
    // Static assets - cache first
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }
    
    // App shell (HTML) - network first with cache fallback
    if (isAppShell(url)) {
      return await networkFirstStrategy(request, CACHE_NAME);
    }
    
    // Default: network first
    return await networkFirstStrategy(request, CACHE_NAME);
    
  } catch (error) {
    console.error('[SW] Request handling failed:', error);
    
    // Return offline fallback if available
    return await getOfflineFallback(request);
  }
}

// Network first strategy
async function networkFirstStrategy(request, cacheName, timeout = 3000) {
  try {
    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
  }
  
  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  throw new Error('No network or cache available');
}

// Cache first strategy
async function cacheFirstStrategy(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.IMAGE_UPLOAD:
      event.waitUntil(syncImageUploads());
      break;
    case SYNC_TAGS.ANALYTICS:
      event.waitUntil(syncAnalytics());
      break;
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

// Sync pending image uploads
async function syncImageUploads() {
  console.log('[SW] Syncing image uploads');
  
  try {
    // Get pending uploads from IndexedDB or localStorage
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        await processUpload(upload);
        await removePendingUpload(upload.id);
      } catch (error) {
        console.error('[SW] Failed to sync upload:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync image uploads failed:', error);
  }
}

// Sync analytics data
async function syncAnalytics() {
  console.log('[SW] Syncing analytics');
  
  try {
    const pendingAnalytics = await getPendingAnalytics();
    
    for (const data of pendingAnalytics) {
      try {
        await sendAnalytics(data);
        await removePendingAnalytics(data.id);
      } catch (error) {
        console.error('[SW] Failed to sync analytics:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync analytics failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    title: data.title || 'WedAI',
    body: data.body || 'Your wedding portraits are ready!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-70x70.png',
    data: data.url || '/',
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-32x32.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const url = event.notification.data || '/';
  
  if (action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to find existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(url);
            return client.focus();
          }
        }
        
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_IMAGE':
      cacheImage(data.url, data.key);
      break;
    case 'QUEUE_UPLOAD':
      queueUpload(data);
      break;
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage({ cacheSize: getCacheSize() });
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Helper functions
function isApiRequest(url) {
  return NETWORK_FIRST_ROUTES.some(route => url.pathname.startsWith(route)) ||
         url.hostname.includes('api.') ||
         url.pathname.includes('/api/');
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url.pathname) ||
         url.hostname.includes('images.') ||
         url.pathname.includes('/generated/');
}

function isStaticAsset(url) {
  return CACHE_FIRST_ROUTES.some(route => url.pathname.startsWith(route)) ||
         /\.(css|js|woff|woff2|ttf|eot)(\?.*)?$/i.test(url.pathname);
}

function isAppShell(url) {
  return url.pathname === '/' || 
         url.pathname === '/index.html' ||
         url.pathname.endsWith('.html');
}

function isAllowedCrossOrigin(url) {
  const allowedOrigins = [
    'https://api.gemini.google.com',
    'https://generativelanguage.googleapis.com',
    // Add other allowed origins
  ];
  
  return allowedOrigins.some(origin => url.origin === origin);
}

async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (isAppShell(url)) {
    const cache = await caches.open(CACHE_NAME);
    return cache.match('/') || cache.match('/index.html');
  }
  
  if (isImageRequest(url)) {
    // Return a placeholder image or cached version
    const cache = await caches.open(IMAGES_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
  }
  
  // Generic offline response
  return new Response('Offline - Content not available', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Cache management
async function cacheImage(url, key) {
  try {
    const cache = await caches.open(IMAGES_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(key || url, response);
    }
  } catch (error) {
    console.error('[SW] Failed to cache image:', error);
  }
}

// Background sync helpers (implement based on your storage solution)
async function getPendingUploads() {
  // Implement based on your storage solution
  return [];
}

async function removePendingUpload(id) {
  // Implement based on your storage solution
}

async function processUpload(upload) {
  // Implement based on your API
}

async function getPendingAnalytics() {
  // Implement based on your analytics solution
  return [];
}

async function removePendingAnalytics(id) {
  // Implement based on your storage solution
}

async function sendAnalytics(data) {
  // Implement based on your analytics solution
}

async function queueUpload(data) {
  // Queue upload for background sync
  console.log('[SW] Queuing upload for background sync');
  
  try {
    // Register background sync
    await self.registration.sync.register(SYNC_TAGS.IMAGE_UPLOAD);
  } catch (error) {
    console.error('[SW] Background sync registration failed:', error);
  }
}

async function getCacheSize() {
  let totalSize = 0;
  
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('wedai-')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        totalSize += requests.length;
      }
    }
  } catch (error) {
    console.error('[SW] Failed to get cache size:', error);
  }
  
  return totalSize;
}

console.log('[SW] Enhanced service worker v2.1 loaded and ready');