// OblivAI Service Worker
// PRIVACY: Caches ONLY static assets, NEVER user data or chat content

const CACHE_NAME = 'oblivai-static-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/Whitelogotransparentbg.png',
  '/set-theme.js'
  // Note: React app bundles will be added dynamically
];

// Domains allowed for caching (models only)
const ALLOWED_MODEL_DOMAINS = [
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'xethub.hf.co'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old static caches (but keep model caches)
          if (cacheName.startsWith('oblivai-static-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is a model download from HuggingFace
  const isModelRequest = ALLOWED_MODEL_DOMAINS.some(domain =>
    url.hostname.includes(domain)
  );

  // Check if this is a local static asset
  const isStaticAsset = url.origin === self.location.origin &&
                        (url.pathname.endsWith('.js') ||
                         url.pathname.endsWith('.css') ||
                         url.pathname.endsWith('.png') ||
                         url.pathname.endsWith('.svg') ||
                         url.pathname.endsWith('.woff2') ||
                         url.pathname.endsWith('.woff') ||
                         url.pathname === '/' ||
                         url.pathname === '/index.html');

  if (isStaticAsset) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
  } else if (isModelRequest) {
    // Network-first for model downloads (WebLLM handles its own caching)
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, try cache as fallback
        return caches.match(request);
      })
    );
  } else {
    // For everything else, just use network
    event.respondWith(fetch(request));
  }
});

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear static cache (but not model cache)
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(STATIC_ASSETS);
        });
      })
    );
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});
