const CACHE_NAME = 'pip5-cache-v2';
const PRECACHE_URLS = ['/', '/index.html', '/assets/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only process http(s) requests; ignore chrome-extension:// and other non-http schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept or cache Firebase APIs, Firestore, Cloud Functions, or non-GET requests
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudfunctions.net') ||
    url.pathname.startsWith('/api') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Handle SPA Navigation requests: Network-first, fall back to /index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      })
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {
                // Ignore caching errors for browser extensions or quota
              });
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and no cached response, return empty response
          return cachedResponse || Response.error();
        });

      return cachedResponse || fetchPromise;
    })
  );
});
