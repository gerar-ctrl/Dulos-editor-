// ============================================================================
// Service Worker - PWA Offline Support & Installability
// ============================================================================

const CACHE_NAME = 'dulos-editor-pwa-v17';
const SHARE_DB_NAME = 'dulos-share-target-db';
const SHARE_STORE_NAME = 'files';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/splash.jpg',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

// Install: precache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: purge outdated caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

function saveSharedFilesToIDB(files) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
        db.createObjectStore(SHARE_STORE_NAME, { autoIncrement: true });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(SHARE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SHARE_STORE_NAME);
      for (const file of files) {
        store.add(file);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const entries = formData.getAll('media');
    const files = entries.filter((entry) => entry instanceof File && entry.size > 0);
    if (files.length > 0) {
      await saveSharedFilesToIDB(files);
    }
  } catch (err) {
    console.error('[SW] Failed to process shared media:', err);
  }
  return Response.redirect('/?shared=1', 303);
}

// Fetch: Network First with cache fallback for HTML, Cache First for immutable assets
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Handle Web Share Target POST requests from mobile OS share sheets
  if (
    event.request.method === 'POST' &&
    url.origin === self.location.origin &&
    url.pathname === '/share-target'
  ) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Only handle GET requests for normal asset/navigation caching
  if (event.request.method !== 'GET') return;

  // For navigation requests: Network-First so deployed updates take effect immediately,
  // with offline cache fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request, { cache: 'no-cache' });
          if (networkResponse && networkResponse.status === 200) {
            cache.put('/index.html', networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cached = await cache.match('/index.html');
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Cache-first for immutable hashed Vite bundles (/assets/*) and local static assets
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icon-') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname === '/manifest.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const cachedType = cached?.headers?.get('content-type') || '';
        if (cached && !cachedType.includes('text/html')) return cached;
        return fetch(event.request).then((response) => {
          const contentType = response?.headers?.get('content-type') || '';
          if (response && response.status === 200 && !contentType.includes('text/html')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network with cache fallback for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        return Response.error();
      })
  );
});
